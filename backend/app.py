import threading
import schedule
import time
import urllib.parse
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

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'getshift_jwt_secret')
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_SECURE'] = True
app.config['JWT_COOKIE_SAMESITE'] = 'None'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
jwt = JWTManager(app)

limiter = Limiter(get_remote_address, app=app, default_limits=[], storage_uri="memory://")

CORS(app, origins=["https://chamdaane-a11y.github.io", "https://chamdaane-a11y.github.io/taskflow"], supports_credentials=True, allow_headers=["Content-Type"], methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])

VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '').replace('\\n', '\n')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_CLAIMS = {"sub": "mailto:chamdaane@gmail.com"}

# ============================================
# HELPERS EMAIL & SLACK
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
    lien = f"https://getshift-backend.onrender.com/verify-email/{token}"
    html = f"""<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#0f0f13;color:#f0f0f5;padding:40px;border-radius:16px;">
        <h1 style="color:#6c63ff;">GetShift</h1>
        <h2>Bonjour {nom} !</h2>
        <p>Merci de vous etre inscrit. Cliquez ci-dessous pour verifier votre email :</p>
        <a href="{lien}" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:20px 0;">
            Verifier mon email
        </a>
        <p style="color:#888;font-size:12px;">Ce lien expire dans 24h.</p>
    </div>"""
    threading.Thread(target=envoyer_email, args=(email, "Verifiez votre email GetShift", html)).start()

# ============================================
# PUSH NOTIFICATIONS
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
# JOBS AUTOMATIQUES (SCHEDULER)
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
            SELECT t.id, t.titre, t.user_id FROM taches t
            WHERE t.terminee = FALSE AND t.deadline = CURDATE()
            AND (t.rappel_envoye = FALSE OR t.rappel_envoye IS NULL)
        """)
        taches = cursor.fetchall()
        for tache in taches:
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (tache['user_id'],))
            sub = cursor.fetchone()
            if sub:
                envoyer_push(sub['subscription'], f"Deadline aujourd'hui : {tache['titre']}", "Cette tâche est à rendre aujourd'hui !")
                cursor.execute("UPDATE taches SET rappel_envoye = TRUE WHERE id = %s", (tache['id'],))
        db.commit()
        cursor.close()
        db.close()
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
                envoyer_push(sub['subscription'], f"{user['nb_retard']} tâche(s) en retard", f"{user['nom']}, rattrapez vos tâches dépassées !")
        cursor.close()
        db.close()
    except Exception as e:
        print(f"[Tâches en retard] Erreur: {e}")

def job_encouragements():
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom,
                COUNT(CASE WHEN t.terminee = TRUE AND DATE(t.updated_at) = CURDATE() THEN 1 END) as terminees_auj
            FROM users u LEFT JOIN taches t ON u.id = t.user_id
            WHERE u.email_verifie = TRUE GROUP BY u.id HAVING terminees_auj > 0
        """)
        users = cursor.fetchall()
        messages = [
            (10, "Légendaire !", "10 tâches bouclées aujourd'hui !"),
            (5,  "Exceptionnel !", "5 tâches terminées !"),
            (3,  "En feu !", "3 tâches terminées aujourd'hui !"),
            (1,  "Belle journée !", "Première tâche du jour terminée !"),
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
    except Exception as e:
        print(f"[Encouragements] Erreur: {e}")

# ============================================
# TEMPLATES HTML EMAILS
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
      <tr><td style="background:linear-gradient(135deg,#6c63ff,#a855f7);padding:28px 36px;">
        <span style="font-size:20px;font-weight:800;color:white;">GetShift</span>
      </td></tr>
      <tr><td style="padding:36px;">{contenu_html}</td></tr>
      <tr><td style="padding:20px 36px 28px;border-top:1px solid #ffffff08;">
        <p style="margin:0;font-size:11px;color:#44445a;text-align:center;">
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
        lignes += f'<tr><td style="padding:12px 14px;border-bottom:1px solid #ffffff08;"><span style="color:#e8e8f0;font-weight:600;">{t["titre"]}</span><span style="color:{prio_color};margin-left:8px;">{t.get("priorite","moyenne").upper()}</span></td></tr>'
    contenu = f"""<h2 style="color:#fff;">Rappel · Demain c'est deadline</h2>
    <p style="color:#8888a8;">Bonjour <strong style="color:#e8e8f0;">{nom}</strong>, tu as <strong style="color:#6c63ff;">{len(taches)} tâche(s)</strong> à rendre demain.</p>
    <table width="100%" style="background:#0f0f18;border-radius:12px;border:1px solid #ffffff0a;margin-bottom:24px;">{lignes}</table>
    <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#a855f7);color:white;padding:13px 28px;border-radius:11px;text-decoration:none;font-weight:700;">Ouvrir le Dashboard →</a>"""
    return _base_email(contenu, "Rappel deadline demain — GetShift")

def _html_rappel_jour_j(nom, taches):
    lignes = ""
    for t in taches:
        prio_color = {"haute": "#e05c5c", "moyenne": "#e08a3c", "basse": "#4caf82"}.get(t.get("priorite","moyenne"), "#e08a3c")
        lignes += f'<tr><td style="padding:12px 14px;border-bottom:1px solid #ffffff08;"><span style="color:#e8e8f0;font-weight:600;">{t["titre"]}</span></td></tr>'
    contenu = f"""<h2 style="color:#fff;">Deadline aujourd'hui</h2>
    <p style="color:#8888a8;">Bonjour <strong>{nom}</strong>, <strong style="color:#e05c5c;">{len(taches)} tâche(s)</strong> sont à rendre aujourd'hui.</p>
    <table width="100%" style="background:#0f0f18;border-radius:12px;margin-bottom:24px;">{lignes}</table>
    <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:inline-block;background:linear-gradient(135deg,#e05c5c,#e08a3c);color:white;padding:13px 28px;border-radius:11px;text-decoration:none;font-weight:700;">Terminer maintenant →</a>"""
    return _base_email(contenu, "Deadline aujourd'hui — GetShift")

def _html_taches_retard(nom, taches):
    lignes = ""
    for t in taches:
        jours = t.get("jours_retard", 0)
        lignes += f'<tr><td style="padding:12px 14px;border-bottom:1px solid #ffffff08;"><span style="color:#e8e8f0;font-weight:600;">{t["titre"]}</span><span style="color:#e05c5c;margin-left:8px;">+{jours}j</span></td></tr>'
    contenu = f"""<h2 style="color:#fff;">Tâches en retard</h2>
    <p style="color:#8888a8;">Bonjour <strong>{nom}</strong>, tu as <strong style="color:#e05c5c;">{len(taches)} tâche(s) en retard</strong>.</p>
    <table width="100%" style="background:#0f0f18;border-radius:12px;margin-bottom:24px;">{lignes}</table>
    <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:inline-block;background:linear-gradient(135deg,#e05c5c,#a855f7);color:white;padding:13px 28px;border-radius:11px;text-decoration:none;font-weight:700;">Rattraper le retard →</a>"""
    return _base_email(contenu, "Tâches en retard — GetShift")

def _html_resume_hebdo(nom, stats):
    terminees = stats.get("terminees", 0)
    en_cours = stats.get("en_cours", 0)
    en_retard = stats.get("en_retard", 0)
    taux = stats.get("taux", 0)
    points = stats.get("points", 0)
    niveau = stats.get("niveau", 1)
    points_semaine = stats.get("points_semaine", 0)
    terminees_prec = stats.get("terminees_prec", 0)
    conseil_ia = stats.get("conseil_ia", "")
    taches_haute = stats.get("taches_haute", [])
    jours_actifs = stats.get("jours_actifs", {})

    taux_color = "#4caf82" if taux >= 70 else "#e08a3c" if taux >= 40 else "#e05c5c"
    barre_w = max(4, min(100, int(taux)))
    diff = terminees - terminees_prec
    diff_color = "#4caf82" if diff >= 0 else "#e05c5c"
    diff_label = f"{'▲' if diff >= 0 else '▼'} {abs(diff)} vs semaine précédente"
    niveaux_labels = {1:"Débutant",2:"Apprenti",3:"Confirmé",4:"Expert",5:"Maître",6:"Légende"}
    niveau_label = niveaux_labels.get(niveau, f"Niveau {niveau}")

    contenu = f"""
    <h2 style="color:#fff;margin:0 0 20px;">Bonjour {nom}, voici ta semaine.</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="33%" style="padding:0 5px 0 0;"><div style="background:#0f0f18;border:1px solid #4caf8222;border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;font-weight:800;color:#4caf82;">{terminees}</div>
          <div style="font-size:11px;color:#8888a8;">Terminées</div>
          <div style="font-size:10px;color:{diff_color};">{diff_label}</div>
        </div></td>
        <td width="33%" style="padding:0 2px;"><div style="background:#0f0f18;border:1px solid #6c63ff22;border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;font-weight:800;color:#6c63ff;">{en_cours}</div>
          <div style="font-size:11px;color:#8888a8;">En cours</div>
        </div></td>
        <td width="33%" style="padding:0 0 0 5px;"><div style="background:#0f0f18;border:1px solid #e05c5c22;border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;font-weight:800;color:#e05c5c;">{en_retard}</div>
          <div style="font-size:11px;color:#8888a8;">En retard</div>
        </div></td>
      </tr>
    </table>
    <div style="background:#0f0f18;border-radius:14px;padding:18px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="color:#8888a8;">TAUX DE COMPLÉTION</span>
        <span style="font-size:20px;font-weight:800;color:{taux_color};">{taux}%</span>
      </div>
      <div style="height:8px;background:#ffffff08;border-radius:99px;">
        <div style="height:8px;width:{barre_w}%;background:{taux_color};border-radius:99px;"></div>
      </div>
    </div>
    {"<div style='background:linear-gradient(135deg,#a855f712,#6c63ff12);border:1px solid #a855f725;border-radius:14px;padding:20px;margin-bottom:16px;'><div style='font-size:11px;font-weight:700;color:#a855f7;margin-bottom:5px;'>CONSEIL IA</div><div style='font-size:13px;color:#c8c8e8;'>" + conseil_ia + "</div></div>" if conseil_ia else ""}
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 6px 0 0;" width="50%">
          <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#6c63ff,#a855f7);color:white;padding:13px;border-radius:11px;text-decoration:none;font-weight:700;">Dashboard →</a>
        </td>
        <td style="padding:0 0 0 6px;" width="50%">
          <a href="https://chamdaane-a11y.github.io/taskflow/#/analytics" style="display:block;text-align:center;background:#1a1a28;color:#8888a8;padding:13px;border-radius:11px;text-decoration:none;font-weight:600;border:1px solid #ffffff0f;">Analytics →</a>
        </td>
      </tr>
    </table>"""
    return _base_email(contenu, "Bilan hebdomadaire — GetShift")

# ============================================
# JOBS EMAIL
# ============================================

def job_email_rappel_veille():
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.email, t.titre, t.priorite
            FROM taches t JOIN users u ON t.user_id = u.id
            WHERE t.terminee = FALSE AND t.deadline = DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND u.email_verifie = TRUE
            ORDER BY u.id, t.priorite DESC
        """)
        rows = cursor.fetchall()
        cursor.close(); db.close()
        from itertools import groupby
        rows.sort(key=lambda r: r['id'])
        for user_id, taches_iter in groupby(rows, key=lambda r: r['id']):
            taches = list(taches_iter)
            u = taches[0]
            html = _html_rappel_veille(u['nom'], taches)
            threading.Thread(target=envoyer_email, args=(u['email'], f"Rappel · Deadline demain : {len(taches)} tâche(s) — GetShift", html)).start()
    except Exception as e:
        print(f"[Email J-1] Erreur: {e}")

def job_email_rappel_jour_j():
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.email, t.titre, t.priorite
            FROM taches t JOIN users u ON t.user_id = u.id
            WHERE t.terminee = FALSE AND t.deadline = CURDATE() AND u.email_verifie = TRUE
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
    except Exception as e:
        print(f"[Email Jour J] Erreur: {e}")

def job_email_taches_retard():
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.email, t.titre, t.deadline, DATEDIFF(CURDATE(), t.deadline) as jours_retard
            FROM taches t JOIN users u ON t.user_id = u.id
            WHERE t.terminee = FALSE AND t.deadline < CURDATE() AND t.deadline IS NOT NULL AND u.email_verifie = TRUE
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
    except Exception as e:
        print(f"[Email Retard] Erreur: {e}")

def job_email_resume_hebdo():
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.email, u.points, u.niveau,
                COUNT(CASE WHEN t.terminee = TRUE AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees,
                COUNT(CASE WHEN t.terminee = TRUE AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND t.updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_prec,
                COUNT(CASE WHEN t.terminee = FALSE THEN 1 END) as en_cours,
                COUNT(CASE WHEN t.terminee = FALSE AND t.deadline < CURDATE() AND t.deadline IS NOT NULL THEN 1 END) as en_retard,
                COUNT(CASE WHEN t.terminee = TRUE AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) * 10 as points_semaine,
                COUNT(t.id) as total
            FROM users u LEFT JOIN taches t ON u.id = t.user_id
            WHERE u.email_verifie = TRUE GROUP BY u.id
        """)
        users = cursor.fetchall()
        for u in users:
            if u['total'] == 0:
                continue
            user_id = u['id']
            taux = round((u['terminees'] / max(u['total'], 1)) * 100, 0) if u['terminees'] else 0
            conseil_ia = ""
            try:
                contexte = f"Utilisateur: {u['nom']}. Cette semaine: {u['terminees']} tâches terminées, {u['en_cours']} en cours, {u['en_retard']} en retard. Taux: {int(taux)}%."
                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": f"{contexte}\n\nDonne un conseil de productivité personnalisé en 2 phrases max, bienveillant et actionnable."}],
                    max_tokens=120, temperature=0.7
                )
                conseil_ia = completion.choices[0].message.content.strip()
            except Exception:
                conseil_ia = "Continue sur ta lancée et concentre-toi sur tes tâches prioritaires."
            stats = {
                "terminees": u['terminees'] or 0, "terminees_prec": u['terminees_prec'] or 0,
                "en_cours": u['en_cours'] or 0, "en_retard": u['en_retard'] or 0,
                "taux": int(taux), "points": u['points'] or 0, "niveau": u['niveau'] or 1,
                "points_semaine": u['points_semaine'] or 0, "conseil_ia": conseil_ia,
                "jours_actifs": {}, "taches_haute": []
            }
            html = _html_resume_hebdo(u['nom'], stats)
            threading.Thread(target=envoyer_email, args=(u['email'], f"Bilan · semaine du {datetime.now().strftime('%d/%m')} — GetShift", html)).start()
        cursor.close(); db.close()
    except Exception as e:
        print(f"[Email Hebdo] Erreur: {e}")

def demarrer_scheduler():
    schedule.every().day.at("08:00").do(job_resume_matin)
    schedule.every().hour.do(job_rappels_deadline)
    schedule.every().day.at("09:00").do(job_taches_en_retard)
    schedule.every(2).hours.do(job_encouragements)
    schedule.every().day.at("09:00").do(job_email_rappel_veille)
    schedule.every().day.at("08:00").do(job_email_rappel_jour_j)
    schedule.every().day.at("10:00").do(job_email_taches_retard)
    schedule.every().friday.at("18:00").do(job_email_resume_hebdo)
    schedule.every().day.at("00:00").do(job_backup_quotidien)
    print("[Scheduler] Démarré ✅")
    while True:
        schedule.run_pending()
        time.sleep(60)

threading.Thread(target=demarrer_scheduler, daemon=True).start()

