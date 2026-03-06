import threading
import schedule
import time
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, set_access_cookies, unset_jwt_cookies
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from database import connecter
import hashlib
import os
import json
import re
import secrets
from datetime import timedelta, datetime
from dotenv import load_dotenv
from groq import Groq
from pywebpush import webpush, WebPushException
import requests as http_requests
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail as SGMail

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'taskflow_secret')

# JWT
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'taskflow_jwt_secret')
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_SECURE'] = True
app.config['JWT_COOKIE_SAMESITE'] = 'None'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
jwt = JWTManager(app)

# Rate Limiter
limiter = Limiter(get_remote_address, app=app, default_limits=[], storage_uri="memory://")

CORS(app, origins=["https://chamdaane-a11y.github.io", "https://chamdaane-a11y.github.io/taskflow"], supports_credentials=True, allow_headers=["Content-Type"], methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])

VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_CLAIMS = {"sub": "mailto:chamdaane@gmail.com"}

# ============================================
# 📧 HELPERS EMAIL & SLACK
# ============================================

def envoyer_notification_slack(webhook_url, message):
    try:
        http_requests.post(webhook_url, json={"text": message}, timeout=5)
    except Exception as e:
        print(f"Erreur Slack: {e}")

def envoyer_email(to_email, subject, html_content):
    try:
        message = SGMail(
            from_email=os.getenv('MAIL_DEFAULT_SENDER', 'chamdaane@gmail.com'),
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        sg.send(message)
        return True
    except Exception as e:
        print(f"Erreur email SendGrid: {e}")
        return False

def envoyer_email_verification(email, nom, token):
    lien = f"https://taskflow-production-75c1.up.railway.app/verify-email/{token}"
    html = f"""<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#0f0f13;color:#f0f0f5;padding:40px;border-radius:16px;">
        <h1 style="color:#6c63ff;">TaskFlow</h1>
        <h2>Bonjour {nom} !</h2>
        <p>Merci de vous etre inscrit. Cliquez ci-dessous pour verifier votre email :</p>
        <a href="{lien}" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:20px 0;">
            Verifier mon email
        </a>
        <p style="color:#888;font-size:12px;">Ce lien expire dans 24h.</p>
        <div style="margin-top:24px;padding:14px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:3px solid #6c63ff;">
            <p style="color:#aaa;font-size:12px;margin:0;">Si vous ne trouvez pas cet email, verifiez votre dossier Spams et marquez-le comme Pas un spam pour recevoir nos prochains emails directement.</p>
        </div>
    </div>"""
    threading.Thread(target=envoyer_email, args=(email, "Verifiez votre email TaskFlow", html)).start()

# ============================================
# 🔔 PUSH NOTIFICATIONS HELPERS
# ============================================

def envoyer_push(subscription_json, titre, body, url="/dashboard"):
    try:
        webpush(
            subscription_info=json.loads(subscription_json),
            data=json.dumps({"title": titre, "body": body, "url": url}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        return True
    except WebPushException:
        return False

# ============================================
# ⏰ JOBS AUTOMATIQUES (SCHEDULER)
# ============================================

def job_resume_matin():
    """Résumé quotidien envoyé chaque matin à 8h"""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom,
                COUNT(CASE WHEN t.terminee = FALSE THEN 1 END) as taches_en_cours,
                COUNT(CASE WHEN t.terminee = FALSE AND t.deadline = CURDATE() THEN 1 END) as deadlines_aujourd_hui,
                COUNT(CASE WHEN t.terminee = FALSE AND t.deadline < CURDATE() THEN 1 END) as taches_en_retard,
                COUNT(CASE WHEN t.terminee = TRUE AND DATE(t.updated_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 END) as terminees_hier
            FROM users u
            LEFT JOIN taches t ON u.id = t.user_id
            WHERE u.email_verifie = TRUE
            GROUP BY u.id
        """)
        users = cursor.fetchall()
        for user in users:
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (user['id'],))
            sub = cursor.fetchone()
            if not sub:
                continue
            en_cours = user['taches_en_cours'] or 0
            aujourd_hui = user['deadlines_aujourd_hui'] or 0
            en_retard = user['taches_en_retard'] or 0
            hier = user['terminees_hier'] or 0
            if en_cours == 0:
                continue
            parties = []
            if aujourd_hui > 0:
                parties.append(f"{aujourd_hui} deadline(s) aujourd'hui")
            if en_retard > 0:
                parties.append(f"{en_retard} tâche(s) en retard")
            if hier > 0:
                parties.append(f"{hier} terminée(s) hier")
            if not parties:
                parties.append(f"{en_cours} tâche(s) en cours")
            body = " · ".join(parties)
            envoyer_push(sub['subscription'], f"Bonjour {user['nom']} — Votre journée TaskFlow", body)
        cursor.close()
        db.close()
        print(f"[Résumé matin] OK")
    except Exception as e:
        print(f"[Résumé matin] Erreur: {e}")

def job_rappels_deadline():
    """Rappels pour les tâches dont la deadline est aujourd'hui"""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT t.id, t.titre, t.user_id
            FROM taches t
            WHERE t.terminee = FALSE
            AND t.deadline = CURDATE()
            AND (t.rappel_envoye = FALSE OR t.rappel_envoye IS NULL)
        """)
        taches = cursor.fetchall()
        for tache in taches:
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (tache['user_id'],))
            sub = cursor.fetchone()
            if sub:
                envoyer_push(sub['subscription'],
                    f"Deadline aujourd'hui : {tache['titre']}",
                    "Cette tâche est à rendre aujourd'hui. Ne l'oubliez pas !")
                cursor.execute("UPDATE taches SET rappel_envoye = TRUE WHERE id = %s", (tache['id'],))
        db.commit()
        cursor.close()
        db.close()
        print(f"[Rappels deadline] {len(taches)} rappels envoyés")
    except Exception as e:
        print(f"[Rappels deadline] Erreur: {e}")

def job_taches_en_retard():
    """Notifie les utilisateurs pour leurs tâches en retard"""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id as user_id, u.nom, COUNT(*) as nb_retard
            FROM taches t JOIN users u ON t.user_id = u.id
            WHERE t.terminee = FALSE AND t.deadline < CURDATE() AND t.deadline IS NOT NULL
            GROUP BY u.id
        """)
        users = cursor.fetchall()
        for user in users:
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (user['user_id'],))
            sub = cursor.fetchone()
            if sub:
                nb = user['nb_retard']
                envoyer_push(sub['subscription'],
                    f"{nb} tâche(s) en retard",
                    f"{user['nom']}, rattrapez vos tâches dépassées dès maintenant !")
        cursor.close()
        db.close()
        print(f"[Tâches en retard] OK")
    except Exception as e:
        print(f"[Tâches en retard] Erreur: {e}")

def job_encouragements():
    """Encouragements personnalisés selon la productivité du jour"""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom,
                COUNT(CASE WHEN t.terminee = TRUE AND DATE(t.updated_at) = CURDATE() THEN 1 END) as terminees_auj
            FROM users u
            LEFT JOIN taches t ON u.id = t.user_id
            WHERE u.email_verifie = TRUE
            GROUP BY u.id
            HAVING terminees_auj > 0
        """)
        users = cursor.fetchall()
        messages = [
            (10, "Légendaire !", "10 tâches bouclées aujourd'hui. Vous êtes une machine TaskFlow !"),
            (5,  "Exceptionnel !", "5 tâches terminées ! Vous êtes au sommet de votre productivité."),
            (3,  "En feu !", "3 tâches terminées aujourd'hui. Vous êtes dans la zone !"),
            (1,  "Belle journée !", "Vous avez terminé votre première tâche du jour. Continuez !"),
        ]
        for user in users:
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (user['id'],))
            sub = cursor.fetchone()
            if not sub:
                continue
            n = user['terminees_auj']
            for seuil, titre, body in messages:
                if n >= seuil:
                    envoyer_push(sub['subscription'], titre, body)
                    break
        cursor.close()
        db.close()
        print(f"[Encouragements] OK")
    except Exception as e:
        print(f"[Encouragements] Erreur: {e}")

def demarrer_scheduler():
    """Lance le scheduler en arrière-plan"""
    schedule.every().day.at("08:00").do(job_resume_matin)
    schedule.every().hour.do(job_rappels_deadline)
    schedule.every().day.at("09:00").do(job_taches_en_retard)
    schedule.every(2).hours.do(job_encouragements)
    print("[Scheduler] Démarré ✅")
    while True:
        schedule.run_pending()
        time.sleep(60)

# Démarrage du scheduler en thread
threading.Thread(target=demarrer_scheduler, daemon=True).start()

# ============================================
# 🔐 AUTHENTIFICATION
# ============================================

@app.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.get_json()
        nom = data.get('nom', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        if not nom or not email or not password:
            return jsonify({"erreur": "Tous les champs sont requis"}), 400
        if len(password) < 8:
            return jsonify({"erreur": "Le mot de passe doit contenir au moins 8 caractères"}), 400
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        verification_token = secrets.token_urlsafe(32)
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if curseur.fetchone():
            curseur.close(); db.close()
            return jsonify({"erreur": "Email déjà utilisé !"}), 400
        curseur.execute(
            "INSERT INTO users (nom, email, password, verification_token, email_verifie) VALUES (%s, %s, %s, %s, FALSE)",
            (nom, email, password_hash, verification_token)
        )
        db.commit(); curseur.close(); db.close()
        threading.Thread(target=envoyer_email_verification, args=(email, nom, verification_token)).start()
        return jsonify({"message": "Compte créé ! Vérifiez votre email pour activer votre compte."})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, nom FROM users WHERE verification_token = %s", (token,))
        user = curseur.fetchone()
        if not user:
            db.close()
            return """<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
                <h1 style="color:#e05c5c">Lien invalide ou expiré</h1>
                <a href="https://chamdaane-a11y.github.io/taskflow" style="color:#6c63ff">Retour à TaskFlow</a>
            </body></html>""", 400
        curseur.execute("UPDATE users SET email_verifie=TRUE, verification_token=NULL WHERE id=%s", (user['id'],))
        db.commit(); db.close()
        return """<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
            <h1 style="color:#6c63ff">Email vérifié !</h1>
            <p>Votre compte TaskFlow est maintenant actif.</p>
            <a href="https://chamdaane-a11y.github.io/taskflow" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:20px">
                Se connecter →
            </a>
        </body></html>"""
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
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
            "SELECT id, nom, email, email_verifie, theme FROM users WHERE email = %s AND password = %s",
            (email, password_hash)
        )
        user = curseur.fetchone()
        curseur.close(); db.close()
        if not user:
            return jsonify({"erreur": "Email ou mot de passe incorrect !"}), 401
        if not user.get('email_verifie'):
            return jsonify({"erreur": "Veuillez vérifier votre email avant de vous connecter !", "non_verifie": True}), 403
        access_token = create_access_token(identity=str(user['id']))
        response = make_response(jsonify({
            "message": "Connecté !",
            "user": {"id": user['id'], "nom": user['nom'], "email": user['email'], "theme": user.get('theme', 'dark')}
        }))
        set_access_cookies(response, access_token)
        return response
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({"message": "Déconnecté !"}))
    unset_jwt_cookies(response)
    return response

@app.route('/resend-verification', methods=['POST'])
@limiter.limit("3 per hour")
def resend_verification():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, nom, email_verifie FROM users WHERE email=%s", (email,))
        user = curseur.fetchone()
        if not user:
            db.close()
            return jsonify({"erreur": "Email introuvable"}), 404
        if user['email_verifie']:
            db.close()
            return jsonify({"erreur": "Email déjà vérifié"}), 400
        new_token = secrets.token_urlsafe(32)
        curseur.execute("UPDATE users SET verification_token=%s WHERE email=%s", (new_token, email))
        db.commit(); db.close()
        threading.Thread(target=envoyer_email_verification, args=(email, user['nom'], new_token)).start()
        return jsonify({"message": "Email de vérification renvoyé !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per hour")
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, nom FROM users WHERE email=%s", (email,))
        user = curseur.fetchone()
        if not user:
            db.close()
            return jsonify({"message": "Si cet email existe, un lien a été envoyé."})
        reset_token = secrets.token_urlsafe(32)
        expiry = datetime.now() + timedelta(hours=1)
        curseur.execute("UPDATE users SET reset_token=%s, reset_token_expiry=%s WHERE id=%s", (reset_token, expiry, user['id']))
        db.commit(); db.close()
        lien = f"https://chamdaane-a11y.github.io/taskflow/#/reset-password/{reset_token}"
        html = f"""<div style="font-family:Arial;max-width:500px;margin:auto;background:#0f0f13;color:#f0f0f5;padding:40px;border-radius:16px;">
            <h1 style="color:#6c63ff;">TaskFlow</h1>
            <h2>Bonjour {user['nom']} !</h2>
            <p>Cliquez ci-dessous pour reinitialiser votre mot de passe :</p>
            <a href="{lien}" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:20px 0;">
                Reinitialiser mon mot de passe
            </a>
            <p style="color:#888;font-size:12px;">Ce lien expire dans 1h.</p>
            <div style="margin-top:24px;padding:14px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:3px solid #6c63ff;">
                <p style="color:#aaa;font-size:12px;margin:0;">Si vous ne trouvez pas cet email, verifiez votre dossier Spams.</p>
            </div>
        </div>"""
        threading.Thread(target=envoyer_email, args=(email, "Reinitialisation mot de passe TaskFlow", html)).start()
        return jsonify({"message": "Si cet email existe, un lien a été envoyé."})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token', '')
        password = data.get('password', '').strip()
        if len(password) < 8:
            return jsonify({"erreur": "Le mot de passe doit contenir au moins 8 caractères"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, reset_token_expiry FROM users WHERE reset_token=%s", (token,))
        user = curseur.fetchone()
        if not user:
            db.close()
            return jsonify({"erreur": "Lien invalide ou expiré"}), 400
        if user['reset_token_expiry'] and datetime.now() > user['reset_token_expiry']:
            db.close()
            return jsonify({"erreur": "Lien expiré, demandez un nouveau"}), 400
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        curseur.execute("UPDATE users SET password=%s, reset_token=NULL, reset_token_expiry=NULL WHERE id=%s", (password_hash, user['id']))
        db.commit(); db.close()
        return jsonify({"message": "Mot de passe modifié avec succès !"})
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

@app.route('/users/<int:id>/nom', methods=['PUT'])
def update_nom(id):
    try:
        data = request.get_json()
        nom = data.get('nom', '').strip()
        if not nom:
            return jsonify({"erreur": "Le nom ne peut pas être vide"}), 400
        db = connecter()
        curseur = db.cursor()
        curseur.execute("UPDATE users SET nom=%s WHERE id=%s", (nom, id))
        db.commit(); db.close()
        return jsonify({"message": "Nom mis à jour !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/users/<int:id>/password', methods=['PUT'])
def update_password(id):
    try:
        data = request.get_json()
        ancien = data.get('ancien_password', '').strip()
        nouveau = data.get('nouveau_password', '').strip()
        if not ancien or not nouveau:
            return jsonify({"erreur": "Tous les champs sont requis"}), 400
        if len(nouveau) < 8:
            return jsonify({"erreur": "Le mot de passe doit contenir au moins 8 caractères"}), 400
        ancien_hash = hashlib.sha256(ancien.encode('utf-8')).hexdigest()
        nouveau_hash = hashlib.sha256(nouveau.encode('utf-8')).hexdigest()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM users WHERE id=%s AND password=%s", (id, ancien_hash))
        if not curseur.fetchone():
            db.close()
            return jsonify({"erreur": "Mot de passe actuel incorrect"}), 400
        curseur.execute("UPDATE users SET password=%s WHERE id=%s", (nouveau_hash, id))
        db.commit(); db.close()
        return jsonify({"message": "Mot de passe modifié avec succès !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/users/<int:id>/theme', methods=['PUT'])
def update_theme(id):
    data = request.get_json()
    db = connecter()
    curseur = db.cursor()
    curseur.execute("UPDATE users SET theme=%s WHERE id=%s", (data['theme'], id))
    db.commit(); db.close()
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
    db.commit(); db.close()
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
    db.commit(); db.close()
    return jsonify({"message": "Catégorie ajoutée !"})

@app.route('/categories/<int:id>', methods=['DELETE'])
def supprimer_categorie(id):
    db = connecter()
    curseur = db.cursor()
    curseur.execute("DELETE FROM categories WHERE id=%s", (id,))
    db.commit(); db.close()
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
        FROM taches t LEFT JOIN categories c ON t.categorie_id = c.id
        WHERE t.user_id = %s ORDER BY t.created_at DESC
    """, (user_id,))
    taches = curseur.fetchall()
    for tache in taches:
        curseur.execute("""
            SELECT COUNT(*) as nb_bloquantes FROM dependances d
            JOIN taches t2 ON d.depend_de_id = t2.id
            WHERE d.tache_id = %s AND t2.terminee = FALSE
        """, (tache['id'],))
        tache['bloquee'] = curseur.fetchone()['nb_bloquantes'] > 0
    db.close()
    return jsonify(taches)

@app.route('/taches', methods=['POST'])
def ajouter_tache():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("""
            INSERT INTO taches (titre, priorite, deadline, user_id, categorie_id) VALUES (%s, %s, %s, %s, %s)
        """, (data['titre'], data.get('priorite', 'moyenne'), data.get('deadline'), data['user_id'], data.get('categorie_id')))
        db.commit()
        curseur2 = db.cursor(dictionary=True)
        curseur2.execute("SELECT config FROM integrations WHERE user_id=%s AND type='slack'", (data['user_id'],))
        row = curseur2.fetchone()
        if row:
            config = json.loads(row['config'])
            webhook_url = config.get('webhook_url')
            if webhook_url:
                deadline_str = f" (deadline: {data['deadline']})" if data.get('deadline') else ""
                envoyer_notification_slack(webhook_url, f"Nouvelle tâche TaskFlow : *{data['titre']}*{deadline_str} — Priorité: {data.get('priorite', 'moyenne')}")
        db.close()
        return jsonify({"message": "Tâche ajoutée !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/taches/<int:id>', methods=['PUT'])
def terminer_tache(id):
    data = request.get_json()
    db = connecter()
    curseur = db.cursor(dictionary=True)
    if data.get('terminee'):
        curseur.execute("""
            SELECT COUNT(*) as nb_bloquantes FROM dependances d
            JOIN taches t ON d.depend_de_id = t.id WHERE d.tache_id = %s AND t.terminee = FALSE
        """, (id,))
        if curseur.fetchone()['nb_bloquantes'] > 0:
            db.close()
            return jsonify({"erreur": "Cette tâche est bloquée par des dépendances non terminées"}), 400
    curseur.execute("UPDATE taches SET terminee=%s WHERE id=%s", (data['terminee'], id))
    db.commit(); db.close()
    return jsonify({"message": "Tâche mise à jour !"})

@app.route('/taches/<int:id>', methods=['DELETE'])
def supprimer_tache(id):
    db = connecter()
    curseur = db.cursor()
    curseur.execute("DELETE FROM dependances WHERE tache_id=%s OR depend_de_id=%s", (id, id))
    curseur.execute("DELETE FROM taches WHERE id=%s", (id,))
    db.commit(); db.close()
    return jsonify({"message": "Tâche supprimée !"})

@app.route('/taches/<int:id>/statut', methods=['PATCH'])
def update_statut_tache(id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("UPDATE taches SET statut=%s WHERE id=%s", (data.get('statut', 'a_faire'), id))
        db.commit(); db.close()
        return jsonify({"message": "Statut mis à jour !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/taches/rappels/<int:user_id>', methods=['GET'])
def get_rappels(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT id, titre, deadline, priorite, DATEDIFF(deadline, CURDATE()) AS jours_restants
            FROM taches WHERE user_id = %s AND terminee = FALSE AND deadline IS NOT NULL
            AND deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) ORDER BY deadline ASC
        """, (user_id,))
        rappels = curseur.fetchall()
        db.close()
        return jsonify({"count": len(rappels), "rappels": rappels})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 🔗 DEPENDANCES
# ============================================

@app.route('/taches/<int:tache_id>/dependances', methods=['GET'])
def get_dependances(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT d.id, d.depend_de_id, t.titre as titre_prerequis, t.terminee
            FROM dependances d JOIN taches t ON d.depend_de_id = t.id WHERE d.tache_id = %s
        """, (tache_id,))
        dependances = curseur.fetchall()
        db.close()
        return jsonify(dependances)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/taches/<int:tache_id>/dependances', methods=['POST'])
def ajouter_dependance(tache_id):
    try:
        data = request.get_json()
        depend_de_id = data['depend_de_id']
        if tache_id == depend_de_id:
            return jsonify({"erreur": "Une tâche ne peut pas dépendre d'elle-même"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM dependances WHERE tache_id=%s AND depend_de_id=%s", (tache_id, depend_de_id))
        if curseur.fetchone():
            db.close(); return jsonify({"erreur": "Cette dépendance existe déjà"}), 400
        curseur.execute("SELECT id FROM dependances WHERE tache_id=%s AND depend_de_id=%s", (depend_de_id, tache_id))
        if curseur.fetchone():
            db.close(); return jsonify({"erreur": "Dépendance circulaire détectée"}), 400
        curseur.execute("INSERT INTO dependances (tache_id, depend_de_id) VALUES (%s, %s)", (tache_id, depend_de_id))
        db.commit(); db.close()
        return jsonify({"message": "Dépendance ajoutée !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/dependances/<int:id>', methods=['DELETE'])
def supprimer_dependance(id):
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM dependances WHERE id=%s", (id,))
        db.commit(); db.close()
        return jsonify({"message": "Dépendance supprimée !"})
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
    historique_messages = data.get('messages', [])
    try:
        messages_api = [{"role": "system", "content": "Tu es un assistant de productivité TaskFlow. Tu aides l'utilisateur à gérer ses tâches et à être plus productif. Tu réponds en français."}]
        for msg in historique_messages:
            if msg['role'] == 'user':
                messages_api.append({"role": "user", "content": msg['content']})
            elif msg['role'] == 'ia':
                messages_api.append({"role": "assistant", "content": msg['content']})
        messages_api.append({"role": "user", "content": prompt})
        completion = groq_client.chat.completions.create(model=modele, messages=messages_api, max_tokens=1024)
        reponse = completion.choices[0].message.content
        if tache_id:
            db = connecter()
            curseur = db.cursor()
            curseur.execute("UPDATE taches SET terminee=TRUE WHERE id=%s", (tache_id,))
            db.commit(); db.close()
        return jsonify({"reponse": reponse, "modele": modele, "tache_id": tache_id})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/ia/historique/<int:user_id>', methods=['GET'])
def get_historique(user_id):
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("""
        SELECT h.*, t.titre as tache_titre FROM historique_ia h
        LEFT JOIN taches t ON h.tache_id = t.id WHERE h.user_id = %s
        ORDER BY h.created_at DESC LIMIT 50
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
        INSERT INTO historique_ia (user_id, prompt, reponse, modele, tache_id) VALUES (%s, %s, %s, %s, %s)
    """, (data['user_id'], data['prompt'], data['reponse'], data['modele'], data.get('tache_id')))
    db.commit(); db.close()
    return jsonify({"message": "Historique sauvegarde !"})

@app.route('/ia/generer-taches', methods=['POST'])
def generer_taches():
    try:
        data = request.get_json(force=True)
        if not data or 'objectif' not in data or 'user_id' not in data:
            return jsonify({"erreur": "objectif et user_id requis"}), 400
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": f'Objectif : "{data["objectif"]}". Génère exactement 5 tâches concrètes. Réponds UNIQUEMENT en JSON : ["tache 1","tache 2","tache 3","tache 4","tache 5"]'}],
            max_tokens=300, temperature=0.4
        )
        reponse = completion.choices[0].message.content.strip()
        match = re.search(r'\[.*\]', reponse, re.S)
        if not match: raise ValueError("Réponse IA non JSON")
        taches_list = json.loads(match.group())
        if not isinstance(taches_list, list) or len(taches_list) != 5: raise ValueError("IA n'a pas généré 5 tâches")
        taches_list = [str(t).strip() for t in taches_list if str(t).strip()]
        db = connecter()
        curseur = db.cursor()
        for titre in taches_list:
            curseur.execute("INSERT INTO taches (titre, priorite, user_id) VALUES (%s, %s, %s)", (titre, data.get('priorite', 'moyenne'), data['user_id']))
        db.commit(); db.close()
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
            SELECT id, titre, priorite, deadline, temps_estime, DATEDIFF(deadline, CURDATE()) AS jours_restants
            FROM taches WHERE user_id=%s AND terminee=FALSE ORDER BY deadline ASC, priorite DESC
        """, (user_id,))
        taches = curseur.fetchall()
        if not taches: return jsonify({"erreur": "Aucune tache a planifier"}), 400
        taches_str = "\n".join([f"- {t['titre']} (priorite: {t['priorite']}, deadline: {t['deadline']}, temps: {t['temps_estime'] or 30} min)" for t in taches])
        completion = groq_client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{"role": "user", "content": f'Planifie ces taches sur 7 jours ({heures_dispo_par_jour}h/jour):\n{taches_str}\nReponds UNIQUEMENT en JSON: {{"planification": [{{"titre": "...", "date": "YYYY-MM-DD", "heure_debut": "HH:MM", "heure_fin": "HH:MM", "raison": "..."}}], "conseil": "..."}}'}],
            max_tokens=1500, temperature=0.3
        )
        reponse = completion.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', reponse, re.S)
        if not match: raise ValueError("Reponse IA invalide")
        plan = json.loads(match.group())
        for item in plan.get('planification', []):
            tache = next((t for t in taches if t['titre'] == item['titre']), None)
            if tache:
                curseur.execute("""
                    INSERT INTO planification (user_id, tache_id, date_planifiee, heure_debut, heure_fin, charge_minutes, genere_par_ia)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                """, (user_id, tache['id'], item['date'], item['heure_debut'], item['heure_fin'], tache.get('temps_estime', 30)))
        db.commit(); db.close()
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
        db.commit(); db.close()
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
        db.commit(); db.close()
        return jsonify({"message": "Sous-tache mise a jour !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/sous-taches/<int:id>', methods=['DELETE'])
def supprimer_sous_tache(id):
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM sous_taches WHERE id=%s", (id,))
        db.commit(); db.close()
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
        db.commit(); db.close()
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
            SELECT p.*, t.titre, t.priorite, t.temps_estime, t.statut FROM planification p
            JOIN taches t ON p.tache_id = t.id WHERE p.user_id = %s AND p.date_planifiee >= CURDATE()
            ORDER BY p.date_planifiee ASC, p.heure_debut ASC
        """, (user_id,))
        planification = curseur.fetchall()
        db.close()
        for row in planification:
            for key, value in row.items():
                if hasattr(value, 'total_seconds'): row[key] = str(value)
                elif hasattr(value, 'isoformat'): row[key] = value.isoformat()
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
        db.commit(); db.close()
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
            SELECT id, titre, priorite, deadline, temps_estime, statut, DATEDIFF(deadline, CURDATE()) AS jours_restants
            FROM taches WHERE user_id=%s AND terminee=FALSE AND deadline IS NOT NULL ORDER BY deadline ASC
        """, (user_id,))
        taches = curseur.fetchall()
        for t in taches:
            jours = t['jours_restants'] or 99
            prio = {'haute': 3, 'moyenne': 2, 'basse': 1}.get(t['priorite'], 1)
            score = (prio * 3) + (1 / max(jours, 0.5)) * 10 + ((t['temps_estime'] or 30) / 60) + (20 if jours < 0 else 0)
            t['score_priorite'] = round(score, 2)
            curseur.execute("UPDATE taches SET score_priorite=%s WHERE id=%s", (score, t['id']))
        db.commit(); db.close()
        taches.sort(key=lambda x: x['score_priorite'], reverse=True)
        return jsonify(taches)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 📊 ANALYTICS
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
        jours = request.args.get('jours', 7, type=int)
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
            WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY DATE(updated_at) ORDER BY jour ASC
        """, (user_id, jours))
        par_jour = curseur.fetchall()
        curseur.execute("""
            SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE
            AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        """, (user_id,))
        cette_semaine = curseur.fetchone()['count']
        curseur.execute("""
            SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE
            AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
            AND updated_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        """, (user_id,))
        semaine_precedente = curseur.fetchone()['count']
        curseur.execute("""
            SELECT HOUR(updated_at) as heure, COUNT(*) as count FROM taches
            WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY HOUR(updated_at) ORDER BY heure
        """, (user_id,))
        par_heure = [0] * 24
        for row in curseur.fetchall():
            if row['heure'] is not None: par_heure[row['heure']] = row['count']
        curseur.execute("""
            SELECT DATE(created_at) as jour, COUNT(*) as count FROM historique_ia
            WHERE user_id=%s AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at) ORDER BY jour ASC
        """, (user_id,))
        ia_par_jour = curseur.fetchall()
        evolution = round(((cette_semaine - semaine_precedente) / max(semaine_precedente, 1)) * 100, 1)
        db.close()
        return jsonify({
            "total": total, "terminees": terminees, "taux_completion": taux,
            "priorites": priorites, "par_jour": par_jour,
            "cette_semaine": cette_semaine, "semaine_precedente": semaine_precedente,
            "ia_par_jour": ia_par_jour, "par_heure": par_heure, "evolution": evolution
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
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, nom FROM users WHERE email=%s", (data['email'],))
        collaborateur = curseur.fetchone()
        if not collaborateur: return jsonify({"erreur": "Utilisateur introuvable"}), 404
        if collaborateur['id'] == data['owner_id']: return jsonify({"erreur": "Vous ne pouvez pas vous inviter vous-meme"}), 400
        curseur.execute("SELECT id FROM collaborations WHERE tache_id=%s AND collaborateur_id=%s", (data['tache_id'], collaborateur['id']))
        if curseur.fetchone(): return jsonify({"erreur": "Deja invite"}), 400
        curseur.execute("INSERT INTO collaborations (tache_id, owner_id, collaborateur_id, statut) VALUES (%s, %s, %s, 'invite')", (data['tache_id'], data['owner_id'], collaborateur['id']))
        db.commit(); db.close()
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
        db.commit(); db.close()
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
        db.commit(); db.close()
        return jsonify({"message": "Commentaire ajoute !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# 🔔 PUSH NOTIFICATIONS ROUTES
# ============================================

@app.route('/push/vapid-public-key', methods=['GET'])
def get_vapid_public_key():
    return jsonify({"public_key": VAPID_PUBLIC_KEY})

@app.route('/push/subscribe', methods=['POST'])
def subscribe_push():
    try:
        data = request.get_json()
        subscription = json.dumps(data['subscription'])
        db = connecter()
        cursor = db.cursor()
        cursor.execute("DELETE FROM push_subscriptions WHERE user_id = %s", (data['user_id'],))
        cursor.execute("INSERT INTO push_subscriptions (user_id, subscription) VALUES (%s, %s)", (data['user_id'], subscription))
        db.commit(); cursor.close(); db.close()
        return jsonify({"message": "Abonnement enregistré !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/push/send-rappels', methods=['POST'])
def send_rappels():
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT t.titre, t.deadline, t.user_id, DATEDIFF(t.deadline, CURDATE()) AS jours_restants
            FROM taches t WHERE t.terminee = FALSE AND t.deadline IS NOT NULL
            AND t.deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        """)
        taches = cursor.fetchall()
        sent = 0
        for tache in taches:
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (tache['user_id'],))
            sub = cursor.fetchone()
            if sub:
                jours = tache['jours_restants']
                if envoyer_push(sub['subscription'],
                    f"Deadline : {tache['titre']}",
                    "Aujourd'hui !" if jours == 0 else f"Dans {jours} jour(s)"):
                    sent += 1
        cursor.close(); db.close()
        return jsonify({"message": f"{sent} notifications envoyées"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# Routes de déclenchement manuel (pour tests)
@app.route('/push/resume-matin', methods=['POST'])
def trigger_resume_matin():
    threading.Thread(target=job_resume_matin).start()
    return jsonify({"message": "Résumé matin déclenché !"})

@app.route('/push/rappels-deadline', methods=['POST'])
def trigger_rappels_deadline():
    threading.Thread(target=job_rappels_deadline).start()
    return jsonify({"message": "Rappels deadline déclenchés !"})

@app.route('/push/encouragements', methods=['POST'])
def trigger_encouragements():
    threading.Thread(target=job_encouragements).start()
    return jsonify({"message": "Encouragements déclenchés !"})

# ============================================
# 🔗 INTÉGRATIONS
# ============================================

@app.route('/integrations/slack', methods=['GET'])
def get_slack_integration():
    try:
        user_id = request.args.get('user_id')
        if not user_id: return jsonify({"erreur": "user_id requis"}), 400
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
        config = json.dumps({"webhook_url": data['webhook_url']})
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM integrations WHERE user_id=%s AND type='slack'", (data['user_id'],))
        curseur.execute("INSERT INTO integrations (user_id, type, config) VALUES (%s, 'slack', %s)", (data['user_id'], config))
        db.commit(); db.close()
        return jsonify({"message": "Webhook Slack sauvegardé !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)