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
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'getshift_secret')

# JWT
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'getshift_jwt_secret')
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_SECURE'] = True
app.config['JWT_COOKIE_SAMESITE'] = 'None'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
jwt = JWTManager(app)

# Rate Limiter
limiter = Limiter(get_remote_address, app=app, default_limits=[], storage_uri="memory://")

CORS(app, origins=["https://chamdaane-a11y.github.io", "https://chamdaane-a11y.github.io/taskflow"], supports_credentials=True, allow_headers=["Content-Type"], methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])

# ✅ VAPID : correction du format de la clé privée (sauts de ligne)
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '').replace('\\n', '\n')
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
        <h1 style="color:#6c63ff;">GetShift</h1>
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
    threading.Thread(target=envoyer_email, args=(email, "Verifiez votre email GetShift", html)).start()

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
    except WebPushException as e:
        print(f"[Push] Erreur: {e}")
        return False

# ============================================
# ⏰ JOBS AUTOMATIQUES (SCHEDULER)
# ============================================

def job_resume_matin():
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
            envoyer_push(sub['subscription'], f"Bonjour {user['nom']} — Votre journée GetShift", body)
        cursor.close()
        db.close()
        print("[Résumé matin] OK")
    except Exception as e:
        print(f"[Résumé matin] Erreur: {e}")

def job_rappels_deadline():
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
        print("[Tâches en retard] OK")
    except Exception as e:
        print(f"[Tâches en retard] Erreur: {e}")

def job_encouragements():
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
            (10, "Légendaire !", "10 tâches bouclées aujourd'hui. Vous êtes une machine GetShift !"),
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
        print("[Encouragements] OK")
    except Exception as e:
        print(f"[Encouragements] Erreur: {e}")

# ============================================
# 📧 TEMPLATES HTML EMAILS
# ============================================

def _base_email(contenu_html, titre_preheader="GetShift"):
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{titre_preheader}</title></head>
<body style="margin:0;padding:0;background:#0c0c12;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c12;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:540px;background:#13131e;border-radius:20px;border:1px solid #ffffff0f;overflow:hidden;">
      <!-- Header bande colorée -->
      <tr><td style="background:linear-gradient(135deg,#6c63ff,#a855f7);padding:28px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;">GetShift</span>
            </td>
            <td align="right">
              <span style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:500;letter-spacing:1px;">PRODUCTIVITÉ</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <!-- Contenu -->
      <tr><td style="padding:36px;">
        {contenu_html}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 36px 28px;border-top:1px solid #ffffff08;">
        <p style="margin:0;font-size:11px;color:#44445a;text-align:center;line-height:1.7;">
          Tu reçois cet email car tu as un compte GetShift.<br>
          <a href="https://chamdaane-a11y.github.io/taskflow" style="color:#6c63ff;text-decoration:none;">Ouvrir GetShift</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

def _html_rappel_veille(nom, taches):
    lignes = ""
    for t in taches:
        prio_color = {"haute": "#e05c5c", "moyenne": "#e08a3c", "basse": "#4caf82"}.get(t.get("priorite","moyenne"), "#e08a3c")
        lignes += f"""
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #ffffff08;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><span style="font-size:13px;color:#e8e8f0;font-weight:600;">{t['titre']}</span></td>
              <td align="right"><span style="font-size:11px;font-weight:700;color:{prio_color};background:{prio_color}18;padding:3px 9px;border-radius:99px;">{t.get('priorite','moyenne').upper()}</span></td>
            </tr></table>
          </td>
        </tr>"""
    contenu = f"""
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Rappel · Demain c'est deadline</h2>
    <p style="margin:0 0 24px;font-size:13px;color:#8888a8;line-height:1.7;">Bonjour <strong style="color:#e8e8f0;">{nom}</strong>, tu as <strong style="color:#6c63ff;">{len(taches)} tâche(s)</strong> à rendre demain. Ne laisse rien passer !</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f18;border-radius:12px;border:1px solid #ffffff0a;margin-bottom:24px;overflow:hidden;">
      {lignes}
    </table>
    <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#a855f7);color:white;padding:13px 28px;border-radius:11px;text-decoration:none;font-weight:700;font-size:14px;">
      Ouvrir le Dashboard →
    </a>"""
    return _base_email(contenu, "Rappel deadline demain — GetShift")

def _html_rappel_jour_j(nom, taches):
    lignes = ""
    for t in taches:
        prio_color = {"haute": "#e05c5c", "moyenne": "#e08a3c", "basse": "#4caf82"}.get(t.get("priorite","moyenne"), "#e08a3c")
        lignes += f"""
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #ffffff08;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><span style="font-size:13px;color:#e8e8f0;font-weight:600;">{t['titre']}</span></td>
              <td align="right"><span style="font-size:11px;font-weight:700;color:{prio_color};background:{prio_color}18;padding:3px 9px;border-radius:99px;">{t.get('priorite','moyenne').upper()}</span></td>
            </tr></table>
          </td>
        </tr>"""
    contenu = f"""
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Deadline aujourd'hui</h2>
    <p style="margin:0 0 24px;font-size:13px;color:#8888a8;line-height:1.7;">Bonjour <strong style="color:#e8e8f0;">{nom}</strong>, <strong style="color:#e05c5c;">{len(taches)} tâche(s)</strong> sont à rendre <strong style="color:#e05c5c;">aujourd'hui</strong>. C'est le moment d'agir !</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f18;border-radius:12px;border:1px solid #e05c5c20;margin-bottom:24px;overflow:hidden;">
      {lignes}
    </table>
    <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:inline-block;background:linear-gradient(135deg,#e05c5c,#e08a3c);color:white;padding:13px 28px;border-radius:11px;text-decoration:none;font-weight:700;font-size:14px;">
      Terminer maintenant →
    </a>"""
    return _base_email(contenu, "Deadline aujourd'hui — GetShift")

def _html_taches_retard(nom, taches):
    lignes = ""
    for t in taches:
        jours = t.get("jours_retard", 0)
        lignes += f"""
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #ffffff08;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><span style="font-size:13px;color:#e8e8f0;font-weight:600;">{t['titre']}</span><br>
                  <span style="font-size:11px;color:#e05c5c;">Deadline : {t.get('deadline_str','?')}</span></td>
              <td align="right" style="white-space:nowrap;"><span style="font-size:11px;font-weight:700;color:#e05c5c;background:#e05c5c18;padding:3px 9px;border-radius:99px;">+{jours}j</span></td>
            </tr></table>
          </td>
        </tr>"""
    contenu = f"""
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Tâches en retard</h2>
    <p style="margin:0 0 24px;font-size:13px;color:#8888a8;line-height:1.7;">Bonjour <strong style="color:#e8e8f0;">{nom}</strong>, tu as <strong style="color:#e05c5c;">{len(taches)} tâche(s) en retard</strong>. Rattrape-les dès maintenant pour ne pas perdre le fil.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f18;border-radius:12px;border:1px solid #e05c5c20;margin-bottom:24px;overflow:hidden;">
      {lignes}
    </table>
    <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:inline-block;background:linear-gradient(135deg,#e05c5c,#a855f7);color:white;padding:13px 28px;border-radius:11px;text-decoration:none;font-weight:700;font-size:14px;">
      Rattraper le retard →
    </a>"""
    return _base_email(contenu, "Tâches en retard — GetShift")