# ============================================
# AUTO-MIGRATIONS (idempotentes)
# ============================================
def run_migrations():
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'taches' AND column_name = 'focus_date'
        """)
        if curseur.fetchone()[0] == 0:
            curseur.execute("ALTER TABLE taches ADD COLUMN focus_date DATE NULL")
            db.commit()
            print("[Migrations] focus_date ajouté à taches ✅")
        db.close()
    except Exception as e:
        print(f"[Migrations] erreur : {e}")

run_migrations()

# ============================================
# AUTHENTIFICATION
# ============================================

GOOGLE_CLIENT_ID = '149080640376-8t2ah2odllgq6t83795dafhdgrajbh61.apps.googleusercontent.com'

@app.route('/auth/google', methods=['POST'])
@limiter.limit("20 per minute")
def auth_google():
    try:
        google_id_direct = request.json.get('google_id')
        credential       = request.json.get('credential')
        if google_id_direct:
            google_id  = google_id_direct
            email      = request.json.get('email', '')
            nom        = request.json.get('nom', email.split('@')[0])
            avatar_url = request.json.get('avatar', '')
        elif credential:
            idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), GOOGLE_CLIENT_ID)
            google_id  = idinfo['sub']
            email      = idinfo['email']
            nom        = idinfo.get('name', email.split('@')[0])
            avatar_url = idinfo.get('picture', '')
        else:
            return jsonify({"erreur": "Token Google manquant"}), 400
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE google_id = %s OR email = %s LIMIT 1", (google_id, email))
        user = cursor.fetchone()
        if user:
            if not user.get('google_id'):
                cursor.execute("UPDATE users SET google_id = %s, email_verifie = TRUE WHERE id = %s", (google_id, user['id']))
                db.commit()
            user_id = user['id']; nom_final = user['nom']
            niveau = user.get('niveau', 1); points = user.get('points', 0); theme = user.get('theme', 'dark')
        else:
            cursor.execute("INSERT INTO users (nom, email, password, google_id, email_verifie, points, niveau, theme) VALUES (%s, %s, %s, %s, TRUE, 0, 1, 'dark')", (nom, email, secrets.token_hex(32), google_id))
            db.commit()
            user_id = cursor.lastrowid; nom_final = nom; niveau = 1; points = 0; theme = 'dark'
        cursor.close(); db.close()
        access_token = create_access_token(identity=str(user_id))
        response = make_response(jsonify({"message": "Connexion Google réussie", "user": {"id": user_id, "nom": nom_final, "email": email, "niveau": niveau, "points": points, "theme": theme, "avatar": avatar_url}}))
        set_access_cookies(response, access_token)
        return response, 200
    except ValueError:
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
        curseur.execute("INSERT INTO users (nom, email, password, verification_token, email_verifie) VALUES (%s, %s, %s, %s, FALSE)", (nom, email, password_hash, verification_token))
        db.commit(); curseur.close(); db.close()
        threading.Thread(target=envoyer_email_verification, args=(email, nom, verification_token)).start()
        return jsonify({"message": "Compte créé ! Vérifiez votre email."})
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
            <a href="https://chamdaane-a11y.github.io/taskflow" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:20px">Se connecter →</a>
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
        curseur.execute("SELECT id, nom, email, email_verifie, theme FROM users WHERE email = %s AND password = %s", (email, password_hash))
        user = curseur.fetchone()
        curseur.close(); db.close()
        if not user:
            return jsonify({"erreur": "Email ou mot de passe incorrect !"}), 401
        if not user.get('email_verifie'):
            return jsonify({"erreur": "Veuillez vérifier votre email avant de vous connecter !", "non_verifie": True}), 403
        access_token = create_access_token(identity=str(user['id']))
        response = make_response(jsonify({"message": "Connecté !", "user": {"id": user['id'], "nom": user['nom'], "email": user['email'], "theme": user.get('theme', 'dark')}}))
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
            db.close(); return jsonify({"erreur": "Email introuvable"}), 404
        if user['email_verifie']:
            db.close(); return jsonify({"erreur": "Email déjà vérifié"}), 400
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
            db.close(); return jsonify({"message": "Si cet email existe, un lien a été envoyé."})
        reset_token = secrets.token_urlsafe(32)
        expiry = datetime.now() + timedelta(hours=1)
        curseur.execute("UPDATE users SET reset_token=%s, reset_token_expiry=%s WHERE id=%s", (reset_token, expiry, user['id']))
        db.commit(); db.close()
        lien = f"https://chamdaane-a11y.github.io/taskflow/#/reset-password/{reset_token}"
        html = f"""<div style="font-family:Arial;max-width:500px;margin:auto;background:#0f0f13;color:#f0f0f5;padding:40px;border-radius:16px;">
            <h1 style="color:#6c63ff;">GetShift</h1><h2>Bonjour {user['nom']} !</h2>
            <p>Cliquez ci-dessous pour réinitialiser votre mot de passe :</p>
            <a href="{lien}" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:20px 0;">Réinitialiser mon mot de passe</a>
            <p style="color:#888;font-size:12px;">Ce lien expire dans 1h.</p>
        </div>"""
        threading.Thread(target=envoyer_email, args=(email, "Réinitialisation mot de passe GetShift", html)).start()
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
            db.close(); return jsonify({"erreur": "Lien invalide ou expiré"}), 400
        if user['reset_token_expiry'] and datetime.now() > user['reset_token_expiry']:
            db.close(); return jsonify({"erreur": "Lien expiré, demandez un nouveau"}), 400
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        curseur.execute("UPDATE users SET password=%s, reset_token=NULL, reset_token_expiry=NULL WHERE id=%s", (password_hash, user['id']))
        db.commit(); db.close()
        return jsonify({"message": "Mot de passe modifié avec succès !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# UTILISATEURS
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
            db.close(); return jsonify({"erreur": "Mot de passe actuel incorrect"}), 400
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
    curseur.execute("UPDATE users SET points=points+%s WHERE id=%s", (pts, id))
    db.commit()
    curseur.execute("SELECT points FROM users WHERE id=%s", (id,))
    user = curseur.fetchone()
    total_pts = user['points']
    paliers = [(1,0),(2,100),(3,250),(4,500),(5,1000),(6,2000),(7,5000),(8,10000)]
    nouveau_niveau = max([n for n, m in paliers if total_pts >= m])
    curseur.execute("UPDATE users SET niveau=%s WHERE id=%s", (nouveau_niveau, id))
    db.commit()
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
    curseur.execute("UPDATE users SET streak=%s, derniere_activite=%s WHERE id=%s", (streak, aujourd_hui, id))
    db.commit()
    curseur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=TRUE", (id,))
    nb_terminees = curseur.fetchone()['nb']
    nouveaux_badges = verifier_badges(curseur, db, id, nb_terminees, total_pts, streak)
    db.commit(); db.close()
    return jsonify({"points": total_pts, "niveau": nouveau_niveau, "streak": streak, "nouveaux_badges": nouveaux_badges})

# ============================================
# BADGES
# ============================================

REGLES_BADGES = [
    {"id": "first_task",  "nom": "Premier pas",      "icon": "🌱", "description": "Première tâche terminée",        "condition": lambda t, p, s: t >= 1},
    {"id": "five_tasks",  "nom": "En rythme",        "icon": "🔥", "description": "5 tâches terminées",             "condition": lambda t, p, s: t >= 5},
    {"id": "ten_tasks",   "nom": "Productif",        "icon": "⚡", "description": "10 tâches terminées",            "condition": lambda t, p, s: t >= 10},
    {"id": "fifty_tasks", "nom": "Machine",          "icon": "🤖", "description": "50 tâches terminées",            "condition": lambda t, p, s: t >= 50},
    {"id": "century",     "nom": "Centurion",        "icon": "💯", "description": "100 tâches terminées",           "condition": lambda t, p, s: t >= 100},
    {"id": "pts_100",     "nom": "Débutant",         "icon": "🥉", "description": "100 points gagnés",             "condition": lambda t, p, s: p >= 100},
    {"id": "pts_500",     "nom": "Confirmé",         "icon": "🥈", "description": "500 points gagnés",             "condition": lambda t, p, s: p >= 500},
    {"id": "pts_1000",    "nom": "Expert",           "icon": "🥇", "description": "1000 points gagnés",            "condition": lambda t, p, s: p >= 1000},
    {"id": "pts_5000",    "nom": "Maître",           "icon": "👑", "description": "5000 points gagnés",            "condition": lambda t, p, s: p >= 5000},
    {"id": "streak_3",    "nom": "3 jours de suite", "icon": "🔥", "description": "Actif 3 jours consécutifs",     "condition": lambda t, p, s: s >= 3},
    {"id": "streak_7",    "nom": "Semaine parfaite", "icon": "📅", "description": "Actif 7 jours consécutifs",     "condition": lambda t, p, s: s >= 7},
    {"id": "streak_30",   "nom": "Mois de feu",      "icon": "🌟", "description": "Actif 30 jours consécutifs",    "condition": lambda t, p, s: s >= 30},
    {"id": "early_bird",  "nom": "Lève-tôt",         "icon": "🌅", "description": "Tâche terminée avant 8h",      "condition": lambda t, p, s: False},
    {"id": "night_owl",   "nom": "Noctambule",       "icon": "🦉", "description": "Tâche terminée après 23h",     "condition": lambda t, p, s: False},
    {"id": "speedster",   "nom": "Fulgurant",        "icon": "⚡", "description": "5 tâches terminées en 1 jour", "condition": lambda t, p, s: False},
]

def verifier_badges(curseur, db, user_id, nb_terminees, points_total, streak):
    curseur.execute("SELECT badge_id FROM badges_utilisateurs WHERE user_id=%s", (user_id,))
    deja_obtenus = {r['badge_id'] for r in curseur.fetchall()}
    nouveaux = []
    for regle in REGLES_BADGES:
        if regle['id'] in deja_obtenus:
            continue
        if regle['condition'](nb_terminees, points_total, streak):
            curseur.execute("INSERT INTO badges_utilisateurs (user_id, badge_id) VALUES (%s, %s)", (user_id, regle['id']))
            nouveaux.append({"id": regle['id'], "nom": regle['nom'], "icon": regle['icon'], "description": regle['description']})
    return nouveaux

@app.route('/users/<int:id>/badges', methods=['GET'])
def get_badges(id):
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
            result.append({"id": b['id'], "nom": b['nom'], "icon": b['icon'], "description": b['description'], "obtenu": b['id'] in obtenus, "obtenu_le": str(obtenus[b['id']]) if b['id'] in obtenus else None})
        return jsonify({"badges": result, "streak": user['streak'] if user else 0, "nb_obtenus": len(obtenus), "nb_total": len(REGLES_BADGES)})
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


@app.route('/dashboard/stats/<int:user_id>', methods=['GET'])
def dashboard_stats(user_id):
    """Stats agrégées pour le HUD du Dashboard : niveau, points, streak, semaine."""
    try:
        from datetime import date as _date
        db = connecter()
        c = db.cursor(dictionary=True)
        c.execute("SELECT nom, points, niveau, streak, derniere_activite FROM users WHERE id=%s", (user_id,))
        u = c.fetchone()
        if not u:
            db.close(); return jsonify({"erreur": "User non trouvé"}), 404

        c.execute("""SELECT
            COUNT(CASE WHEN terminee=1 AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_semaine,
            COUNT(CASE WHEN terminee=1 AND updated_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_semaine_prec,
            COUNT(CASE WHEN terminee=1 THEN 1 END) as terminees_total,
            COUNT(CASE WHEN terminee=0 THEN 1 END) as actives,
            COUNT(*) as total
            FROM taches WHERE user_id=%s""", (user_id,))
        cnt = c.fetchone()

        # Niveau brackets : 1: 0-100, 2: 100-300, 3: 300-700, 4: 700-1500, 5: 1500-3000, 6: 3000+
        BRACKETS = [0, 100, 300, 700, 1500, 3000]
        points = u['points'] or 0
        niveau_actuel = 1
        for i, threshold in enumerate(BRACKETS):
            if points >= threshold:
                niveau_actuel = i + 1
        niveau_actuel = min(niveau_actuel, len(BRACKETS))
        if niveau_actuel != (u['niveau'] or 1):
            c.execute("UPDATE users SET niveau=%s WHERE id=%s", (niveau_actuel, user_id))
            db.commit()
        prev_threshold = BRACKETS[niveau_actuel - 1] if niveau_actuel >= 1 else 0
        next_threshold = BRACKETS[niveau_actuel] if niveau_actuel < len(BRACKETS) else (BRACKETS[-1] + 1500)
        progres_niveau = round((points - prev_threshold) / max(1, next_threshold - prev_threshold) * 100)
        progres_niveau = max(0, min(100, progres_niveau))
        niveaux_labels = {1:"Débutant",2:"Apprenti",3:"Confirmé",4:"Expert",5:"Maître",6:"Légende"}
        niveau_label = niveaux_labels.get(niveau_actuel, f"Niveau {niveau_actuel}")

        # Streak — auto-reset si > 1 jour d'inactivité
        streak = u['streak'] or 0
        derniere = u['derniere_activite']
        if derniere:
            today = _date.today()
            d_act = derniere.date() if hasattr(derniere, 'date') else derniere
            try:
                delta_days = (today - d_act).days
                if delta_days > 1:
                    streak = 0
                    c.execute("UPDATE users SET streak=0 WHERE id=%s", (user_id,))
                    db.commit()
            except Exception:
                pass

        # Points semaine : 10 points par tâche terminée cette semaine
        points_semaine = (cnt['terminees_semaine'] or 0) * 10
        points_semaine_prec = (cnt['terminees_semaine_prec'] or 0) * 10
        if points_semaine_prec > 0:
            delta_pct = round((points_semaine - points_semaine_prec) / points_semaine_prec * 100)
        else:
            delta_pct = 100 if points_semaine > 0 else 0

        total = cnt['total'] or 0
        terminees_total = cnt['terminees_total'] or 0
        taux = round(terminees_total / total * 100) if total > 0 else 0

        db.close()
        return jsonify({
            "niveau": niveau_actuel,
            "niveau_label": niveau_label,
            "points": points,
            "points_to_next": max(0, next_threshold - points),
            "progres_niveau": progres_niveau,
            "next_threshold": next_threshold,
            "streak": streak,
            "points_semaine": points_semaine,
            "points_semaine_prec": points_semaine_prec,
            "delta_semaine": delta_pct,
            "terminees_semaine": cnt['terminees_semaine'] or 0,
            "terminees_total": terminees_total,
            "taches_actives": cnt['actives'] or 0,
            "total_taches": total,
            "taux_completion": taux,
        })
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500

# ============================================
# CATEGORIES
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
# TACHES
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
        curseur.execute("INSERT INTO taches (titre, priorite, deadline, user_id, categorie_id) VALUES (%s, %s, %s, %s, %s)", (data['titre'], data.get('priorite', 'moyenne'), data.get('deadline'), data['user_id'], data.get('categorie_id')))
        db.commit()
        tache_id = curseur.lastrowid
        curseur2 = db.cursor(dictionary=True)
        curseur2.execute("SELECT config FROM integrations WHERE user_id=%s AND type='slack'", (data['user_id'],))
        row = curseur2.fetchone()
        if row:
            config = json.loads(row['config'])
            webhook_url = config.get('webhook_url')
            if webhook_url:
                envoyer_notification_slack(webhook_url, f"Nouvelle tâche GetShift : *{data['titre']}* — Priorité: {data.get('priorite', 'moyenne')}")
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
        curseur.execute("SELECT COUNT(*) as nb_bloquantes FROM dependances d JOIN taches t ON d.depend_de_id = t.id WHERE d.tache_id = %s AND t.terminee = FALSE", (id,))
        if curseur.fetchone()['nb_bloquantes'] > 0:
            db.close(); return jsonify({"erreur": "Cette tâche est bloquée par des dépendances non terminées"}), 400
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

@app.route('/taches/<int:id>/focus', methods=['PATCH'])
def update_focus_tache(id):
    try:
        data = request.get_json() or {}
        focus = bool(data.get('focus', False))
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT user_id FROM taches WHERE id = %s", (id,))
        row = curseur.fetchone()
        if not row:
            db.close()
            return jsonify({"erreur": "Tâche introuvable"}), 404
        user_id = row['user_id']
        if focus:
            curseur.execute("""
                SELECT COUNT(*) AS n FROM taches
                WHERE user_id = %s AND focus_date = CURDATE() AND terminee = FALSE AND id <> %s
            """, (user_id, id))
            if curseur.fetchone()['n'] >= 3:
                db.close()
                return jsonify({"erreur": "Limite de 3 tâches atteinte"}), 400
            curseur.execute("UPDATE taches SET focus_date = CURDATE() WHERE id = %s", (id,))
            db.commit()
            curseur.execute("SELECT focus_date FROM taches WHERE id = %s", (id,))
            focus_date = curseur.fetchone()['focus_date']
            db.close()
            return jsonify({"message": "Focus mis à jour", "focus_date": str(focus_date) if focus_date else None})
        else:
            curseur.execute("UPDATE taches SET focus_date = NULL WHERE id = %s", (id,))
            db.commit(); db.close()
            return jsonify({"message": "Focus retiré", "focus_date": None})
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
# DEPENDANCES
# ============================================

@app.route('/taches/<int:tache_id>/dependances', methods=['GET'])
def get_dependances(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT d.id, d.depend_de_id, t.titre as titre_prerequis, t.terminee FROM dependances d JOIN taches t ON d.depend_de_id = t.id WHERE d.tache_id = %s", (tache_id,))
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
# IA — ROUTES EXISTANTES (S1-S7)
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
    curseur.execute("SELECT h.*, t.titre as tache_titre FROM historique_ia h LEFT JOIN taches t ON h.tache_id = t.id WHERE h.user_id = %s ORDER BY h.created_at DESC LIMIT 50", (user_id,))
    historique = curseur.fetchall()
    db.close()
    return jsonify(historique)

@app.route('/ia/historique', methods=['POST'])
def sauvegarder_historique():
    data = request.get_json()
    db = connecter()
    curseur = db.cursor()
    curseur.execute("INSERT INTO historique_ia (user_id, prompt, reponse, modele, tache_id) VALUES (%s, %s, %s, %s, %s)", (data['user_id'], data['prompt'], data['reponse'], data['modele'], data.get('tache_id')))
    db.commit(); db.close()
    return jsonify({"message": "Historique sauvegarde !"})

@app.route('/ia/sous-taches-contextuelles', methods=['POST'])
def generer_sous_taches_contextuelles():
    try:
        data = request.get_json(force=True)
        titre = data.get('titre', '').strip()
        if not titre:
            return jsonify({"erreur": "Titre requis"}), 400
        prompt = f"""Tu es un assistant de productivité expert. Analyse cette tâche : "{titre}"
Génère entre 4 et 6 sous-tâches concrètes, actionnables et ordonnées logiquement.
Réponds UNIQUEMENT en JSON valide :
{{"type": "le type détecté", "sous_taches": [{{"titre": "sous-tâche", "priorite": "haute|moyenne|basse"}}], "conseil": "conseil court"}}"""
        completion = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}], max_tokens=600, temperature=0.4)
        reponse = completion.choices[0].message.content.strip()
        reponse = re.sub(r'```json|```', '', reponse).strip()
        match = re.search(r'\{.*\}', reponse, re.S)
        if not match:
            raise ValueError("Réponse IA invalide")
        return jsonify(json.loads(match.group()))
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/ia/generer-taches', methods=['POST'])
def generer_taches():
    try:
        data = request.get_json(force=True)
        if not data or 'objectif' not in data or 'user_id' not in data:
            return jsonify({"erreur": "objectif et user_id requis"}), 400
        completion = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": f'Objectif : "{data["objectif"]}". Génère exactement 5 tâches concrètes. Réponds UNIQUEMENT en JSON : ["tache 1","tache 2","tache 3","tache 4","tache 5"]'}], max_tokens=300, temperature=0.4)
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
        curseur.execute("SELECT id, titre, priorite, deadline, temps_estime, DATEDIFF(deadline, CURDATE()) AS jours_restants FROM taches WHERE user_id=%s AND terminee=FALSE ORDER BY deadline ASC, priorite DESC", (user_id,))
        taches = curseur.fetchall()
        if not taches: return jsonify({"erreur": "Aucune tache a planifier"}), 400
        taches_str = "\n".join([f"- {t['titre']} (priorite: {t['priorite']}, deadline: {t['deadline']}, temps: {t['temps_estime'] or 30} min)" for t in taches])
        completion = groq_client.chat.completions.create(model='llama-3.3-70b-versatile', messages=[{"role": "user", "content": f'Planifie ces taches sur 7 jours ({heures_dispo_par_jour}h/jour):\n{taches_str}\nReponds UNIQUEMENT en JSON: {{"planification": [{{"titre": "...", "date": "YYYY-MM-DD", "heure_debut": "HH:MM", "heure_fin": "HH:MM", "raison": "..."}}], "conseil": "..."}}'}], max_tokens=1500, temperature=0.3)
        reponse = completion.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', reponse, re.S)
        if not match: raise ValueError("Reponse IA invalide")
        plan = json.loads(match.group())
        for item in plan.get('planification', []):
            tache = next((t for t in taches if t['titre'] == item['titre']), None)
            if tache:
                curseur.execute("INSERT INTO planification (user_id, tache_id, date_planifiee, heure_debut, heure_fin, charge_minutes, genere_par_ia) VALUES (%s, %s, %s, %s, %s, %s, TRUE)", (user_id, tache['id'], item['date'], item['heure_debut'], item['heure_fin'], tache.get('temps_estime', 30)))
        db.commit(); db.close()
        return jsonify({"planification": plan['planification'], "conseil": plan.get('conseil', ''), "message": f"{len(plan['planification'])} taches planifiees !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# SOUS-TACHES
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
# TEMPS
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
# PLANIFICATION
# ============================================

@app.route('/planification/<int:user_id>', methods=['GET'])
def get_planification(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT p.*, t.titre, t.priorite, t.temps_estime, t.statut FROM planification p JOIN taches t ON p.tache_id = t.id WHERE p.user_id = %s AND p.date_planifiee >= CURDATE() ORDER BY p.date_planifiee ASC, p.heure_debut ASC", (user_id,))
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
        curseur.execute("INSERT INTO planification (user_id, tache_id, date_planifiee, heure_debut, heure_fin, charge_minutes, genere_par_ia) VALUES (%s, %s, %s, %s, %s, %s, %s)", (data['user_id'], data['tache_id'], data['date_planifiee'], data.get('heure_debut'), data.get('heure_fin'), data.get('charge_minutes', 0), data.get('genere_par_ia', False)))
        db.commit(); db.close()
        return jsonify({"message": "Planification ajoutee !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# PRIORITE INTELLIGENTE
# ============================================

@app.route('/taches/<int:user_id>/priorite-intelligente', methods=['GET'])
def priorite_intelligente(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, titre, priorite, deadline, temps_estime, statut, DATEDIFF(deadline, CURDATE()) AS jours_restants FROM taches WHERE user_id=%s AND terminee=FALSE AND deadline IS NOT NULL ORDER BY deadline ASC", (user_id,))
        taches = curseur.fetchall()
        updates = []
        for t in taches:
            jours = t['jours_restants'] or 99
            prio = {'haute': 3, 'moyenne': 2, 'basse': 1}.get(t['priorite'], 1)
            score = (prio * 3) + (1 / max(jours, 0.5)) * 10 + ((t['temps_estime'] or 30) / 60) + (20 if jours < 0 else 0)
            t['score_priorite'] = round(score, 2)
            updates.append((score, t['id']))
        if updates:
            curseur.executemany("UPDATE taches SET score_priorite=%s WHERE id=%s", updates)
        db.commit(); db.close()
        taches.sort(key=lambda x: x['score_priorite'], reverse=True)
        return jsonify(taches)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# ANALYTICS
# ============================================

@app.route('/charge/<int:user_id>', methods=['GET'])
def get_charge(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT date_planifiee, SUM(charge_minutes) as total_minutes, COUNT(*) as nb_taches FROM planification WHERE user_id=%s AND date_planifiee BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) GROUP BY date_planifiee ORDER BY date_planifiee ASC", (user_id,))
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
        curseur.execute("SELECT DATE(updated_at) as jour, COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL %s DAY) GROUP BY DATE(updated_at) ORDER BY jour ASC", (user_id, jours))
        par_jour = curseur.fetchall()
        curseur.execute("SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
        cette_semaine = curseur.fetchone()['count']
        curseur.execute("SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND updated_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
        semaine_precedente = curseur.fetchone()['count']
        curseur.execute("SELECT HOUR(updated_at) as heure, COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY HOUR(updated_at) ORDER BY heure", (user_id,))
        par_heure = [0] * 24
        for row in curseur.fetchall():
            if row['heure'] is not None: par_heure[row['heure']] = row['count']
        curseur.execute("SELECT DATE(created_at) as jour, COUNT(*) as count FROM historique_ia WHERE user_id=%s AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY jour ASC", (user_id,))
        ia_par_jour = curseur.fetchall()
        evolution = round(((cette_semaine - semaine_precedente) / max(semaine_precedente, 1)) * 100, 1)
        db.close()
        return jsonify({"total": total, "terminees": terminees, "taux_completion": taux, "priorites": priorites, "par_jour": par_jour, "cette_semaine": cette_semaine, "semaine_precedente": semaine_precedente, "ia_par_jour": ia_par_jour, "par_heure": par_heure, "evolution": evolution})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# COLLABORATION
# ============================================

def _init_equipe_activites(curseur):
    curseur.execute("""
        CREATE TABLE IF NOT EXISTS equipe_activites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            equipe_id INT NOT NULL,
            user_id INT NOT NULL,
            nom_user VARCHAR(100) NOT NULL,
            action VARCHAR(80) NOT NULL,
            cible VARCHAR(200) DEFAULT '',
            cible_id INT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_equipe (equipe_id)
        )
    """)

def log_activite(equipe_id, user_id, nom_user, action, cible='', cible_id=None):
    try:
        db = connecter()
        c = db.cursor()
        _init_equipe_activites(c)
        c.execute(
            "INSERT INTO equipe_activites (equipe_id, user_id, nom_user, action, cible, cible_id) VALUES (%s,%s,%s,%s,%s,%s)",
            (equipe_id, user_id, nom_user, action, cible, cible_id)
        )
        db.commit()
        db.close()
    except Exception:
        pass

@app.route('/equipes/<int:equipe_id>/activites', methods=['GET'])
def get_activites_equipe(equipe_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        _init_equipe_activites(curseur)
        curseur.execute(
            "SELECT * FROM equipe_activites WHERE equipe_id=%s ORDER BY created_at DESC LIMIT 30",
            (equipe_id,)
        )
        activites = curseur.fetchall()
        db.close()
        return jsonify(activites)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes', methods=['POST'])
def creer_equipe():
    try:
        data = request.get_json()
        code = secrets.token_urlsafe(16)
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("INSERT INTO equipes (nom, description, code_invitation, createur_id) VALUES (%s, %s, %s, %s)", (data['nom'], data.get('description', ''), code, data['user_id']))
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
        db.commit(); db.close()
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
        curseur.execute("SELECT u.id, u.nom, u.email, em.role, em.rejoint_le FROM equipe_membres em JOIN users u ON em.user_id=u.id WHERE em.equipe_id=%s ORDER BY em.rejoint_le ASC", (equipe_id,))
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
        curseur.execute("INSERT INTO taches_equipe (equipe_id, titre, description, priorite, assignee_id, createur_id, deadline) VALUES (%s, %s, %s, %s, %s, %s, %s)", (data['equipe_id'], data['titre'], data.get('description',''), data.get('priorite','moyenne'), data.get('assignee_id'), data['createur_id'], data.get('deadline')))
        tache_id = curseur.lastrowid
        db.commit()
        curseur.execute("SELECT te.*, u1.nom as createur_nom, u2.nom as assignee_nom FROM taches_equipe te JOIN users u1 ON te.createur_id=u1.id LEFT JOIN users u2 ON te.assignee_id=u2.id WHERE te.id=%s", (tache_id,))
        tache = curseur.fetchone()
        db.close()
        nom_user = tache.get('createur_nom', 'Quelqu\'un') if tache else 'Quelqu\'un'
        log_activite(data['equipe_id'], data['createur_id'], nom_user, 'a créé la tâche', data['titre'], tache_id)
        return jsonify(tache)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/taches/<int:tache_id>', methods=['PUT'])
def modifier_tache_equipe(tache_id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        fields, vals = [], []
        for key in ['titre', 'statut', 'priorite', 'assignee_id', 'deadline', 'description']:
            if key in data:
                fields.append(f"{key}=%s")
                vals.append(data[key])
        if fields:
            vals.append(tache_id)
            curseur.execute(f"UPDATE taches_equipe SET {', '.join(fields)} WHERE id=%s", vals)
            db.commit()
        curseur.execute("SELECT titre, equipe_id FROM taches_equipe WHERE id=%s", (tache_id,))
        tache_info = curseur.fetchone()
        db.close()
        if tache_info and data.get('user_id') and data.get('nom_user'):
            statut_labels = {'todo': 'À faire', 'en_cours': 'En cours', 'termine': 'Terminé'}
            if 'statut' in data:
                action = f"a déplacé vers {statut_labels.get(data['statut'], data['statut'])}"
            else:
                action = 'a modifié la tâche'
            log_activite(tache_info['equipe_id'], data['user_id'], data['nom_user'], action, tache_info['titre'], tache_id)
        return jsonify({"message": "Tache mise a jour"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/taches/<int:tache_id>/commentaires', methods=['GET'])
def get_commentaires_equipe(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT c.*, u.nom FROM commentaires_tache c JOIN users u ON c.user_id=u.id WHERE c.tache_id=%s ORDER BY c.created_at ASC", (tache_id,))
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
        curseur = db.cursor(dictionary=True)
        curseur.execute("INSERT INTO commentaires_tache (tache_id, user_id, contenu) VALUES (%s, %s, %s)", (data['tache_id'], data['user_id'], data['contenu']))
        db.commit()
        curseur.execute("SELECT te.titre, te.equipe_id, u.nom FROM taches_equipe te JOIN users u ON u.id=%s WHERE te.id=%s", (data['user_id'], data['tache_id']))
        info = curseur.fetchone()
        if info:
            log_activite(info['equipe_id'], data['user_id'], info['nom'], 'a commenté sur', info['titre'], data['tache_id'])
            # Traiter les @mentions
            contenu = data.get('contenu', '')
            mentions = re.findall(r'@(\w[\w\s]*?)(?=\s|$|@)', contenu)
            if mentions:
                curseur.execute("SELECT u.id, u.nom, u.email FROM equipe_membres em JOIN users u ON em.user_id=u.id WHERE em.equipe_id=%s", (info['equipe_id'],))
                membres = curseur.fetchall()
                auteur = info['nom']
                tache_titre = info['titre']
                for m in mentions:
                    mentionné = next((mb for mb in membres if mb['nom'].lower().startswith(m.lower()) and mb['id'] != data['user_id']), None)
                    if mentionné:
                        html = f"""<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<div style="background:linear-gradient(135deg,#6c63ff,#a855f7);padding:20px 24px;border-radius:12px 12px 0 0">
<h2 style="color:white;margin:0;font-size:18px">💬 Nouvelle mention — GetShift</h2></div>
<div style="background:#f8f8ff;padding:20px 24px;border-radius:0 0 12px 12px;border:1px solid #e8e8f0">
<p style="color:#333;font-size:14px"><strong>{auteur}</strong> t'a mentionné dans un commentaire sur la tâche <strong>« {tache_titre} »</strong> :</p>
<div style="background:white;border-left:3px solid #6c63ff;padding:12px 16px;border-radius:0 8px 8px 0;color:#555;font-size:14px;line-height:1.6">{contenu}</div>
<a href="https://chamdaane-a11y.github.io/taskflow" style="display:inline-block;margin-top:18px;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px">Répondre →</a>
</div></div>"""
                        envoyer_email(mentionné['email'], f"💬 {auteur} t'a mentionné sur GetShift", html)
        db.close()
        return jsonify({"message": "Commentaire ajoute"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>/membres/<int:target_id>/role', methods=['PATCH'])
def changer_role_membre(equipe_id, target_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nouveau_role = data.get('role')
        if nouveau_role not in ('admin', 'membre'):
            return jsonify({"erreur": "Role invalide"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT role FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe_id, user_id))
        row = curseur.fetchone()
        if not row or row['role'] != 'admin':
            return jsonify({"erreur": "Non autorise"}), 403
        curseur.execute("UPDATE equipe_membres SET role=%s WHERE equipe_id=%s AND user_id=%s", (nouveau_role, equipe_id, target_id))
        db.commit(); db.close()
        return jsonify({"message": "Role mis a jour"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>/membres/<int:target_id>', methods=['DELETE'])
def exclure_membre(equipe_id, target_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT role FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe_id, user_id))
        row = curseur.fetchone()
        if not row or row['role'] != 'admin':
            return jsonify({"erreur": "Non autorise"}), 403
        curseur.execute("SELECT createur_id FROM equipes WHERE id=%s", (equipe_id,))
        equipe = curseur.fetchone()
        if equipe and equipe['createur_id'] == target_id:
            return jsonify({"erreur": "Impossible d'exclure le createur"}), 400
        curseur.execute("DELETE FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe_id, target_id))
        db.commit(); db.close()
        return jsonify({"message": "Membre exclu"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>/nom', methods=['PATCH'])
def renommer_equipe(equipe_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nouveau_nom = data.get('nom', '').strip()
        if not nouveau_nom:
            return jsonify({"erreur": "Nom vide"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT role FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe_id, user_id))
        row = curseur.fetchone()
        if not row or row['role'] != 'admin':
            return jsonify({"erreur": "Non autorise"}), 403
        curseur.execute("UPDATE equipes SET nom=%s WHERE id=%s", (nouveau_nom, equipe_id))
        db.commit(); db.close()
        return jsonify({"message": "Equipe renommee", "nom": nouveau_nom})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>/stats', methods=['GET'])
def get_stats_equipe(equipe_id):
    try:
        db = connecter()
        c = db.cursor(dictionary=True)
        # Tâches par statut
        c.execute("SELECT statut, COUNT(*) as n FROM taches_equipe WHERE equipe_id=%s GROUP BY statut", (equipe_id,))
        par_statut = {r['statut']: r['n'] for r in c.fetchall()}
        total = sum(par_statut.values())
        taux = round(par_statut.get('termine', 0) / max(total, 1) * 100)

        # Contribution par membre
        c.execute("""
            SELECT u.id, u.nom,
                SUM(te.statut='todo') as todo,
                SUM(te.statut='en_cours') as en_cours,
                SUM(te.statut='termine') as termine,
                COUNT(te.id) as total
            FROM equipe_membres em
            JOIN users u ON em.user_id=u.id
            LEFT JOIN taches_equipe te ON te.assignee_id=u.id AND te.equipe_id=%s
            WHERE em.equipe_id=%s
            GROUP BY u.id, u.nom
        """, (equipe_id, equipe_id))
        membres = c.fetchall()

        # En retard (deadline < aujourd'hui et pas terminé)
        c.execute("""
            SELECT te.id, te.titre, te.deadline, te.priorite, u.nom as assignee_nom
            FROM taches_equipe te
            LEFT JOIN users u ON te.assignee_id=u.id
            WHERE te.equipe_id=%s AND te.statut != 'termine'
              AND te.deadline IS NOT NULL AND te.deadline < CURDATE()
            ORDER BY te.deadline ASC
            LIMIT 10
        """, (equipe_id,))
        en_retard = c.fetchall()

        # Activité récente (créations/modifs 7 derniers jours)
        c.execute("""
            SELECT DATE(created_at) as jour, COUNT(*) as n
            FROM equipe_activites WHERE equipe_id=%s
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at) ORDER BY jour ASC
        """, (equipe_id,))
        activite_7j = c.fetchall()

        db.close()
        return jsonify({
            "par_statut": par_statut, "total": total, "taux_completion": taux,
            "membres": membres, "en_retard": en_retard, "activite_7j": activite_7j
        })
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/equipes/<int:equipe_id>/ia', methods=['POST'])
def ia_equipe(equipe_id):
    try:
        data = request.get_json()
        message = data.get('message', '')
        user_id = data.get('user_id')
        historique = data.get('historique', [])

        db = connecter()
        c = db.cursor(dictionary=True)

        # Contexte équipe
        c.execute("SELECT nom, description FROM equipes WHERE id=%s", (equipe_id,))
        equipe = c.fetchone()
        c.execute("SELECT u.nom, em.role FROM equipe_membres em JOIN users u ON em.user_id=u.id WHERE em.equipe_id=%s", (equipe_id,))
        membres = c.fetchall()
        c.execute("""
            SELECT te.titre, te.statut, te.priorite, te.deadline, u.nom as assignee_nom
            FROM taches_equipe te LEFT JOIN users u ON te.assignee_id=u.id
            WHERE te.equipe_id=%s ORDER BY te.created_at DESC LIMIT 50
        """, (equipe_id,))
        taches = c.fetchall()
        db.close()

        total = len(taches)
        terminees = sum(1 for t in taches if t['statut'] == 'termine')
        en_cours = sum(1 for t in taches if t['statut'] == 'en_cours')
        en_retard = [t for t in taches if t['statut'] != 'termine' and t.get('deadline') and str(t['deadline']) < datetime.now().strftime('%Y-%m-%d')]

        membres_txt = "\n".join(f"- {m['nom']} ({m['role']})" for m in membres)
        retard_txt = "\n".join(f"  • {t['titre']} (assigné à {t['assignee_nom'] or 'personne'})" for t in en_retard[:5]) if en_retard else "  Aucune"
        taches_actives = [t for t in taches if t['statut'] != 'termine']
        taches_txt = "\n".join(f"  [{t['statut'].upper()}] {t['titre']} — {t['assignee_nom'] or 'non assigné'} {'⚠️ RETARD' if t in en_retard else ''}" for t in taches_actives[:20])

        system = f"""Tu es le Coach IA de l'équipe GetShift. Tu aides l'équipe à être plus productive.
