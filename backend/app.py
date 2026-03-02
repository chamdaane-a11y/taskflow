from flask import Flask, jsonify, request
from flask_cors import CORS
from database import connecter
import hashlib
import os
import json
import re
from dotenv import load_dotenv
from groq import Groq
import requests as http_requests

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'taskflow_secret')
CORS(app)

# ============================================
# 🔐 AUTHENTIFICATION
# ============================================

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        nom = data.get('nom', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not nom or not email or not password:
            return jsonify({"erreur": "Tous les champs sont requis"}), 400

        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing = curseur.fetchone()
        if existing:
            curseur.close()
            db.close()
            return jsonify({"erreur": "Email déjà utilisé !"}), 400

        curseur.execute(
            "INSERT INTO users (nom, email, password) VALUES (%s, %s, %s)",
            (nom, email, password_hash)
        )
        db.commit()
        curseur.close()
        db.close()
        return jsonify({"message": "Compte créé !"})

    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({"erreur": "Email et mot de passe requis"}), 400

        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute(
            "SELECT id, nom, email FROM users WHERE email = %s AND password = %s",
            (email, password_hash)
        )
        user = curseur.fetchone()
        curseur.close()
        db.close()

        if user:
            return jsonify({"message": "Connecté !", "user": user})
        else:
            return jsonify({"erreur": "Email ou mot de passe incorrect !"}), 401

    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 👤 UTILISATEURS
# ============================================

@app.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("SELECT id, nom, email, points, niveau, theme FROM users WHERE id=%s", (id,))
    user = curseur.fetchone()
    db.close()
    return jsonify(user)

@app.route('/users/<int:id>/theme', methods=['PUT'])
def update_theme(id):
    data = request.get_json()
    db = connecter()
    curseur = db.cursor()
    curseur.execute("UPDATE users SET theme=%s WHERE id=%s", (data['theme'], id))
    db.commit()
    db.close()
    return jsonify({"message": "Theme mis a jour !"})

@app.route('/users/<int:id>/points', methods=['PUT'])
def update_points(id):
    data = request.get_json()
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("UPDATE users SET points=points+%s WHERE id=%s", (data['points'], id))
    db.commit()
    curseur.execute("SELECT points, niveau FROM users WHERE id=%s", (id,))
    user = curseur.fetchone()
    nouveau_niveau = (user['points'] // 100) + 1
    curseur.execute("UPDATE users SET niveau=%s WHERE id=%s", (nouveau_niveau, id))
    db.commit()
    db.close()
    return jsonify({"points": user['points'], "niveau": nouveau_niveau})

# ============================================
# 📂 CATEGORIES
# ============================================

@app.route('/categories/<int:user_id>', methods=['GET'])
def get_categories(user_id):
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("SELECT * FROM categories WHERE user_id=%s", (user_id,))
    categories = curseur.fetchall()
    db.close()
    return jsonify(categories)

@app.route('/categories', methods=['POST'])
def ajouter_categorie():
    data = request.get_json()
    db = connecter()
    curseur = db.cursor()
    curseur.execute("INSERT INTO categories (nom, couleur, user_id) VALUES (%s, %s, %s)", (data['nom'], data['couleur'], data['user_id']))
    db.commit()
    db.close()
    return jsonify({"message": "Catégorie ajoutée !"})

@app.route('/categories/<int:id>', methods=['DELETE'])
def supprimer_categorie(id):
    db = connecter()
    curseur = db.cursor()
    curseur.execute("DELETE FROM categories WHERE id=%s", (id,))
    db.commit()
    db.close()
    return jsonify({"message": "Catégorie supprimée !"})

# ============================================
# ✅ TACHES
# ============================================

@app.route('/taches/<int:user_id>', methods=['GET'])
def get_taches(user_id):
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("""
        SELECT t.*, c.nom as categorie_nom, c.couleur as categorie_couleur
        FROM taches t
        LEFT JOIN categories c ON t.categorie_id = c.id
        WHERE t.user_id = %s
        ORDER BY t.created_at DESC
    """, (user_id,))
    taches = curseur.fetchall()
    db.close()
    return jsonify(taches)

@app.route('/taches', methods=['POST'])
def ajouter_tache():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("""
            INSERT INTO taches (titre, priorite, deadline, user_id, categorie_id)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data['titre'],
            data.get('priorite', 'moyenne'),
            data.get('deadline', None),
            data['user_id'],
            data.get('categorie_id', None)
        ))
        db.commit()

        # Notifier Slack si webhook configuré
        curseur2 = db.cursor(dictionary=True)
        curseur2.execute("SELECT config FROM integrations WHERE user_id=%s AND type='slack'", (data['user_id'],))
        row = curseur2.fetchone()
        if row:
            config = json.loads(row['config'])
            webhook_url = config.get('webhook_url')
            if webhook_url:
                deadline_str = f" (deadline: {data['deadline']})" if data.get('deadline') else ""
                envoyer_notification_slack(
                    webhook_url,
                    f"✅ Nouvelle tâche TaskFlow : *{data['titre']}*{deadline_str} — Priorité: {data.get('priorite', 'moyenne')}"
                )
        db.close()
        return jsonify({"message": "Tâche ajoutée !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/taches/<int:id>', methods=['PUT'])
def terminer_tache(id):
    data = request.get_json()
    db = connecter()
    curseur = db.cursor()
    curseur.execute("UPDATE taches SET terminee=%s WHERE id=%s", (data['terminee'], id))
    db.commit()
    db.close()
    return jsonify({"message": "Tâche mise à jour !"})

@app.route('/taches/<int:id>', methods=['DELETE'])
def supprimer_tache(id):
    db = connecter()
    curseur = db.cursor()
    curseur.execute("DELETE FROM taches WHERE id=%s", (id,))
    db.commit()
    db.close()
    return jsonify({"message": "Tâche supprimée !"})

@app.route('/taches/<int:id>/statut', methods=['PATCH'])
def update_statut_tache(id):
    try:
        data = request.get_json()
        statut = data.get('statut', 'a_faire')
        db = connecter()
        curseur = db.cursor()
        curseur.execute("UPDATE taches SET statut=%s WHERE id=%s", (statut, id))
        db.commit()
        db.close()
        return jsonify({"message": "Statut mis à jour !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/taches/rappels/<int:user_id>', methods=['GET'])
def get_rappels(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT id, titre, deadline, priorite,
                   DATEDIFF(deadline, CURDATE()) AS jours_restants
            FROM taches
            WHERE user_id = %s
              AND terminee = FALSE
              AND deadline IS NOT NULL
              AND deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
            ORDER BY deadline ASC
        """, (user_id,))
        rappels = curseur.fetchall()
        db.close()
        return jsonify({"count": len(rappels), "rappels": rappels})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 🤖 IA
# ============================================

@app.route('/ia/executer', methods=['POST'])
def executer_ia():
    data = request.get_json()
    prompt = data['prompt']
    modele = data.get('modele', 'llama-3.3-70b-versatile')
    tache_id = data.get('tache_id')
    try:
        completion = groq_client.chat.completions.create(
            model=modele,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024
        )
        reponse = completion.choices[0].message.content
        if tache_id:
            db = connecter()
            curseur = db.cursor()
            curseur.execute("UPDATE taches SET terminee=TRUE WHERE id=%s", (tache_id,))
            db.commit()
            db.close()
        return jsonify({"reponse": reponse, "modele": modele, "tache_id": tache_id})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/ia/historique/<int:user_id>', methods=['GET'])
def get_historique(user_id):
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("""
        SELECT h.*, t.titre as tache_titre 
        FROM historique_ia h
        LEFT JOIN taches t ON h.tache_id = t.id
        WHERE h.user_id = %s
        ORDER BY h.created_at DESC
        LIMIT 50
    """, (user_id,))
    historique = curseur.fetchall()
    db.close()
    return jsonify(historique)

@app.route('/ia/historique', methods=['POST'])
def sauvegarder_historique():
    data = request.get_json()
    db = connecter()
    curseur = db.cursor()
    curseur.execute("""
        INSERT INTO historique_ia (user_id, prompt, reponse, modele, tache_id)
        VALUES (%s, %s, %s, %s, %s)
    """, (data['user_id'], data['prompt'], data['reponse'], data['modele'], data.get('tache_id', None)))
    db.commit()
    db.close()
    return jsonify({"message": "Historique sauvegarde !"})

@app.route('/ia/generer-taches', methods=['POST'])
def generer_taches():
    try:
        data = request.get_json(force=True)
        if not data or 'objectif' not in data or 'user_id' not in data:
            return jsonify({"erreur": "objectif et user_id requis"}), 400
        objectif = data['objectif']
        user_id = data['user_id']
        priorite = data.get('priorite', 'moyenne')
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": f'Tu es un assistant de productivité. Objectif : "{objectif}". Génère exactement 5 tâches concrètes. Réponds UNIQUEMENT en JSON valide : ["tache 1","tache 2","tache 3","tache 4","tache 5"]'}],
            max_tokens=300, temperature=0.4
        )
        reponse = completion.choices[0].message.content.strip()
        match = re.search(r'\[.*\]', reponse, re.S)
        if not match:
            raise ValueError("Réponse IA non JSON")
        taches_list = json.loads(match.group())
        if not isinstance(taches_list, list) or len(taches_list) != 5:
            raise ValueError("IA n'a pas généré 5 tâches")
        taches_list = [str(t).strip() for t in taches_list if str(t).strip()]
        db = connecter()
        curseur = db.cursor()
        for titre in taches_list:
            curseur.execute("INSERT INTO taches (titre, priorite, user_id) VALUES (%s, %s, %s)", (titre, priorite, user_id))
        db.commit()
        db.close()
        return jsonify({"taches": taches_list, "message": "5 tâches créées avec succès"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/ia/planifier', methods=['POST'])
def planifier_semaine():
    try:
        data = request.get_json()
        user_id = data['user_id']
        heures_dispo_par_jour = data.get('heures_dispo', 8)
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT id, titre, priorite, deadline, temps_estime,
                   DATEDIFF(deadline, CURDATE()) AS jours_restants
            FROM taches WHERE user_id=%s AND terminee=FALSE
            ORDER BY deadline ASC, priorite DESC
        """, (user_id,))
        taches = curseur.fetchall()
        if not taches:
            return jsonify({"erreur": "Aucune tache a planifier"}), 400
        taches_str = "\n".join([f"- {t['titre']} (priorite: {t['priorite']}, deadline: {t['deadline']}, temps: {t['temps_estime'] or 30} min)" for t in taches])
        completion = groq_client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{"role": "user", "content": f'Planifie ces taches sur 7 jours ({heures_dispo_par_jour}h/jour):\n{taches_str}\nReponds UNIQUEMENT en JSON: {{"planification": [{{"titre": "...", "date": "YYYY-MM-DD", "heure_debut": "HH:MM", "heure_fin": "HH:MM", "raison": "..."}}], "conseil": "..."}}'}],
            max_tokens=1500, temperature=0.3
        )
        reponse = completion.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', reponse, re.S)
        if not match:
            raise ValueError("Reponse IA invalide")
        plan = json.loads(match.group())
        for item in plan.get('planification', []):
            tache = next((t for t in taches if t['titre'] == item['titre']), None)
            if tache:
                curseur.execute("""
                    INSERT INTO planification (user_id, tache_id, date_planifiee, heure_debut, heure_fin, charge_minutes, genere_par_ia)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                """, (user_id, tache['id'], item['date'], item['heure_debut'], item['heure_fin'], tache.get('temps_estime', 30)))
        db.commit()
        db.close()
        return jsonify({"planification": plan['planification'], "conseil": plan.get('conseil', ''), "message": f"{len(plan['planification'])} taches planifiees !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 📋 SOUS-TACHES
# ============================================

@app.route('/taches/<int:tache_id>/sous-taches', methods=['GET'])
def get_sous_taches(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT * FROM sous_taches WHERE tache_id=%s ORDER BY ordre ASC", (tache_id,))
        sous_taches = curseur.fetchall()
        db.close()
        return jsonify(sous_taches)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/taches/<int:tache_id>/sous-taches', methods=['POST'])
def ajouter_sous_tache(tache_id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("INSERT INTO sous_taches (tache_id, titre, ordre) VALUES (%s, %s, %s)", (tache_id, data['titre'], data.get('ordre', 0)))
        db.commit()
        db.close()
        return jsonify({"message": "Sous-tache ajoutee !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/sous-taches/<int:id>', methods=['PUT'])
def terminer_sous_tache(id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("UPDATE sous_taches SET terminee=%s WHERE id=%s", (data['terminee'], id))
        db.commit()
        db.close()
        return jsonify({"message": "Sous-tache mise a jour !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/sous-taches/<int:id>', methods=['DELETE'])
def supprimer_sous_tache(id):
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM sous_taches WHERE id=%s", (id,))
        db.commit()
        db.close()
        return jsonify({"message": "Sous-tache supprimee !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# ⏱️ TEMPS
# ============================================

@app.route('/taches/<int:id>/temps', methods=['PUT'])
def update_temps(id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("UPDATE taches SET temps_estime=%s, temps_reel=%s WHERE id=%s", (data.get('temps_estime'), data.get('temps_reel'), id))
        db.commit()
        db.close()
        return jsonify({"message": "Temps mis a jour !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 📅 PLANIFICATION
# ============================================

@app.route('/planification/<int:user_id>', methods=['GET'])
def get_planification(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT p.*, t.titre, t.priorite, t.temps_estime, t.statut
            FROM planification p
            JOIN taches t ON p.tache_id = t.id
            WHERE p.user_id = %s AND p.date_planifiee >= CURDATE()
            ORDER BY p.date_planifiee ASC, p.heure_debut ASC
        """, (user_id,))
        planification = curseur.fetchall()
        db.close()
        return jsonify(planification)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/planification', methods=['POST'])
def ajouter_planification():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("""
            INSERT INTO planification (user_id, tache_id, date_planifiee, heure_debut, heure_fin, charge_minutes, genere_par_ia)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data['user_id'], data['tache_id'], data['date_planifiee'], data.get('heure_debut'), data.get('heure_fin'), data.get('charge_minutes', 0), data.get('genere_par_ia', False)))
        db.commit()
        db.close()
        return jsonify({"message": "Planification ajoutee !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 🧠 PRIORITE INTELLIGENTE
# ============================================

@app.route('/taches/<int:user_id>/priorite-intelligente', methods=['GET'])
def priorite_intelligente(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT id, titre, priorite, deadline, temps_estime, statut,
                   DATEDIFF(deadline, CURDATE()) AS jours_restants
            FROM taches WHERE user_id=%s AND terminee=FALSE AND deadline IS NOT NULL
            ORDER BY deadline ASC
        """, (user_id,))
        taches = curseur.fetchall()
        for t in taches:
            jours = t['jours_restants'] or 99
            temps = t['temps_estime'] or 30
            prio = {'haute': 3, 'moyenne': 2, 'basse': 1}.get(t['priorite'], 1)
            retard = 1 if jours < 0 else 0
            score = (prio * 3) + (1 / max(jours, 0.5)) * 10 + (temps / 60) + (retard * 20)
            t['score_priorite'] = round(score, 2)
            curseur.execute("UPDATE taches SET score_priorite=%s WHERE id=%s", (score, t['id']))
        db.commit()
        db.close()
        taches.sort(key=lambda x: x['score_priorite'], reverse=True)
        return jsonify(taches)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 📊 CHARGE & ANALYTICS
# ============================================

@app.route('/charge/<int:user_id>', methods=['GET'])
def get_charge(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT date_planifiee, SUM(charge_minutes) as total_minutes, COUNT(*) as nb_taches
            FROM planification WHERE user_id=%s
            AND date_planifiee BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            GROUP BY date_planifiee ORDER BY date_planifiee ASC
        """, (user_id,))
        charge = curseur.fetchall()
        db.close()
        return jsonify(charge)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/analytics/<int:user_id>', methods=['GET'])
def get_analytics(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT COUNT(*) as total FROM taches WHERE user_id=%s", (user_id,))
        total = curseur.fetchone()['total']
        curseur.execute("SELECT COUNT(*) as terminees FROM taches WHERE user_id=%s AND terminee=TRUE", (user_id,))
        terminees = curseur.fetchone()['terminees']
        taux = round((terminees / total * 100), 1) if total > 0 else 0
        curseur.execute("SELECT priorite, COUNT(*) as count FROM taches WHERE user_id=%s GROUP BY priorite", (user_id,))
        priorites = {r['priorite']: r['count'] for r in curseur.fetchall()}
        curseur.execute("""
            SELECT DATE(updated_at) as jour, COUNT(*) as count FROM taches
            WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(updated_at) ORDER BY jour ASC
        """, (user_id,))
        par_jour = curseur.fetchall()
        curseur.execute("SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
        cette_semaine = curseur.fetchone()['count']
        curseur.execute("SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND updated_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
        semaine_precedente = curseur.fetchone()['count']
        curseur.execute("""
            SELECT DATE(created_at) as jour, COUNT(*) as count FROM historique_ia
            WHERE user_id=%s AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at) ORDER BY jour ASC
        """, (user_id,))
        ia_par_jour = curseur.fetchall()
        db.close()
        return jsonify({
            "total": total, "terminees": terminees, "taux_completion": taux,
            "priorites": priorites, "par_jour": par_jour,
            "cette_semaine": cette_semaine, "semaine_precedente": semaine_precedente,
            "ia_par_jour": ia_par_jour,
            "evolution": round(((cette_semaine - semaine_precedente) / max(semaine_precedente, 1)) * 100, 1)
        })
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 👥 COLLABORATION
# ============================================

@app.route('/collaboration/inviter', methods=['POST'])
def inviter_collaborateur():
    try:
        data = request.get_json()
        tache_id = data['tache_id']
        owner_id = data['owner_id']
        email = data['email']
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, nom FROM users WHERE email=%s", (email,))
        collaborateur = curseur.fetchone()
        if not collaborateur:
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        if collaborateur['id'] == owner_id:
            return jsonify({"erreur": "Vous ne pouvez pas vous inviter vous-meme"}), 400
        curseur.execute("SELECT id FROM collaborations WHERE tache_id=%s AND collaborateur_id=%s", (tache_id, collaborateur['id']))
        if curseur.fetchone():
            return jsonify({"erreur": "Deja invite"}), 400
        curseur.execute("INSERT INTO collaborations (tache_id, owner_id, collaborateur_id, statut) VALUES (%s, %s, %s, 'invite')", (tache_id, owner_id, collaborateur['id']))
        db.commit()
        db.close()
        return jsonify({"message": f"{collaborateur['nom']} invite avec succes !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/collaboration/invitations/<int:user_id>', methods=['GET'])
def get_invitations(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT c.*, t.titre as tache_titre, u.nom as owner_nom
            FROM collaborations c JOIN taches t ON c.tache_id = t.id JOIN users u ON c.owner_id = u.id
            WHERE c.collaborateur_id=%s ORDER BY c.created_at DESC
        """, (user_id,))
        invitations = curseur.fetchall()
        db.close()
        return jsonify(invitations)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/collaboration/repondre/<int:id>', methods=['PUT'])
def repondre_invitation(id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("UPDATE collaborations SET statut=%s WHERE id=%s", (data['statut'], id))
        db.commit()
        db.close()
        return jsonify({"message": "Reponse enregistree"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/collaboration/taches/<int:user_id>', methods=['GET'])
def get_taches_partagees(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT t.*, u.nom as owner_nom, c.statut as collab_statut, c.id as collab_id
            FROM collaborations c JOIN taches t ON c.tache_id = t.id JOIN users u ON c.owner_id = u.id
            WHERE c.collaborateur_id=%s AND c.statut='accepte' ORDER BY t.created_at DESC
        """, (user_id,))
        taches = curseur.fetchall()
        db.close()
        return jsonify(taches)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/collaboration/membres/<int:tache_id>', methods=['GET'])
def get_membres(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT c.*, u.nom, u.email FROM collaborations c
            JOIN users u ON c.collaborateur_id = u.id WHERE c.tache_id=%s
        """, (tache_id,))
        membres = curseur.fetchall()
        db.close()
        return jsonify(membres)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 💬 COMMENTAIRES
# ============================================

@app.route('/commentaires/<int:tache_id>', methods=['GET'])
def get_commentaires(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT c.*, u.nom FROM commentaires c
            JOIN users u ON c.user_id = u.id WHERE c.tache_id=%s ORDER BY c.created_at ASC
        """, (tache_id,))
        commentaires = curseur.fetchall()
        db.close()
        return jsonify(commentaires)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/commentaires', methods=['POST'])
def ajouter_commentaire():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("INSERT INTO commentaires (tache_id, user_id, contenu) VALUES (%s, %s, %s)", (data['tache_id'], data['user_id'], data['contenu']))
        db.commit()
        db.close()
        return jsonify({"message": "Commentaire ajoute !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 🔔 PUSH NOTIFICATIONS
# ============================================
from pywebpush import webpush, WebPushException

VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_CLAIMS = {"sub": "mailto:admin@taskflow.app"}

@app.route('/push/vapid-public-key', methods=['GET'])
def get_vapid_public_key():
    return jsonify({"public_key": VAPID_PUBLIC_KEY})

@app.route('/push/subscribe', methods=['POST'])
def subscribe_push():
    try:
        data = request.get_json()
        user_id = data['user_id']
        subscription = json.dumps(data['subscription'])
        db = connecter()
        cursor = db.cursor()
        cursor.execute("DELETE FROM push_subscriptions WHERE user_id = %s", (user_id,))
        cursor.execute("INSERT INTO push_subscriptions (user_id, subscription) VALUES (%s, %s)", (user_id, subscription))
        db.commit()
        cursor.close()
        db.close()
        return jsonify({"message": "Abonnement enregistré !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/push/send-rappels', methods=['POST'])
def send_rappels():
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT t.titre, t.deadline, t.user_id,
                   DATEDIFF(t.deadline, CURDATE()) AS jours_restants
            FROM taches t
            WHERE t.terminee = FALSE
              AND t.deadline IS NOT NULL
              AND t.deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        """)
        taches = cursor.fetchall()

        sent = 0
        for tache in taches:
            # Envoi push notification
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (tache['user_id'],))
            sub = cursor.fetchone()
            if sub:
                subscription = json.loads(sub['subscription'])
                jours = tache['jours_restants']
                msg = "Aujourd'hui !" if jours == 0 else f"Dans {jours} jour(s)"
                try:
                    webpush(
                        subscription_info=subscription,
                        data=json.dumps({
                            "title": f"⏰ Deadline : {tache['titre']}",
                            "body": msg
                        }),
                        vapid_private_key=VAPID_PRIVATE_KEY,
                        vapid_claims=VAPID_CLAIMS
                    )
                    sent += 1
                except WebPushException:
                    pass

            # Envoi Slack si webhook configuré
            cursor.execute("SELECT config FROM integrations WHERE user_id=%s AND type='slack'", (tache['user_id'],))
            slack_row = cursor.fetchone()
            if slack_row:
                slack_config = json.loads(slack_row['config'])
                slack_webhook = slack_config.get('webhook_url')
                if slack_webhook:
                    jours = tache['jours_restants']
                    slack_msg = f"⏰ *Deadline TaskFlow* : {tache['titre']} — {'Aujourd\'hui !' if jours == 0 else f'Dans {jours} jour(s)'}"
                    envoyer_notification_slack(slack_webhook, slack_msg)

        cursor.close()
        db.close()
        return jsonify({"message": f"{sent} notifications envoyées"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 🔗 INTÉGRATIONS
# ============================================

def envoyer_notification_slack(webhook_url, message):
    try:
        http_requests.post(webhook_url, json={"text": message}, timeout=5)
    except Exception as e:
        print(f"Erreur Slack: {e}")

@app.route('/integrations/slack', methods=['GET'])
def get_slack_integration():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"erreur": "user_id requis"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT config FROM integrations WHERE user_id=%s AND type='slack'", (user_id,))
        row = curseur.fetchone()
        db.close()
        if row:
            config = json.loads(row['config'])
            return jsonify({"webhook_url": config.get('webhook_url', '')})
        return jsonify({"webhook_url": ""})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/integrations/slack', methods=['POST'])
def save_slack_integration():
    try:
        data = request.get_json()
        user_id = data['user_id']
        webhook_url = data['webhook_url']
        config = json.dumps({"webhook_url": webhook_url})
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM integrations WHERE user_id=%s AND type='slack'", (user_id,))
        curseur.execute(
            "INSERT INTO integrations (user_id, type, config) VALUES (%s, 'slack', %s)",
            (user_id, config)
        )
        db.commit()
        db.close()
        return jsonify({"message": "Webhook Slack sauvegardé !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)