def _html_resume_hebdo(nom, stats):
    terminees       = stats.get("terminees", 0)
    en_cours        = stats.get("en_cours", 0)
    en_retard       = stats.get("en_retard", 0)
    taux            = stats.get("taux", 0)
    points          = stats.get("points", 0)
    niveau          = stats.get("niveau", 1)
    points_semaine  = stats.get("points_semaine", 0)
    terminees_prec  = stats.get("terminees_prec", 0)
    conseil_ia      = stats.get("conseil_ia", "")
    taches_haute    = stats.get("taches_haute", [])
    jours_actifs    = stats.get("jours_actifs", {})  # {"Lun":3,"Mar":0,...}

    taux_color  = "#4caf82" if taux >= 70 else "#e08a3c" if taux >= 40 else "#e05c5c"
    barre_w     = max(4, min(100, int(taux)))

    # Comparaison semaine précédente
    diff = terminees - terminees_prec
    diff_color  = "#4caf82" if diff >= 0 else "#e05c5c"
    diff_symbol = "▲" if diff >= 0 else "▼"
    diff_label  = f"{diff_symbol} {abs(diff)} vs semaine précédente"

    # Niveaux labels
    niveaux_labels = {1:"Débutant",2:"Apprenti",3:"Confirmé",4:"Expert",5:"Maître",6:"Légende"}
    niveau_label = niveaux_labels.get(niveau, f"Niveau {niveau}")
    points_prochain = (niveau * 100) - points
    niveau_pct = max(4, min(100, int((points % 100))))

    # Graphique jours actifs (barres HTML)
    jours_ordre = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    max_val = max(jours_actifs.values()) if jours_actifs and max(jours_actifs.values()) > 0 else 1
    barres_html = ""
    for j in jours_ordre:
        val = jours_actifs.get(j, 0)
        h = max(4, int((val / max_val) * 52))
        bar_color = "#6c63ff" if val > 0 else "#ffffff0a"
        barres_html += f"""
        <td style="text-align:center;padding:0 3px;vertical-align:bottom;">
          <div style="font-size:10px;color:#6c63ff;font-weight:700;margin-bottom:4px;">{val if val > 0 else ''}</div>
          <div style="width:100%;height:{h}px;background:{bar_color};border-radius:4px 4px 0 0;min-width:28px;"></div>
          <div style="font-size:10px;color:#44445a;margin-top:5px;">{j}</div>
        </td>"""

    # Tâches haute priorité non terminées
    haute_html = ""
    if taches_haute:
        for t in taches_haute[:5]:
            dl = f" · {t.get('deadline_str','')}" if t.get('deadline_str') else ""
            haute_html += f"""
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #ffffff06;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td><span style="font-size:12px;color:#e8e8f0;font-weight:600;">{t['titre']}</span>
                      <span style="font-size:10px;color:#44445a;">{dl}</span></td>
                  <td align="right" style="white-space:nowrap;">
                    <span style="font-size:10px;font-weight:700;color:#e05c5c;background:#e05c5c15;padding:2px 8px;border-radius:99px;">HAUTE</span>
                  </td>
                </tr></table>
              </td>
            </tr>"""
    else:
        haute_html = '<tr><td style="padding:14px;text-align:center;font-size:12px;color:#44445a;">Aucune tâche haute priorité en suspens —<br><span style="color:#4caf82;font-weight:700;">tout est sous contrôle.</span></td></tr>'

    # Conseil IA
    conseil_block = ""
    if conseil_ia:
        conseil_block = f"""
        <!-- Conseil IA -->
        <div style="background:linear-gradient(135deg,#a855f712,#6c63ff12);border:1px solid #a855f725;border-radius:14px;padding:20px;margin-bottom:20px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:top;">
              <div style="width:32px;height:32px;background:linear-gradient(135deg,#6c63ff,#a855f7);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;"><span style="font-size:13px;font-weight:800;color:white;">IA</span></div>
            </td>
            <td>
              <div style="font-size:11px;font-weight:700;color:#a855f7;letter-spacing:1px;margin-bottom:5px;">CONSEIL IA PERSONNALISÉ</div>
              <div style="font-size:13px;color:#c8c8e8;line-height:1.7;">{conseil_ia}</div>
            </td>
          </tr></table>
        </div>"""

    contenu = f"""
    <!-- En-tête personnalisé -->
    <div style="margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;color:#6c63ff;letter-spacing:1.5px;margin-bottom:8px;">BILAN HEBDOMADAIRE</div>
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.2;">
        Bonjour {nom},<br>
        <span style="color:#8888a8;font-size:18px;font-weight:600;">Voici ta semaine en un coup d'œil.</span>
      </h2>
    </div>

    <!-- KPIs principaux -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="33%" style="padding:0 5px 0 0;">
          <div style="background:#0f0f18;border:1px solid #4caf8222;border-radius:14px;padding:18px 14px;text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#4caf82;letter-spacing:-1px;">{terminees}</div>
            <div style="font-size:11px;color:#8888a8;margin-top:3px;font-weight:500;">Terminées</div>
            <div style="font-size:10px;color:{diff_color};margin-top:5px;font-weight:700;">{diff_label}</div>
          </div>
        </td>
        <td width="33%" style="padding:0 2px;">
          <div style="background:#0f0f18;border:1px solid #6c63ff22;border-radius:14px;padding:18px 14px;text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#6c63ff;letter-spacing:-1px;">{en_cours}</div>
            <div style="font-size:11px;color:#8888a8;margin-top:3px;font-weight:500;">En cours</div>
            <div style="font-size:10px;color:#44445a;margin-top:5px;">À finir</div>
          </div>
        </td>
        <td width="33%" style="padding:0 0 0 5px;">
          <div style="background:#0f0f18;border:1px solid #e05c5c22;border-radius:14px;padding:18px 14px;text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#e05c5c;letter-spacing:-1px;">{en_retard}</div>
            <div style="font-size:11px;color:#8888a8;margin-top:3px;font-weight:500;">En retard</div>
            <div style="font-size:10px;color:#e05c5c;margin-top:5px;">· À traiter</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Taux complétion + barre -->
    <div style="background:#0f0f18;border:1px solid #ffffff0a;border-radius:14px;padding:18px 20px;margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
        <tr>
          <td>
            <span style="font-size:12px;color:#8888a8;font-weight:600;letter-spacing:0.5px;">TAUX DE COMPLÉTION</span>
          </td>
          <td align="right">
            <span style="font-size:20px;font-weight:800;color:{taux_color};">{taux}%</span>
          </td>
        </tr>
      </table>
      <div style="height:8px;background:#ffffff08;border-radius:99px;overflow:hidden;">
        <div style="height:8px;width:{barre_w}%;background:linear-gradient(90deg,{taux_color},{taux_color}aa);border-radius:99px;"></div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#44445a;">
        {"Excellente semaine — continue sur cette lancée." if taux >= 70 else "Bonne progression — encore un effort la semaine prochaine." if taux >= 40 else "Semaine difficile — recentre-toi sur l'essentiel."}
      </div>
    </div>

    <!-- Graphique jours actifs -->
    <div style="background:#0f0f18;border:1px solid #ffffff0a;border-radius:14px;padding:18px 20px;margin-bottom:16px;">
      <div style="font-size:12px;color:#8888a8;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">ACTIVITÉ PAR JOUR</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="vertical-align:bottom;">
          {barres_html}
        </tr>
      </table>
    </div>

    <!-- Badge niveau + points -->
    <div style="background:linear-gradient(135deg,#1a1230,#120f1e);border:1px solid #6c63ff25;border-radius:14px;padding:20px;margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-size:11px;font-weight:700;color:#a855f7;letter-spacing:1px;margin-bottom:4px;">TON NIVEAU</div>
            <div style="font-size:20px;font-weight:800;color:#fff;">{niveau_label}</div>
            <div style="font-size:11px;color:#44445a;margin-top:4px;">{points_prochain} pts pour le niveau suivant</div>
          </td>
          <td align="right" style="vertical-align:middle;">
            <div style="text-align:right;">
              <div style="font-size:11px;color:#8888a8;margin-bottom:2px;">Cette semaine</div>
              <div style="font-size:24px;font-weight:800;color:#6c63ff;">+{points_semaine}</div>
              <div style="font-size:10px;color:#44445a;">points gagnés</div>
            </div>
          </td>
        </tr>
      </table>
      <div style="margin-top:14px;height:5px;background:#ffffff08;border-radius:99px;overflow:hidden;">
        <div style="height:5px;width:{niveau_pct}%;background:linear-gradient(90deg,#6c63ff,#a855f7);border-radius:99px;"></div>
      </div>
    </div>

    <!-- Tâches haute priorité non terminées -->
    <div style="background:#0f0f18;border:1px solid #e05c5c18;border-radius:14px;overflow:hidden;margin-bottom:16px;">
      <div style="padding:14px 18px;border-bottom:1px solid #ffffff06;">
        <span style="font-size:12px;font-weight:700;color:#e05c5c;letter-spacing:0.5px;">PRIORITÉ HAUTE — NON TERMINÉES</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        {haute_html}
      </table>
    </div>

    {conseil_block}

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 6px 0 0;" width="50%">
          <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#6c63ff,#a855f7);color:white;padding:13px 20px;border-radius:11px;text-decoration:none;font-weight:700;font-size:13px;">
            Dashboard →
          </a>
        </td>
        <td style="padding:0 0 0 6px;" width="50%">
          <a href="https://chamdaane-a11y.github.io/taskflow/#/analytics" style="display:block;text-align:center;background:#1a1a28;color:#8888a8;padding:13px 20px;border-radius:11px;text-decoration:none;font-weight:600;font-size:13px;border:1px solid #ffffff0f;">
            Analytics →
          </a>
        </td>
      </tr>
    </table>"""
    return _base_email(contenu, "Bilan hebdomadaire — GetShift")

# ============================================
# 📧 JOBS EMAIL
# ============================================

def job_email_rappel_veille():
    """Envoie un email J-1 à chaque user qui a des deadlines demain."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.email,
                   t.titre, t.priorite
            FROM taches t
            JOIN users u ON t.user_id = u.id
            WHERE t.terminee = FALSE
              AND t.deadline = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
              AND u.email_verifie = TRUE
            ORDER BY u.id, t.priorite DESC
        """)
        rows = cursor.fetchall()
        cursor.close(); db.close()
        # Grouper par user
        from itertools import groupby
        rows.sort(key=lambda r: r['id'])
        for user_id, taches_iter in groupby(rows, key=lambda r: r['id']):
            taches = list(taches_iter)
            u = taches[0]
            html = _html_rappel_veille(u['nom'], taches)
            threading.Thread(target=envoyer_email, args=(u['email'], f"Rappel · Deadline demain : {len(taches)} tâche(s) — GetShift", html)).start()
        print(f"[Email J-1] {len(rows)} emails envoyés")
    except Exception as e:
        print(f"[Email J-1] Erreur: {e}")

def job_email_rappel_jour_j():
    """Envoie un email jour J à chaque user qui a des deadlines aujourd'hui."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.email,
                   t.titre, t.priorite
            FROM taches t
            JOIN users u ON t.user_id = u.id
            WHERE t.terminee = FALSE
              AND t.deadline = CURDATE()
              AND u.email_verifie = TRUE
            ORDER BY u.id, t.priorite DESC
        """)
        rows = cursor.fetchall()
        cursor.close(); db.close()
        from itertools import groupby
        rows.sort(key=lambda r: r['id'])
        for user_id, taches_iter in groupby(rows, key=lambda r: r['id']):
            taches = list(taches_iter)
            u = taches[0]
            html = _html_rappel_jour_j(u['nom'], taches)
            threading.Thread(target=envoyer_email, args=(u['email'], f"Deadline aujourd'hui : {len(taches)} tâche(s) — GetShift", html)).start()
        print(f"[Email Jour J] {len(rows)} emails envoyés")
    except Exception as e:
        print(f"[Email Jour J] Erreur: {e}")

def job_email_taches_retard():
    """Envoie un email aux users qui ont des tâches en retard."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.email,
                   t.titre,
                   t.deadline,
                   DATEDIFF(CURDATE(), t.deadline) as jours_retard
            FROM taches t
            JOIN users u ON t.user_id = u.id
            WHERE t.terminee = FALSE
              AND t.deadline < CURDATE()
              AND t.deadline IS NOT NULL
              AND u.email_verifie = TRUE
            ORDER BY u.id, t.deadline ASC
        """)
        rows = cursor.fetchall()
        cursor.close(); db.close()
        from itertools import groupby
        rows.sort(key=lambda r: r['id'])
        for user_id, taches_iter in groupby(rows, key=lambda r: r['id']):
            taches = list(taches_iter)
            u = taches[0]
            for t in taches:
                if t['deadline']:
                    t['deadline_str'] = t['deadline'].strftime('%d/%m/%Y') if hasattr(t['deadline'], 'strftime') else str(t['deadline'])
            html = _html_taches_retard(u['nom'], taches)
            threading.Thread(target=envoyer_email, args=(u['email'], f"{len(taches)} tâche(s) en retard — GetShift", html)).start()
        print(f"[Email Retard] {len(rows)} emails envoyés")
    except Exception as e:
        print(f"[Email Retard] Erreur: {e}")