━━━ ÉQUIPE : {equipe['nom']} ━━━
{equipe.get('description', '')}

━━━ MEMBRES ━━━
{membres_txt}

━━━ ÉTAT ACTUEL ━━━
Total tâches : {total} | Terminées : {terminees} | En cours : {en_cours} | Taux completion : {round(terminees/max(total,1)*100)}%

━━━ TÂCHES EN RETARD ━━━
{retard_txt}

━━━ TÂCHES ACTIVES ━━━
{taches_txt}

━━━ INSTRUCTIONS ━━━
Réponds en français. Tu peux : analyser la charge de travail, identifier les blocages, suggérer des réassignations, générer un sprint planning, détecter qui est surchargé. Sois direct, actionnable, bienveillant. Maximum 3 paragraphes sauf si tu listes des tâches."""

        messages = [{"role": "system", "content": system}]
        for h in historique[-8:]:
            messages.append({"role": h['role'], "content": h['content']})
        messages.append({"role": "user", "content": message})

        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=800,
            temperature=0.7
        )
        reponse = resp.choices[0].message.content
        return jsonify({"reponse": reponse})
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
        db.commit(); db.close()
        return jsonify({"message": "Equipe supprimee"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

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
        curseur.execute("SELECT c.*, t.titre as tache_titre, u.nom as owner_nom FROM collaborations c JOIN taches t ON c.tache_id = t.id JOIN users u ON c.owner_id = u.id WHERE c.collaborateur_id=%s ORDER BY c.created_at DESC", (user_id,))
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
        curseur.execute("SELECT t.*, u.nom as owner_nom, c.statut as collab_statut, c.id as collab_id FROM collaborations c JOIN taches t ON c.tache_id = t.id JOIN users u ON c.owner_id = u.id WHERE c.collaborateur_id=%s AND c.statut='accepte' ORDER BY t.created_at DESC", (user_id,))
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
        curseur.execute("SELECT c.*, u.nom, u.email FROM collaborations c JOIN users u ON c.collaborateur_id = u.id WHERE c.tache_id=%s", (tache_id,))
        membres = curseur.fetchall()
        db.close()
        return jsonify(membres)
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# COMMENTAIRES
# ============================================

@app.route('/commentaires/<int:tache_id>', methods=['GET'])
def get_commentaires(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT c.*, u.nom FROM commentaires c JOIN users u ON c.user_id = u.id WHERE c.tache_id=%s ORDER BY c.created_at ASC", (tache_id,))
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
# PUSH NOTIFICATIONS ROUTES
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
        cursor.execute("SELECT t.titre, t.deadline, t.user_id, DATEDIFF(t.deadline, CURDATE()) AS jours_restants FROM taches t WHERE t.terminee = FALSE AND t.deadline IS NOT NULL AND t.deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)")
        taches = cursor.fetchall()
        sent = 0
        for tache in taches:
            cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id = %s", (tache['user_id'],))
            sub = cursor.fetchone()
            if sub:
                jours = tache['jours_restants']
                if envoyer_push(sub['subscription'], f"Deadline : {tache['titre']}", "Aujourd'hui !" if jours == 0 else f"Dans {jours} jour(s)"):
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
# ROUTES EMAIL
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
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, nom, email, points, niveau FROM users WHERE id=%s", (user_id,))
        u = cursor.fetchone()
        cursor.close(); db.close()
        if not u:
            return jsonify({"erreur": "User introuvable"}), 404
        stats = {
            "terminees": 7, "terminees_prec": 4, "en_cours": 3, "en_retard": 1,
            "taux": 70, "points": u['points'] or 0, "niveau": u['niveau'] or 1,
            "points_semaine": 70, "jours_actifs": {}, "taches_haute": [],
            "conseil_ia": "Continue sur ta lancée ! Pour la semaine prochaine, essaie de travailler en blocs de 90 minutes sur tes tâches haute priorité dès le matin."
        }
        html = _html_resume_hebdo(u['nom'], stats)
        envoyer_email(u['email'], "Bilan hebdomadaire [TEST] — GetShift", html)
        return jsonify({"message": f"Email de test envoyé à {u['email']} !"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# INTEGRATIONS
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
# OAUTH INTEGRATIONS (Calendar, Drive, Zoom, Notion, Discord)
# ============================================

@app.route('/auth/google/calendar')
def auth_google_calendar():
    user_id = request.args.get('user_id')
    # TODO : implémenter le vrai flow OAuth Google Calendar
    # Pour l'instant, retourne le postMessage de succès
    return """<script>
        window.opener.postMessage({type:'oauth_success',integration:'google_calendar'},'*');
        window.close();
    </script>"""

@app.route('/auth/google/drive')
def auth_google_drive():
    user_id = request.args.get('user_id')
    return """<script>
        window.opener.postMessage({type:'oauth_success',integration:'google_drive'},'*');
        window.close();
    </script>"""

@app.route('/auth/zoom')
def auth_zoom():
    user_id = request.args.get('user_id')
    return """<script>
        window.opener.postMessage({type:'oauth_success',integration:'zoom'},'*');
        window.close();
    </script>"""

@app.route('/auth/notion')
def auth_notion():
    user_id = request.args.get('user_id')
    return """<script>
        window.opener.postMessage({type:'oauth_success',integration:'notion'},'*');
        window.close();
    </script>"""

@app.route('/auth/slack/oauth')
def auth_slack_oauth():
    user_id = request.args.get('user_id')
    return """<script>
        window.opener.postMessage({type:'oauth_success',integration:'slack'},'*');
        window.close();
    </script>"""

@app.route('/auth/discord')
def auth_discord():
    user_id = request.args.get('user_id')
    return """<script>
        window.opener.postMessage({type:'oauth_success',integration:'discord'},'*');
        window.close();
    </script>"""

@app.route('/auth/disconnect/<integration_id>', methods=['DELETE'])
def disconnect_integration(integration_id):
    try:
        user_id = request.args.get('user_id')
        db = connecter()
        curseur = db.cursor()
        curseur.execute(
            "DELETE FROM integrations WHERE user_id=%s AND type=%s",
            (user_id, integration_id)
        )
        db.commit(); db.close()
        return jsonify({"message": f"{integration_id} déconnecté"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# SPRINT 3 — TEMPLATES
# ============================================

@app.route('/templates/init', methods=['POST'])
def init_templates():
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS templates (
                id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
                titre VARCHAR(200) NOT NULL, description TEXT,
                categorie VARCHAR(50) DEFAULT 'autre', icone VARCHAR(10) DEFAULT '📋',
                utilisations INT DEFAULT 0, cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)""")
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS template_taches (
                id INT AUTO_INCREMENT PRIMARY KEY, template_id INT NOT NULL,
                titre VARCHAR(200) NOT NULL, priorite VARCHAR(20) DEFAULT 'moyenne',
                deadline_jours INT DEFAULT NULL, ordre INT DEFAULT 0,
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE)""")
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS template_sous_taches (
                id INT AUTO_INCREMENT PRIMARY KEY, template_tache_id INT NOT NULL,
                titre VARCHAR(200) NOT NULL, ordre INT DEFAULT 0,
                FOREIGN KEY (template_tache_id) REFERENCES template_taches(id) ON DELETE CASCADE)""")
        db.commit()
        templates_defaut = [
            {"user_id": 1, "titre": "Lancer un projet", "description": "Toutes les étapes pour démarrer un projet de A à Z", "categorie": "projet", "icone": "🚀", "taches": [
                {"titre": "Définir les objectifs", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Rédiger le cahier des charges", "Identifier les parties prenantes"]},
                {"titre": "Constituer l'équipe", "priorite": "haute", "deadline_jours": 3, "sous_taches": ["Lister les compétences", "Assigner les rôles"]},
                {"titre": "Créer le planning", "priorite": "moyenne", "deadline_jours": 7, "sous_taches": ["Définir les jalons", "Répartir les tâches"]},
            ]},
            {"user_id": 1, "titre": "Préparer un voyage", "description": "Checklist pour organiser votre voyage", "categorie": "voyage", "icone": "✈️", "taches": [
                {"titre": "Réserver les billets", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Comparer les prix", "Choisir les dates"]},
                {"titre": "Préparer les documents", "priorite": "haute", "deadline_jours": 5, "sous_taches": ["Vérifier passeport", "Demander visa si nécessaire"]},
                {"titre": "Faire la valise", "priorite": "moyenne", "deadline_jours": 7, "sous_taches": ["Liste vêtements", "Médicaments et trousse"]},
            ]},
            {"user_id": 1, "titre": "Routine matinale", "description": "Démarrez chaque journée avec productivité", "categorie": "habitude", "icone": "🌅", "taches": [
                {"titre": "Sport / Exercice", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Échauffement 5 min", "Séance 20 min"]},
                {"titre": "Planifier sa journée", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Lister les 3 priorités", "Vérifier le calendrier"]},
            ]},
            {"user_id": 1, "titre": "Sprint d'examen 7 jours", "description": "Plan complet de révision pour réussir un examen en 1 semaine", "categorie": "etude", "icone": "📚", "taches": [
                {"titre": "Cartographier la matière", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Lister tous les chapitres", "Identifier les zones faibles"]},
                {"titre": "Plan de révision personnalisé", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Diviser par jour", "Allouer le temps par chapitre"]},
                {"titre": "Sessions Pomodoro × 8 / jour", "priorite": "moyenne", "deadline_jours": 4, "sous_taches": ["Préparer environnement", "Couper notifications"]},
                {"titre": "Tests blancs et corrections", "priorite": "haute", "deadline_jours": 5, "sous_taches": ["Faire un test complet", "Analyser les erreurs"]},
                {"titre": "Sommeil et nutrition la veille", "priorite": "haute", "deadline_jours": 6, "sous_taches": ["Dormir 8h", "Manger sain et léger"]},
            ]},
            {"user_id": 1, "titre": "Mémoire / Thèse 30 jours", "description": "Roadmap pour rédiger un mémoire ou une thèse en un mois", "categorie": "etude", "icone": "🎓", "taches": [
                {"titre": "Choisir et valider le sujet", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Discuter avec encadrant", "Définir la problématique"]},
                {"titre": "Rédiger l'introduction", "priorite": "haute", "deadline_jours": 7, "sous_taches": ["Plan détaillé", "Première version"]},
                {"titre": "Revue de littérature", "priorite": "haute", "deadline_jours": 14, "sous_taches": ["Lire 20 articles", "Synthèse"]},
                {"titre": "Méthodologie + premiers résultats", "priorite": "haute", "deadline_jours": 21, "sous_taches": ["Définir méthodes", "Analyser les données"]},
                {"titre": "Rédaction des chapitres", "priorite": "haute", "deadline_jours": 27, "sous_taches": ["Brouillon", "Relecture"]},
                {"titre": "Préparer la soutenance", "priorite": "haute", "deadline_jours": 30, "sous_taches": ["Slides", "Répétition", "Anticiper les questions"]},
            ]},
            {"user_id": 1, "titre": "Apprendre une compétence (30j)", "description": "Apprendre une nouvelle compétence en 30 jours avec projet final", "categorie": "apprentissage", "icone": "🧠", "taches": [
                {"titre": "Définir l'objectif SMART", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Mesurable", "Réaliste"]},
                {"titre": "Trouver 3 ressources", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Cours en ligne", "Livre", "Mentor"]},
                {"titre": "Planning quotidien 1h", "priorite": "moyenne", "deadline_jours": 3, "sous_taches": ["Bloquer le créneau", "Préparer le matériel"]},
                {"titre": "Mini-projet semaine 1", "priorite": "moyenne", "deadline_jours": 7},
                {"titre": "Mini-projet semaine 2", "priorite": "moyenne", "deadline_jours": 14},
                {"titre": "Bilan + ajustement", "priorite": "moyenne", "deadline_jours": 21},
                {"titre": "Projet final", "priorite": "haute", "deadline_jours": 30, "sous_taches": ["Conception", "Réalisation", "Démo"]},
            ]},
            {"user_id": 1, "titre": "Routine du soir", "description": "Bien finir sa journée pour mieux commencer demain", "categorie": "habitude", "icone": "🌙", "taches": [
                {"titre": "Préparer demain", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Tenue", "Sac", "3 priorités"]},
                {"titre": "Déconnexion écrans 1h avant", "priorite": "moyenne", "deadline_jours": 1},
                {"titre": "Lecture 20 min", "priorite": "basse", "deadline_jours": 1},
                {"titre": "Méditation 5 min", "priorite": "moyenne", "deadline_jours": 1},
            ]},
            {"user_id": 1, "titre": "Sprint Pomodoro 4h", "description": "Bloc de deep work de 4 heures avec 4 Pomodoros", "categorie": "focus", "icone": "⏱️", "taches": [
                {"titre": "Bloquer le calendrier", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Mode ne pas déranger", "Eau + collation"]},
                {"titre": "Pomodoro 1 — démarrage (25 min)", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Pomodoro 2 — flow (25 min)", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Pause 15 min", "priorite": "basse", "deadline_jours": 1},
                {"titre": "Pomodoro 3 — production (25 min)", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Pomodoro 4 — finalisation (25 min)", "priorite": "haute", "deadline_jours": 1},
            ]},
            {"user_id": 1, "titre": "Onboarding nouveau client (freelance)", "description": "Démarrer une mission freelance de manière professionnelle", "categorie": "freelance", "icone": "🤝", "taches": [
                {"titre": "Contrat signé + acompte", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Vérifier les clauses", "Encaisser l'acompte"]},
                {"titre": "Réunion de cadrage", "priorite": "haute", "deadline_jours": 2, "sous_taches": ["Brief", "Livrables", "Deadlines"]},
                {"titre": "Accès aux outils du client", "priorite": "moyenne", "deadline_jours": 3},
                {"titre": "Plan de communication", "priorite": "moyenne", "deadline_jours": 4, "sous_taches": ["Channel", "Fréquence", "Reporting"]},
                {"titre": "Premier livrable", "priorite": "haute", "deadline_jours": 7},
            ]},
            {"user_id": 1, "titre": "Présentation client", "description": "Préparer une présentation impactante en 5 jours", "categorie": "travail", "icone": "📊", "taches": [
                {"titre": "Comprendre l'audience", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Profils", "Attentes"]},
                {"titre": "Storyline en 3 actes", "priorite": "haute", "deadline_jours": 2},
                {"titre": "Slides v1", "priorite": "moyenne", "deadline_jours": 3},
                {"titre": "Répétition + chrono", "priorite": "haute", "deadline_jours": 4},
                {"titre": "Anticiper objections", "priorite": "moyenne", "deadline_jours": 5},
            ]},
            {"user_id": 1, "titre": "Sunday Review (planifier la semaine)", "description": "Bilan hebdo + planning de la semaine en 1h", "categorie": "productivite", "icone": "📅", "taches": [
                {"titre": "Bilan semaine passée", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Wins", "Echecs", "Leçons"]},
                {"titre": "3 objectifs majeurs de la semaine", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Bloquer les deep work sessions", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Préparer les meetings", "priorite": "moyenne", "deadline_jours": 1},
                {"titre": "Vie perso : 1 sortie + 2 sports", "priorite": "moyenne", "deadline_jours": 1},
            ]},
            {"user_id": 1, "titre": "Bilan trimestriel", "description": "Faire le point tous les 3 mois sur ses objectifs", "categorie": "productivite", "icone": "📈", "taches": [
                {"titre": "Lister les wins", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Lister les échecs", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Causes racines"]},
                {"titre": "Mesurer les KPIs", "priorite": "haute", "deadline_jours": 2},
                {"titre": "3 priorités du prochain trimestre", "priorite": "haute", "deadline_jours": 3},
                {"titre": "Communiquer aux parties prenantes", "priorite": "moyenne", "deadline_jours": 5},
            ]},
            {"user_id": 1, "titre": "Lancer un side-project (30j)", "description": "De l'idée au lancement public en 30 jours", "categorie": "entrepreneuriat", "icone": "💡", "taches": [
                {"titre": "Valider le besoin (5 interviews)", "priorite": "haute", "deadline_jours": 3},
                {"titre": "Wireframe MVP", "priorite": "haute", "deadline_jours": 5},
                {"titre": "Stack technique + setup", "priorite": "moyenne", "deadline_jours": 7},
                {"titre": "Premier prototype fonctionnel", "priorite": "haute", "deadline_jours": 14},
                {"titre": "Beta avec 10 testeurs", "priorite": "haute", "deadline_jours": 21},
                {"titre": "Lancement public", "priorite": "haute", "deadline_jours": 30, "sous_taches": ["Product Hunt", "Reddit", "Twitter"]},
            ]},
            {"user_id": 1, "titre": "Lancer un MVP (6 semaines)", "description": "Ship un produit minimum viable en 6 semaines", "categorie": "entrepreneuriat", "icone": "🚀", "taches": [
                {"titre": "Définir la valeur unique", "priorite": "haute", "deadline_jours": 2},
                {"titre": "Roadmap 6 semaines", "priorite": "haute", "deadline_jours": 3},
                {"titre": "Build core feature", "priorite": "haute", "deadline_jours": 21},
                {"titre": "Landing page + email capture", "priorite": "moyenne", "deadline_jours": 25},
                {"titre": "Beta privée 20 users", "priorite": "haute", "deadline_jours": 35},
                {"titre": "Lancement Product Hunt", "priorite": "haute", "deadline_jours": 42},
            ]},
            {"user_id": 1, "titre": "Préparer un entretien d'embauche", "description": "Maximiser ses chances en 6 jours", "categorie": "carriere", "icone": "💼", "taches": [
                {"titre": "Analyser le poste", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Compétences clés", "Mission"]},
                {"titre": "CV adapté au poste", "priorite": "haute", "deadline_jours": 2},
                {"titre": "Préparer 5 STAR stories", "priorite": "haute", "deadline_jours": 3},
                {"titre": "Recherches sur l'entreprise", "priorite": "moyenne", "deadline_jours": 4, "sous_taches": ["Vision", "Concurrents", "Actualités"]},
                {"titre": "Questions à poser", "priorite": "basse", "deadline_jours": 5},
                {"titre": "Mock interview", "priorite": "haute", "deadline_jours": 6},
                {"titre": "Tenue + logistique", "priorite": "basse", "deadline_jours": 6},
            ]},
            {"user_id": 1, "titre": "Networking événement", "description": "Maximiser le ROI d'un événement de networking", "categorie": "carriere", "icone": "🎤", "taches": [
                {"titre": "LinkedIn à jour", "priorite": "haute", "deadline_jours": 3},
                {"titre": "Pitch personnel 30 sec", "priorite": "haute", "deadline_jours": 4},
                {"titre": "Lister 5 personnes à rencontrer", "priorite": "moyenne", "deadline_jours": 5},
                {"titre": "Cartes de visite / QR code", "priorite": "basse", "deadline_jours": 6},
                {"titre": "Follow-up J+2", "priorite": "haute", "deadline_jours": 8, "sous_taches": ["Message LinkedIn", "Meeting si pertinent"]},
            ]},
            {"user_id": 1, "titre": "Levée de fonds (seed)", "description": "Roadmap pour lever en 60 jours", "categorie": "entrepreneuriat", "icone": "💰", "taches": [
                {"titre": "Pitch deck v1", "priorite": "haute", "deadline_jours": 7},
                {"titre": "Liste 50 investisseurs", "priorite": "haute", "deadline_jours": 10},
                {"titre": "Warm intros via réseau", "priorite": "haute", "deadline_jours": 14},
                {"titre": "Premiers rendez-vous", "priorite": "haute", "deadline_jours": 21},
                {"titre": "Data room complète", "priorite": "haute", "deadline_jours": 28},
                {"titre": "Term sheet négocié", "priorite": "haute", "deadline_jours": 60},
            ]},
            {"user_id": 1, "titre": "Plan sportif 30 jours", "description": "Reprise du sport progressive avec bilan", "categorie": "sante", "icone": "🏋️", "taches": [
                {"titre": "Bilan physique de départ", "priorite": "haute", "deadline_jours": 1, "sous_taches": ["Photos", "Mesures", "Performances"]},
                {"titre": "Plan d'entraînement", "priorite": "haute", "deadline_jours": 2},
                {"titre": "Adapter alimentation", "priorite": "moyenne", "deadline_jours": 3},
                {"titre": "Semaine 1 — assiduité 5/7", "priorite": "haute", "deadline_jours": 7},
                {"titre": "Bilan mi-parcours", "priorite": "moyenne", "deadline_jours": 15},
                {"titre": "Bilan final + photos", "priorite": "haute", "deadline_jours": 30},
            ]},
            {"user_id": 1, "titre": "Méditation 21 jours", "description": "Installer une pratique de méditation durable", "categorie": "habitude", "icone": "🧘", "taches": [
                {"titre": "Installer une app (Petit Bambou, Headspace)", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Choisir un créneau fixe", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Sessions 5 min × 7 jours", "priorite": "moyenne", "deadline_jours": 7},
                {"titre": "Sessions 10 min × 7 jours", "priorite": "moyenne", "deadline_jours": 14},
                {"titre": "Sessions 15 min × 7 jours", "priorite": "moyenne", "deadline_jours": 21},
                {"titre": "Bilan sensations", "priorite": "basse", "deadline_jours": 21},
            ]},
            {"user_id": 1, "titre": "Détox digitale 7 jours", "description": "Reprendre le contrôle de son temps d'écran", "categorie": "habitude", "icone": "📵", "taches": [
                {"titre": "Auditer le screen time", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Désinstaller 3 apps chronophages", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Couper les notifications non essentielles", "priorite": "haute", "deadline_jours": 1},
                {"titre": "1h sans écran le matin", "priorite": "moyenne", "deadline_jours": 2},
                {"titre": "Sortie sans téléphone", "priorite": "moyenne", "deadline_jours": 4},
                {"titre": "Bilan + nouvelles règles", "priorite": "moyenne", "deadline_jours": 7},
            ]},
            {"user_id": 1, "titre": "Reset alimentation 14 jours", "description": "Reprendre une alimentation saine", "categorie": "sante", "icone": "🥗", "taches": [
                {"titre": "Vider les placards (sucre, ultra-transformé)", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Liste de courses saines", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Meal prep dimanche", "priorite": "haute", "deadline_jours": 7},
                {"titre": "Hydratation 2L / jour", "priorite": "moyenne", "deadline_jours": 14},
                {"titre": "Bilan énergie", "priorite": "basse", "deadline_jours": 14},
            ]},
            {"user_id": 1, "titre": "Déménagement", "description": "Organiser un déménagement sans stress", "categorie": "vie", "icone": "📦", "taches": [
                {"titre": "Trier et donner", "priorite": "haute", "deadline_jours": 7},
                {"titre": "Cartons + étiquetage", "priorite": "haute", "deadline_jours": 14},
                {"titre": "Réserver camion ou déménageurs", "priorite": "haute", "deadline_jours": 21},
                {"titre": "Changements d'adresse", "priorite": "haute", "deadline_jours": 28, "sous_taches": ["EDF / GDF", "Internet", "Banque", "Impôts"]},
                {"titre": "Jour J", "priorite": "haute", "deadline_jours": 30, "sous_taches": ["Inventaire", "État des lieux"]},
                {"titre": "Installer dans la nouvelle", "priorite": "moyenne", "deadline_jours": 35},
            ]},
            {"user_id": 1, "titre": "Préparer un événement", "description": "Mariage, fête, anniversaire — checklist complète", "categorie": "vie", "icone": "🎉", "taches": [
                {"titre": "Définir budget + invités", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Choisir lieu et date", "priorite": "haute", "deadline_jours": 7},
                {"titre": "Envoyer invitations", "priorite": "haute", "deadline_jours": 14},
                {"titre": "Traiteur + déco", "priorite": "moyenne", "deadline_jours": 21},
                {"titre": "Logistique J-3", "priorite": "haute", "deadline_jours": 28},
                {"titre": "Jour J", "priorite": "haute", "deadline_jours": 30},
            ]},
            {"user_id": 1, "titre": "Budget mensuel", "description": "Maîtriser ses finances chaque mois", "categorie": "finance", "icone": "💶", "taches": [
                {"titre": "Calculer revenus nets", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Lister dépenses fixes", "priorite": "haute", "deadline_jours": 1},
                {"titre": "Catégoriser dépenses variables", "priorite": "moyenne", "deadline_jours": 2},
                {"titre": "Définir épargne (% revenus)", "priorite": "haute", "deadline_jours": 2},
                {"titre": "Mid-month check", "priorite": "moyenne", "deadline_jours": 15},
                {"titre": "Bilan fin de mois", "priorite": "haute", "deadline_jours": 30},
            ]},
            {"user_id": 1, "titre": "Challenge zéro déchet (mois 1)", "description": "Premier mois pour réduire ses déchets", "categorie": "challenge", "icone": "♻️", "taches": [
                {"titre": "Auditer poubelles d'une semaine", "priorite": "haute", "deadline_jours": 7},
                {"titre": "Acheter contenants réutilisables", "priorite": "moyenne", "deadline_jours": 10},
                {"titre": "Mettre en place un compost", "priorite": "moyenne", "deadline_jours": 14},
                {"titre": "Refuser jetable au resto", "priorite": "basse", "deadline_jours": 21},
                {"titre": "Bilan + objectifs mois 2", "priorite": "basse", "deadline_jours": 30},
            ]},
        ]
        for tmpl in templates_defaut:
            curseur.execute("SELECT id FROM templates WHERE user_id=%s AND titre=%s LIMIT 1", (tmpl['user_id'], tmpl['titre']))
            if curseur.fetchone():
                continue
            curseur.execute("INSERT INTO templates (user_id, titre, description, categorie, icone) VALUES (%s, %s, %s, %s, %s)", (tmpl['user_id'], tmpl['titre'], tmpl['description'], tmpl['categorie'], tmpl['icone']))
            template_id = curseur.lastrowid
            for i, t in enumerate(tmpl['taches']):
                curseur.execute("INSERT INTO template_taches (template_id, titre, priorite, deadline_jours, ordre) VALUES (%s, %s, %s, %s, %s)", (template_id, t['titre'], t['priorite'], t.get('deadline_jours'), i))
                tache_id = curseur.lastrowid
                for j, st in enumerate(t.get('sous_taches', [])):
                    curseur.execute("INSERT INTO template_sous_taches (template_tache_id, titre, ordre) VALUES (%s, %s, %s)", (tache_id, st, j))
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
        curseur.execute("INSERT INTO templates (user_id, titre, description, categorie, icone) VALUES (%s, %s, %s, %s, %s)", (data['user_id'], data['titre'], data.get('description', ''), data.get('categorie', 'autre'), data.get('icone', '📋')))
        template_id = curseur.lastrowid
        for i, tache in enumerate(data.get('taches', [])):
            curseur.execute("INSERT INTO template_taches (template_id, titre, priorite, deadline_jours, ordre) VALUES (%s, %s, %s, %s, %s)", (template_id, tache['titre'], tache.get('priorite', 'moyenne'), tache.get('deadline_jours'), i))
            tache_id = curseur.lastrowid
            for j, st in enumerate(tache.get('sous_taches', [])):
                curseur.execute("INSERT INTO template_sous_taches (template_tache_id, titre, ordre) VALUES (%s, %s, %s)", (tache_id, st['titre'] if isinstance(st, dict) else st, j))
        db.commit(); db.close()
        return jsonify({"message": "Template créé", "id": template_id})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/templates/<int:template_id>/utiliser', methods=['POST'])
def utiliser_template(template_id):
    try:
        data = request.get_json()
        user_id = data['user_id']
        date_debut = data.get('date_debut')
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT * FROM templates WHERE id=%s", (template_id,))
        tmpl = curseur.fetchone()
        if not tmpl:
            return jsonify({"erreur": "Template introuvable"}), 404
        curseur.execute("SELECT * FROM template_taches WHERE template_id=%s ORDER BY ordre", (template_id,))
        taches = curseur.fetchall()
        taches_creees = []
        debut = datetime.fromisoformat(date_debut) if date_debut else datetime.now()
        for tache in taches:
            deadline = debut + timedelta(days=tache['deadline_jours'] or 7)
            curseur.execute("INSERT INTO taches (titre, priorite, deadline, user_id) VALUES (%s, %s, %s, %s)", (tache['titre'], tache['priorite'], deadline.strftime('%Y-%m-%d %H:%M'), user_id))
            tache_id = curseur.lastrowid
            curseur.execute("SELECT * FROM template_sous_taches WHERE template_tache_id=%s ORDER BY ordre", (tache['id'],))
            for j, st in enumerate(curseur.fetchall()):
                curseur.execute("INSERT INTO sous_taches (tache_id, titre, ordre) VALUES (%s, %s, %s)", (tache_id, st['titre'], j))
            taches_creees.append(tache_id)
        curseur.execute("UPDATE templates SET utilisations=utilisations+1 WHERE id=%s", (template_id,))
        db.commit(); db.close()
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
        db.commit(); db.close()
        return jsonify({"message": "Template supprimé"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# SPRINT 4 — TOMORROW BUILDER
# ============================================

def calculer_score_energie(user_id, db_cursor):
    try:
        db_cursor.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=1 AND DATE(updated_at) = CURDATE()", (user_id,))
        taches_aujourd_hui = (db_cursor.fetchone() or {}).get('nb', 0)
        db_cursor.execute("SELECT streak FROM users WHERE id=%s", (user_id,))
        streak = (db_cursor.fetchone() or {}).get('streak', 0)
        db_cursor.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=0 AND deadline < NOW()", (user_id,))
        en_retard = (db_cursor.fetchone() or {}).get('nb', 0)
        score = 60 + min(streak * 3, 20) + min(taches_aujourd_hui * 5, 15) - min(en_retard * 5, 30)
        return max(10, min(100, score))
    except:
        return 60

def estimer_duree_tache(titre, priorite):
    titre_lower = titre.lower()
    mots_longs = ['rédiger', 'analyser', 'concevoir', 'développer', 'coder', 'créer', 'préparer', 'planifier', 'rechercher']
    mots_courts = ['appeler', 'email', 'envoyer', 'vérifier', 'lire', 'répondre', 'noter', 'checker']
    mots_moyens = ['réunion', 'meeting', 'réviser', 'corriger', 'mettre à jour', 'organiser']
    duree_base = 45
    for mot in mots_longs:
        if mot in titre_lower: duree_base = 90; break
    for mot in mots_courts:
        if mot in titre_lower: duree_base = 20; break
    for mot in mots_moyens:
        if mot in titre_lower: duree_base = 60; break
    if priorite == 'haute': duree_base = int(duree_base * 1.3)
    elif priorite == 'basse': duree_base = int(duree_base * 0.8)
    return duree_base

def detecter_heure_productive(user_id, db_cursor):
    try:
        db_cursor.execute("SELECT HOUR(updated_at) as heure, COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=1 AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY HOUR(updated_at) ORDER BY nb DESC LIMIT 1", (user_id,))
        row = db_cursor.fetchone()
        if row: return row['heure']
    except:
        pass
    return 9

@app.route('/ia/tomorrow-builder/<int:user_id>', methods=['GET'])
def tomorrow_builder(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, titre, priorite, deadline FROM taches WHERE user_id=%s AND terminee=0 ORDER BY CASE priorite WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 ELSE 3 END, deadline ASC LIMIT 15", (user_id,))
        taches = curseur.fetchall()
        if not taches:
            return jsonify({"erreur": "Aucune tâche active"}), 404
        score_energie = calculer_score_energie(user_id, curseur)
        heure_productive = detecter_heure_productive(user_id, curseur)
        for t in taches:
            t['duree_estimee'] = estimer_duree_tache(t['titre'], t['priorite'])
            if t['deadline']: t['deadline'] = str(t['deadline'])
        niveau_energie = "élevé" if score_energie >= 70 else "moyen" if score_energie >= 40 else "faible"
        demain = (datetime.now() + timedelta(days=1)).strftime('%A %d %B %Y')
        prompt_taches = "\n".join([f"- [{t['priorite'].upper()}] {t['titre']} | {t['duree_estimee']}min | {t.get('deadline', 'non définie')}" for t in taches[:10]])
        prompt = f"""Crée le planning optimal pour demain ({demain}).
Score énergie: {score_energie}/100 ({niveau_energie}), heure productive: {heure_productive}h
Tâches: {prompt_taches}
Réponds UNIQUEMENT en JSON: {{"score_energie": {score_energie}, "niveau_energie": "{niveau_energie}", "heure_productive": {heure_productive}, "duree_totale_planifiee": 0, "conseil_journee": "", "alerte_burnout": false, "message_alerte": null, "planning": [{{"ordre": 1, "heure_debut": "09:00", "heure_fin": "10:00", "type": "tache", "titre": "", "priorite": "haute", "duree_minutes": 60, "raison_placement": "", "energie_requise": "élevée", "tips": ""}}], "taches_reportees": [], "resume_global": ""}}"""
        response = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}], max_tokens=2000, temperature=0.7)
        contenu = response.choices[0].message.content.strip()
        if '```json' in contenu: contenu = contenu.split('```json')[1].split('```')[0].strip()
        elif '```' in contenu: contenu = contenu.split('```')[1].split('```')[0].strip()
        planning_data = json.loads(contenu)
        curseur.execute("CREATE TABLE IF NOT EXISTS tomorrow_plans (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, planning_json LONGTEXT, score_energie INT, cree_le DATETIME DEFAULT CURRENT_TIMESTAMP, date_planifiee DATE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)")
        demain_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        curseur.execute("DELETE FROM tomorrow_plans WHERE user_id=%s AND date_planifiee=%s", (user_id, demain_date))
        curseur.execute("INSERT INTO tomorrow_plans (user_id, planning_json, score_energie, date_planifiee) VALUES (%s, %s, %s, %s)", (user_id, json.dumps(planning_data), score_energie, demain_date))
        db.commit(); db.close()
        return jsonify(planning_data)
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500

@app.route('/ia/tomorrow-builder/<int:user_id>/saved', methods=['GET'])
def get_saved_planning(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT * FROM tomorrow_plans WHERE user_id=%s ORDER BY cree_le DESC LIMIT 1", (user_id,))
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
    try:
        data = request.get_json()
        titre = data.get('titre', '')
        priorite = data.get('priorite', 'moyenne')
        user_id = data.get('user_id')
        if not titre.strip():
            return jsonify({"erreur": "Titre requis"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT titre, priorite, terminee FROM taches WHERE user_id=%s ORDER BY created_at DESC LIMIT 50", (user_id,))
        historique = curseur.fetchall()
        total = len(historique)
        terminees = sum(1 for t in historique if t['terminee'])
        taux_global = round((terminees / total * 100)) if total > 0 else 50
        h_p = [t for t in historique if t['priorite'] == priorite]
        taux_priorite = round(sum(1 for t in h_p if t['terminee']) / len(h_p) * 100) if h_p else taux_global
        duree_estimee = estimer_duree_tache(titre, priorite)
        dernieres = ', '.join([t['titre'][:25] for t in historique[:5]])
        prompt = f"""Analyse cette tache et genere son Task DNA.
TACHE: "{titre}" | Priorite: {priorite} | Duree: {duree_estimee}min
HISTORIQUE: Taux global: {taux_global}% | Priorite {priorite}: {taux_priorite}%
Dernieres taches: {dernieres}
Reponds UNIQUEMENT en JSON: {{"score_viabilite": 0, "prediction": "succes", "categorie": "deep_work", "emoji_categorie": "💡", "label_categorie": "Travail profond", "duree_estimee": {duree_estimee}, "duree_label": "{duree_estimee} min", "facteurs_succes": [], "facteurs_risque": [], "conseil_principal": "", "conseil_reformulation": null, "niveau_complexite": "moyenne", "meilleur_moment": "matin", "explication_score": ""}}"""
        response = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}], max_tokens=800, temperature=0.6)
        contenu = response.choices[0].message.content.strip()
        if '```json' in contenu: contenu = contenu.split('```json')[1].split('```')[0].strip()
        elif '```' in contenu: contenu = contenu.split('```')[1].split('```')[0].strip()
        dna = json.loads(contenu)
        curseur.execute("CREATE TABLE IF NOT EXISTS task_dna_analyses (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, titre_tache VARCHAR(200), score_viabilite INT, prediction VARCHAR(20), categorie VARCHAR(50), dna_json LONGTEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)")
        curseur.execute("INSERT INTO task_dna_analyses (user_id, titre_tache, score_viabilite, prediction, categorie, dna_json) VALUES (%s,%s,%s,%s,%s,%s)", (user_id, titre, dna.get('score_viabilite'), dna.get('prediction'), dna.get('categorie'), json.dumps(dna)))
        db.commit(); db.close()
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
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, titre, priorite, deadline, created_at, updated_at FROM taches WHERE user_id=%s AND terminee=0", (user_id,))
        taches = curseur.fetchall()
        db.close()
        alertes = []
        for t in taches:
            if not t['updated_at'] or not t['deadline']:
                continue
            updated_at = t['updated_at']
            if not isinstance(updated_at, datetime):
                updated_at = datetime.combine(updated_at, datetime.min.time())
            deadline_dt = t['deadline']
            if not isinstance(deadline_dt, datetime):
                deadline_dt = datetime.combine(deadline_dt, datetime.min.time())
            jours_sans_action = (datetime.now() - updated_at).days if updated_at else 0
            jours_avant_deadline = (deadline_dt - datetime.now()).days if deadline_dt else 999
            score = 0
            if jours_sans_action > 3 and t['priorite'] == 'haute': score = 90
            elif jours_sans_action > 5 and t['priorite'] == 'moyenne': score = 70
            elif jours_sans_action > 7: score = 50
            if score > 0:
                alertes.append({"tache_id": t['id'], "titre": t['titre'], "priorite": t['priorite'], "jours_sans_action": jours_sans_action, "jours_avant_deadline": jours_avant_deadline, "score_procrastination": score, "niveau": "critique" if score >= 80 else "modere"})
        alertes.sort(key=lambda x: x['score_procrastination'], reverse=True)
        return jsonify({"alertes": alertes, "total": len(alertes)})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/ia/smart-planning/trigger', methods=['POST'])
def trigger_tomorrow_builder_notif():
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM users")
        users = curseur.fetchall()
        db.close()
        return jsonify({"message": f"Tomorrow Builder déclenché pour {len(users)} utilisateurs"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# SPRINT 6 — COACH IA
# ============================================

COACH_STYLES = {
    "bienveillant": {"nom": "Alex", "emoji": "🤗", "description": "Doux, encourageant, toujours positif", "persona": "Tu es Alex, un coach bienveillant et empathique. Tu encourages toujours, tu celebres chaque petite victoire, tu utilises un langage chaleureux et positif."},
    "motivateur":   {"nom": "Max",  "emoji": "🔥", "description": "Energique, challengeant, pousse à se dépasser", "persona": "Tu es Max, un coach motivateur et dynamique. Tu challenges l'utilisateur, tu utilises un langage energique et direct."},
    "analytique":   {"nom": "Nova", "emoji": "📊", "description": "Précis, basé sur les données, factuel", "persona": "Tu es Nova, un coach analytique et precis. Tu bases tes conseils sur les donnees et les faits."},
}

def get_coach_context(user_id, curseur):
    curseur.execute("SELECT COUNT(*) as total FROM taches WHERE user_id=%s", (user_id,))
    total = curseur.fetchone()['total']
    curseur.execute("SELECT COUNT(*) as done FROM taches WHERE user_id=%s AND terminee=1", (user_id,))
    done = curseur.fetchone()['done']
    curseur.execute("SELECT COUNT(*) as retard FROM taches WHERE user_id=%s AND terminee=0 AND deadline < NOW()", (user_id,))
    retard = curseur.fetchone()['retard']
    curseur.execute("SELECT COUNT(*) as actives FROM taches WHERE user_id=%s AND terminee=0", (user_id,))
    actives = curseur.fetchone()['actives']
    curseur.execute("SELECT streak, nom FROM users WHERE id=%s", (user_id,))
    user_row = curseur.fetchone()
    streak = user_row['streak'] if user_row else 0
    prenom = user_row['nom'] if user_row else 'Utilisateur'
    taux = round(done / total * 100) if total > 0 else 0
    return {"prenom": prenom, "total_taches": total, "taches_terminees": done, "taches_actives": actives, "taches_en_retard": retard, "taux_completion": taux, "streak": streak}

@app.route('/ia/coach/styles', methods=['GET'])
def get_coach_styles():
    return jsonify({"styles": [{"id": k, "nom": v["nom"], "emoji": v["emoji"], "description": v["description"]} for k, v in COACH_STYLES.items()]})

@app.route('/ia/coach/chat', methods=['POST'])
def coach_chat():
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
        curseur.execute("CREATE TABLE IF NOT EXISTS coach_messages (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, role VARCHAR(10), contenu TEXT, style_coach VARCHAR(30), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)")
        curseur.execute("INSERT INTO coach_messages (user_id, role, contenu, style_coach) VALUES (%s, %s, %s, %s)", (user_id, 'user', message, style))
        system_prompt = coach['persona'] + f"\n\nPROFIL DE {ctx['prenom'].upper()}:\n- Taches: {ctx['taches_actives']} actives | {ctx['taches_terminees']} terminées | {ctx['taches_en_retard']} en retard\n- Taux: {ctx['taux_completion']}% | Streak: {ctx['streak']} jours\nReponds en francais, 3-5 phrases max."
        messages = [{"role": "system", "content": system_prompt}]
        for h in historique[-6:]:
            messages.append({"role": h['role'], "content": h['contenu']})
        messages.append({"role": "user", "content": message})
        response = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=messages, max_tokens=400, temperature=0.8)
        reponse = response.choices[0].message.content.strip()
        curseur.execute("INSERT INTO coach_messages (user_id, role, contenu, style_coach) VALUES (%s, %s, %s, %s)", (user_id, 'assistant', reponse, style))
        db.commit(); db.close()
        return jsonify({"reponse": reponse, "coach": {"nom": coach['nom'], "emoji": coach['emoji']}})
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500


@app.route('/ia/coach/daily-message/<int:user_id>', methods=['GET'])
def coach_daily_message(user_id):
    """Message du coach personnalisé pour la journée. Cache 24h."""
    try:
        from datetime import date as _date
        style = request.args.get('style', 'bienveillant')
        coach = COACH_STYLES.get(style, COACH_STYLES['bienveillant'])
        db = connecter()
        c = db.cursor(dictionary=True)
        c.execute("""CREATE TABLE IF NOT EXISTS coach_daily_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            date_msg DATE NOT NULL,
            style_coach VARCHAR(30),
            contenu TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_day_style (user_id, date_msg, style_coach),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )""")
        today_str = _date.today().isoformat()
        c.execute("SELECT contenu FROM coach_daily_messages WHERE user_id=%s AND date_msg=%s AND style_coach=%s",
                  (user_id, today_str, style))
        existing = c.fetchone()
        if existing and existing['contenu']:
            db.close()
            return jsonify({
                "message": existing['contenu'],
                "coach": {"nom": coach['nom'], "emoji": coach['emoji'], "style": style},
                "cached": True
            })

        ctx = get_coach_context(user_id, c)
        c.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND focus_date=CURDATE() AND terminee=0", (user_id,))
        focus_count = (c.fetchone() or {}).get('nb', 0)
        c.execute("""SELECT titre FROM taches WHERE user_id=%s AND terminee=0 AND focus_date=CURDATE()
                     ORDER BY FIELD(priorite,'haute','moyenne','basse'), deadline ASC LIMIT 1""", (user_id,))
        top = c.fetchone()
        top_titre = top['titre'] if top else None

        prompt = f"""{coach['persona']}

CONTEXTE DE {ctx['prenom'].upper()}:
- {ctx['taches_actives']} tâches actives, {ctx['taches_en_retard']} en retard
- Streak: {ctx['streak']} jour(s) consécutif(s)
- Taux complétion global: {ctx['taux_completion']}%
- Focus du jour: {focus_count}/3 tâches épinglées
{f"- Top du jour: \"{top_titre}\"" if top_titre else "- Aucune tâche épinglée pour aujourd'hui"}

Écris un message du matin court (2-3 phrases max), personnalisé et actionnable pour {ctx['prenom']}.
- Mentionne 1 détail concret de son contexte (chiffre, tâche, streak…)
- Pas de "Bonjour" ni de salutation générique
- Va droit au but mais avec ton ton de coach
- Termine par une mini-action ou un focus pour la journée"""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=180, temperature=0.85
        )
        contenu = response.choices[0].message.content.strip()
        c.execute("""INSERT INTO coach_daily_messages (user_id, date_msg, style_coach, contenu)
                     VALUES (%s, %s, %s, %s)
                     ON DUPLICATE KEY UPDATE contenu=VALUES(contenu)""",
                  (user_id, today_str, style, contenu))
        db.commit(); db.close()
        return jsonify({
            "message": contenu,
            "coach": {"nom": coach['nom'], "emoji": coach['emoji'], "style": style},
            "cached": False
        })
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500


@app.route('/ia/coach/rapport/<int:user_id>', methods=['GET'])
def coach_rapport(user_id):
    try:
        style = request.args.get('style', 'bienveillant')
        coach = COACH_STYLES.get(style, COACH_STYLES['bienveillant'])
        db = connecter()
        curseur = db.cursor(dictionary=True)
        ctx = get_coach_context(user_id, curseur)
        curseur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=1 AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)", (user_id,))
        terminees_semaine = curseur.fetchone()['nb']
        curseur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)", (user_id,))
        creees_semaine = curseur.fetchone()['nb']
        prompt = coach['persona'] + f"\n\nRapport coaching pour {ctx['prenom']}:\n- Complétées: {terminees_semaine} | Créées: {creees_semaine} | En retard: {ctx['taches_en_retard']}\n- Taux: {ctx['taux_completion']}% | Streak: {ctx['streak']} jours\nJSON: {{\"titre\": \"\", \"note_semaine\": 7, \"resume\": \"\", \"point_fort\": \"\", \"point_amelioration\": \"\", \"defi_semaine_prochaine\": \"\", \"message_coach\": \"\"}}"
        response = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}], max_tokens=600, temperature=0.75)
        contenu = response.choices[0].message.content.strip()
        if '```json' in contenu: contenu = contenu.split('```json')[1].split('```')[0].strip()
        elif '```' in contenu: contenu = contenu.split('```')[1].split('```')[0].strip()
        rapport = json.loads(contenu)
        rapport['coach'] = {"nom": coach['nom'], "emoji": coach['emoji'], "style": style}
        rapport['stats'] = {"terminees_semaine": terminees_semaine, "creees_semaine": creees_semaine, "taux_completion": ctx['taux_completion'], "streak": ctx['streak']}
        db.close()
        return jsonify(rapport)
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500

@app.route('/ia/coach/historique/<int:user_id>', methods=['GET'])
def get_coach_historique(user_id):
    try:
        style = request.args.get('style', 'bienveillant')
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT role, contenu, created_at FROM coach_messages WHERE user_id=%s AND style_coach=%s ORDER BY created_at DESC LIMIT 20", (user_id, style))
        messages = curseur.fetchall()
        db.close()
        for m in messages: m['created_at'] = str(m['created_at'])
        return jsonify({"messages": list(reversed(messages))})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

# ============================================
# SPRINT 7 — GOAL REVERSE ENGINEERING
# ============================================

@app.route('/ia/goal-reverse', methods=['POST'])
def goal_reverse():
    data = request.json
    user_id = data.get('user_id')
    objectif = data.get('objectif')
    deadline = data.get('deadline')
    niveau = data.get('niveau', 'realiste')
    aujourd_hui = datetime.now().strftime('%Y-%m-%d')
    prompt = f"""Tu es un expert en productivité et planification stratégique.
Fais du Goal Reverse Engineering : pars de l'objectif final et reconstruis le chemin étape par étape.

CONTEXTE : Objectif : {objectif} | Deadline : {deadline} | Niveau : {niveau} | Aujourd'hui : {aujourd_hui}

FORMAT JSON STRICT :
{{
  "duree_semaines": <number>, "score_faisabilite": <number>, "conseil_global": "<string>",
  "risques": ["<string>"],
  "jalons": [{{
    "semaine": <number>, "titre": "<string>", "date_fin": "YYYY-MM-DD", "difficulte": "faible|moyenne|élevée",
    "taches": [{{"titre": "<string>", "duree_estimee": <number>, "priorite": "faible|moyenne|haute", "deadline": "YYYY-MM-DD"}}]
  }}]
}}
Dates entre {aujourd_hui} et {deadline}. Max 8 jalons, 4 tâches par jalon. JSON uniquement."""
    try:
        response = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}], temperature=0.7, max_tokens=2500)
        raw = response.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'): raw = raw[4:]
        result = json.loads(raw)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ia/goal-reverse/importer', methods=['POST'])
def goal_reverse_importer():
    data = request.json
    user_id = data.get('user_id')
    taches = data.get('taches', [])
    ids_crees = []
    try:
        conn = connecter()
        cursor = conn.cursor()
        for t in taches:
            cursor.execute("INSERT INTO taches (titre, priorite, deadline, user_id) VALUES (%s, %s, %s, %s)", (t['titre'], t['priorite'], t['deadline'], user_id))
            ids_crees.append(cursor.lastrowid)
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": f"{len(ids_crees)} tâches importées avec succès", "ids": ids_crees})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# SPRINT 8 — GETSHIFT AI AUGMENTÉ
# ============================================

ABREVIATIONS = {
    "rdv": "rendez-vous", "pb": "problème", "pbl": "problème",
    "msg": "message", "tj": "toujours", "bcp": "beaucoup",
    "tt": "tout", "tjs": "toujours", "pr": "pour", "qd": "quand",
    "dc": "donc", "stp": "s'il te plaît", "svp": "s'il vous plaît",
    "asap": "dès que possible", "fyi": "pour information",
    "mtn": "maintenant", "ac": "avec", "ss": "sans",
    "dsl": "désolé", "jsuis": "je suis", "jvais": "je vais",
    "jpe": "je peux", "jsa": "je sais", "cc": "salut",
    "wsh": "salut", "lgtm": "c'est bon", "tldr": "en résumé",
    "eta": "heure estimée", "imo": "à mon avis", "ok": "d'accord",
}

def expand_abreviations(texte: str) -> str:
    mots = texte.split()
    resultat = []
    for mot in mots:
        mot_clean = mot.rstrip(".,!?;:'\"")
        ponctuation = mot[len(mot_clean):]
        if mot_clean.lower() in ABREVIATIONS:
            expansion = ABREVIATIONS[mot_clean.lower()]
            if mot_clean and mot_clean[0].isupper():
                expansion = expansion.capitalize()
            resultat.append(expansion + ponctuation)
        else:
            resultat.append(mot)
    return " ".join(resultat)

def init_user_memory_table(curseur):
    curseur.execute("""
        CREATE TABLE IF NOT EXISTS user_memory (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            categorie VARCHAR(50) NOT NULL,
            cle VARCHAR(100) NOT NULL,
            valeur TEXT,
            poids FLOAT DEFAULT 1.0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_cle (user_id, categorie, cle),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

def sauvegarder_memoire(user_id: int, observations: list):
    if not observations:
        return
    try:
        db = connecter()
        cur = db.cursor()
        init_user_memory_table(cur)
        for obs in observations:
            cur.execute("""
                INSERT INTO user_memory (user_id, categorie, cle, valeur, poids)
                VALUES (%s, %s, %s, %s, 1.0)
                ON DUPLICATE KEY UPDATE valeur=VALUES(valeur), poids=poids+0.1, updated_at=NOW()
            """, (user_id, obs['categorie'], obs['cle'], obs['valeur']))
        db.commit(); cur.close(); db.close()
    except Exception as e:
        print(f"[Mémoire] Erreur: {e}")

def charger_memoire(user_id: int) -> dict:
    try:
        db = connecter()
        cur = db.cursor(dictionary=True)
        init_user_memory_table(cur)
        cur.execute("SELECT categorie, cle, valeur, poids FROM user_memory WHERE user_id=%s ORDER BY poids DESC, updated_at DESC LIMIT 60", (user_id,))
        rows = cur.fetchall()
        cur.close(); db.close()
        memoire = {}
        for row in rows:
            cat = row['categorie']
            if cat not in memoire: memoire[cat] = []
            memoire[cat].append({"cle": row['cle'], "valeur": row['valeur'], "poids": row['poids']})
        return memoire
    except Exception as e:
        print(f"[Mémoire] Erreur: {e}")
        return {}

def extraire_et_sauvegarder_memoire(user_id: int, message: str, reponse: str):
    observations = []
    message_lower = message.lower()
    if any(w in message_lower for w in ["je préfère", "j'aime", "j'utilise", "mon outil"]):
        observations.append({"categorie": "preferences", "cle": f"pref_{len(message_lower)%100}", "valeur": message[:200]})
    if any(w in message_lower for w in ['matin', 'soir', 'nuit', 'midi', 'après-midi']):
        observations.append({"categorie": "habitudes", "cle": "horaires", "valeur": message[:200]})
    for mot in ['développeur', 'étudiant', 'manager', 'freelance', 'entrepreneur', 'ingénieur', 'designer']:
        if mot in message_lower:
            observations.append({"categorie": "profil", "cle": "metier", "valeur": mot}); break
    if any(w in message_lower for w in ['objectif', 'je veux', 'je dois', 'mon projet']):
        observations.append({"categorie": "objectifs", "cle": f"obj_{len(message)%50}", "valeur": message[:250]})
    for sujet in ['productivité', 'organisation', 'motivation', 'procrastination', 'stress', 'apprentissage']:
        if sujet in message_lower:
            observations.append({"categorie": "sujets", "cle": sujet, "valeur": f"mentionne: {sujet}"})
    if observations:
        threading.Thread(target=sauvegarder_memoire, args=(user_id, observations), daemon=True).start()

def formater_memoire_pour_prompt(memoire: dict) -> str:
    if not memoire: return ""
    lignes = ["MÉMOIRE (conversations précédentes) :"]
    if "profil" in memoire: lignes.append(f"- Profil : {', '.join(m['valeur'] for m in memoire['profil'][:3])}")
    if "preferences" in memoire: lignes.append(f"- Préférences : {' | '.join(m['valeur'][:80] for m in memoire['preferences'][:3])}")
    if "habitudes" in memoire: lignes.append(f"- Habitudes : {' | '.join(m['valeur'][:80] for m in memoire['habitudes'][:2])}")
    if "objectifs" in memoire: lignes.append(f"- Objectifs : {' | '.join(m['valeur'][:100] for m in memoire['objectifs'][:2])}")
    if "sujets" in memoire: lignes.append(f"- Sujets fréquents : {', '.join(m['cle'] for m in memoire['sujets'][:5])}")
    return "\n".join(lignes)

MOTS_SEARCH_OBLIGATOIRE = [
    "recherche", "cherche", "google", "actualité", "news",
    "aujourd'hui", "en ce moment", "récent", "2024", "2025", "2026",
    "prix de", "météo", "qu'est-ce que", "c'est quoi", "qui est", "combien coûte",
]

MOTS_SEARCH_CONTEXTUEL = [
    "tendance", "populaire", "meilleur", "comparaison", "vs",
    "outil", "app", "logiciel", "méthode", "framework",
    "définition", "comment faire", "tutoriel",
]

def evaluer_besoin_search(message: str, historique: list):
    msg_lower = message.lower()
    for mot in MOTS_SEARCH_OBLIGATOIRE:
        if mot in msg_lower:
            query = message.replace("recherche", "").replace("cherche", "").strip()
            return True, (query[:120] if len(query) > 120 else query) or message[:100]
    score = sum(1 for mot in MOTS_SEARCH_CONTEXTUEL if mot in msg_lower)
    if score >= 2 and len(message) > 30:
        return True, message[:100]
    if msg_lower.startswith(("quel", "quels", "quelle", "quelles")) and score >= 1:
        return True, message[:100]
    return False, ""

def web_search_tavily(query: str, max_results: int = 5) -> list:
    try:
        api_key = os.getenv("TAVILY_API_KEY", "")
        if not api_key:
            print("[Tavily] Clé API manquante")
            return []
        payload = {"api_key": api_key, "query": query, "search_depth": "advanced", "max_results": max_results, "include_answer": True, "include_raw_content": False}
        resp = http_requests.post("https://api.tavily.com/search", json=payload, timeout=8, headers={"Content-Type": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        results = []
        if data.get("answer"):
            results.append({"title": "Synthèse", "snippet": data["answer"][:600], "url": "", "source": "Tavily AI", "is_answer": True})
        for r in data.get("results", [])[:max_results]:
            results.append({"title": r.get("title", "")[:120], "snippet": r.get("content", "")[:500], "url": r.get("url", ""), "source": r.get("url", "").split("/")[2] if r.get("url") else "Web", "score": r.get("score", 0), "is_answer": False})
        return results
    except Exception as e:
        print(f"[Tavily] Erreur: {e}")
        return []

def formater_search_pour_prompt(results: list, query: str) -> str:
    if not results:
        return f"[Recherche web '{query}' — aucun résultat]"
    lignes = [f"DONNÉES WEB EN TEMPS RÉEL — requête : \"{query}\"", f"Date : {datetime.now().strftime('%d/%m/%Y')}", ""]
    answers = [r for r in results if r.get('is_answer')]
    sources = [r for r in results if not r.get('is_answer')]
    if answers:
        lignes.append(f"RÉPONSE DIRECTE : {answers[0]['snippet']}")
        lignes.append("")
    lignes.append("SOURCES :")
    for i, r in enumerate(sources, 1):
        lignes.append(f"\n[{i}] {r.get('title', 'Sans titre')}")
        if r.get('snippet'): lignes.append(f"    {r['snippet'][:400]}")
        if r.get('url'): lignes.append(f"    URL : {r['url']}")
    lignes.append("\nUtilise ces données pour répondre avec les infos les plus récentes. Cite les sources naturellement.")
    return "\n".join(lignes)

def detecter_intention(texte: str) -> str:
    t = texte.lower()
    if any(m in t for m in ["crée", "créer", "ajoute", "ajouter", "nouvelle tâche", "add task"]):
        return "action_creer"
    if any(m in t for m in ["marque comme terminée", "termine la tâche", "finis", "coche", "valide la tâche"]):
        return "action_terminer"
    if any(m in t for m in ["planifie", "planifier", "tomorrow builder", "organise ma journée"]):
        return "action_planifier"
    return "chat"

def extraire_titre_tache(prompt: str) -> str:
    for mot in ["crée une tâche", "créer une tâche", "ajoute une tâche", "ajouter une tâche", "nouvelle tâche"]:
        if mot in prompt.lower():
            return prompt.lower().replace(mot, "").strip().capitalize()[:120]
    return prompt.strip().capitalize()[:120]

def build_elite_system_prompt(user_row: dict, taches: list, memoire: dict, contexte_web: str,
                              coach_style: str = None, focus_today: list = None,
                              dna_summary: dict = None, recent_coach: list = None) -> str:
    terminees = sum(1 for t in taches if t.get('terminee'))
    en_cours = [t for t in taches if not t.get('terminee')]
    en_retard = [t for t in en_cours if t.get('deadline') and str(t['deadline']) < datetime.now().strftime('%Y-%m-%d')]
    haute = [t for t in en_cours if t.get('priorite') == 'haute']
    taux = round(terminees / max(len(taches), 1) * 100)
    taches_str = "\n".join(f"  • [{t.get('priorite','?').upper()}] {t['titre']}" + (f" · deadline {str(t['deadline'])[:10]}" if t.get('deadline') else "") for t in en_cours[:8]) or "  • Aucune tâche en cours"
    memoire_str = formater_memoire_pour_prompt(memoire)

    # Persona Coach (lien, pas merge — le Coach a sa voix)
    persona_block = ""
    if coach_style and coach_style in COACH_STYLES:
        coach = COACH_STYLES[coach_style]
        persona_block = f"""━━━ PERSONA ACTIVE — TU ES {coach['nom'].upper()} ━━━
{coach['persona']}
Style : {coach['description']}
IMPORTANT : tu réponds comme {coach['nom']}, pas comme un assistant générique. Garde ce ton dans CHAQUE phrase.

"""

    # Focus du jour bloc
    focus_block = ""
    if focus_today:
        items = "\n".join(f"  ★ [{t.get('priorite','?').upper()}] {t['titre']}" for t in focus_today[:3])
        focus_block = f"━━━ FOCUS DU JOUR ({len(focus_today)}/3 épinglées) ━━━\n{items}\n\n"
    else:
        focus_block = "━━━ FOCUS DU JOUR ━━━\nAucune tâche épinglée pour aujourd'hui — l'utilisateur n'a pas encore choisi ses 3 priorités.\n\n"

    # DNA insights
    dna_block = ""
    if dna_summary and (dna_summary.get('total_analyses') or 0) >= 2:
        dna_block = f"━━━ TASK DNA INSIGHTS (sur {dna_summary['total_analyses']} analyses) ━━━\nScore moyen : {dna_summary.get('score_global', 0)}/100\n"
        cats = dna_summary.get('stats_par_categorie', [])[:3]
        if cats:
            dna_block += "Top catégories : " + " · ".join(f"{c['categorie']} ({c['total']}×, {round(c.get('score_moyen', 0))}/100)" for c in cats) + "\n"
        dna_block += "\n"

    # Recent coach context (pont entre le drawer Coach et IAChat)
    coach_block = ""
    if recent_coach:
        last_msgs = " / ".join(f"{m['role']}: {m['contenu'][:80]}" for m in recent_coach[:3])
        coach_block = f"━━━ DERNIÈRES CONVOS COACH ━━━\n{last_msgs}\n\n"

    base_identity = f"Tu es {COACH_STYLES[coach_style]['nom']}, le coach IA de {user_row['nom']} sur GetShift." if coach_style and coach_style in COACH_STYLES else f"Tu es GetShift AI — l'assistant IA de {user_row['nom']} sur GetShift."

    now = datetime.now()
    date_str = now.strftime("%A %d %B %Y")
    heure_str = now.strftime("%H:%M")

    return f"""{persona_block}{base_identity}

Tu n'es pas un assistant générique. Tu es le spécialiste absolu de la productivité personnelle. Tu combines :
- L'expertise d'un coach certifié (GTD, Deep Work, Atomic Habits, Zettelkasten, Pomodoro, Cal Newport)
- La précision d'un analyste comportemental qui lit les patterns
- L'intelligence d'un assistant qui connaît vraiment {user_row['nom']}
- L'accès au web temps réel via Tavily Search

━━━ DATE & HEURE ACTUELLES ━━━
Aujourd'hui : {date_str} | Heure : {heure_str}
Tu connais la date et l'heure exactes. Si on te demande "on est quel jour ?" ou "quelle heure est-il ?", réponds avec ces valeurs. Ne jamais dire que tu ne sais pas.

━━━ À PROPOS DE GETSHIFT ━━━
GetShift est une application SaaS de productivité IA, fondée par Hamdaane CHITOU (étudiant en data science).
Mission : aider les étudiants et travailleurs à performer davantage grâce à l'IA. Différenciateurs clés : Task DNA (scoring IA), Bin Packing AI, Coach IA (Alex/Max/Nova), gamification (points/niveaux/streak), sync Google Calendar, vues Kanban/Gantt/Calendrier.
Si l'utilisateur te demande qui a créé GetShift, qui est le fondateur, ou des infos sur l'app, réponds avec ces informations.

━━━ PROFIL ━━━
Nom : {user_row['nom']} | Niveau : {user_row.get('niveau', 1)} | Points : {user_row.get('points', 0)} | Streak : {user_row.get('streak', 0)}j
Tâches : {len(taches)} total | {terminees} terminées ({taux}%) | {len(en_cours)} actives | {len(en_retard)} en retard
{f"Urgentes : {', '.join(t['titre'] for t in haute[:3])}" if haute else "Aucune haute priorité urgente"}

{focus_block}━━━ TÂCHES EN COURS ━━━
{taches_str}

{dna_block}{coach_block}{f"━━━ {memoire_str}" if memoire_str else ""}
{f"━━━ DONNÉES WEB TEMPS RÉEL ━━━{chr(10)}{contexte_web}" if contexte_web else ""}

━━━ RÈGLES ABSOLUES ━━━
1. PERSONNALISATION TOTALE — Chaque réponse reflète le contexte de {user_row['nom']}. Zéro réponse générique.
2. FORMAT RICHE — Markdown : ## sections, **gras**, listes, | tableaux |, `code`, ---
3. ACTIONNABLE — Chaque réponse se termine par une action concrète faisable dans les 5 minutes
4. PROACTIF — Si tu détectes procrastination, surcharge ou pattern négatif, tu le dis sans détour
5. CONNECTÉ — Si tu vois un pattern dans le Focus du jour ou DNA, tu l'exploites pour conseiller
6. SOURCES — Si tu utilises des données web, tu cites ("Selon [source]...")
7. LANGUE — Français par défaut
8. LONGUEUR — Question simple = réponse percutante ; complexe = analyse complète mais sans bavardage
9. PERSONA — Si tu joues un coach (Alex/Max/Nova), garde son ton dans CHAQUE phrase, pas seulement la première
10. DATE — Tu connais toujours la date et l'heure actuelles (voir bloc DATE & HEURE ci-dessus). Ne jamais prétendre l'ignorer.

Prouve à chaque réponse que tu es le meilleur assistant de productivité qui existe."""

# ════════════════════════════════════════════════════════════════════
# TOOL USE / FUNCTION CALLING — IA agent qui peut appeler des fonctions
# ════════════════════════════════════════════════════════════════════

GETSHIFT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "creer_tache",
            "description": "Crée une nouvelle tâche dans la liste de l'utilisateur. À utiliser dès que l'utilisateur veut créer/ajouter une tâche, même implicitement.",
            "parameters": {
                "type": "object",
                "properties": {
                    "titre": {"type": "string", "description": "Titre de la tâche, court et actionnable"},
                    "priorite": {"type": "string", "enum": ["haute", "moyenne", "basse"], "description": "Priorité (déduite du contexte)"},
                    "deadline_iso": {"type": "string", "description": "Deadline au format ISO 8601 (ex 2026-05-12T15:00:00) ou null si non précisée"},
                    "epingler_focus_jour": {"type": "boolean", "description": "Si true, épingle au focus du jour (max 3 par jour)"}
                },
                "required": ["titre"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "creer_taches_lot",
            "description": "Crée PLUSIEURS tâches d'un coup. À utiliser quand l'utilisateur décrit plusieurs tâches dans un même message.",
            "parameters": {
                "type": "object",
                "properties": {
                    "taches": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "titre": {"type": "string"},
                                "priorite": {"type": "string", "enum": ["haute", "moyenne", "basse"]},
                                "deadline_iso": {"type": "string"}
                            },
                            "required": ["titre"]
                        }
                    }
                },
                "required": ["taches"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "terminer_tache",
            "description": "Marque une tâche comme terminée. Utilise tache_id si connu, sinon recherche par mots-clés.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tache_id": {"type": "integer", "description": "ID de la tâche (préférer si dispo)"},
                    "recherche": {"type": "string", "description": "Mots-clés pour identifier la tâche si pas d'ID"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "supprimer_tache",
            "description": "Supprime définitivement une tâche.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tache_id": {"type": "integer"},
                    "recherche": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "modifier_tache",
            "description": "Modifie le titre, la priorité ou la deadline d'une tâche existante.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tache_id": {"type": "integer"},
                    "recherche": {"type": "string", "description": "Si pas d'ID, mots-clés pour la trouver"},
                    "nouveau_titre": {"type": "string"},
                    "nouvelle_priorite": {"type": "string", "enum": ["haute", "moyenne", "basse"]},
                    "nouvelle_deadline_iso": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "epingler_focus_jour",
            "description": "Épingle 1 à 3 tâches au Focus du jour (les priorités du jour).",
            "parameters": {
                "type": "object",
                "properties": {
                    "tache_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "Liste d'IDs (max 3 au total déjà épinglés)"
                    }
                },
                "required": ["tache_ids"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lister_taches",
            "description": "Liste les tâches de l'utilisateur avec filtres optionnels.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filtre": {"type": "string", "enum": ["actives", "terminees", "haute", "en_retard", "focus_jour", "toutes"], "description": "Filtre à appliquer"},
                    "limite": {"type": "integer", "description": "Nombre max à retourner (défaut 10)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenir_stats",
            "description": "Récupère les stats de productivité (niveau, points, streak, taux, points semaine).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyser_task_dna",
            "description": "Analyse Task DNA d'une tâche : score de viabilité 0-100 + conseils + facteurs succès/risque.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tache_id": {"type": "integer"},
                    "recherche": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "rechercher_web",
            "description": "Recherche web temps réel via Tavily. À utiliser pour info actuelle, dates récentes, news.",
            "parameters": {
                "type": "object",
                "properties": {
                    "requete": {"type": "string"}
                },
                "required": ["requete"]
            }
        }
    },
]


def trouver_tache_par_recherche(curseur, user_id: int, recherche: str):
    """Trouve la première tâche active matchant les mots-clés (au moins 1 mot commun)."""
    if not recherche:
        return None
    mots_recherche = set(recherche.lower().split())
    curseur.execute("SELECT id, titre, priorite, deadline FROM taches WHERE user_id=%s AND terminee=0 ORDER BY created_at DESC LIMIT 50", (user_id,))
    for t in curseur.fetchall():
        mots_titre = set((t['titre'] or '').lower().split())
        if len(mots_recherche & mots_titre) >= 1:
            return t
    return None


def executer_outil(nom_fonction: str, arguments: dict, user_id: int) -> dict:
    """Exécute un tool appelé par l'IA et retourne le résultat structuré."""
    try:
        db = connecter()
        cur = db.cursor(dictionary=True)
        result = {"tool": nom_fonction, "ok": True}

        if nom_fonction == "creer_tache":
            titre = (arguments.get('titre') or '').strip()
            if not titre:
                db.close()
                return {"tool": nom_fonction, "ok": False, "erreur": "Titre vide"}
            priorite = arguments.get('priorite', 'moyenne')
            deadline = arguments.get('deadline_iso')
            focus = arguments.get('epingler_focus_jour', False)
            cur.execute("INSERT INTO taches (titre, priorite, deadline, user_id) VALUES (%s, %s, %s, %s)", (titre, priorite, deadline, user_id))
            db.commit()
            new_id = cur.lastrowid
            if focus:
                # vérifie qu'on a < 3
                cur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND focus_date=CURDATE() AND terminee=0", (user_id,))
                nb = (cur.fetchone() or {}).get('nb', 0)
                if nb < 3:
                    cur.execute("UPDATE taches SET focus_date=CURDATE() WHERE id=%s", (new_id,))
                    db.commit()
            result.update({"id": new_id, "titre": titre, "priorite": priorite, "deadline": deadline, "focus": focus})

        elif nom_fonction == "creer_taches_lot":
            taches = arguments.get('taches', [])[:10]
            crees = []
            for t in taches:
                titre = (t.get('titre') or '').strip()
                if not titre: continue
                cur.execute("INSERT INTO taches (titre, priorite, deadline, user_id) VALUES (%s, %s, %s, %s)",
                           (titre, t.get('priorite', 'moyenne'), t.get('deadline_iso'), user_id))
                crees.append({"id": cur.lastrowid, "titre": titre, "priorite": t.get('priorite', 'moyenne'), "deadline": t.get('deadline_iso')})
            db.commit()
            result.update({"crees": crees, "nb": len(crees)})

        elif nom_fonction == "terminer_tache":
            tache_id = arguments.get('tache_id')
            if not tache_id:
                t = trouver_tache_par_recherche(cur, user_id, arguments.get('recherche', ''))
                if not t:
                    db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche introuvable"}
                tache_id = t['id']; titre = t['titre']
            else:
                cur.execute("SELECT titre FROM taches WHERE id=%s AND user_id=%s", (tache_id, user_id))
                row = cur.fetchone()
                if not row: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche non trouvée"}
                titre = row['titre']
            cur.execute("UPDATE taches SET terminee=TRUE WHERE id=%s AND user_id=%s", (tache_id, user_id))
            cur.execute("UPDATE users SET points = COALESCE(points,0) + 20 WHERE id=%s", (user_id,))
            db.commit()
            result.update({"id": tache_id, "titre": titre})

        elif nom_fonction == "supprimer_tache":
            tache_id = arguments.get('tache_id')
            if not tache_id:
                t = trouver_tache_par_recherche(cur, user_id, arguments.get('recherche', ''))
                if not t: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche introuvable"}
                tache_id = t['id']; titre = t['titre']
            else:
                cur.execute("SELECT titre FROM taches WHERE id=%s AND user_id=%s", (tache_id, user_id))
                row = cur.fetchone()
                if not row: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche non trouvée"}
                titre = row['titre']
            cur.execute("DELETE FROM taches WHERE id=%s AND user_id=%s", (tache_id, user_id))
            db.commit()
            result.update({"id": tache_id, "titre": titre})

        elif nom_fonction == "modifier_tache":
            tache_id = arguments.get('tache_id')
            if not tache_id:
                t = trouver_tache_par_recherche(cur, user_id, arguments.get('recherche', ''))
                if not t: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche introuvable"}
                tache_id = t['id']
            updates, params = [], []
            if arguments.get('nouveau_titre'):    updates.append("titre=%s");    params.append(arguments['nouveau_titre'])
            if arguments.get('nouvelle_priorite'):updates.append("priorite=%s"); params.append(arguments['nouvelle_priorite'])
            if arguments.get('nouvelle_deadline_iso'): updates.append("deadline=%s"); params.append(arguments['nouvelle_deadline_iso'])
            if not updates:
                db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Aucune modification précisée"}
            params.extend([tache_id, user_id])
            cur.execute(f"UPDATE taches SET {', '.join(updates)} WHERE id=%s AND user_id=%s", tuple(params))
            db.commit()
            cur.execute("SELECT titre, priorite, deadline FROM taches WHERE id=%s", (tache_id,))
            new = cur.fetchone() or {}
            if new.get('deadline'): new['deadline'] = str(new['deadline'])
            result.update({"id": tache_id, "modifications": new})

        elif nom_fonction == "epingler_focus_jour":
            ids = (arguments.get('tache_ids') or [])[:3]
            cur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND focus_date=CURDATE() AND terminee=0", (user_id,))
            deja = (cur.fetchone() or {}).get('nb', 0)
            disponible = max(0, 3 - deja)
            ids = ids[:disponible]
            for tid in ids:
                cur.execute("UPDATE taches SET focus_date=CURDATE() WHERE id=%s AND user_id=%s AND terminee=0", (tid, user_id))
            db.commit()
            result.update({"epinglees": ids, "nb": len(ids)})

        elif nom_fonction == "lister_taches":
            filtre = arguments.get('filtre', 'actives')
            limite = min(arguments.get('limite', 10), 30)
            where = "user_id=%s"
            if filtre == "actives":     where += " AND terminee=0"
            elif filtre == "terminees": where += " AND terminee=1"
            elif filtre == "haute":     where += " AND terminee=0 AND priorite='haute'"
            elif filtre == "en_retard": where += " AND terminee=0 AND deadline < NOW()"
            elif filtre == "focus_jour":where += " AND focus_date=CURDATE() AND terminee=0"
            cur.execute(f"SELECT id, titre, priorite, deadline, terminee, focus_date FROM taches WHERE {where} ORDER BY created_at DESC LIMIT %s", (user_id, limite))
            rows = cur.fetchall()
            for r in rows:
                if r.get('deadline'): r['deadline'] = str(r['deadline'])
                if r.get('focus_date'): r['focus_date'] = str(r['focus_date'])
            result.update({"filtre": filtre, "taches": rows, "nb": len(rows)})

        elif nom_fonction == "obtenir_stats":
            cur.execute("SELECT points, niveau, streak FROM users WHERE id=%s", (user_id,))
            u = cur.fetchone() or {}
            cur.execute("""SELECT
                COUNT(CASE WHEN terminee=1 AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_semaine,
                COUNT(CASE WHEN terminee=1 THEN 1 END) as terminees_total,
                COUNT(*) as total,
                COUNT(CASE WHEN terminee=0 AND deadline < NOW() THEN 1 END) as en_retard
                FROM taches WHERE user_id=%s""", (user_id,))
            cnt = cur.fetchone() or {}
            result.update({
                "points": u.get('points') or 0, "niveau": u.get('niveau') or 1, "streak": u.get('streak') or 0,
                "terminees_semaine": cnt.get('terminees_semaine') or 0,
                "terminees_total": cnt.get('terminees_total') or 0,
                "total": cnt.get('total') or 0,
                "en_retard": cnt.get('en_retard') or 0,
                "points_semaine": (cnt.get('terminees_semaine') or 0) * 10,
            })

        elif nom_fonction == "analyser_task_dna":
            tache_id = arguments.get('tache_id')
            if not tache_id:
                t = trouver_tache_par_recherche(cur, user_id, arguments.get('recherche', ''))
                if not t: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche introuvable"}
                tache_id = t['id']; titre = t['titre']; priorite = t['priorite']
            else:
                cur.execute("SELECT titre, priorite FROM taches WHERE id=%s AND user_id=%s", (tache_id, user_id))
                row = cur.fetchone()
                if not row: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche non trouvée"}
                titre = row['titre']; priorite = row['priorite']
            # Stats utilisateur
            cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN terminee=1 THEN 1 ELSE 0 END) as done FROM taches WHERE user_id=%s", (user_id,))
            s = cur.fetchone() or {}
            taux = round((s.get('done') or 0) / max(s.get('total') or 1, 1) * 100)
            duree = estimer_duree_tache(titre, priorite or 'moyenne') if 'estimer_duree_tache' in globals() else 30
            prompt = f"Analyse cette tache: \"{titre}\" priorite {priorite}. Taux user {taux}%. Reponds JSON: {{\"score_viabilite\":0-100, \"conseil_principal\":\"\", \"facteurs_succes\":[], \"facteurs_risque\":[]}}"
            try:
                resp = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role":"user","content":prompt}], max_tokens=500, temperature=0.5)
                contenu = resp.choices[0].message.content.strip()
                if '```json' in contenu: contenu = contenu.split('```json')[1].split('```')[0].strip()
                elif '```' in contenu:    contenu = contenu.split('```')[1].split('```')[0].strip()
                dna = json.loads(contenu)
            except Exception as e:
                dna = {"score_viabilite": 60, "conseil_principal": "DNA indisponible", "facteurs_succes": [], "facteurs_risque": []}
            result.update({"id": tache_id, "titre": titre, "dna": dna})

        elif nom_fonction == "rechercher_web":
            requete = arguments.get('requete', '').strip()
            if not requete: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Requête vide"}
            results_web = web_search_tavily(requete, max_results=5)
            result.update({"requete": requete, "results": results_web, "nb": len(results_web)})

        else:
            db.close()
            return {"tool": nom_fonction, "ok": False, "erreur": f"Outil inconnu : {nom_fonction}"}

        cur.close(); db.close()
        return result
    except Exception as e:
        try: db.close()
        except: pass
        import traceback
        return {"tool": nom_fonction, "ok": False, "erreur": str(e)[:200], "trace": traceback.format_exc()[:300]}


@app.route('/ia/assistant', methods=['POST'])
def assistant_augmente():
    try:
        data = request.get_json()
        user_id     = data.get('user_id')
        message_raw = data.get('message', '').strip()
        modele      = data.get('modele', 'llama-3.3-70b-versatile')
        historique  = data.get('historique', [])
        tache_id    = data.get('tache_id')
        force_search = data.get('force_search', False)
        coach_style = data.get('coach_style')
        attachment_text = data.get('attachment_text', '')  # texte extrait d'un fichier uploadé  # 'bienveillant' / 'motivateur' / 'analytique' / None

        if not message_raw:
            return jsonify({"erreur": "Message vide"}), 400

        # 1. Abréviations
        message = expand_abreviations(message_raw)
        abrev_expandees = message != message_raw

        # 2. Contexte utilisateur
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT nom, email, points, niveau, streak FROM users WHERE id=%s", (user_id,))
        user_row = curseur.fetchone()
        if not user_row:
            db.close()
            return jsonify({"erreur": "Utilisateur introuvable"}), 404

        curseur.execute("SELECT id, titre, priorite, deadline, terminee, focus_date FROM taches WHERE user_id=%s ORDER BY terminee ASC, created_at DESC LIMIT 25", (user_id,))
        taches = curseur.fetchall()
        for t in taches:
            if t.get('deadline'): t['deadline'] = str(t['deadline'])
            if t.get('focus_date'): t['focus_date'] = str(t['focus_date'])

        # Focus du jour (3 max)
        focus_today = [t for t in taches if not t.get('terminee') and t.get('focus_date') and str(t['focus_date'])[:10] == datetime.now().strftime('%Y-%m-%d')][:3]

        # DNA summary (réutilise la logique de /ia/task-dna/stats)
        dna_summary = None
        try:
            curseur.execute("SELECT categorie, COUNT(*) as total, AVG(score_viabilite) as score_moyen FROM task_dna_analyses WHERE user_id=%s GROUP BY categorie ORDER BY total DESC LIMIT 5", (user_id,))
            stats_cat = curseur.fetchall()
            curseur.execute("SELECT AVG(score_viabilite) as score_global, COUNT(*) as total FROM task_dna_analyses WHERE user_id=%s", (user_id,))
            g = curseur.fetchone() or {}
            if g.get('total'):
                dna_summary = {
                    "score_global": round(g.get('score_global') or 0),
                    "total_analyses": g.get('total') or 0,
                    "stats_par_categorie": stats_cat,
                }
        except Exception:
            pass

        # Récents échanges Coach (pont entre drawer Coach et IAChat)
        recent_coach = []
        try:
            curseur.execute("SELECT role, contenu FROM coach_messages WHERE user_id=%s ORDER BY created_at DESC LIMIT 6", (user_id,))
            recent_coach = curseur.fetchall()
            recent_coach.reverse()
        except Exception:
            pass

        # 3. Mémoire
        memoire = charger_memoire(user_id)

        # 4. Intention (kept pour debug/UI, mais les ACTIONS sont déléguées au tool calling)
        intention = detecter_intention(message)

        db.close()

        # 5. Web search
        contexte_web = ""
        search_results = []
        faire_search, query_search = evaluer_besoin_search(message, historique)
        if force_search or faire_search:
            query = message[:100] if force_search else query_search
            search_results = web_search_tavily(query, max_results=5)
            contexte_web = formater_search_pour_prompt(search_results, query)

        # 6. System prompt élite (enrichi avec persona Coach + Focus + DNA + Coach history)
        system_prompt = build_elite_system_prompt(
            user_row, taches, memoire, contexte_web,
            coach_style=coach_style,
            focus_today=focus_today,
            dna_summary=dna_summary,
            recent_coach=recent_coach,
        )

        # 7. Messages API
        messages_api = [{"role": "system", "content": system_prompt}]
        for h in historique[-16:]:
            role = "assistant" if h.get('role') in ('ia', 'assistant') else "user"
            messages_api.append({"role": role, "content": h.get('content', '')})

        # Injecter le contenu d'un fichier uploadé en contexte avant le message user
        user_content = message
        if attachment_text:
            user_content = f"[FICHIER UPLOADÉ — voici son contenu :]\n\n{attachment_text}\n\n[FIN DU FICHIER]\n\n{message}"
        messages_api.append({"role": "user", "content": user_content})

        # 8. Appel Groq AVEC TOOL USE — l'IA peut appeler nos fonctions GetShift
        # Loop : modèle → tool_calls? → exécuter → re-call avec résultats → ... jusqu'à done
        actions_executees = []
        max_tours = 5  # garde-fou anti-loop infini
        tour = 0
        while tour < max_tours:
            tour += 1
            completion = groq_client.chat.completions.create(
                model=modele, messages=messages_api,
                tools=GETSHIFT_TOOLS, tool_choice="auto",
                max_tokens=2000, temperature=0.6,
            )
            choice = completion.choices[0]
            msg = choice.message

            # Si l'IA appelle des outils → exécuter et re-prompter
            if msg.tool_calls:
                # Ajouter le message assistant (avec ses tool_calls) à l'historique
                messages_api.append({
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                        for tc in msg.tool_calls
                    ]
                })
                # Exécuter chaque tool call
                for tc in msg.tool_calls:
                    fn_name = tc.function.name
                    try: fn_args = json.loads(tc.function.arguments or '{}')
                    except: fn_args = {}
                    res = executer_outil(fn_name, fn_args, user_id)
                    actions_executees.append(res)
                    # Renvoyer le résultat au modèle
                    messages_api.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(res, default=str)[:3000],
                    })
                continue  # Boucle pour qu'il termine sa réponse

            # Pas de tool call → réponse finale
            reponse = (msg.content or "").strip()
            break
        else:
            reponse = "(L'IA a effectué plusieurs actions mais n'a pas pu finaliser la réponse texte.)"

        # 9. Historique + mémoire
        try:
            db2 = connecter()
            cur2 = db2.cursor()
            cur2.execute("INSERT INTO historique_ia (user_id, prompt, reponse, modele, tache_id) VALUES (%s,%s,%s,%s,%s)", (user_id, message_raw, reponse, modele, tache_id))
            db2.commit(); cur2.close(); db2.close()
        except Exception as e:
            print(f"[Assistant] Erreur historique: {e}")

        threading.Thread(target=extraire_et_sauvegarder_memoire, args=(user_id, message_raw, reponse), daemon=True).start()

        # Détecter intention principale à partir des actions
        intention_finale = "chat"
        if any(a.get('tool') == 'creer_tache' or a.get('tool') == 'creer_taches_lot' for a in actions_executees):
            intention_finale = "action_creer"
        elif any(a.get('tool') == 'terminer_tache' for a in actions_executees):
            intention_finale = "action_terminer"
        elif any(a.get('tool') == 'rechercher_web' for a in actions_executees) or faire_search or force_search:
            intention_finale = "search"

        return jsonify({
            "reponse": reponse,
            "intention": intention_finale,
            "action": None,
            "actions": actions_executees,  # NOUVEAU : liste de toutes les actions tool exécutées
            "abrev_expandees": abrev_expandees,
            "message_original": message_raw,
            "message_expande": message if abrev_expandees else None,
            "search_results": search_results if search_results else None,
            "web_searched": bool(search_results) or any(a.get('tool') == 'rechercher_web' for a in actions_executees),
            "modele": modele,
        })

    except Exception as e:
        import traceback
        print(f"[GetShift AI] Erreur: {e}")
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500

@app.route('/ia/assistant/stream', methods=['POST'])
def assistant_stream():
    """
    Variante streaming SSE de /ia/assistant — pour effet ChatGPT/Claude.
    Envoie les tokens au fur et à mesure que Groq les génère.
    Ne gère QUE le mode 'chat' (pas les actions create/terminer/planifier qui restent sur /ia/assistant).
    Si une action est détectée, le client doit refallback sur /ia/assistant non-stream.
    """
    from flask import Response, stream_with_context
    try:
        data = request.get_json()
        user_id      = data.get('user_id')
        message_raw  = data.get('message', '').strip()
        modele       = data.get('modele', 'llama-3.3-70b-versatile')
        historique   = data.get('historique', [])
        force_search    = data.get('force_search', False)
        coach_style     = data.get('coach_style')
        attachment_text = data.get('attachment_text', '')

        if not message_raw or not user_id:
            return jsonify({"erreur": "user_id et message requis"}), 400

        message = expand_abreviations(message_raw)

        # Charge le contexte une fois
        db = connecter()
        c = db.cursor(dictionary=True)
        c.execute("SELECT nom, email, points, niveau, streak FROM users WHERE id=%s", (user_id,))
        user_row = c.fetchone()
        if not user_row:
            db.close()
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        c.execute("SELECT id, titre, priorite, deadline, terminee, focus_date FROM taches WHERE user_id=%s ORDER BY terminee ASC, created_at DESC LIMIT 25", (user_id,))
        taches = c.fetchall()
        for t in taches:
            if t.get('deadline'): t['deadline'] = str(t['deadline'])
            if t.get('focus_date'): t['focus_date'] = str(t['focus_date'])
        focus_today = [t for t in taches if not t.get('terminee') and t.get('focus_date') and str(t['focus_date'])[:10] == datetime.now().strftime('%Y-%m-%d')][:3]
        # DNA
        dna_summary = None
        try:
            c.execute("SELECT categorie, COUNT(*) as total, AVG(score_viabilite) as score_moyen FROM task_dna_analyses WHERE user_id=%s GROUP BY categorie ORDER BY total DESC LIMIT 5", (user_id,))
            stats_cat = c.fetchall()
            c.execute("SELECT AVG(score_viabilite) as score_global, COUNT(*) as total FROM task_dna_analyses WHERE user_id=%s", (user_id,))
            g = c.fetchone() or {}
            if g.get('total'):
                dna_summary = {"score_global": round(g.get('score_global') or 0), "total_analyses": g.get('total') or 0, "stats_par_categorie": stats_cat}
        except Exception:
            pass
        # Coach recent
        recent_coach = []
        try:
            c.execute("SELECT role, contenu FROM coach_messages WHERE user_id=%s ORDER BY created_at DESC LIMIT 6", (user_id,))
            recent_coach = c.fetchall(); recent_coach.reverse()
        except Exception:
            pass
        memoire = charger_memoire(user_id)
        db.close()

        # Web search (sync, avant le stream)
        contexte_web = ""
        search_results = []
        faire_search, query_search = evaluer_besoin_search(message, historique)
        if force_search or faire_search:
            query = message[:100] if force_search else query_search
            search_results = web_search_tavily(query, max_results=5)
            contexte_web = formater_search_pour_prompt(search_results, query)

        system_prompt = build_elite_system_prompt(
            user_row, taches, memoire, contexte_web,
            coach_style=coach_style, focus_today=focus_today,
            dna_summary=dna_summary, recent_coach=recent_coach,
        )

        messages_api = [{"role": "system", "content": system_prompt}]
        for h in historique[-16:]:
            role = "assistant" if h.get('role') in ('ia', 'assistant') else "user"
            messages_api.append({"role": role, "content": h.get('content', '')})
        user_content_stream = message
        if attachment_text:
            user_content_stream = f"[FICHIER UPLOADÉ — voici son contenu :]\n\n{attachment_text}\n\n[FIN DU FICHIER]\n\n{message}"
        messages_api.append({"role": "user", "content": user_content_stream})

        def generate():
            full_response_parts = []
            # Métadonnées au tout début (1 ligne JSON)
            meta = {
                "type": "meta",
                "search_results": search_results if search_results else None,
                "web_searched": bool(search_results),
                "intention": "search" if (faire_search or force_search) else "chat",
                "modele": modele,
            }
            yield f"data: {json.dumps(meta)}\n\n"
            try:
                stream = groq_client.chat.completions.create(
                    model=modele, messages=messages_api,
                    max_tokens=2000, temperature=0.72, stream=True,
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                    if delta:
                        full_response_parts.append(delta)
                        yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"
                full_response = "".join(full_response_parts)
                yield f"data: {json.dumps({'type': 'done', 'full': full_response})}\n\n"
                # Side effects post-stream (historique + mémoire)
                try:
                    db2 = connecter(); cur2 = db2.cursor()
                    cur2.execute("INSERT INTO historique_ia (user_id, prompt, reponse, modele, tache_id) VALUES (%s,%s,%s,%s,%s)", (user_id, message_raw, full_response, modele, None))
                    db2.commit(); cur2.close(); db2.close()
                except Exception as e:
                    print(f"[Stream] historique err: {e}")
                threading.Thread(target=extraire_et_sauvegarder_memoire, args=(user_id, message_raw, full_response), daemon=True).start()
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return Response(stream_with_context(generate()), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        })
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()}), 500


@app.route('/ia/suggestions/<int:user_id>', methods=['GET'])
def ia_suggestions(user_id):
    """
    Retourne 4 suggestions contextuelles pour l'écran d'accueil de IAChat.
    Rules-based (pas de Groq) → instantané + free.
    """
    try:
        from datetime import date
        db = connecter()
        c = db.cursor(dictionary=True)
        c.execute("SELECT nom, streak FROM users WHERE id=%s", (user_id,))
        u = c.fetchone() or {}
        prenom = (u.get('nom') or 'toi').split(' ')[0]
        streak = u.get('streak') or 0

        c.execute("""SELECT
            COUNT(CASE WHEN terminee=0 AND deadline < NOW() THEN 1 END) as en_retard,
            COUNT(CASE WHEN terminee=0 AND priorite='haute' THEN 1 END) as haute,
            COUNT(CASE WHEN terminee=0 THEN 1 END) as actives,
            COUNT(CASE WHEN terminee=1 AND DATE(updated_at)=CURDATE() THEN 1 END) as terminees_aujourdhui,
            COUNT(CASE WHEN focus_date=CURDATE() AND terminee=0 THEN 1 END) as focus_jour
            FROM taches WHERE user_id=%s""", (user_id,))
        cnt = c.fetchone() or {}

        c.execute("SELECT titre FROM taches WHERE user_id=%s AND terminee=0 AND priorite='haute' ORDER BY deadline ASC LIMIT 1", (user_id,))
        top_haute = c.fetchone()

        # DNA
        c.execute("SELECT COUNT(*) as nb FROM task_dna_analyses WHERE user_id=%s", (user_id,))
        dna_count = (c.fetchone() or {}).get('nb', 0)
        db.close()

        suggestions = []
        # 1. En retard prioritaire
        if (cnt.get('en_retard') or 0) > 0:
            n = cnt['en_retard']
            suggestions.append({
                "icon": "AlertCircle", "color": "#ef4444",
                "text": f"J'ai {n} tâche{'s' if n>1 else ''} en retard. Aide-moi à les rattraper en priorité.",
                "grad": "linear-gradient(135deg,#ef4444,#f59e0b)",
            })
        # 2. Focus du jour vide
        if (cnt.get('focus_jour') or 0) == 0 and (cnt.get('actives') or 0) > 0:
            suggestions.append({
                "icon": "Target", "color": "#a855f7",
                "text": "Choisis mes 3 priorités du jour parmi mes tâches actives.",
                "grad": "linear-gradient(135deg,#a855f7,#ec4899)",
            })
        # 3. Top haute priorité actionable
        if top_haute and top_haute.get('titre'):
            t = top_haute['titre'][:60]
            suggestions.append({
                "icon": "Zap", "color": "#f59e0b",
                "text": f"Décompose la tâche \"{t}\" en sous-étapes.",
                "grad": "linear-gradient(135deg,#f59e0b,#ef4444)",
            })
        # 4. Streak motivation
        if streak >= 3:
            suggestions.append({
                "icon": "Flame", "color": "#f97316",
                "text": f"{streak} jours de streak ! Comment je maintiens cette dynamique ?",
                "grad": "linear-gradient(135deg,#f97316,#ec4899)",
            })
        elif streak == 0 and (cnt.get('actives') or 0) > 0:
            suggestions.append({
                "icon": "Flame", "color": "#f97316",
                "text": "Aide-moi à créer une routine quotidienne pour démarrer un streak.",
                "grad": "linear-gradient(135deg,#f97316,#ec4899)",
            })
        # 5. DNA insight si dispo
        if dna_count >= 2:
            suggestions.append({
                "icon": "Brain", "color": "#0ea5e9",
                "text": "Analyse mes patterns de productivité (Task DNA) et donne-moi 3 conseils.",
                "grad": "linear-gradient(135deg,#0ea5e9,#a855f7)",
            })
        # 6. Plan semaine si peu d'actions
        if len(suggestions) < 4:
            suggestions.append({
                "icon": "Calendar", "color": "#6c63ff",
                "text": f"Construis-moi un plan d'action pour la semaine, {prenom}.",
                "grad": "linear-gradient(135deg,#6c63ff,#a855f7)",
            })
        if len(suggestions) < 4:
            suggestions.append({
                "icon": "Sparkles", "color": "#10b981",
                "text": "Comment optimiser mes 2 prochaines heures pour être au max ?",
                "grad": "linear-gradient(135deg,#10b981,#0ea5e9)",
            })
        if len(suggestions) < 4:
            suggestions.append({
                "icon": "Globe", "color": "#0ea5e9",
                "text": "Cherche les 3 meilleures techniques de productivité pour étudiants/travailleurs.",
                "grad": "linear-gradient(135deg,#0ea5e9,#06b6d4)",
            })

        return jsonify({"suggestions": suggestions[:4]})
    except Exception as e:
        return jsonify({"erreur": str(e), "suggestions": []}), 500


@app.route('/ia/web-search', methods=['POST'])
def route_web_search():
    data = request.get_json()
    query = data.get('query', '').strip()
    if not query: return jsonify({"erreur": "Query vide"}), 400
    results = web_search_tavily(query, max_results=5)
    return jsonify({"results": results, "query": query, "count": len(results)})

@app.route('/ia/memory/<int:user_id>', methods=['GET'])
def get_user_memory(user_id):
    memoire = charger_memoire(user_id)
    return jsonify({"memoire": memoire, "total_entrees": sum(len(v) for v in memoire.values())})

@app.route('/ia/memory/<int:user_id>', methods=['DELETE'])
def clear_user_memory(user_id):
    try:
        db = connecter()
        cur = db.cursor()
        cur.execute("DELETE FROM user_memory WHERE user_id=%s", (user_id,))
        db.commit(); cur.close(); db.close()
        return jsonify({"message": "Mémoire effacée"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/ia/memory/<int:user_id>/<int:memory_id>', methods=['DELETE'])
def delete_one_memory(user_id, memory_id):
    """Supprime une entrée de mémoire spécifique."""
    try:
        db = connecter()
        cur = db.cursor()
        cur.execute("DELETE FROM user_memory WHERE id=%s AND user_id=%s", (memory_id, user_id))
        affected = cur.rowcount
        db.commit(); cur.close(); db.close()
        if affected == 0:
            return jsonify({"erreur": "Mémoire non trouvée"}), 404
        return jsonify({"message": "Souvenir oublié"})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/ia/memory/<int:user_id>/full', methods=['GET'])
def get_user_memory_full(user_id):
    """Retourne toutes les entrées de mémoire avec leurs id pour pouvoir les supprimer."""
    try:
        db = connecter()
        cur = db.cursor(dictionary=True)
        cur.execute("CREATE TABLE IF NOT EXISTS user_memory (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, categorie VARCHAR(50), cle VARCHAR(150), valeur TEXT, poids INT DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)")
        cur.execute("SELECT id, categorie, cle, valeur, poids, created_at FROM user_memory WHERE user_id=%s ORDER BY poids DESC, created_at DESC LIMIT 100", (user_id,))
        rows = cur.fetchall()
        for r in rows:
            if r.get('created_at'): r['created_at'] = str(r['created_at'])
        cur.close(); db.close()
        return jsonify({"items": rows, "total": len(rows)})
    except Exception as e:
        return jsonify({"erreur": str(e), "items": []}), 500

@app.route('/ia/upload-extract', methods=['POST'])
def ia_upload_extract():
    """
    Reçoit un fichier (PDF, image, txt) → extrait le texte → laisse l'IA en faire des tâches.
    Retourne juste le texte extrait pour que le frontend l'envoie comme contexte.
    """
    import base64
    try:
        if 'file' not in request.files:
            return jsonify({"erreur": "Aucun fichier"}), 400
        f = request.files['file']
        if not f or not f.filename:
            return jsonify({"erreur": "Fichier vide"}), 400

        filename = f.filename.lower()
        contenu_extrait = ""

        # ── TXT/MD ────────────────────────────────────────────────
        if filename.endswith(('.txt', '.md', '.markdown')):
            contenu_extrait = f.read().decode('utf-8', errors='replace')

        # ── PDF ───────────────────────────────────────────────────
        elif filename.endswith('.pdf'):
            try:
                from pypdf import PdfReader
                reader = PdfReader(f)
                pages = []
                for p in reader.pages[:30]:  # max 30 pages
                    try: pages.append(p.extract_text() or "")
                    except: pass
                contenu_extrait = "\n\n".join(pages)
            except ImportError:
                # Fallback : tente avec PyPDF2
                try:
                    from PyPDF2 import PdfReader
                    reader = PdfReader(f)
                    contenu_extrait = "\n\n".join((p.extract_text() or "") for p in reader.pages[:30])
                except Exception:
                    return jsonify({"erreur": "PDF non supportable côté serveur (lib manquante)"}), 500

        # ── EXCEL ─────────────────────────────────────────────────
        elif filename.endswith(('.xlsx', '.xls')):
            try:
                import openpyxl, io
                wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
                lignes = []
                for sheet in wb.worksheets:
                    lignes.append(f"=== Feuille : {sheet.title} ===")
                    for row in sheet.iter_rows(values_only=True):
                        if any(cell is not None for cell in row):
                            lignes.append("\t".join("" if cell is None else str(cell) for cell in row))
                contenu_extrait = "\n".join(lignes)
            except Exception as e:
                return jsonify({"erreur": f"Lecture Excel impossible : {str(e)[:200]}"}), 500

        # ── CSV ────────────────────────────────────────────────────
        elif filename.endswith('.csv'):
            import csv, io as sio
            text = f.read().decode('utf-8', errors='replace')
            reader = csv.reader(sio.StringIO(text))
            contenu_extrait = "\n".join("\t".join(row) for row in reader)

        # ── WORD ──────────────────────────────────────────────────
        elif filename.endswith('.docx'):
            try:
                from docx import Document
                import io
                doc = Document(io.BytesIO(f.read()))
                contenu_extrait = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            except Exception as e:
                return jsonify({"erreur": f"Lecture Word impossible : {str(e)[:200]}"}), 500

        # ── IMAGE → Groq Vision ───────────────────────────────────
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
            try:
                file_bytes = f.read()
                if len(file_bytes) > 4 * 1024 * 1024:
                    return jsonify({"erreur": "Image trop grande (max 4 Mo)"}), 400
                b64 = base64.b64encode(file_bytes).decode('utf-8')
                mime = 'image/jpeg' if filename.endswith(('.jpg', '.jpeg')) else 'image/png' if filename.endswith('.png') else 'image/webp'
                # Groq vision model
                vision_resp = groq_client.chat.completions.create(
                    model="llama-3.2-90b-vision-preview",
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extrais TOUT le texte visible sur cette image (planning, syllabus, notes, calendrier, capture d'écran...). Retourne uniquement le texte, structuré si possible. Si tu vois des dates/horaires/tâches, conserve-les exactement comme elles apparaissent."},
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                        ]
                    }],
                    max_tokens=2000, temperature=0.2,
                )
                contenu_extrait = vision_resp.choices[0].message.content.strip()
            except Exception as e:
                return jsonify({"erreur": f"Vision IA indisponible : {str(e)[:200]}"}), 500
        else:
            ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'inconnu'
            return jsonify({"erreur": f"Type non supporté (.{ext}). Formats acceptés : PDF, Word, Excel, CSV, TXT, MD, images."}), 400

        # Limiter la taille
        if len(contenu_extrait) > 12000:
            contenu_extrait = contenu_extrait[:12000] + "\n\n[…contenu tronqué]"

        return jsonify({
            "texte": contenu_extrait,
            "filename": f.filename,
            "type": filename.rsplit('.', 1)[-1] if '.' in filename else 'unknown',
            "longueur": len(contenu_extrait),
        })
    except Exception as e:
        import traceback
        return jsonify({"erreur": str(e), "trace": traceback.format_exc()[:500]}), 500


@app.route('/ia/expand-abreviations', methods=['POST'])
def route_expand_abreviations():
    data = request.get_json()
    texte = data.get('texte', '')
    expande = expand_abreviations(texte)
    return jsonify({"original": texte, "expande": expande, "modifie": texte != expande})


# ============================================
# BACKUP AUTOMATIQUE QUOTIDIEN — MINUIT

def job_backup_quotidien():
    """
    Backup quotidien à minuit :
    1. Dump SQL complet de toutes les tables
    2. Stockage dans la table backups (Aiven)
    3. Envoi par email à l'admin
    """
    debut = datetime.now()
    print(f"[Backup] Démarrage à {debut.strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)

        # ── Créer la table de stockage des backups si elle n'existe pas ──
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS backups_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(200) NOT NULL,
                taille_ko INT DEFAULT 0,
                nb_tables INT DEFAULT 0,
                nb_lignes_total INT DEFAULT 0,
                statut VARCHAR(20) DEFAULT 'succes',
                erreur TEXT,
                duree_secondes FLOAT DEFAULT 0,
                cree_le DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS backups_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                backup_log_id INT NOT NULL,
                contenu LONGTEXT,
                cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (backup_log_id) REFERENCES backups_log(id) ON DELETE CASCADE
            )
        """)
        db.commit()

        # ── Récupérer la liste de toutes les tables ──
        curseur.execute("SHOW TABLES")
        tables = [list(row.values())[0] for row in curseur.fetchall()]

        # Tables à exclure du backup (optionnel)
        tables_exclure = ['backups_data']  # éviter backup récursif
        tables = [t for t in tables if t not in tables_exclure]

        dump_lines = []
        nb_lignes_total = 0

        dump_lines.append(f"-- GetShift Database Backup")
        dump_lines.append(f"-- Date : {debut.strftime('%Y-%m-%d %H:%M:%S')}")
        dump_lines.append(f"-- Tables : {len(tables)}")
        dump_lines.append(f"-- ============================================")
        dump_lines.append("")
        dump_lines.append("SET FOREIGN_KEY_CHECKS=0;")
        dump_lines.append("")

        for table in tables:
            try:
                # Structure de la table
                curseur.execute(f"SHOW CREATE TABLE `{table}`")
                create_result = curseur.fetchone()
                create_sql = list(create_result.values())[1]

                dump_lines.append(f"-- Table : {table}")
                dump_lines.append(f"DROP TABLE IF EXISTS `{table}`;")
                dump_lines.append(f"{create_sql};")
                dump_lines.append("")

                # Données
                curseur.execute(f"SELECT * FROM `{table}`")
                rows = curseur.fetchall()
                nb_lignes_total += len(rows)

                if rows:
                    colonnes = list(rows[0].keys())
                    cols_str = ", ".join(f"`{c}`" for c in colonnes)

                    for row in rows:
                        vals = []
                        for val in row.values():
                            if val is None:
                                vals.append("NULL")
                            elif isinstance(val, (int, float)):
                                vals.append(str(val))
                            elif isinstance(val, datetime):
                                vals.append(f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'")
                            elif hasattr(val, 'strftime'):
                                vals.append(f"'{val.strftime('%Y-%m-%d')}'")
                            else:
                                # Échapper les quotes
                                escaped = str(val).replace("\\", "\\\\").replace("'", "\\'")
                                vals.append(f"'{escaped}'")
                        vals_str = ", ".join(vals)
                        dump_lines.append(f"INSERT INTO `{table}` ({cols_str}) VALUES ({vals_str});")

                dump_lines.append("")

            except Exception as e:
                dump_lines.append(f"-- ERREUR table {table}: {e}")
                dump_lines.append("")

        dump_lines.append("SET FOREIGN_KEY_CHECKS=1;")
        dump_lines.append("")
        dump_lines.append(f"-- Fin du backup — {nb_lignes_total} lignes exportées")

        contenu_sql = "\n".join(dump_lines)
        taille_ko = len(contenu_sql.encode('utf-8')) // 1024
        duree = (datetime.now() - debut).total_seconds()
        nom_backup = f"getshift_backup_{debut.strftime('%Y%m%d_%H%M%S')}.sql"

        # ── Stocker dans Aiven (backups_log + backups_data) ──
        curseur.execute("""
            INSERT INTO backups_log (nom, taille_ko, nb_tables, nb_lignes_total, statut, duree_secondes)
            VALUES (%s, %s, %s, %s, 'succes', %s)
        """, (nom_backup, taille_ko, len(tables), nb_lignes_total, round(duree, 2)))
        backup_id = curseur.lastrowid

        curseur.execute("""
            INSERT INTO backups_data (backup_log_id, contenu)
            VALUES (%s, %s)
        """, (backup_id, contenu_sql))
        db.commit()

        # Garder seulement les 7 derniers backups dans Aiven (éviter surcharge)
        curseur.execute("""
            DELETE bd FROM backups_data bd
            JOIN backups_log bl ON bd.backup_log_id = bl.id
            WHERE bl.id NOT IN (
                SELECT id FROM (
                    SELECT id FROM backups_log ORDER BY cree_le DESC LIMIT 7
                ) AS recent
            )
        """)
        curseur.execute("""
            DELETE FROM backups_log
            WHERE id NOT IN (
                SELECT id FROM (
                    SELECT id FROM backups_log ORDER BY cree_le DESC LIMIT 7
                ) AS recent
            )
        """)
        db.commit()
        curseur.close()
        db.close()

        print(f"[Backup] Stocké dans Aiven — {taille_ko} Ko, {nb_lignes_total} lignes, {len(tables)} tables")

        # ── Envoyer par email ──
        _envoyer_backup_email(nom_backup, contenu_sql, taille_ko, nb_lignes_total, len(tables), round(duree, 2))

    except Exception as e:
        import traceback
        print(f"[Backup] ERREUR: {e}\n{traceback.format_exc()}")
        # Notifier l'admin de l'échec
        try:
            html_erreur = f"""
            <div style="font-family:Arial;max-width:500px;margin:auto;background:#0f0f13;color:#f0f0f5;padding:40px;border-radius:16px;">
                <h1 style="color:#e05c5c;">Backup GetShift — ÉCHEC</h1>
                <p>Le backup quotidien a échoué le {datetime.now().strftime('%d/%m/%Y à %H:%M')}.</p>
                <div style="background:#1a0a0a;border:1px solid #e05c5c33;border-radius:8px;padding:16px;font-family:monospace;font-size:12px;color:#ff8080;">
                    {str(e)}
                </div>
                <p style="color:#888;font-size:12px;margin-top:20px;">Vérifiez les logs Render pour plus de détails.</p>
            </div>"""
            envoyer_email('chamdaane@gmail.com', f"ALERTE — Backup GetShift échoué {datetime.now().strftime('%d/%m/%Y')}", html_erreur)
        except:
            pass


def _envoyer_backup_email(nom, contenu_sql, taille_ko, nb_lignes, nb_tables, duree):
    """Envoie le backup par email avec le fichier SQL en pièce jointe simulée."""
    try:
        import base64
        from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition

        date_str = datetime.now().strftime('%d/%m/%Y à %H:%M')

        # HTML du corps
        html = f"""
        <div style="font-family:Arial;max-width:540px;margin:auto;background:#0c0c12;color:#f0f0f5;padding:0;border-radius:20px;overflow:hidden;border:1px solid #ffffff0f;">
            <div style="background:linear-gradient(135deg,#6c63ff,#a855f7);padding:28px 36px;">
                <span style="font-size:20px;font-weight:800;color:white;">GetShift</span>
                <span style="float:right;font-size:11px;color:rgba(255,255,255,0.7);font-weight:500;letter-spacing:1px;">BACKUP QUOTIDIEN</span>
            </div>
            <div style="padding:36px;">
                <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;">Backup réussi</h2>
                <p style="margin:0 0 24px;font-size:13px;color:#8888a8;">{date_str}</p>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                        <td style="padding:0 5px 0 0;" width="25%">
                            <div style="background:#0f0f18;border:1px solid #6c63ff22;border-radius:12px;padding:14px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#6c63ff;">{nb_tables}</div>
                                <div style="font-size:10px;color:#8888a8;margin-top:2px;">Tables</div>
                            </div>
                        </td>
                        <td style="padding:0 5px;" width="25%">
                            <div style="background:#0f0f18;border:1px solid #4caf8222;border-radius:12px;padding:14px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#4caf82;">{nb_lignes}</div>
                                <div style="font-size:10px;color:#8888a8;margin-top:2px;">Lignes</div>
                            </div>
                        </td>
                        <td style="padding:0 5px;" width="25%">
                            <div style="background:#0f0f18;border:1px solid #e08a3c22;border-radius:12px;padding:14px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#e08a3c;">{taille_ko}</div>
                                <div style="font-size:10px;color:#8888a8;margin-top:2px;">Ko</div>
                            </div>
                        </td>
                        <td style="padding:0 0 0 5px;" width="25%">
                            <div style="background:#0f0f18;border:1px solid #a855f722;border-radius:12px;padding:14px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#a855f7;">{duree}s</div>
                                <div style="font-size:10px;color:#8888a8;margin-top:2px;">Durée</div>
                            </div>
                        </td>
                    </tr>
                </table>

                <div style="background:#0f0f18;border:1px solid #ffffff0a;border-radius:12px;padding:16px;margin-bottom:20px;">
                    <div style="font-size:11px;color:#8888a8;margin-bottom:6px;font-weight:600;">FICHIER</div>
                    <div style="font-size:13px;color:#e8e8f0;font-family:monospace;">{nom}</div>
                    <div style="font-size:11px;color:#44445a;margin-top:4px;">Le fichier SQL complet est en pièce jointe.</div>
                </div>

                <div style="font-size:12px;color:#44445a;border-top:1px solid #ffffff08;padding-top:16px;">
                    Backup stocké dans Aiven (7 derniers conservés) + envoyé par email.<br>
                    Prochain backup : demain à minuit.
                </div>
            </div>
        </div>"""

        # Créer l'email avec pièce jointe
        message = Mail(
            from_email=os.getenv('MAIL_DEFAULT_SENDER', 'chamdaane@gmail.com'),
            to_emails='chamdaane@gmail.com',
            subject=f"Backup GetShift — {datetime.now().strftime('%d/%m/%Y')} ✅",
            html_content=html
        )

        # Pièce jointe SQL (encodée en base64)
        sql_bytes = contenu_sql.encode('utf-8')
        encoded = base64.b64encode(sql_bytes).decode()

        attachment = Attachment(
            file_content=FileContent(encoded),
            file_name=FileName(nom),
            file_type=FileType('application/sql'),
            disposition=Disposition('attachment')
        )
        message.attachment = attachment

        sg.send(message)
        print(f"[Backup] Email envoyé à chamdaane@gmail.com ({taille_ko} Ko)")

    except Exception as e:
        print(f"[Backup] Erreur email: {e}")


@app.route('/backup/trigger', methods=['POST'])
def trigger_backup():
    """Déclenche un backup manuel immédiatement."""
    threading.Thread(target=job_backup_quotidien, daemon=True).start()
    return jsonify({"message": "Backup déclenché ! Vous recevrez un email dans quelques secondes."})


@app.route('/backup/historique', methods=['GET'])
def get_backup_historique():
    """Retourne l'historique des backups."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT id, nom, taille_ko, nb_tables, nb_lignes_total,
                   statut, duree_secondes, cree_le
            FROM backups_log
            ORDER BY cree_le DESC LIMIT 30
        """)
        backups = curseur.fetchall()
        db.close()
        for b in backups:
            b['cree_le'] = str(b['cree_le'])
        return jsonify({"backups": backups, "total": len(backups)})
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/backup/restaurer/<int:backup_id>', methods=['GET'])
def telecharger_backup(backup_id):
    """Retourne le contenu SQL d'un backup pour restauration."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT bl.nom, bd.contenu, bl.cree_le
            FROM backups_data bd
            JOIN backups_log bl ON bd.backup_log_id = bl.id
            WHERE bl.id = %s
        """, (backup_id,))
        backup = curseur.fetchone()
        db.close()
        if not backup:
            return jsonify({"erreur": "Backup introuvable"}), 404
        from flask import Response
        return Response(
            backup['contenu'],
            mimetype='application/sql',
            headers={'Content-Disposition': f'attachment; filename={backup["nom"]}'}
        )
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500





# ============================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)