def job_email_resume_hebdo():
    """Envoie le bilan hebdo enrichi chaque vendredi soir."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)

        # Stats globales par user
        cursor.execute("""
            SELECT u.id, u.nom, u.email, u.points, u.niveau,
                COUNT(CASE WHEN t.terminee = TRUE AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees,
                COUNT(CASE WHEN t.terminee = TRUE AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                           AND t.updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_prec,
                COUNT(CASE WHEN t.terminee = FALSE THEN 1 END) as en_cours,
                COUNT(CASE WHEN t.terminee = FALSE AND t.deadline < CURDATE() AND t.deadline IS NOT NULL THEN 1 END) as en_retard,
                COUNT(CASE WHEN t.terminee = TRUE AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) * 10 as points_semaine,
                COUNT(t.id) as total
            FROM users u
            LEFT JOIN taches t ON u.id = t.user_id
            WHERE u.email_verifie = TRUE
            GROUP BY u.id
        """)
        users = cursor.fetchall()

        for u in users:
            if u['total'] == 0:
                continue

            user_id = u['id']
            taux = round((u['terminees'] / max(u['total'], 1)) * 100, 0) if u['terminees'] else 0

            # Activité par jour de la semaine (lun→dim)
            cursor.execute("""
                SELECT DAYOFWEEK(updated_at) as dow, COUNT(*) as cnt
                FROM taches
                WHERE user_id = %s AND terminee = TRUE
                  AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DAYOFWEEK(updated_at)
            """, (user_id,))
            dow_map = {r['dow']: r['cnt'] for r in cursor.fetchall()}
            # MySQL: 1=dim, 2=lun, ..., 7=sam
            jours_actifs = {
                "Lun": dow_map.get(2, 0),
                "Mar": dow_map.get(3, 0),
                "Mer": dow_map.get(4, 0),
                "Jeu": dow_map.get(5, 0),
                "Ven": dow_map.get(6, 0),
                "Sam": dow_map.get(7, 0),
                "Dim": dow_map.get(1, 0),
            }

            # Tâches haute priorité non terminées
            cursor.execute("""
                SELECT titre, deadline FROM taches
                WHERE user_id = %s AND terminee = FALSE AND priorite = 'haute'
                ORDER BY deadline ASC LIMIT 5
            """, (user_id,))
            taches_haute_raw = cursor.fetchall()
            taches_haute = []
            for t in taches_haute_raw:
                dl_str = t['deadline'].strftime('%d/%m') if t.get('deadline') and hasattr(t['deadline'], 'strftime') else ""
                taches_haute.append({"titre": t['titre'], "deadline_str": dl_str})

            # Conseil IA généré par Groq
            conseil_ia = ""
            try:
                contexte = f"Utilisateur: {u['nom']}. Cette semaine: {u['terminees']} tâches terminées, {u['en_cours']} en cours, {u['en_retard']} en retard. Taux de complétion: {int(taux)}%. Semaine précédente: {u['terminees_prec']} terminées."
                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{
                        "role": "user",
                        "content": f"{contexte}\n\nDonne un conseil de productivité personnalisé en 2 phrases maximum, bienveillant et actionnable. Réponds uniquement le conseil, sans introduction."
                    }],
                    max_tokens=120, temperature=0.7
                )
                conseil_ia = completion.choices[0].message.content.strip()
            except Exception:
                conseil_ia = "Continue sur ta lancée et concentre-toi sur tes tâches prioritaires la semaine prochaine."

            stats = {
                "terminees":      u['terminees']      or 0,
                "terminees_prec": u['terminees_prec'] or 0,
                "en_cours":       u['en_cours']       or 0,
                "en_retard":      u['en_retard']      or 0,
                "taux":           int(taux),
                "points":         u['points']         or 0,
                "niveau":         u['niveau']         or 1,
                "points_semaine": u['points_semaine'] or 0,
                "jours_actifs":   jours_actifs,
                "taches_haute":   taches_haute,
                "conseil_ia":     conseil_ia,
            }

            html = _html_resume_hebdo(u['nom'], stats)
            threading.Thread(target=envoyer_email, args=(
                u['email'],
                f"Bilan · semaine du {datetime.now().strftime('%d/%m')} — GetShift",
                html
            )).start()

        cursor.close(); db.close()
        print(f"[Email Hebdo] {len(users)} emails envoyés")
    except Exception as e:
        print(f"[Email Hebdo] Erreur: {e}")

def demarrer_scheduler():
    # Push notifications existantes
    schedule.every().day.at("08:00").do(job_resume_matin)
    schedule.every().hour.do(job_rappels_deadline)
    schedule.every().day.at("09:00").do(job_taches_en_retard)
    schedule.every(2).hours.do(job_encouragements)
    # Emails notifications
    schedule.every().day.at("09:00").do(job_email_rappel_veille)   # J-1 chaque matin 9h
    schedule.every().day.at("08:00").do(job_email_rappel_jour_j)   # Jour J chaque matin 8h
    schedule.every().day.at("10:00").do(job_email_taches_retard)   # Retard chaque matin 10h
    schedule.every().friday.at("18:00").do(job_email_resume_hebdo) # Résumé vendredi 18h
    print("[Scheduler] Démarré ✅")
    while True:
        schedule.run_pending()
        time.sleep(60)

threading.Thread(target=demarrer_scheduler, daemon=True).start()

# ============================================
# 🔐 AUTHENTIFICATION
# ============================================

GOOGLE_CLIENT_ID = '149080640376-8t2ah2odllgq6t83795dafhdgrajbh61.apps.googleusercontent.com'

@app.route('/auth/google', methods=['POST'])
@limiter.limit("20 per minute")
def auth_google():
    """Connexion / inscription via Google OAuth — crée le compte si inexistant."""
    try:
        # Flow implicit — google_id envoyé directement depuis userinfo Google
        google_id_direct = request.json.get('google_id')
        credential       = request.json.get('credential')

        if google_id_direct:
            google_id  = google_id_direct
            email      = request.json.get('email', '')
            nom        = request.json.get('nom', email.split('@')[0])
            avatar_url = request.json.get('avatar', '')
        elif credential:
            # Flow credential (id_token)
            idinfo = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
            google_id  = idinfo['sub']
            email      = idinfo['email']
            nom        = idinfo.get('name', email.split('@')[0])
            avatar_url = idinfo.get('picture', '')
        else:
            return jsonify({"erreur": "Token Google manquant"}), 400

        db = connecter()
        cursor = db.cursor(dictionary=True)

        # Chercher user existant par google_id ou email
        cursor.execute("SELECT * FROM users WHERE google_id = %s OR email = %s LIMIT 1", (google_id, email))
        user = cursor.fetchone()

        if user:
            # Mettre à jour google_id si connexion email existante
            if not user.get('google_id'):
                cursor.execute("UPDATE users SET google_id = %s, email_verifie = TRUE WHERE id = %s", (google_id, user['id']))
                db.commit()
            user_id = user['id']
            nom_final = user['nom']
            niveau = user.get('niveau', 1)
            points = user.get('points', 0)
            theme  = user.get('theme', 'dark')
        else:
            # Créer nouveau compte Google
            cursor.execute("""
                INSERT INTO users (nom, email, password, google_id, email_verifie, points, niveau, theme)
                VALUES (%s, %s, %s, %s, TRUE, 0, 1, 'dark')
            """, (nom, email, secrets.token_hex(32), google_id))
            db.commit()
            user_id   = cursor.lastrowid
            nom_final = nom
            niveau    = 1
            points    = 0
            theme     = 'dark'

        cursor.close()
        db.close()

        # Générer JWT
        access_token = create_access_token(identity=str(user_id))
        response = make_response(jsonify({
            "message": "Connexion Google réussie",
            "user": {
                "id": user_id, "nom": nom_final, "email": email,
                "niveau": niveau, "points": points, "theme": theme,
                "avatar": avatar_url
            }
        }))
        set_access_cookies(response, access_token)
        return response, 200

    except ValueError as e:
        return jsonify({"erreur": "Token Google invalide"}), 401
    except Exception as e:
        print(f"[Google OAuth] Erreur: {e}")
        return jsonify({"erreur": "Erreur serveur"}), 500

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
                <a href="https://chamdaane-a11y.github.io/taskflow" style="color:#6c63ff">Retour à GetShift</a>
            </body></html>""", 400
        curseur.execute("UPDATE users SET email_verifie=TRUE, verification_token=NULL WHERE id=%s", (user['id'],))
        db.commit(); db.close()
        return """<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
            <h1 style="color:#6c63ff">Email vérifié !</h1>
            <p>Votre compte GetShift est maintenant actif.</p>
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
            <h1 style="color:#6c63ff;">GetShift</h1>
            <h2>Bonjour {user['nom']} !</h2>
            <p>Cliquez ci-dessous pour reinitialiser votre mot de passe :</p>
            <a href="{lien}" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:20px 0;">
                Reinitialiser mon mot de passe
            </a>
            <p style="color:#888;font-size:12px;">Ce lien expire dans 1h.</p>
        </div>"""
        threading.Thread(target=envoyer_email, args=(email, "Reinitialisation mot de passe GetShift", html)).start()
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
    pts = data['points']
    db = connecter()
    curseur = db.cursor(dictionary=True)

    # Ajouter les points
    curseur.execute("UPDATE users SET points=points+%s WHERE id=%s", (pts, id))
    db.commit()

    # Recalculer le niveau (paliers fixes)
    curseur.execute("SELECT points FROM users WHERE id=%s", (id,))
    user = curseur.fetchone()
    total_pts = user['points']
    paliers = [(1,0),(2,100),(3,250),(4,500),(5,1000),(6,2000),(7,5000),(8,10000)]
    nouveau_niveau = max([n for n, m in paliers if total_pts >= m])
    curseur.execute("UPDATE users SET niveau=%s WHERE id=%s", (nouveau_niveau, id))
    db.commit()

    # Mettre à jour le streak
    curseur.execute("SELECT streak, derniere_activite FROM users WHERE id=%s", (id,))
    u = curseur.fetchone()
    from datetime import date, timedelta
    aujourd_hui = date.today()
    derniere = u['derniere_activite'].date() if u['derniere_activite'] else None
    streak = u['streak'] or 0
    if derniere is None or derniere < aujourd_hui - timedelta(days=1):
        streak = 1
    elif derniere == aujourd_hui - timedelta(days=1):
        streak += 1
    # Si déjà aujourd'hui, streak inchangé
    curseur.execute("UPDATE users SET streak=%s, derniere_activite=%s WHERE id=%s", (streak, aujourd_hui, id))
    db.commit()

    # Vérifier et attribuer les badges
    curseur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=TRUE", (id,))
    nb_terminees = curseur.fetchone()['nb']
    nouveaux_badges = verifier_badges(curseur, db, id, nb_terminees, total_pts, streak)
    db.commit()
    db.close()
    return jsonify({"points": total_pts, "niveau": nouveau_niveau, "streak": streak, "nouveaux_badges": nouveaux_badges})

# ============================================
# 🏆 BADGES
# ============================================

REGLES_BADGES = [
    # Performance
    {"id": "first_task",     "nom": "Premier pas",       "icon": "🌱", "description": "Première tâche terminée",          "condition": lambda t, p, s: t >= 1},
    {"id": "five_tasks",     "nom": "En rythme",         "icon": "🔥", "description": "5 tâches terminées",               "condition": lambda t, p, s: t >= 5},
    {"id": "ten_tasks",      "nom": "Productif",         "icon": "⚡", "description": "10 tâches terminées",              "condition": lambda t, p, s: t >= 10},
    {"id": "fifty_tasks",    "nom": "Machine",           "icon": "🤖", "description": "50 tâches terminées",              "condition": lambda t, p, s: t >= 50},
    {"id": "century",        "nom": "Centurion",         "icon": "💯", "description": "100 tâches terminées",             "condition": lambda t, p, s: t >= 100},
    # Points
    {"id": "pts_100",        "nom": "Débutant",          "icon": "🥉", "description": "100 points gagnés",               "condition": lambda t, p, s: p >= 100},
    {"id": "pts_500",        "nom": "Confirmé",          "icon": "🥈", "description": "500 points gagnés",               "condition": lambda t, p, s: p >= 500},
    {"id": "pts_1000",       "nom": "Expert",            "icon": "🥇", "description": "1000 points gagnés",              "condition": lambda t, p, s: p >= 1000},
    {"id": "pts_5000",       "nom": "Maître",            "icon": "👑", "description": "5000 points gagnés",              "condition": lambda t, p, s: p >= 5000},
    # Streak
    {"id": "streak_3",       "nom": "3 jours de suite",  "icon": "🔥", "description": "Actif 3 jours consécutifs",       "condition": lambda t, p, s: s >= 3},
    {"id": "streak_7",       "nom": "Semaine parfaite",  "icon": "📅", "description": "Actif 7 jours consécutifs",       "condition": lambda t, p, s: s >= 7},
    {"id": "streak_30",      "nom": "Mois de feu",       "icon": "🌟", "description": "Actif 30 jours consécutifs",      "condition": lambda t, p, s: s >= 30},
    # Spéciaux
    {"id": "early_bird",     "nom": "Lève-tôt",          "icon": "🌅", "description": "Tâche terminée avant 8h",        "condition": lambda t, p, s: False},  # Géré séparément
    {"id": "night_owl",      "nom": "Noctambule",        "icon": "🦉", "description": "Tâche terminée après 23h",       "condition": lambda t, p, s: False},  # Géré séparément
    {"id": "speedster",      "nom": "Fulgurant",         "icon": "⚡", "description": "5 tâches terminées en 1 jour",   "condition": lambda t, p, s: False},  # Géré séparément
]

def verifier_badges(curseur, db, user_id, nb_terminees, points_total, streak):
    """Vérifie et attribue les badges manquants. Retourne la liste des nouveaux badges."""
    curseur.execute("SELECT badge_id FROM badges_utilisateurs WHERE user_id=%s", (user_id,))
    deja_obtenus = {r['badge_id'] for r in curseur.fetchall()}
    nouveaux = []
    for regle in REGLES_BADGES:
        if regle['id'] in deja_obtenus:
            continue
        if regle['condition'](nb_terminees, points_total, streak):
            curseur.execute(
                "INSERT INTO badges_utilisateurs (user_id, badge_id) VALUES (%s, %s)",
                (user_id, regle['id'])
            )
            nouveaux.append({"id": regle['id'], "nom": regle['nom'], "icon": regle['icon'], "description": regle['description']})
    return nouveaux

@app.route('/users/<int:id>/badges', methods=['GET'])
def get_badges(id):
    """Retourne tous les badges avec statut obtenu/non obtenu."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT badge_id, obtenu_le FROM badges_utilisateurs WHERE user_id=%s", (id,))
        obtenus = {r['badge_id']: r['obtenu_le'] for r in curseur.fetchall()}
        curseur.execute("SELECT points, streak FROM users WHERE id=%s", (id,))
        user = curseur.fetchone()
        db.close()
        result = []
        for b in REGLES_BADGES:
            result.append({
                "id": b['id'], "nom": b['nom'], "icon": b['icon'],
                "description": b['description'],
                "obtenu": b['id'] in obtenus,
                "obtenu_le": str(obtenus[b['id']]) if b['id'] in obtenus else None
            })
        return jsonify({
            "badges": result,
            "streak": user['streak'] if user else 0,
            "nb_obtenus": len(obtenus),
            "nb_total": len(REGLES_BADGES)
        })
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/users/<int:id>/streak', methods=['GET'])
def get_streak(id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT streak, derniere_activite FROM users WHERE id=%s", (id,))
        user = curseur.fetchone()
        db.close()
        return jsonify({"streak": user['streak'] or 0, "derniere_activite": str(user['derniere_activite']) if user['derniere_activite'] else None})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500



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
        tache_id = curseur.lastrowid
        curseur2 = db.cursor(dictionary=True)
        curseur2.execute("SELECT config FROM integrations WHERE user_id=%s AND type='slack'", (data['user_id'],))
        row = curseur2.fetchone()
        if row:
            config = json.loads(row['config'])
            webhook_url = config.get('webhook_url')
            if webhook_url:
                deadline_str = f" (deadline: {data['deadline']})" if data.get('deadline') else ""
                envoyer_notification_slack(webhook_url, f"Nouvelle tâche GetShift : *{data['titre']}*{deadline_str} — Priorité: {data.get('priorite', 'moyenne')}")
        db.close()
        return jsonify({"message": "Tâche ajoutée !", "id": tache_id})
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
        messages_api = [{"role": "system", "content": "Tu es un assistant de productivité GetShift. Tu aides l'utilisateur à gérer ses tâches et à être plus productif. Tu réponds en français."}]
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

@app.route('/ia/sous-taches-contextuelles', methods=['POST'])
def generer_sous_taches_contextuelles():
    """Génère des sous-tâches contextuelles à partir du titre d'une tâche."""
    try:
        data = request.get_json(force=True)
        titre = data.get('titre', '').strip()
        if not titre:
            return jsonify({"erreur": "Titre requis"}), 400
        prompt = f"""Tu es un assistant de productivité expert.
Analyse cette tâche : "{titre}"
Génère entre 4 et 6 sous-tâches concrètes, actionnables et ordonnées logiquement.
Détecte le type parmi : entretien, voyage, projet, événement, habitude, apprentissage, autre.
Réponds UNIQUEMENT en JSON valide, sans texte autour, sans backticks :
{{"type": "le type détecté", "sous_taches": [{{"titre": "sous-tâche concrète", "priorite": "haute|moyenne|basse"}}], "conseil": "Un conseil court et motivant en 1 phrase"}}"""
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600, temperature=0.4
        )
        reponse = completion.choices[0].message.content.strip()
        reponse = re.sub(r'```json|```', '', reponse).strip()
        match = re.search(r'\{.*\}', reponse, re.S)
        if not match:
            raise ValueError("Réponse IA invalide")
        result = json.loads(match.group())
        return jsonify(result)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

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

# ============================================
# EQUIPES — NOUVEAU SYSTEME COLLABORATION
# ============================================

@app.route('/equipes', methods=['POST'])
def creer_equipe():
    try:
        data = request.get_json()
        import secrets
        code = secrets.token_urlsafe(16)
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute(
            "INSERT INTO equipes (nom, description, code_invitation, createur_id) VALUES (%s, %s, %s, %s)",
            (data['nom'], data.get('description', ''), code, data['user_id'])
        )
        equipe_id = curseur.lastrowid
        curseur.execute("INSERT INTO equipe_membres (equipe_id, user_id, role) VALUES (%s, %s, 'admin')", (equipe_id, data['user_id']))
        db.commit()
        curseur.execute("SELECT * FROM equipes WHERE id=%s", (equipe_id,))
        equipe = curseur.fetchone()
        db.close()
        return jsonify(equipe)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/rejoindre', methods=['POST'])
def rejoindre_equipe():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT * FROM equipes WHERE code_invitation=%s", (data['code'],))
        equipe = curseur.fetchone()
        if not equipe:
            return jsonify({"erreur": "Code invalide"}), 404
        curseur.execute("SELECT id FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe['id'], data['user_id']))
        if curseur.fetchone():
            return jsonify({"erreur": "Deja membre", "equipe": equipe}), 200
        curseur.execute("INSERT INTO equipe_membres (equipe_id, user_id, role) VALUES (%s, %s, 'membre')", (equipe['id'], data['user_id']))
        db.commit()
        db.close()
        return jsonify({"message": f"Vous avez rejoint {equipe['nom']} !", "equipe": equipe})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/user/<int:user_id>', methods=['GET'])
def get_mes_equipes(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT e.*, em.role,
                (SELECT COUNT(*) FROM equipe_membres WHERE equipe_id=e.id) as nb_membres,
                (SELECT COUNT(*) FROM taches_equipe WHERE equipe_id=e.id) as nb_taches,
                u.nom as createur_nom
            FROM equipe_membres em JOIN equipes e ON em.equipe_id=e.id JOIN users u ON e.createur_id=u.id
            WHERE em.user_id=%s ORDER BY e.created_at DESC
        """, (user_id,))
        equipes = curseur.fetchall()
        db.close()
        return jsonify(equipes)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>/membres', methods=['GET'])
def get_membres_equipe(equipe_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT u.id, u.nom, u.email, em.role, em.rejoint_le
            FROM equipe_membres em JOIN users u ON em.user_id=u.id
            WHERE em.equipe_id=%s ORDER BY em.rejoint_le ASC
        """, (equipe_id,))
        membres = curseur.fetchall()
        db.close()
        return jsonify(membres)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>/taches', methods=['GET'])
def get_taches_equipe(equipe_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT te.*, u1.nom as createur_nom, u2.nom as assignee_nom,
                (SELECT COUNT(*) FROM commentaires_tache WHERE tache_id=te.id) as nb_commentaires
            FROM taches_equipe te JOIN users u1 ON te.createur_id=u1.id LEFT JOIN users u2 ON te.assignee_id=u2.id
            WHERE te.equipe_id=%s ORDER BY te.created_at DESC
        """, (equipe_id,))
        taches = curseur.fetchall()
        db.close()
        return jsonify(taches)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/taches', methods=['POST'])
def creer_tache_equipe():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            INSERT INTO taches_equipe (equipe_id, titre, description, priorite, assignee_id, createur_id, deadline)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data['equipe_id'], data['titre'], data.get('description',''), data.get('priorite','moyenne'), data.get('assignee_id'), data['createur_id'], data.get('deadline')))
        tache_id = curseur.lastrowid
        db.commit()
        curseur.execute("""
            SELECT te.*, u1.nom as createur_nom, u2.nom as assignee_nom
            FROM taches_equipe te JOIN users u1 ON te.createur_id=u1.id LEFT JOIN users u2 ON te.assignee_id=u2.id
            WHERE te.id=%s
        """, (tache_id,))
        tache = curseur.fetchone()
        db.close()
        return jsonify(tache)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/taches/<int:tache_id>', methods=['PUT'])
def modifier_tache_equipe(tache_id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        fields, vals = [], []
        for key in ['titre', 'statut', 'priorite', 'assignee_id', 'deadline', 'description']:
            if key in data:
                fields.append(f"{key}=%s")
                vals.append(data[key])
        if fields:
            vals.append(tache_id)
            curseur.execute(f"UPDATE taches_equipe SET {', '.join(fields)} WHERE id=%s", vals)
            db.commit()
        db.close()
        return jsonify({"message": "Tache mise a jour"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/taches/<int:tache_id>/commentaires', methods=['GET'])
def get_commentaires_equipe(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT c.*, u.nom FROM commentaires_tache c JOIN users u ON c.user_id=u.id
            WHERE c.tache_id=%s ORDER BY c.created_at ASC
        """, (tache_id,))
        commentaires = curseur.fetchall()
        db.close()
        return jsonify(commentaires)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/taches/commentaires', methods=['POST'])
def ajouter_commentaire_equipe():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("INSERT INTO commentaires_tache (tache_id, user_id, contenu) VALUES (%s, %s, %s)", (data['tache_id'], data['user_id'], data['contenu']))
        db.commit()
        db.close()
        return jsonify({"message": "Commentaire ajoute"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>', methods=['DELETE'])
def supprimer_equipe(equipe_id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT createur_id FROM equipes WHERE id=%s", (equipe_id,))
        equipe = curseur.fetchone()
        if not equipe or equipe['createur_id'] != data['user_id']:
            return jsonify({"erreur": "Non autorise"}), 403
        curseur.execute("DELETE FROM equipes WHERE id=%s", (equipe_id,))
        db.commit()
        db.close()
        return jsonify({"message": "Equipe supprimee"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# ANCIEN SYSTEME (conserve pour compatibilite)
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
# 📧 ROUTES EMAIL — DÉCLENCHEMENT MANUEL
# ============================================

@app.route('/email/rappel-veille', methods=['POST'])
def trigger_email_rappel_veille():
    threading.Thread(target=job_email_rappel_veille).start()
    return jsonify({"message": "Emails rappel J-1 déclenchés !"})

@app.route('/email/rappel-jour-j', methods=['POST'])
def trigger_email_rappel_jour_j():
    threading.Thread(target=job_email_rappel_jour_j).start()
    return jsonify({"message": "Emails rappel jour J déclenchés !"})

@app.route('/email/taches-retard', methods=['POST'])
def trigger_email_taches_retard():
    threading.Thread(target=job_email_taches_retard).start()
    return jsonify({"message": "Emails tâches en retard déclenchés !"})

@app.route('/email/resume-hebdo', methods=['POST'])
def trigger_email_resume_hebdo():
    threading.Thread(target=job_email_resume_hebdo).start()
    return jsonify({"message": "Emails résumé hebdo déclenchés !"})

@app.route('/email/test/<int:user_id>', methods=['POST'])
def test_email_user(user_id):
    """Envoie un email de test résumé hebdo à un user spécifique."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, nom, email, points, niveau FROM users WHERE id=%s", (user_id,))
        u = cursor.fetchone()
        cursor.close(); db.close()
        if not u:
            return jsonify({"erreur": "User introuvable"}), 404
        # Stats fictives réalistes pour le test
        stats = {
            "terminees": 7, "terminees_prec": 4, "en_cours": 3, "en_retard": 1,
            "taux": 70, "points": u['points'] or 0, "niveau": u['niveau'] or 1,
            "points_semaine": 70,
            "jours_actifs": {"Lun": 2, "Mar": 3, "Mer": 1, "Jeu": 0, "Ven": 1, "Sam": 0, "Dim": 0},
            "taches_haute": [
                {"titre": "Finir le rapport client", "deadline_str": "15/03"},
                {"titre": "Revoir la présentation", "deadline_str": "18/03"},
            ],
            "conseil_ia": "Tu as bien progressé cette semaine avec 7 tâches terminées ! Pour la semaine prochaine, essaie de travailler en blocs de 90 minutes sur tes tâches haute priorité dès le matin."
        }
        html = _html_resume_hebdo(u['nom'], stats)
        envoyer_email(u['email'], "Bilan hebdomadaire [TEST] — GetShift", html)
        return jsonify({"message": f"Email de test envoyé à {u['email']} !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

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
# SPRINT 3 — TEMPLATES COMMUNAUTAIRES
# ============================================

@app.route('/templates/init', methods=['POST'])
def init_templates():
    """Créer la table templates si elle n'existe pas"""
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                titre VARCHAR(200) NOT NULL,
                description TEXT,
                categorie VARCHAR(50) DEFAULT 'autre',
                icone VARCHAR(10) DEFAULT '📋',
                utilisations INT DEFAULT 0,
                cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS template_taches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id INT NOT NULL,
                titre VARCHAR(200) NOT NULL,
                priorite VARCHAR(20) DEFAULT 'moyenne',
                deadline_jours INT DEFAULT NULL,
                ordre INT DEFAULT 0,
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
            )
        """)
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS template_sous_taches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_tache_id INT NOT NULL,
                titre VARCHAR(200) NOT NULL,
                ordre INT DEFAULT 0,
                FOREIGN KEY (template_tache_id) REFERENCES template_taches(id) ON DELETE CASCADE
            )
        """)
        db.commit()

        # Insérer templates par défaut si table vide
        curseur.execute("SELECT COUNT(*) FROM templates")
        count = curseur.fetchone()[0]
        if count == 0:
            templates_defaut = [
                {
                    "user_id": 1,
                    "titre": "Lancer un projet",
                    "description": "Toutes les étapes pour démarrer un nouveau projet de A à Z",
                    "categorie": "projet",
                    "icone": "🚀",
                    "taches": [
                        {"titre": "Définir les objectifs du projet", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Rédiger le cahier des charges", "Identifier les parties prenantes"]},
                        {"titre": "Constituer l'équipe", "priorite": "haute", "deadline_jours": 3, "sous_taches": ["Lister les compétences nécessaires", "Assigner les rôles"]},
                        {"titre": "Planifier le budget", "priorite": "moyenne", "deadline_jours": 5, "sous_taches": ["Estimer les coûts", "Obtenir les validations"]},
                        {"titre": "Créer le planning", "priorite": "moyenne", "deadline_jours": 7, "sous_taches": ["Définir les jalons", "Répartir les tâches"]},
                        {"titre": "Lancer le kick-off", "priorite": "haute", "deadline_jours": 10, "sous_taches": ["Préparer la présentation", "Inviter les parties prenantes"]},
                    ]
                },
                {
                    "user_id": 1,
                    "titre": "Préparer un voyage",
                    "description": "Checklist complète pour organiser votre prochain voyage",
                    "categorie": "voyage",
                    "icone": "✈️",
                    "taches": [
                        {"titre": "Réserver les billets", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Comparer les prix", "Choisir les dates"]},
                        {"titre": "Réserver l'hébergement", "priorite": "haute", "deadline_jours": 3, "sous_taches": ["Rechercher les hôtels", "Lire les avis"]},
                        {"titre": "Préparer les documents", "priorite": "haute", "deadline_jours": 5, "sous_taches": ["Vérifier passeport", "Demander visa si nécessaire"]},
                        {"titre": "Faire la valise", "priorite": "moyenne", "deadline_jours": 14, "sous_taches": ["Liste vêtements", "Médicaments et trousse"]},
                        {"titre": "Organiser le transport local", "priorite": "basse", "deadline_jours": 7, "sous_taches": ["Location voiture", "Transports en commun"]},
                    ]
                },
                {
                    "user_id": 1,
                    "titre": "Routine matinale",
                    "description": "Démarrez chaque journée avec productivité et énergie",
                    "categorie": "habitude",
                    "icone": "🌅",
                    "taches": [
                        {"titre": "Sport / Exercice", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Échauffement 5 min", "Séance 20 min"]},
                        {"titre": "Méditation", "priorite": "moyenne", "deadline_jours": 1, "sous_taches": ["Respiration profonde", "Visualisation"]},
                        {"titre": "Petit-déjeuner sain", "priorite": "moyenne", "deadline_jours": 1, "sous_taches": ["Préparer les ingrédients", "Manger sans écrans"]},
                        {"titre": "Planifier sa journée", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Lister les 3 priorités", "Vérifier le calendrier"]},
                    ]
                },
                {
                    "user_id": 1,
                    "titre": "Apprendre une compétence",
                    "description": "Plan structuré pour acquérir une nouvelle compétence en 30 jours",
                    "categorie": "apprentissage",
                    "icone": "📚",
                    "taches": [
                        {"titre": "Définir l'objectif d'apprentissage", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Niveau cible", "Ressources nécessaires"]},
                        {"titre": "Trouver les ressources", "priorite": "haute", "deadline_jours": 3, "sous_taches": ["Livres / cours en ligne", "Mentors / communautés"]},
                        {"titre": "Créer un planning d'étude", "priorite": "moyenne", "deadline_jours": 5, "sous_taches": ["Sessions quotidiennes", "Révisions hebdomadaires"]},
                        {"titre": "Pratiquer chaque jour", "priorite": "haute", "deadline_jours": 7, "sous_taches": ["Exercices pratiques", "Projets personnels"]},
                        {"titre": "Évaluer les progrès", "priorite": "moyenne", "deadline_jours": 30, "sous_taches": ["Test de niveau", "Ajuster le plan"]},
                    ]
                },
                {
                    "user_id": 1,
                    "titre": "Organiser un événement",
                    "description": "Checklist pour organiser une réunion, fête ou conférence",
                    "categorie": "evenement",
                    "icone": "🎉",
                    "taches": [
                        {"titre": "Définir le concept", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Thème", "Nombre d'invités"]},
                        {"titre": "Choisir la date et le lieu", "priorite": "haute", "deadline_jours": 5, "sous_taches": ["Disponibilités", "Réserver le lieu"]},
                        {"titre": "Envoyer les invitations", "priorite": "moyenne", "deadline_jours": 7, "sous_taches": ["Créer les invitations", "Gérer les RSVP"]},
                        {"titre": "Préparer la logistique", "priorite": "moyenne", "deadline_jours": 10, "sous_taches": ["Traiteur / nourriture", "Décoration"]},
                        {"titre": "Jour J — coordination", "priorite": "haute", "deadline_jours": 14, "sous_taches": ["Arrivée anticipée", "Accueil des invités"]},
                    ]
                },
                {
                    "user_id": 1,
                    "titre": "Recherche d'emploi",
                    "description": "Plan complet pour trouver et décrocher votre prochain emploi",
                    "categorie": "projet",
                    "icone": "💼",
                    "taches": [
                        {"titre": "Mettre à jour le CV", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Expériences récentes", "Compétences clés"]},
                        {"titre": "Rédiger une lettre de motivation type", "priorite": "haute", "deadline_jours": 3, "sous_taches": ["Version générique", "Versions personnalisées"]},
                        {"titre": "Identifier les offres cibles", "priorite": "haute", "deadline_jours": 5, "sous_taches": ["LinkedIn", "Sites spécialisés"]},
                        {"titre": "Préparer les entretiens", "priorite": "haute", "deadline_jours": 7, "sous_taches": ["Questions fréquentes", "Recherche sur les entreprises"]},
                        {"titre": "Relances et suivi", "priorite": "moyenne", "deadline_jours": 14, "sous_taches": ["Tableau de suivi", "Emails de relance"]},
                    ]
                },
            ]

            for tmpl in templates_defaut:
                curseur.execute(
                    "INSERT INTO templates (user_id, titre, description, categorie, icone) VALUES (%s, %s, %s, %s, %s)",
                    (tmpl['user_id'], tmpl['titre'], tmpl['description'], tmpl['categorie'], tmpl['icone'])
                )
                template_id = curseur.lastrowid
                for t in tmpl['taches']:
                    curseur.execute(
                        "INSERT INTO template_taches (template_id, titre, priorite, deadline_jours, ordre) VALUES (%s, %s, %s, %s, %s)",
                        (template_id, t['titre'], t['priorite'], t['deadline_jours'], tmpl['taches'].index(t))
                    )
                    tache_id = curseur.lastrowid
                    for j, st in enumerate(t.get('sous_taches', [])):
                        curseur.execute(
                            "INSERT INTO template_sous_taches (template_tache_id, titre, ordre) VALUES (%s, %s, %s)",
                            (tache_id, st, j)
                        )
            db.commit()

        db.close()
        return jsonify({"message": "Tables templates créées avec succès"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/templates', methods=['GET'])
def get_templates():
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        categorie = request.args.get('categorie', None)
        if categorie:
            curseur.execute("SELECT * FROM templates WHERE categorie=%s ORDER BY utilisations DESC, cree_le DESC", (categorie,))
        else:
            curseur.execute("SELECT * FROM templates ORDER BY utilisations DESC, cree_le DESC")
        templates = curseur.fetchall()
        for tmpl in templates:
            curseur.execute("SELECT * FROM template_taches WHERE template_id=%s ORDER BY ordre", (tmpl['id'],))
            taches = curseur.fetchall()
            for tache in taches:
                curseur.execute("SELECT * FROM template_sous_taches WHERE template_tache_id=%s ORDER BY ordre", (tache['id'],))
                tache['sous_taches'] = curseur.fetchall()
            tmpl['taches'] = taches
            # Auteur
            curseur.execute("SELECT nom FROM users WHERE id=%s", (tmpl['user_id'],))
            auteur = curseur.fetchone()
            tmpl['auteur'] = auteur['nom'] if auteur else 'Anonyme'
        db.close()
        return jsonify(templates)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/templates', methods=['POST'])
def creer_template():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute(
            "INSERT INTO templates (user_id, titre, description, categorie, icone) VALUES (%s, %s, %s, %s, %s)",
            (data['user_id'], data['titre'], data.get('description', ''), data.get('categorie', 'autre'), data.get('icone', '📋'))
        )
        template_id = curseur.lastrowid
        for i, tache in enumerate(data.get('taches', [])):
            curseur.execute(
                "INSERT INTO template_taches (template_id, titre, priorite, deadline_jours, ordre) VALUES (%s, %s, %s, %s, %s)",
                (template_id, tache['titre'], tache.get('priorite', 'moyenne'), tache.get('deadline_jours'), i)
            )
            tache_id = curseur.lastrowid
            for j, st in enumerate(tache.get('sous_taches', [])):
                curseur.execute(
                    "INSERT INTO template_sous_taches (template_tache_id, titre, ordre) VALUES (%s, %s, %s)",
                    (tache_id, st['titre'] if isinstance(st, dict) else st, j)
                )
        db.commit()
        db.close()
        return jsonify({"message": "Template créé", "id": template_id})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/templates/<int:template_id>/utiliser', methods=['POST'])
def utiliser_template(template_id):
    try:
        data = request.get_json()
        user_id = data['user_id']
        date_debut = data.get('date_debut')  # ISO string
        db = connecter()
        curseur = db.cursor(dictionary=True)

        # Charger le template
        curseur.execute("SELECT * FROM templates WHERE id=%s", (template_id,))
        tmpl = curseur.fetchone()
        if not tmpl:
            return jsonify({"erreur": "Template introuvable"}), 404

        curseur.execute("SELECT * FROM template_taches WHERE template_id=%s ORDER BY ordre", (template_id,))
        taches = curseur.fetchall()

        taches_creees = []
        from datetime import datetime, timedelta
        debut = datetime.fromisoformat(date_debut) if date_debut else datetime.now()

        for tache in taches:
            deadline = debut + timedelta(days=tache['deadline_jours'] or 7)
            curseur.execute(
                "INSERT INTO taches (titre, priorite, deadline, user_id) VALUES (%s, %s, %s, %s)",
                (tache['titre'], tache['priorite'], deadline.strftime('%Y-%m-%d %H:%M'), user_id)
            )
            tache_id = curseur.lastrowid

            curseur.execute("SELECT * FROM template_sous_taches WHERE template_tache_id=%s ORDER BY ordre", (tache['id'],))
            sous_taches = curseur.fetchall()
            for j, st in enumerate(sous_taches):
                curseur.execute(
                    "INSERT INTO sous_taches (tache_id, titre, ordre) VALUES (%s, %s, %s)",
                    (tache_id, st['titre'], j)
                )
            taches_creees.append(tache_id)

        # Incrémenter le compteur d'utilisations
        curseur.execute("UPDATE templates SET utilisations=utilisations+1 WHERE id=%s", (template_id,))
        db.commit()
        db.close()
        return jsonify({"message": f"{len(taches_creees)} tâches créées depuis le template", "taches_ids": taches_creees})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/templates/<int:template_id>', methods=['DELETE'])
def supprimer_template(template_id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT user_id FROM templates WHERE id=%s", (template_id,))
        tmpl = curseur.fetchone()
        if not tmpl or tmpl['user_id'] != data['user_id']:
            return jsonify({"erreur": "Non autorisé"}), 403
        curseur.execute("DELETE FROM templates WHERE id=%s", (template_id,))
        db.commit()
        db.close()
        return jsonify({"message": "Template supprimé"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# SPRINT 4 — TOMORROW BUILDER + SMART PLANNING
# ============================================

def calculer_score_energie(user_id, db_cursor):
    """Calcule un score d'énergie 0-100 basé sur l'activité récente"""
    try:
        # Tâches complétées aujourd'hui
        db_cursor.execute("""
            SELECT COUNT(*) as nb FROM taches
            WHERE user_id=%s AND terminee=1
            AND DATE(updated_at) = CURDATE()
        """, (user_id,))
        row = db_cursor.fetchone()
        taches_aujourd_hui = row['nb'] if row else 0

        # Streak
        db_cursor.execute("SELECT streak FROM users WHERE id=%s", (user_id,))
        row = db_cursor.fetchone()
        streak = row['streak'] if row else 0

        # Tâches en retard (drainent l'énergie)
        db_cursor.execute("""
            SELECT COUNT(*) as nb FROM taches
            WHERE user_id=%s AND terminee=0
            AND deadline < NOW()
        """, (user_id,))
        row = db_cursor.fetchone()
        en_retard = row['nb'] if row else 0

        # Score : base 60 + bonus streak + bonus tâches jour - malus retard
        score = 60
        score += min(streak * 3, 20)
        score += min(taches_aujourd_hui * 5, 15)
        score -= min(en_retard * 5, 30)
        return max(10, min(100, score))
    except:
        return 60

def estimer_duree_tache(titre, priorite):
    """Estime la durée d'une tâche en minutes selon son titre et priorité"""
    titre_lower = titre.lower()
    # Mots-clés indiquant des tâches longues
    mots_longs = ['rédiger', 'analyser', 'concevoir', 'développer', 'coder', 'créer', 'préparer', 'planifier', 'rechercher']
    mots_courts = ['appeler', 'email', 'envoyer', 'vérifier', 'lire', 'répondre', 'noter', 'checker']
    mots_moyens = ['réunion', 'meeting', 'réviser', 'corriger', 'mettre à jour', 'organiser']

    duree_base = 45  # défaut
    for mot in mots_longs:
        if mot in titre_lower:
            duree_base = 90
            break
    for mot in mots_courts:
        if mot in titre_lower:
            duree_base = 20
            break
    for mot in mots_moyens:
        if mot in titre_lower:
            duree_base = 60
            break

    # Ajustement par priorité
    if priorite == 'haute':
        duree_base = int(duree_base * 1.3)
    elif priorite == 'basse':
        duree_base = int(duree_base * 0.8)

    return duree_base

def detecter_heure_productive(user_id, db_cursor):
    """Détecte l'heure de pointe productive de l'utilisateur"""
    try:
        db_cursor.execute("""
            SELECT HOUR(updated_at) as heure, COUNT(*) as nb
            FROM taches
            WHERE user_id=%s AND terminee=1
            AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY HOUR(updated_at)
            ORDER BY nb DESC
            LIMIT 1
        """, (user_id,))
        row = db_cursor.fetchone()
        if row:
            return row['heure']
    except:
        pass
    return 9  # défaut : 9h du matin

@app.route('/ia/tomorrow-builder/<int:user_id>', methods=['GET'])
def tomorrow_builder(user_id):
    """Génère le planning optimal du lendemain avec l'IA"""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)

        # 1. Récupérer les tâches actives
        curseur.execute("""
            SELECT id, titre, priorite, deadline
            FROM taches
            WHERE user_id=%s AND terminee=0
            ORDER BY
                CASE priorite WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 ELSE 3 END,
                deadline ASC
            LIMIT 15
        """, (user_id,))
        taches = curseur.fetchall()

        if not taches:
            return jsonify({"erreur": "Aucune tâche active"}), 404

        # 2. Calculer métriques utilisateur
        score_energie = calculer_score_energie(user_id, curseur)
        heure_productive = detecter_heure_productive(user_id, curseur)

        # 3. Enrichir les tâches avec durée estimée
        for t in taches:
            t['duree_estimee'] = estimer_duree_tache(t['titre'], t['priorite'])
            if t['deadline']:
                t['deadline'] = str(t['deadline'])

        # 4. Appel IA pour générer le planning
        from groq import Groq
        client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

        niveau_energie = "élevé" if score_energie >= 70 else "moyen" if score_energie >= 40 else "faible"
        demain = (datetime.now() + timedelta(days=1)).strftime('%A %d %B %Y')

        prompt_taches = "\n".join([
            f"- [{t['priorite'].upper()}] {t['titre']} | Durée estimée: {t['duree_estimee']}min | Deadline: {t.get('deadline', 'non définie')}"
            for t in taches[:10]
        ])

        prompt = f"""Tu es un expert en productivité et planification. Tu dois créer le planning optimal pour demain ({demain}).

PROFIL UTILISATEUR:
- Score d'énergie: {score_energie}/100 (niveau {niveau_energie})
- Heure de pointe productive détectée: {heure_productive}h
- Nombre de tâches actives: {len(taches)}

TÂCHES À PLANIFIER:
{prompt_taches}

RÈGLES DE PLANIFICATION:
- Commencer par les tâches haute priorité pendant l'heure de pointe ({heure_productive}h-{heure_productive+2}h)
- Maximum 6h de travail effectif planifié
- Intercaler des pauses (pause 15min après chaque 90min de travail)
- Si énergie faible: maximum 4h, tâches légères en priorité
- Les quick wins (< 20min) en début ou fin de journée
- Éviter de planifier plus de 3 tâches haute priorité par jour

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{{
  "score_energie": {score_energie},
  "niveau_energie": "{niveau_energie}",
  "heure_productive": {heure_productive},
  "duree_totale_planifiee": <nombre en minutes>,
  "conseil_journee": "<conseil personnalisé en 1-2 phrases>",
  "alerte_burnout": <true ou false>,
  "message_alerte": "<message si alerte_burnout=true, sinon null>",
  "planning": [
    {{
      "ordre": 1,
      "heure_debut": "<ex: 09:00>",
      "heure_fin": "<ex: 10:30>",
      "type": "tache" ou "pause",
      "titre": "<titre de la tâche ou 'Pause'>",
      "priorite": "<haute/moyenne/basse>",
      "duree_minutes": <nombre>,
      "raison_placement": "<pourquoi cette tâche à cette heure>",
      "energie_requise": "<faible/moyenne/élevée>",
      "tips": "<conseil spécifique pour cette tâche>"
    }}
  ],
  "taches_reportees": [
    {{
      "titre": "<titre>",
      "raison": "<pourquoi reportée>"
    }}
  ],
  "resume_global": "<résumé du planning en 2-3 phrases motivantes>"
}}"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.7
        )

        contenu = response.choices[0].message.content.strip()
        # Nettoyer le JSON
        if '```json' in contenu:
            contenu = contenu.split('```json')[1].split('```')[0].strip()
        elif '```' in contenu:
            contenu = contenu.split('```')[1].split('```')[0].strip()

        planning_data = json.loads(contenu)

        # 5. Sauvegarder le planning en base
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS tomorrow_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                planning_json LONGTEXT,
                score_energie INT,
                cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
                date_planifiee DATE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        demain_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        curseur.execute("DELETE FROM tomorrow_plans WHERE user_id=%s AND date_planifiee=%s", (user_id, demain_date))
        curseur.execute(
            "INSERT INTO tomorrow_plans (user_id, planning_json, score_energie, date_planifiee) VALUES (%s, %s, %s, %s)",
            (user_id, json.dumps(planning_data), score_energie, demain_date)
        )
        db.commit()
        db.close()

        return jsonify(planning_data)

    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500


@app.route('/ia/tomorrow-builder/<int:user_id>/saved', methods=['GET'])
def get_saved_planning(user_id):
    """Récupère le dernier planning sauvegardé"""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT * FROM tomorrow_plans
            WHERE user_id=%s
            ORDER BY cree_le DESC LIMIT 1
        """, (user_id,))
        row = curseur.fetchone()
        db.close()
        if row:
            return jsonify({"planning": json.loads(row['planning_json']), "cree_le": str(row['cree_le']), "date_planifiee": str(row['date_planifiee'])})
        return jsonify({"planning": None})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


# ============================================
# SPRINT 5 — TASK DNA
# ============================================

@app.route('/ia/task-dna', methods=['POST'])
def analyser_task_dna():
    """Analyse le DNA d'une tache et predit son succes/abandon"""
    try:
        data = request.get_json()
        titre = data.get('titre', '')
        priorite = data.get('priorite', 'moyenne')
        user_id = data.get('user_id')
        if not titre.strip():
            return jsonify({"erreur": "Titre requis"}), 400

        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute(
            "SELECT titre, priorite, terminee FROM taches WHERE user_id=%s ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        )
        historique = curseur.fetchall()

        total = len(historique)
        terminees = sum(1 for t in historique if t['terminee'])
        taux_global = round((terminees / total * 100)) if total > 0 else 50
        h_p = [t for t in historique if t['priorite'] == priorite]
        taux_priorite = round(sum(1 for t in h_p if t['terminee']) / len(h_p) * 100) if h_p else taux_global
        duree_estimee = estimer_duree_tache(titre, priorite)

        from groq import Groq
        client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

        dernieres = ', '.join([t['titre'][:25] for t in historique[:5]])
        prompt = (
            "Tu es un expert en productivite. Analyse cette tache et genere son Task DNA.\n\n"
            f"TACHE: \"{titre}\" | Priorite: {priorite} | Duree estimee: {duree_estimee}min\n"
            f"HISTORIQUE: Taux completion global: {taux_global}% | Priorite {priorite!r}: {taux_priorite}%\n"
            f"Dernieres taches: {dernieres}\n\n"
            "Reponds UNIQUEMENT en JSON valide:\n"
            "{\n"
            '  \"score_viabilite\": <0-100>,\n'
            '  \"prediction\": \"succes\" ou \"abandon\" ou \"risque\",\n'
            '  \"categorie\": \"<deep_work|communication|routine|projet|quick_win|apprentissage|administratif>\",\n'
            '  \"emoji_categorie\": \"<emoji>\",\n'
            '  \"label_categorie\": \"<nom francais>\",\n'
            f'  \"duree_estimee\": {duree_estimee},\n'
            '  \"duree_label\": \"<ex: 45 min>\",\n'
            '  \"facteurs_succes\": [\"<f1>\", \"<f2>\"],\n'
            '  \"facteurs_risque\": [\"<r1>\", \"<r2>\"],\n'
            '  \"conseil_principal\": \"<conseil 1-2 phrases>\",\n'
            '  \"conseil_reformulation\": \"<titre ameliore ou null>\",\n'
            '  \"niveau_complexite\": \"faible\" ou \"moyenne\" ou \"elevee\",\n'
            '  \"meilleur_moment\": \"<matin|apres-midi|soir>\",\n'
            '  \"explication_score\": \"<explication 1 phrase>\"\n'
            "}"
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800, temperature=0.6
        )
        contenu = response.choices[0].message.content.strip()
        if '```json' in contenu:
            contenu = contenu.split('```json')[1].split('```')[0].strip()
        elif '```' in contenu:
            contenu = contenu.split('```')[1].split('```')[0].strip()
        dna = json.loads(contenu)

        sql_create = (
            "CREATE TABLE IF NOT EXISTS task_dna_analyses ("
            "id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, "
            "titre_tache VARCHAR(200), score_viabilite INT, prediction VARCHAR(20), "
            "categorie VARCHAR(50), dna_json LONGTEXT, "
            "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"
        )
        curseur.execute(sql_create)
        curseur.execute(
            "INSERT INTO task_dna_analyses (user_id, titre_tache, score_viabilite, prediction, categorie, dna_json) VALUES (%s,%s,%s,%s,%s,%s)",
            (user_id, titre, dna.get('score_viabilite'), dna.get('prediction'), dna.get('categorie'), json.dumps(dna))
        )
        db.commit()
        db.close()
        return jsonify(dna)
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500




@app.route('/ia/task-dna/stats/<int:user_id>', methods=['GET'])
def get_dna_stats(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT categorie, COUNT(*) as total, AVG(score_viabilite) as score_moyen FROM task_dna_analyses WHERE user_id=%s GROUP BY categorie ORDER BY total DESC", (user_id,))
        stats = curseur.fetchall()
        curseur.execute("SELECT AVG(score_viabilite) as score_global, COUNT(*) as total_analyses FROM task_dna_analyses WHERE user_id=%s", (user_id,))
        g = curseur.fetchone()
        db.close()
        return jsonify({"stats_par_categorie": stats, "score_global": round(g['score_global'] or 0), "total_analyses": g['total_analyses'] or 0})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/ia/procrastination/<int:user_id>', methods=['GET'])
def analyser_procrastination(user_id):
    """Détecte les tâches procrastinées et génère des alertes"""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT id, titre, priorite, deadline, created_at, updated_at
            FROM taches
            WHERE user_id=%s AND terminee=0
        """, (user_id,))
        taches = curseur.fetchall()
        db.close()

        alertes = []
        for t in taches:
            if not t['updated_at'] or not t['deadline']:
                continue
            updated_at = t['updated_at']
            if updated_at and not isinstance(updated_at, datetime):
                updated_at = datetime.combine(updated_at, datetime.min.time())
            deadline_dt = t['deadline']
            if deadline_dt and not isinstance(deadline_dt, datetime):
                deadline_dt = datetime.combine(deadline_dt, datetime.min.time())
            jours_sans_action = (datetime.now() - updated_at).days if updated_at else 0
            jours_avant_deadline = (deadline_dt - datetime.now()).days if deadline_dt else 999

            score = 0
            if jours_sans_action > 3 and t['priorite'] == 'haute':
                score = 90
            elif jours_sans_action > 5 and t['priorite'] == 'moyenne':
                score = 70
            elif jours_sans_action > 7:
                score = 50

            if score > 0:
                alertes.append({
                    "tache_id": t['id'],
                    "titre": t['titre'],
                    "priorite": t['priorite'],
                    "jours_sans_action": jours_sans_action,
                    "jours_avant_deadline": jours_avant_deadline,
                    "score_procrastination": score,
                    "niveau": "critique" if score >= 80 else "modere"
                })

        alertes.sort(key=lambda x: x['score_procrastination'], reverse=True)
        return jsonify({"alertes": alertes, "total": len(alertes)})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/ia/smart-planning/trigger', methods=['POST'])
def trigger_tomorrow_builder_notif():
    """Déclenché par cron à 19h — envoie notif push Tomorrow Builder"""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM users")
        users = curseur.fetchall()
        db.close()

        envoyes = 0
        for u in users:
            try:
                # Générer le planning (appel interne)
                import requests as req
                req.get(f"http://localhost:{os.environ.get('PORT', 5000)}/ia/tomorrow-builder/{u['id']}", timeout=30)
                envoyes += 1
            except:
                pass

        return jsonify({"message": f"Tomorrow Builder déclenché pour {envoyes} utilisateurs"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


# ============================================
# SPRINT 6 — ACCOUNTABILITY PARTNER AI (COACH)
# ============================================

COACH_STYLES = {
    "bienveillant": {
        "nom": "Alex",
        "emoji": "🤗",
        "description": "Doux, encourageant, toujours positif",
        "persona": "Tu es Alex, un coach bienveillant et empathique. Tu encourages toujours, tu celebres chaque petite victoire, tu utilises un langage chaleureux et positif. Tu ne juges jamais. Tu poses des questions douces pour comprendre les blocages."
    },
    "motivateur": {
        "nom": "Max",
        "emoji": "🔥",
        "description": "Energique, challengeant, pousse à se dépasser",
        "persona": "Tu es Max, un coach motivateur et dynamique. Tu challenges l'utilisateur, tu utilises un langage energique et direct. Tu crois fermement en son potentiel et tu le pousses a se depasser. Tu utilises des metaphores sportives et des appels a l'action forts."
    },
    "analytique": {
        "nom": "Nova",
        "emoji": "📊",
        "description": "Précis, basé sur les données, factuel",
        "persona": "Tu es Nova, un coach analytique et precis. Tu bases tes conseils sur les donnees et les faits. Tu identifies des patterns, tu proposes des strategies concretes et mesurables. Tu es neutre emotionnellement mais tres efficace."
    }
}

def get_coach_context(user_id, curseur):
    """Construit le contexte complet de l'utilisateur pour le coach"""
    # Tâches
    curseur.execute("SELECT COUNT(*) as total FROM taches WHERE user_id=%s", (user_id,))
    total = curseur.fetchone()['total']
    curseur.execute("SELECT COUNT(*) as done FROM taches WHERE user_id=%s AND terminee=1", (user_id,))
    done = curseur.fetchone()['done']
    curseur.execute("SELECT COUNT(*) as retard FROM taches WHERE user_id=%s AND terminee=0 AND deadline < NOW()", (user_id,))
    retard = curseur.fetchone()['retard']
    curseur.execute("SELECT COUNT(*) as actives FROM taches WHERE user_id=%s AND terminee=0", (user_id,))
    actives = curseur.fetchone()['actives']
    # Streak
    curseur.execute("SELECT streak, nom FROM users WHERE id=%s", (user_id,))
    user_row = curseur.fetchone()
    streak = user_row['streak'] if user_row else 0
    prenom = user_row['nom'] if user_row else 'Utilisateur'
    taux = round(done / total * 100) if total > 0 else 0

    return {
        "prenom": prenom,
        "total_taches": total,
        "taches_terminees": done,
        "taches_actives": actives,
        "taches_en_retard": retard,
        "taux_completion": taux,
        "streak": streak
    }

@app.route('/ia/coach/styles', methods=['GET'])
def get_coach_styles():
    styles = []
    for key, val in COACH_STYLES.items():
        styles.append({"id": key, "nom": val["nom"], "emoji": val["emoji"], "description": val["description"]})
    return jsonify({"styles": styles})

@app.route('/ia/coach/chat', methods=['POST'])
def coach_chat():
    """Chat interactif avec le coach IA"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        message = data.get('message', '')
        style = data.get('style', 'bienveillant')
        historique = data.get('historique', [])

        if not message.strip():
            return jsonify({"erreur": "Message vide"}), 400

        coach = COACH_STYLES.get(style, COACH_STYLES['bienveillant'])

        db = connecter()
        curseur = db.cursor(dictionary=True)
        ctx = get_coach_context(user_id, curseur)

        # Sauvegarder message user
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS coach_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                role VARCHAR(10),
                contenu TEXT,
                style_coach VARCHAR(30),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        curseur.execute(
            "INSERT INTO coach_messages (user_id, role, contenu, style_coach) VALUES (%s, %s, %s, %s)",
            (user_id, 'user', message, style)
        )

        from groq import Groq
        client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

        system_prompt = (
            coach['persona'] + "\n\n"
            f"PROFIL DE {ctx['prenom'].upper()}:\n"
            f"- Taches actives: {ctx['taches_actives']} | Terminees: {ctx['taches_terminees']} | En retard: {ctx['taches_en_retard']}\n"
            f"- Taux de completion: {ctx['taux_completion']}%\n"
            f"- Streak actuel: {ctx['streak']} jours\n\n"
            "Reponds en francais, de facon concise (3-5 phrases max). "
            "Tu connais le profil de l'utilisateur et tu t'y referes naturellement. "
            "Ne repete pas les donnees chiffrees a chaque fois, integre-les naturellement."
        )

        messages = [{"role": "system", "content": system_prompt}]
        for h in historique[-6:]:
            messages.append({"role": h['role'], "content": h['contenu']})
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=400,
            temperature=0.8
        )
        reponse = response.choices[0].message.content.strip()

        curseur.execute(
            "INSERT INTO coach_messages (user_id, role, contenu, style_coach) VALUES (%s, %s, %s, %s)",
            (user_id, 'assistant', reponse, style)
        )
        db.commit()
        db.close()

        return jsonify({"reponse": reponse, "coach": {"nom": coach['nom'], "emoji": coach['emoji']}})

    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500


@app.route('/ia/coach/rapport/<int:user_id>', methods=['GET'])
def coach_rapport(user_id):
    """Génère un rapport automatique hebdomadaire du coach"""
    try:
        style = request.args.get('style', 'bienveillant')
        coach = COACH_STYLES.get(style, COACH_STYLES['bienveillant'])

        db = connecter()
        curseur = db.cursor(dictionary=True)
        ctx = get_coach_context(user_id, curseur)

        # Tâches complétées cette semaine
        curseur.execute("""
            SELECT COUNT(*) as nb FROM taches
            WHERE user_id=%s AND terminee=1
            AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, (user_id,))
        terminees_semaine = curseur.fetchone()['nb']

        # Tâches créées cette semaine
        curseur.execute("""
            SELECT COUNT(*) as nb FROM taches
            WHERE user_id=%s AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, (user_id,))
        creees_semaine = curseur.fetchone()['nb']

        from groq import Groq
        client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

        prompt = (
            coach['persona'] + "\n\n"
            f"Genere un rapport de coaching hebdomadaire pour {ctx['prenom']}.\n\n"
            f"DONNEES DE LA SEMAINE:\n"
            f"- Taches completees: {terminees_semaine}\n"
            f"- Taches creees: {creees_semaine}\n"
            f"- Taches en retard: {ctx['taches_en_retard']}\n"
            f"- Taux completion global: {ctx['taux_completion']}%\n"
            f"- Streak: {ctx['streak']} jours\n\n"
            "Reponds en JSON valide:\n"
            '{"titre": "<titre motivant>", '
            '"note_semaine": <1-10>, '
            '"resume": "<resume 2-3 phrases>", '
            '"point_fort": "<meilleur point de la semaine>", '
            '"point_amelioration": "<un axe d amelioration>", '
            '"defi_semaine_prochaine": "<un defi concret et mesurable>", '
            '"message_coach": "<message personnalise 2-3 phrases dans le style du coach>"}'
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600, temperature=0.75
        )
        contenu = response.choices[0].message.content.strip()
        if '```json' in contenu:
            contenu = contenu.split('```json')[1].split('```')[0].strip()
        elif '```' in contenu:
            contenu = contenu.split('```')[1].split('```')[0].strip()

        rapport = json.loads(contenu)
        rapport['coach'] = {"nom": coach['nom'], "emoji": coach['emoji'], "style": style}
        rapport['stats'] = {
            "terminees_semaine": terminees_semaine,
            "creees_semaine": creees_semaine,
            "taux_completion": ctx['taux_completion'],
            "streak": ctx['streak']
        }

        db.close()
        return jsonify(rapport)

    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500


@app.route('/ia/coach/historique/<int:user_id>', methods=['GET'])
def get_coach_historique(user_id):
    """Récupère l'historique des messages coach"""
    try:
        style = request.args.get('style', 'bienveillant')
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT role, contenu, created_at FROM coach_messages
            WHERE user_id=%s AND style_coach=%s
            ORDER BY created_at DESC LIMIT 20
        """, (user_id, style))
        messages = curseur.fetchall()
        db.close()
        for m in messages:
            m['created_at'] = str(m['created_at'])
        return jsonify({"messages": list(reversed(messages))})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)