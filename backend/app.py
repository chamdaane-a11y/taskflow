import sys
print("[BOOT] Python:", sys.version, flush=True)
print("[BOOT] Starting imports...", flush=True)
import threading
import schedule
import time
import urllib.parse
from flask import Flask, jsonify, request, make_response, redirect
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, set_access_cookies, unset_jwt_cookies, jwt_required, get_jwt, get_jwt_identity, decode_token, verify_jwt_in_request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from database import connecter
import hashlib
import os
import json
import re
import secrets
import base64
import uuid

# Google OAuth ajoute automatiquement userinfo.email + userinfo.profile aux
# scopes demandés (via openid). oauthlib râle car scopes retournés != demandés.
# Cette env var demande à oauthlib d'accepter le scope élargi.
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
from datetime import timedelta, datetime
from dotenv import load_dotenv
from groq import Groq
from pywebpush import webpush, WebPushException
import requests as http_requests
from google.oauth2 import id_token
from google.oauth2.credentials import Credentials
from google.auth.transport import requests as google_requests
from google.auth.transport.requests import Request as GoogleAuthRequest
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from cryptography.fernet import Fernet
import pyotp
import qrcode
import io

print("[BOOT] Imports done", flush=True)
load_dotenv()
print("[BOOT] load_dotenv OK", flush=True)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
print("[BOOT] Groq client OK", flush=True)
print(f"[BOOT] Brevo API key set: {bool(os.getenv('BREVO_API_KEY'))}", flush=True)

class ISODateJSONProvider(DefaultJSONProvider):
    @staticmethod
    def default(o):
        from datetime import date, datetime
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        return DefaultJSONProvider.default(o)

app = Flask(__name__)
app.json_provider_class = ISODateJSONProvider
app.json = ISODateJSONProvider(app)
# Secrets OBLIGATOIRES via l'environnement — aucun fallback (le repo est public,
# un fallback en dur = forge de JWT triviale). Fail-fast au boot si absent.
_SECRET_KEY = os.getenv('SECRET_KEY')
_JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
if not _SECRET_KEY or not _JWT_SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY et JWT_SECRET_KEY doivent etre definis dans l'environnement "
        "(Render env vars). Aucun fallback autorise."
    )
app.secret_key = _SECRET_KEY

app.config['JWT_SECRET_KEY'] = _JWT_SECRET_KEY
# 'headers' ET 'cookies' : le header Authorization Bearer est la voie principale
# (les cookies tiers github.io↔onrender.com sont bloqués par Safari/iOS et Android
# Chrome). Le cookie reste accepté en parallèle pour rétrocompat / clients où il passe.
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
app.config['JWT_COOKIE_SECURE'] = True
app.config['JWT_COOKIE_SAMESITE'] = 'None'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # TODO: réactiver après debug cookie csrf_access_token
jwt = JWTManager(app)

limiter = Limiter(get_remote_address, app=app, default_limits=[], storage_uri="memory://")

CORS(app, origins=["https://chamdaane-a11y.github.io", "https://chamdaane-a11y.github.io/taskflow"], supports_credentials=True, allow_headers=["Content-Type", "X-CSRF-TOKEN", "Authorization"], methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])

# ═══════════════════════════════════════════════════════════════════
#  Sécurité — helpers transverses (auth, ownership, jobs, erreurs)
# ═══════════════════════════════════════════════════════════════════
from flask import abort

def _ensure_error_log(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS error_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            route VARCHAR(200),
            method VARCHAR(10),
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_created (created_at)
        )
    """)

def _log_error(e):
    """Best-effort : persiste une erreur pour le watchdog (taux d'erreurs).
    Ne lève jamais — un échec de log ne doit pas masquer l'erreur d'origine."""
    try:
        route = None; method = None
        try:
            route = (request.path or '')[:200]; method = request.method
        except Exception:
            pass
        db = connecter(); cur = db.cursor()
        _ensure_error_log(cur)
        cur.execute("INSERT INTO error_log (route, method, message) VALUES (%s, %s, %s)",
                    (route, method, str(e)[:2000]))
        db.commit(); cur.close(); db.close()
    except Exception:
        pass

def erreur_500(e):
    """Réponse 500 générique. La trace complète va dans les logs serveur
    UNIQUEMENT — jamais renvoyée au client (fuite d'info / fingerprinting).
    On persiste aussi l'erreur (best-effort) pour que le watchdog suive le taux."""
    app.logger.error("Exception non gérée: %s", e, exc_info=True)
    _log_error(e)
    return jsonify({"erreur": "Erreur interne"}), 500

@app.errorhandler(500)
def _handle_500(e):
    return jsonify({"erreur": "Erreur interne"}), 500

def current_uid():
    """ID utilisateur authentifié issu du JWT (cookie). Suppose @jwt_required()."""
    return int(get_jwt_identity())

def require_owner(uid):
    """403 si l'utilisateur authentifié n'est pas le propriétaire de la ressource."""
    if current_uid() != int(uid):
        abort(403)

def owns_row(cur, table, row_id, uid, col='user_id'):
    """True si la ligne `table.id=row_id` appartient à `uid`. `table`/`col` sont
    toujours des littéraux internes (jamais d'input user) → pas d'injection."""
    cur.execute(f"SELECT {col} AS owner FROM {table} WHERE id=%s", (row_id,))
    r = cur.fetchone()
    if r is None:
        return None  # ressource inexistante
    owner = r['owner'] if isinstance(r, dict) else r[0]
    return owner is not None and int(owner) == int(uid)

def require_job_secret():
    """401 si le header Authorization ne porte pas le JOB_SECRET attendu.
    Protège les endpoints cron/backup (déclenchés par GitHub Actions)."""
    expected = os.getenv('JOB_SECRET')
    sent = (request.headers.get('Authorization') or '').replace('Bearer ', '').strip()
    if not expected or not secrets.compare_digest(sent, expected):
        abort(401)

def require_team_member(cur, equipe_id, uid, roles=None):
    """403 si `uid` n'est pas membre de l'équipe (ou n'a pas un rôle requis).
    Retourne le rôle du membre. `roles` = itérable de rôles autorisés (ex. {'admin'})."""
    cur.execute("SELECT role FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe_id, uid))
    r = cur.fetchone()
    if r is None:
        abort(403)
    role = r['role'] if isinstance(r, dict) else r[0]
    if roles is not None and role not in roles:
        abort(403)
    return role

def _implique_dans_tache(cur, tache_id, uid):
    """True si `uid` est propriétaire de la tâche OU collaborateur dessus."""
    cur.execute("SELECT user_id FROM taches WHERE id=%s", (tache_id,))
    r = cur.fetchone()
    owner = (r['user_id'] if isinstance(r, dict) else r[0]) if r else None
    if owner is not None and int(owner) == int(uid):
        return True
    cur.execute("SELECT 1 FROM collaborations WHERE tache_id=%s AND collaborateur_id=%s", (tache_id, uid))
    return cur.fetchone() is not None

# ── Hash mot de passe — scrypt (werkzeug), avec support legacy SHA-256 + rehash transparent ──
from werkzeug.security import generate_password_hash, check_password_hash

def hash_password(pw):
    return generate_password_hash(pw)

def _looks_sha256(s):
    return bool(s) and len(s) == 64 and all(c in '0123456789abcdef' for c in s.lower())

def verify_password(pw, stored, user_id=None):
    """Vérifie un mot de passe. Accepte les anciens hash SHA-256 non salés et, en
    cas de succès, les re-hash en scrypt de façon transparente (migration progressive)."""
    if stored is None:
        return False
    if _looks_sha256(stored):
        if hashlib.sha256(pw.encode('utf-8')).hexdigest() == stored:
            if user_id is not None:
                try:
                    db = connecter(); c = db.cursor()
                    c.execute("UPDATE users SET password=%s WHERE id=%s", (hash_password(pw), user_id))
                    db.commit(); db.close()
                except Exception as _e:
                    app.logger.error("rehash mdp échoué: %s", _e)
            return True
        return False
    return check_password_hash(stored, pw)

@app.after_request
def disable_api_cache(response):
    """Empêche les browsers de cacher les réponses JSON.
    Sans ça, axios.get polling renvoie du cache stale → l'user doit Ctrl+Shift+R."""
    try:
        ctype = (response.headers.get('Content-Type') or '').lower()
        if 'application/json' in ctype:
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
    except Exception:
        pass
    return response

# ═══════════════════════════════════════════════════════════════════
#  Garde d'authentification centralisé (anti-IDOR)
#  Toute route exige un JWT valide SAUF l'allowlist publique. Les routes
#  cron/backup exigent le JOB_SECRET. L'ownership URL (user_id / /users/<id>)
#  est vérifié ici. L'ownership des ressources (id de tâche, etc.) et le
#  scoping équipe sont gérés dans chaque handler concerné.
# ═══════════════════════════════════════════════════════════════════

# Endpoints publics (pas d'auth) — par NOM de fonction handler
PUBLIC_ENDPOINTS = {
    'health', 'auth_google', 'register', 'verify_email', 'login', 'logout',
    'resend_verification', 'forgot_password', 'reset_password',
    'confirm_email_change', 'login_totp', 'get_vapid_public_key',
    # Flux OAuth (redirect navigateur + callbacks) — identité via query/state + table oauth_states
    'auth_google_calendar', 'auth_google_calendar_callback', 'gcal_webhook',
    'auth_gmail', 'auth_gmail_callback', 'auth_google_drive',
    'auth_google_drive_callback', 'auth_zoom', 'auth_notion',
    'auth_notion_callback', 'auth_slack_oauth', 'auth_discord',
    # Données statiques non sensibles
    'get_coach_styles', 'goal_reverse_templates',
}

# Endpoints job/cron/backup — protégés par JOB_SECRET (header Authorization Bearer)
JOB_ENDPOINTS = {
    'debug_push_status', 'debug_gcal_status', 'debug_email_status', 'debug_resume_hebdo',
    'send_rappels', 'trigger_resume_matin', 'trigger_rappels_deadline', 'trigger_encouragements',
    'trigger_email_rappel_veille', 'trigger_email_rappel_jour_j',
    'trigger_email_taches_retard', 'trigger_email_resume_hebdo',
    'trigger_lifecycle', 'trigger_daily_matin', 'trigger_daily_midi', 'trigger_daily_soir',
    'trigger_backup', 'get_backup_historique', 'telecharger_backup', 'watchdog_run',
    'broadcast_email',
}

# Endpoints appelés par le frontend (auth JWT) mais idempotents/publics par nature
# → JWT requis mais pas d'ownership à vérifier
JWT_NO_OWNERSHIP = {'init_templates'}

# Ressources à colonne user_id directe : (préfixe de règle, nom du param, table).
# L'ownership est vérifié centralement (le param d'URL doit pointer une ligne
# appartenant à l'utilisateur authentifié). Les sous-ressources nécessitant une
# jointure (sous_taches, dependances, commentaires), les templates partagés et
# les routes équipe sont gérés dans leurs handlers respectifs.
RESOURCE_OWNERSHIP = [
    ('/taches/<int:id>', 'id', 'taches'),
    ('/taches/<int:tache_id>', 'tache_id', 'taches'),
    ('/planification/<int:entry_id>', 'entry_id', 'planification'),
    ('/categories/<int:id>', 'id', 'categories'),
    ('/integrations/google-calendar/sync-task/<int:task_id>', 'task_id', 'taches'),
    ('/ia/goal-reverse/<int:objectif_id>', 'objectif_id', 'objectifs'),
]

# Ressources d'équipe identifiées par un id de ressource (pas equipe_id dans l'URL).
# On résout l'équipe via la ressource puis on exige l'appartenance. (préfixe, param, SQL→equipe_id)
TEAM_RESOURCE = [
    ('/equipes/taches/<int:tache_id>', 'tache_id', "SELECT equipe_id FROM taches_equipe WHERE id=%s"),
    ('/equipes/labels/<int:label_id>', 'label_id', "SELECT equipe_id FROM labels_equipe WHERE id=%s"),
    ('/equipes/sous-taches/<int:sous_tache_id>', 'sous_tache_id',
     "SELECT te.equipe_id FROM sous_taches_equipe se JOIN taches_equipe te ON se.tache_id=te.id WHERE se.id=%s"),
]

@app.before_request
def _enforce_auth():
    # Laisser passer le préflight CORS (géré par flask-cors)
    if request.method == 'OPTIONS':
        return
    ep = request.endpoint
    if ep is None:
        return  # route inconnue → 404 normal
    if ep in PUBLIC_ENDPOINTS:
        return
    if ep in JOB_ENDPOINTS:
        require_job_secret()
        return
    # Toute autre route exige un JWT valide
    verify_jwt_in_request()
    if ep in JWT_NO_OWNERSHIP:
        return  # JWT vérifié, pas d'ownership à checker
    uid = current_uid()

    # Anti-IDOR body : forcer user_id du body à l'identité authentifiée. Flask met
    # en cache le JSON parsé → l'écrasement ici se propage à tous les handlers qui
    # lisent data['user_id']. Le client ne peut plus agir au nom d'un autre.
    if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        body = request.get_json(silent=True)
        if isinstance(body, dict):
            # Clés représentant l'utilisateur AGISSANT (jamais une cible) → forcées au JWT.
            # NB: assignee_id / collaborateur_id / target_id ne sont PAS écrasés (cibles légitimes).
            for _k in ('user_id', 'createur_id', 'owner_id'):
                if _k in body:
                    body[_k] = uid

    # Ownership basé sur l'URL
    args = request.view_args or {}
    if 'user_id' in args and int(args['user_id']) != uid:
        abort(403)
    rule = getattr(request.url_rule, 'rule', '') or ''
    if rule.startswith('/users/<int:id>') and 'id' in args and int(args['id']) != uid:
        abort(403)

    # Ownership des ressources à user_id direct
    for prefix, param, table in RESOURCE_OWNERSHIP:
        if rule.startswith(prefix) and param in args:
            db = connecter(); cur = db.cursor(dictionary=True)
            try:
                owned = owns_row(cur, table, args[param], uid)
            finally:
                db.close()
            if owned is None:
                abort(404)
            if not owned:
                abort(403)
            break

    # Ownership équipe : être membre est requis pour toute route /equipes/<equipe_id>/*
    # (les actions admin font en plus leur propre contrôle de rôle dans le handler).
    if 'equipe_id' in args:
        db = connecter(); cur = db.cursor(dictionary=True)
        try:
            require_team_member(cur, args['equipe_id'], uid)
        finally:
            db.close()

    # Ownership équipe via ressource (tâche/label/sous-tâche d'équipe) : résoudre
    # l'équipe depuis la ressource puis exiger l'appartenance.
    for prefix, param, sql in TEAM_RESOURCE:
        if rule.startswith(prefix) and param in args:
            db = connecter(); cur = db.cursor(dictionary=True)
            try:
                cur.execute(sql, (args[param],))
                row = cur.fetchone()
                if row is None:
                    abort(404)
                eq_id = row['equipe_id'] if isinstance(row, dict) else row[0]
                require_team_member(cur, eq_id, uid)
            finally:
                db.close()
            break

VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '').replace('\\n', '\n')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_CLAIMS = {"sub": "mailto:chamdaane@gmail.com"}

# Marker version pour diagnostiquer les retards de déploiement Render
# (changer cette string à chaque commit majeur pour vérifier ce qui tourne).
APP_BUILD_MARKER = '2026-05-28-pool-backup-fix-v12'

# ============================================
# HELPERS EMAIL & SLACK
# ============================================

def get_client_ip():
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr or '—'

def parse_device(ua):
    ua = ua or ''
    if 'iPhone' in ua or ('Android' in ua and 'Mobile' in ua):
        device_type = 'Mobile'
    elif 'iPad' in ua or ('Android' in ua and 'Mobile' not in ua):
        device_type = 'Tablette'
    else:
        device_type = 'Ordinateur'
    if 'Edg/' in ua or 'EdgA/' in ua:
        browser = 'Edge'
    elif 'OPR/' in ua or 'Opera' in ua:
        browser = 'Opera'
    elif 'Firefox/' in ua:
        browser = 'Firefox'
    elif 'Chrome/' in ua:
        browser = 'Chrome'
    elif 'Safari/' in ua:
        browser = 'Safari'
    else:
        browser = 'Navigateur'
    return f"{device_type} · {browser}"

def envoyer_notification_slack(webhook_url, message):
    try:
        http_requests.post(webhook_url, json={"text": message}, timeout=5)
    except Exception as e:
        print(f"Erreur Slack: {e}")

def envoyer_email(to_email, subject, html_content, attachment=None):
    """Envoie un email via l'API Brevo.
    attachment optionnel : dict {'name': 'file.sql', 'content_b64': '...'}"""
    api_key = os.getenv('BREVO_API_KEY', '')
    if not api_key:
        print("Erreur email Brevo: BREVO_API_KEY non definie")
        return False
    sender_email = os.getenv('MAIL_DEFAULT_SENDER', 'chamdaane@gmail.com')
    payload = {
        'sender': {'name': 'GetShift', 'email': sender_email},
        'to': [{'email': to_email}],
        'subject': subject,
        'htmlContent': html_content,
    }
    if attachment:
        payload['attachment'] = [{'name': attachment['name'], 'content': attachment['content_b64']}]
    try:
        r = http_requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers={
                'api-key': api_key,
                'accept': 'application/json',
                'content-type': 'application/json',
            },
            json=payload,
            timeout=15,
        )
        if r.status_code in (200, 201):
            return True
        print(f"Erreur email Brevo: HTTP {r.status_code} {r.text[:300]}")
        return False
    except Exception as e:
        print(f"Erreur email Brevo (exception): {e}")
        return False

def envoyer_email_verification(email, nom, token):
    # On utilise _base_email pour l'identité GRAPHITE & EMBER, mais cette fonction
    # peut être appelée AVANT que EMAIL_TOKENS soit défini si l'import order change ;
    # donc on défère la création du HTML à l'envoi.
    def _send():
        t = EMAIL_TOKENS
        lien = f"https://getshift-backend.onrender.com/verify-email/{token}"
        contenu = f"""
        <h1 style="color:{t['text']};margin:0 0 10px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Bienvenue {nom}</h1>
        <p style="color:{t['text_2']};margin:0 0 24px;font-size:14px;line-height:1.6;">Merci de t'être inscrit. Confirme ton adresse email pour activer ton compte GetShift.</p>
        {_email_cta_btn("Vérifier mon email", lien)}
        <p style="color:{t['text_3']};margin:24px 0 0;font-size:12px;">Ce lien expire dans 24h. Si tu n'as pas créé de compte, ignore ce message.</p>
        """
        envoyer_email(email, "Vérifie ton email — GetShift", _base_email(contenu, "Vérifie ton email"))
    threading.Thread(target=_send).start()

# ============================================
# PUSH NOTIFICATIONS
# ============================================

def envoyer_push(subscription_json, titre, body, url="/dashboard", tag=None, image=None, require_interaction=False, renotify=False, db=None, sub_id=None):
    """Envoie une push notification. Options optionnelles pour branding/UX :
    - tag : groupe les notifs (ex: 'deadline', 'team', 'system'). Même tag = remplace.
    - image : URL d'une bannière riche (Android Chrome only).
    - require_interaction : la notif reste affichée jusqu'à action user.
    - renotify : true = re-notifie même si même tag (par défaut false).
    Self-heal : si db+sub_id sont fournis et que le service push répond 404/410
    (subscription expirée/révoquée), on supprime la ligne morte de la BDD."""
    try:
        payload = {"title": titre, "body": body, "url": url}
        if tag: payload["tag"] = tag
        if image: payload["image"] = image
        if require_interaction: payload["require_interaction"] = True
        if renotify: payload["renotify"] = True
        webpush(
            subscription_info=json.loads(subscription_json),
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        return True
    except WebPushException as e:
        print(f"[Push] Erreur: {e}")
        # 404 Not Found / 410 Gone = endpoint mort → on purge la subscription.
        status = getattr(getattr(e, 'response', None), 'status_code', None)
        if db is not None and sub_id is not None and status in (404, 410):
            try:
                cur = db.cursor()
                cur.execute("DELETE FROM push_subscriptions WHERE id=%s", (sub_id,))
                db.commit(); cur.close()
                print(f"[Push] Subscription morte purgée (id={sub_id}, status={status})")
            except Exception as _e:
                print(f"[Push] Purge sub échouée: {_e}")
        return False


# ── Changement d'email ────────────────────────────────────────────────
_email_change_columns_ready = False

def _ensure_email_change_columns():
    """Idempotent : ne lance l'ALTER qu'une fois par process. Log les vraies erreurs (sauf 'duplicate column')."""
    global _email_change_columns_ready
    if _email_change_columns_ready:
        return
    try:
        db = connecter(); cur = db.cursor()
        for col_def in [
            "email_change_token VARCHAR(64)",
            "email_change_new VARCHAR(255)",
            "email_change_expiry DATETIME",
        ]:
            try:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col_def}")
            except Exception as e:
                msg = str(e).lower()
                # On ignore uniquement le cas "colonne existe déjà"
                if 'duplicate column' not in msg and 'errno: 1060' not in msg:
                    print(f"[email_change] ALTER {col_def} → {e}", flush=True)
        db.commit(); cur.close(); db.close()
        _email_change_columns_ready = True
    except Exception as e:
        print(f"[email_change] schema error: {e}", flush=True)

def envoyer_email_changement(new_email, nom, token):
    def _send():
        t = EMAIL_TOKENS
        lien = f"https://getshift-backend.onrender.com/confirm-email-change/{token}"
        contenu = f"""
        <h1 style="color:{t['text']};margin:0 0 10px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Confirmation du changement</h1>
        <p style="color:{t['text_2']};margin:0 0 24px;font-size:14px;line-height:1.6;">Bonjour <strong style="color:{t['text']};">{nom}</strong>. Tu as demandé à changer l'email de ton compte GetShift vers cette adresse. Confirme pour finaliser.</p>
        {_email_cta_btn("Confirmer le changement", lien)}
        <p style="color:{t['text_3']};margin:24px 0 0;font-size:12px;">Ce lien expire dans 24h. Si tu n'as pas demandé ce changement, ignore ce message.</p>
        """
        envoyer_email(new_email, "Confirme ton nouvel email — GetShift", _base_email(contenu, "Changement d'email"))
    threading.Thread(target=_send).start()


# ── Sessions actives ──────────────────────────────────────────────────
def _ensure_sessions_table(curseur):
    curseur.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            jti VARCHAR(64) NOT NULL UNIQUE,
            device VARCHAR(200),
            ip VARCHAR(45),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

def _enregistrer_session(user_id, access_token):
    try:
        token_data = decode_token(access_token)
        jti = token_data.get('jti', str(uuid.uuid4()))
        device = parse_device(request.headers.get('User-Agent', ''))
        ip = get_client_ip()
        db = connecter(); cur = db.cursor()
        _ensure_sessions_table(cur)
        cur.execute(
            "INSERT INTO user_sessions (user_id, jti, device, ip) VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE last_seen=NOW()",
            (user_id, jti, device, ip)
        )
        db.commit(); cur.close(); db.close()
    except Exception as e:
        print(f"[session] enregistrement erreur: {e}")


# ── Système anti-doublons : tracking des notifs envoyées ──────────────
def _ensure_notif_table(curseur):
    """Crée la table de tracking si elle n'existe pas."""
    curseur.execute("""
        CREATE TABLE IF NOT EXISTS notifications_envoyees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type VARCHAR(80) NOT NULL,
            titre VARCHAR(200),
            body TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_type (user_id, type, sent_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)


def deja_envoyee(curseur, user_id, type_notif, intervalle_jours=1):
    """Renvoie True si une notif de ce type a été envoyée à cet user dans les N derniers jours."""
    _ensure_notif_table(curseur)
    curseur.execute("""
        SELECT id FROM notifications_envoyees
        WHERE user_id=%s AND type=%s
          AND sent_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        LIMIT 1
    """, (user_id, type_notif, intervalle_jours))
    return curseur.fetchone() is not None


def envoyer_push_smart(curseur, db, user_id, type_notif, titre, body, url="/dashboard", intervalle_jours=1):
    """Envoie un push uniquement si pas déjà envoyé récemment. Trace dans la BDD."""
    _ensure_notif_table(curseur)
    if deja_envoyee(curseur, user_id, type_notif, intervalle_jours):
        return False
    curseur.execute("SELECT id, subscription FROM push_subscriptions WHERE user_id=%s", (user_id,))
    rows = curseur.fetchall()
    if not rows:
        return False  # pas de subscription = pas de push
    envoyé = False
    for r in rows:
        if isinstance(r, dict):
            sub_id, sub = r['id'], r['subscription']
        else:
            sub_id, sub = r[0], r[1]
        # db+sub_id → self-heal : une subscription morte (410) est purgée.
        if envoyer_push(sub, titre, body, url, db=db, sub_id=sub_id):
            envoyé = True
    if envoyé:
        curseur.execute(
            "INSERT INTO notifications_envoyees (user_id, type, titre, body) VALUES (%s, %s, %s, %s)",
            (user_id, type_notif, titre, body)
        )
        db.commit()
    return envoyé

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
                COUNT(CASE WHEN t.terminee = TRUE AND DATE(COALESCE(t.terminee_le, t.updated_at)) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 END) as terminees_hier
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
                COUNT(CASE WHEN t.terminee = TRUE AND DATE(COALESCE(t.terminee_le, t.updated_at)) = CURDATE() THEN 1 END) as terminees_auj
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

# ─── DESIGN TOKENS EMAIL (GRAPHITE & EMBER) ──────────────────────────────────
# Source-of-truth alignée sur frontend-react/src/theme/tokens.css [data-theme="dark"]
EMAIL_TOKENS = {
    'bg':           '#0E1011',  # bg-base
    'surface_1':    '#171A1C',
    'surface_2':    '#1F2326',
    'border':       '#2B2F33',  # border-subtle
    'border_2':     '#383D42',  # border-default
    'ember':        '#E07A3E',
    'ember_hover':  '#F0884A',
    'ember_dark':   '#B8521C',
    'ember_soft':   '#231914',  # ember-soft applied on bg
    'text':         '#ECEAE5',  # text-primary (jamais blanc pur)
    'text_2':       '#A8A39B',  # text-secondary
    'text_3':       '#6E6A65',  # text-tertiary
    'success':      '#7A9778',
    'warning':      '#C28748',
    'danger':       '#B8593F',
}

def _email_logo_html(size=40):
    """Logo GetShift dans l'email : le vrai PNG hosté sur GitHub Pages.
    Source-of-truth identique à l'app (PWA icon 192x192, design 'plaques décalées')."""
    url = "https://chamdaane-a11y.github.io/taskflow/icons/icon-192.png"
    return f'<img src="{url}" alt="GetShift" width="{size}" height="{size}" style="display:block;border:0;outline:none;border-radius:{int(size*0.22)}px;">'

def _base_email(contenu_html, titre_preheader="GetShift"):
    """Wrapper email GRAPHITE & EMBER. Reproduit l'identité visuelle de l'app :
    fond graphite profond, surface 1 pour le card, accents ember, off-white."""
    t = EMAIL_TOKENS
    logo = _email_logo_html(size=36)
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>{titre_preheader}</title>
</head>
<body style="margin:0;padding:0;background:{t['bg']};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Arial,sans-serif;color:{t['text']};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:{t['bg']};padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;background:{t['surface_1']};border-radius:18px;border:1px solid {t['border']};overflow:hidden;">

      <!-- ── Header avec logo + wordmark ──────────────────────────── -->
      <tr><td style="padding:24px 32px;border-bottom:1px solid {t['border']};">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;">{logo}</td>
            <td style="vertical-align:middle;">
              <div style="font-size:18px;font-weight:700;color:{t['text']};letter-spacing:-0.3px;">GetShift</div>
              <div style="font-size:11px;color:{t['text_3']};margin-top:2px;letter-spacing:0.3px;text-transform:uppercase;">Organize · Automate · Perform</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- ── Body ───────────────────────────────────────────────── -->
      <tr><td style="padding:32px;">{contenu_html}</td></tr>

      <!-- ── Footer ─────────────────────────────────────────────── -->
      <tr><td style="padding:20px 32px 24px;border-top:1px solid {t['border']};background:{t['bg']};">
        <p style="margin:0;font-size:11px;color:{t['text_3']};text-align:center;line-height:1.6;">
          Tu reçois cet email car tu as un compte GetShift.<br>
          <a href="https://chamdaane-a11y.github.io/taskflow" style="color:{t['ember']};text-decoration:none;font-weight:600;">Ouvrir GetShift</a>
          &nbsp;·&nbsp;
          <a href="https://chamdaane-a11y.github.io/taskflow/#/settings" style="color:{t['text_2']};text-decoration:none;">Préférences</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>"""

def _email_cta_btn(label, href, primary=True):
    t = EMAIL_TOKENS
    if primary:
        bg = t['ember']
        color = '#1A1A1B'  # text-on-ember
    else:
        bg = t['surface_2']
        color = t['text']
    return f'<a href="{href}" style="display:inline-block;background:{bg};color:{color};padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.2px;">{label}</a>'

def _email_task_row(titre, badge_text=None, badge_color=None):
    t = EMAIL_TOKENS
    badge_html = ""
    if badge_text:
        badge_html = f'<span style="display:inline-block;margin-left:10px;padding:3px 8px;background:{badge_color or t["surface_2"]}22;color:{badge_color or t["text_2"]};border-radius:6px;font-size:10px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">{badge_text}</span>'
    return f'<tr><td style="padding:12px 14px;border-bottom:1px solid {t["border"]};"><span style="color:{t["text"]};font-weight:500;font-size:13.5px;">{titre}</span>{badge_html}</td></tr>'

def _html_rappel_veille(nom, taches):
    t = EMAIL_TOKENS
    lignes = ""
    for tk in taches:
        prio = tk.get("priorite", "moyenne")
        prio_color = {"haute": t['danger'], "moyenne": t['warning'], "basse": t['success']}.get(prio, t['warning'])
        lignes += _email_task_row(tk["titre"], prio.upper(), prio_color)
    contenu = f"""<h1 style="color:{t['text']};margin:0 0 6px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Deadline demain</h1>
    <p style="color:{t['text_2']};margin:0 0 24px;font-size:14px;line-height:1.6;">Bonjour <strong style="color:{t['text']};">{nom}</strong>. Tu as <strong style="color:{t['ember']};">{len(taches)} tâche{'s' if len(taches)>1 else ''}</strong> à rendre demain.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:{t['bg']};border-radius:12px;border:1px solid {t['border']};margin-bottom:24px;">{lignes}</table>
    {_email_cta_btn("Ouvrir le Dashboard", "https://chamdaane-a11y.github.io/taskflow/#/dashboard")}"""
    return _base_email(contenu, "Rappel deadline demain — GetShift")

def _html_rappel_jour_j(nom, taches):
    t = EMAIL_TOKENS
    lignes = ""
    for tk in taches:
        lignes += _email_task_row(tk["titre"])
    contenu = f"""<h1 style="color:{t['text']};margin:0 0 6px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Deadline aujourd'hui</h1>
    <p style="color:{t['text_2']};margin:0 0 24px;font-size:14px;line-height:1.6;">Bonjour <strong style="color:{t['text']};">{nom}</strong>. <strong style="color:{t['danger']};">{len(taches)} tâche{'s' if len(taches)>1 else ''}</strong> à rendre aujourd'hui.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:{t['bg']};border-radius:12px;border:1px solid {t['border']};margin-bottom:24px;">{lignes}</table>
    {_email_cta_btn("Terminer maintenant", "https://chamdaane-a11y.github.io/taskflow/#/dashboard")}"""
    return _base_email(contenu, "Deadline aujourd'hui — GetShift")

def _html_taches_retard(nom, taches):
    t = EMAIL_TOKENS
    lignes = ""
    for tk in taches:
        jours = tk.get("jours_retard", 0)
        lignes += _email_task_row(tk["titre"], f"+{jours}j", t['danger'])
    contenu = f"""<h1 style="color:{t['text']};margin:0 0 6px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Tâches en retard</h1>
    <p style="color:{t['text_2']};margin:0 0 24px;font-size:14px;line-height:1.6;">Bonjour <strong style="color:{t['text']};">{nom}</strong>. <strong style="color:{t['danger']};">{len(taches)} tâche{'s' if len(taches)>1 else ''} en retard</strong> à rattraper.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:{t['bg']};border-radius:12px;border:1px solid {t['border']};margin-bottom:24px;">{lignes}</table>
    {_email_cta_btn("Rattraper le retard", "https://chamdaane-a11y.github.io/taskflow/#/dashboard")}"""
    return _base_email(contenu, "Tâches en retard — GetShift")

def _html_resume_hebdo(nom, stats):
    """Bilan hebdomadaire GRAPHITE & EMBER. Pas d'emojis, design tokens-aligned."""
    t = EMAIL_TOKENS
    terminees = stats.get("terminees", 0)
    en_cours = stats.get("en_cours", 0)
    en_retard = stats.get("en_retard", 0)
    taux = stats.get("taux", 0)
    points = stats.get("points", 0)
    niveau = stats.get("niveau", 1)
    terminees_prec = stats.get("terminees_prec", 0)
    conseil_ia = stats.get("conseil_ia", "")
    taches_haute_done = stats.get("taches_haute_done", [])
    taches_haute_attente = stats.get("taches_haute_attente", [])
    jours_actifs = stats.get("jours_actifs", [])
    streak = stats.get("streak", 0)
    heure_pointe = stats.get("heure_pointe")
    categories = stats.get("categories", [])
    badges_semaine = stats.get("badges_semaine", [])
    calibration_globale = stats.get("calibration_globale")
    semaine_debut = stats.get("semaine_debut", "")
    semaine_fin = stats.get("semaine_fin", "")
    xp_par_prio = stats.get("xp_par_prio", {"haute": 0, "moyenne": 0, "basse": 0})

    # ── Coloration sémantique cohérente avec tokens.css ──
    def perf_color(pct):
        if pct >= 70: return t['success']
        if pct >= 40: return t['warning']
        return t['danger']

    taux_color = perf_color(taux)
    barre_w = max(4, min(100, int(taux)))
    diff = terminees - terminees_prec
    diff_color = t['success'] if diff > 0 else (t['danger'] if diff < 0 else t['text_3'])
    diff_label = f"{'+' if diff > 0 else ''}{diff} vs semaine -1"
    niveau_nom = niveau_label(niveau)
    xp_semaine = xp_par_prio.get("haute", 0)*50 + xp_par_prio.get("moyenne", 0)*25 + xp_par_prio.get("basse", 0)*10

    # ── Calcul du défi semaine prochaine ──
    jour_top = max([j.get("count", 0) for j in jours_actifs] + [0]) if jours_actifs else 0
    potentiel_semaine = jour_top * 5
    if terminees == 0:
        objectif_semaine_prochaine = max(7, 5)
    elif diff < -5:
        objectif_semaine_prochaine = max(terminees_prec, terminees + 5)
    elif terminees < potentiel_semaine * 0.7 and jour_top > 0:
        objectif_semaine_prochaine = potentiel_semaine
    else:
        objectif_semaine_prochaine = int(terminees * 1.3)
    challenge_gap = max(0, objectif_semaine_prochaine - terminees)

    # ── Phrase d'accroche CHALLENGER (sans emoji) ──
    if terminees == 0:
        accroche = f"Zéro tâche cette semaine. Le top 10% en fait déjà {potentiel_semaine if potentiel_semaine > 7 else 15}. À toi de jouer."
    elif diff < -5:
        accroche = f"{diff} tâches vs semaine dernière. Tu redescends — identifie ce qui a changé et reprends le contrôle."
    elif streak >= 7:
        accroche = f"{streak} jours consécutifs — c'est de l'identité, pas de la chance. Pousse jusqu'à 14j."
    elif streak >= 3:
        accroche = f"{streak} jours d'affilée. Tu construis quelque chose — ne casse pas la chaîne maintenant."
    elif jour_top > 0 and terminees < potentiel_semaine * 0.7:
        accroche = f"Ton meilleur jour : {jour_top} tâches. Sur 5 jours ça fait {potentiel_semaine}. Tu es à {terminees}. Réveille-toi."
    elif diff > 5:
        accroche = f"+{diff} vs semaine dernière. Tu accélères. Garde le rythme et passe au seuil suivant."
    elif taux >= 70:
        accroche = f"Taux {taux}% — tu transformes ce que tu décides. Augmente le volume maintenant."
    else:
        accroche = f"{terminees} tâches bouclées. Correct, pas exceptionnel. Vise +30% la semaine prochaine."

    periode_label = f"{semaine_debut} → {semaine_fin}" if semaine_debut else "7 derniers jours"

    # ── Helpers de section ──
    def section_card(content, accent=None, padding=18):
        border_color = accent if accent else t['border']
        return f'<div style="background:{t["bg"]};border:1px solid {border_color};border-radius:14px;padding:{padding}px;margin-bottom:14px;">{content}</div>'

    def section_label(label, color=None):
        c = color or t['text_3']
        return f'<div style="color:{c};font-size:10.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;">{label}</div>'

    # ── HEADER ──
    section_header = f"""
    <div style="margin-bottom:24px;">
      <p style="color:{t['text_3']};font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px;">Bilan · {periode_label}</p>
      <h1 style="color:{t['text']};margin:0 0 10px;font-size:24px;font-weight:700;letter-spacing:-0.4px;">Bonjour {nom}</h1>
      <p style="color:{t['text_2']};font-size:14px;margin:0;line-height:1.6;">{accroche}</p>
    </div>
    """

    # ── KPI principaux : terminées / en cours / en retard ──
    section_kpi = f"""
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:14px;">
      <tr>
        <td width="33%" style="padding-right:4px;"><div style="background:{t['bg']};border:1px solid {t['border']};border-radius:12px;padding:16px 12px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:{t['success']};letter-spacing:-0.5px;">{terminees}</div>
          <div style="font-size:11px;color:{t['text_2']};margin-top:2px;">Terminées</div>
          <div style="font-size:10px;color:{diff_color};margin-top:6px;font-weight:600;">{diff_label}</div>
        </div></td>
        <td width="33%" style="padding:0 2px;"><div style="background:{t['bg']};border:1px solid {t['border']};border-radius:12px;padding:16px 12px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:{t['text']};letter-spacing:-0.5px;">{en_cours}</div>
          <div style="font-size:11px;color:{t['text_2']};margin-top:2px;">En cours</div>
          <div style="font-size:10px;color:{t['text_3']};margin-top:6px;">à venir</div>
        </div></td>
        <td width="33%" style="padding-left:4px;"><div style="background:{t['bg']};border:1px solid {t['border']};border-radius:12px;padding:16px 12px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:{t['danger'] if en_retard > 0 else t['text_2']};letter-spacing:-0.5px;">{en_retard}</div>
          <div style="font-size:11px;color:{t['text_2']};margin-top:2px;">En retard</div>
          <div style="font-size:10px;color:{t['text_3']};margin-top:6px;">{'à rattraper' if en_retard > 0 else 'aucun'}</div>
        </div></td>
      </tr>
    </table>
    """

    # ── Streak / XP / Niveau ──
    section_progression = f"""
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:14px;">
      <tr>
        <td width="33%" style="padding-right:4px;"><div style="background:{t['bg']};border:1px solid {t['border']};border-radius:12px;padding:14px 12px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:{t['ember']};letter-spacing:-0.3px;">{streak}j</div>
          <div style="font-size:10px;color:{t['text_3']};margin-top:4px;letter-spacing:0.3px;">SÉRIE EN COURS</div>
        </div></td>
        <td width="33%" style="padding:0 2px;"><div style="background:{t['bg']};border:1px solid {t['border']};border-radius:12px;padding:14px 12px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:{t['text']};letter-spacing:-0.3px;">+{xp_semaine}</div>
          <div style="font-size:10px;color:{t['text_3']};margin-top:4px;letter-spacing:0.3px;">XP CETTE SEMAINE</div>
        </div></td>
        <td width="33%" style="padding-left:4px;"><div style="background:{t['bg']};border:1px solid {t['border']};border-radius:12px;padding:14px 12px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:{t['text']};letter-spacing:-0.2px;">N{niveau} · {niveau_nom}</div>
          <div style="font-size:10px;color:{t['text_3']};margin-top:4px;letter-spacing:0.3px;">{points} POINTS</div>
        </div></td>
      </tr>
    </table>
    """

    # ── Taux + barre ──
    section_taux = section_card(f"""
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:10px;">
        <tr>
          <td>{section_label("Taux de complétion")}</td>
          <td style="text-align:right;"><span style="font-size:18px;font-weight:700;color:{taux_color};letter-spacing:-0.3px;">{taux}%</span></td>
        </tr>
      </table>
      <div style="height:6px;background:{t['surface_2']};border-radius:99px;">
        <div style="height:6px;width:{barre_w}%;background:{taux_color};border-radius:99px;"></div>
      </div>
    """, padding=16)

    # ── Activité par jour (barres) ──
    section_activite = ""
    if jours_actifs:
        max_count = max([j.get("count", 0) for j in jours_actifs] + [1])
        jours_fr = {0:"Lun",1:"Mar",2:"Mer",3:"Jeu",4:"Ven",5:"Sam",6:"Dim"}
        cellules = ""
        for j in jours_actifs:
            count = j.get("count", 0)
            h = max(int((count / max_count) * 56), 3) if count > 0 else 3
            jour_label_txt = jours_fr.get(j.get("dow", 0), "")
            bar_color = t['ember'] if count >= max_count * 0.7 else t['text_2'] if count > 0 else t['border']
            cellules += f'<td style="vertical-align:bottom;padding:0 3px;width:14%;"><div style="height:60px;text-align:center;"><div style="display:inline-block;height:{h}px;width:80%;background:{bar_color};border-radius:4px 4px 1px 1px;vertical-align:bottom;"></div></div><div style="text-align:center;font-size:10px;color:{t["text_3"]};margin-top:6px;letter-spacing:0.3px;">{jour_label_txt}</div><div style="text-align:center;font-size:11px;font-weight:700;color:{t["text"]};margin-top:2px;">{count}</div></td>'
        max_jour = max(jours_actifs, key=lambda x: x.get("count", 0)) if jours_actifs else None
        meilleur_label = ""
        if max_jour and max_jour.get("count", 0) > 0:
            meilleur_label = f'<div style="text-align:center;font-size:11px;color:{t["text_2"]};margin-top:14px;padding-top:12px;border-top:1px solid {t["border"]};">Meilleur jour : <span style="color:{t["ember"]};font-weight:600;">{jours_fr.get(max_jour.get("dow", 0), "?")} · {max_jour.get("count", 0)} tâches</span>'
            if heure_pointe is not None:
                meilleur_label += f' &nbsp;·&nbsp; Pointe : <span style="color:{t["text"]};font-weight:600;">{heure_pointe}h</span>'
            meilleur_label += '</div>'
        section_activite = section_card(
            section_label("Activité par jour") +
            f'<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>{cellules}</tr></table>' +
            meilleur_label
        )

    # ── Top réussites haute prio ──
    section_top_done = ""
    if taches_haute_done:
        items = ""
        for tk in taches_haute_done[:5]:
            items += f'<div style="padding:9px 0;border-bottom:1px solid {t["border"]};color:{t["text"]};font-size:13px;line-height:1.5;">{tk}</div>'
        items = items.rstrip()
        # Retire le dernier border-bottom
        items = items.replace(f'border-bottom:1px solid {t["border"]};', 'border-bottom:none;', items.count(f'border-bottom:1px solid {t["border"]};'))
        # En fait il faut juste ne pas mettre border-bottom sur le dernier — refait proprement :
        items = ""
        for i, tk in enumerate(taches_haute_done[:5]):
            border = f'border-bottom:1px solid {t["border"]};' if i < min(len(taches_haute_done), 5) - 1 else ''
            items += f'<div style="padding:9px 0;{border}color:{t["text"]};font-size:13px;line-height:1.5;">{tk}</div>'
        section_top_done = section_card(
            section_label("Top réussites · haute priorité", color=t['success']) + items,
            accent=t['border']
        )

    # ── Tâches haute prio en attente ──
    section_attente = ""
    if taches_haute_attente:
        items = ""
        for i, tk in enumerate(taches_haute_attente[:3]):
            border = f'border-bottom:1px solid {t["border"]};' if i < min(len(taches_haute_attente), 3) - 1 else ''
            items += f'<div style="padding:9px 0;{border}color:{t["text"]};font-size:13px;line-height:1.5;">{tk}</div>'
        section_attente = section_card(
            section_label("Ton focus semaine prochaine", color=t['warning']) + items,
            accent=t['border']
        )

    # ── Catégories ──
    section_categories = ""
    if categories:
        total_cat = sum(c.get("count", 0) for c in categories)
        rows = ""
        for c in categories[:4]:
            pct = round((c.get("count", 0) / max(total_cat, 1)) * 100)
            rows += f'<tr><td style="padding:7px 0;color:{t["text"]};font-size:13px;">{c.get("nom", "—")}</td><td style="padding:7px 0;text-align:right;color:{t["text_2"]};font-size:11px;">{c.get("count", 0)} tâches · {pct}%</td></tr>'
        section_categories = section_card(
            section_label("Répartition par catégorie") +
            f'<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">{rows}</table>'
        )

    # ── Calibration Task DNA ──
    section_calibration = ""
    if calibration_globale is not None:
        cal_color = perf_color(calibration_globale)
        section_calibration = section_card(f"""
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td>{section_label("Calibration des durées · Task DNA")}</td>
              <td style="text-align:right;"><span style="font-size:16px;font-weight:700;color:{cal_color};">{calibration_globale}%</span></td>
            </tr>
          </table>
        """, padding=14)

    # ── Badges débloqués ──
    section_badges = ""
    if badges_semaine:
        badges_html = "".join([
            f'<span style="display:inline-block;padding:5px 12px;background:{t["ember_soft"]};border:1px solid {t["ember_dark"]};border-radius:99px;color:{t["ember_hover"]};font-size:11px;font-weight:600;margin:3px 4px 3px 0;">{b.get("nom", "")}</span>'
            for b in badges_semaine
        ])
        section_badges = section_card(
            section_label("Badges débloqués cette semaine", color=t['ember']) + f'<div>{badges_html}</div>'
        )

    # ── Conseil IA ──
    section_conseil = ""
    if conseil_ia:
        section_conseil = f"""
        <div style="background:{t['ember_soft']};border:1px solid {t['ember_dark']};border-radius:14px;padding:18px;margin-bottom:14px;">
          {section_label("Analyse coach IA", color=t['ember'])}
          <div style="font-size:13.5px;color:{t['text']};line-height:1.65;">{conseil_ia}</div>
        </div>
        """

    # ── Défi semaine prochaine ──
    section_defi = ""
    if objectif_semaine_prochaine > 0:
        gap_text = f"+{challenge_gap}" if challenge_gap > 0 else "à égaler"
        tpj = round(objectif_semaine_prochaine / 5, 1)
        section_defi = f"""
        <div style="background:{t['surface_2']};border:1px solid {t['ember_dark']};border-radius:14px;padding:20px;margin-bottom:14px;">
          {section_label("Ton défi semaine prochaine", color=t['ember'])}
          <div style="font-size:28px;font-weight:700;color:{t['text']};margin-bottom:6px;letter-spacing:-0.5px;">{objectif_semaine_prochaine} tâches</div>
          <div style="font-size:13px;color:{t['text_2']};line-height:1.6;">
            Soit <strong style="color:{t['ember']};">{gap_text}</strong> tâches vs cette semaine. Sur 5 jours actifs, c'est <strong style="color:{t['text']};">{tpj} tâches/jour</strong>. Précis, atteignable, exigeant.
          </div>
        </div>
        """

    # ── Potentiel non exploité ──
    section_potentiel = ""
    if jours_actifs:
        max_jour = max(jours_actifs, key=lambda x: x.get("count", 0))
        jour_top_count = max_jour.get("count", 0)
        if jour_top_count >= 3 and terminees < jour_top_count * 5:
            jours_fr = {0:"lundi",1:"mardi",2:"mercredi",3:"jeudi",4:"vendredi",5:"samedi",6:"dimanche"}
            jour_nom = jours_fr.get(max_jour.get("dow", 0), "")
            section_potentiel = section_card(
                section_label("Ton potentiel non exploité") +
                f"""<div style="font-size:13.5px;color:{t['text']};line-height:1.65;">
                  Ton meilleur jour ({jour_nom}) : <strong style="color:{t['ember']};">{jour_top_count} tâches</strong>.
                  Tu sais que tu en es capable. Reproduis ça 5 jours/semaine, c'est <strong style="color:{t['ember']};">{jour_top_count * 5} tâches</strong> — tu n'en es qu'à {terminees}.
                  <br><span style="color:{t['text_2']};font-size:12.5px;">Le potentiel est en toi, pas dans une nouvelle méthode.</span>
                </div>"""
            )

    # ── Objectifs en cours (Goal Reverse) ──
    section_objectifs = ""
    objectifs_hebdo = stats.get("objectifs_en_cours", [])
    if objectifs_hebdo:
        rows_obj = ""
        for obj in objectifs_hebdo[:4]:
            pct_obj = obj.get("progression", 0)
            barre_obj = max(4, min(100, int(pct_obj)))
            couleur_obj = perf_color(pct_obj)
            j_rest = obj.get("jours_restants")
            urgence = ""
            if j_rest is not None:
                if j_rest < 0:
                    urgence = f'<span style="color:{t["danger"]};font-weight:700;font-size:11px;">En retard · {abs(j_rest)}j</span>'
                elif j_rest <= 7:
                    urgence = f'<span style="color:{t["warning"]};font-weight:700;font-size:11px;">J-{j_rest}</span>'
                else:
                    urgence = f'<span style="color:{t["text_3"]};font-size:11px;">J-{j_rest}</span>'
            retard_label = f' <span style="color:{t["danger"]};font-size:11px;">({obj.get("taches_en_retard",0)} en retard)</span>' if obj.get("taches_en_retard", 0) > 0 else ""
            rows_obj += f"""
            <div style="margin-bottom:14px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:6px;">
                <tr>
                  <td style="font-size:13px;color:{t["text"]};font-weight:600;">{obj.get('titre','')}{retard_label}</td>
                  <td style="text-align:right;">{urgence}</td>
                </tr>
              </table>
              <div style="height:5px;background:{t['surface_2']};border-radius:99px;margin-bottom:4px;">
                <div style="height:5px;width:{barre_obj}%;background:{couleur_obj};border-radius:99px;"></div>
              </div>
              <div style="font-size:10.5px;color:{t['text_3']};">{obj.get('taches_done',0)}/{obj.get('taches_total',0)} tâches · {pct_obj}%</div>
            </div>
            """
        section_objectifs = section_card(
            section_label("Tes objectifs en cours") + rows_obj +
            f'<a href="https://chamdaane-a11y.github.io/taskflow/#/goal" style="display:inline-block;margin-top:4px;font-size:11.5px;color:{t["ember"]};text-decoration:none;font-weight:600;">Voir tous mes objectifs →</a>'
        )

    # ── CTAs finaux ──
    section_cta = f"""
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:24px;">
      <tr>
        <td width="50%" style="padding-right:4px;">
          <a href="https://chamdaane-a11y.github.io/taskflow/#/dashboard" style="display:block;text-align:center;background:{t['ember']};color:#1A1A1B;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.2px;">Ouvrir le Dashboard</a>
        </td>
        <td width="50%" style="padding-left:4px;">
          <a href="https://chamdaane-a11y.github.io/taskflow/#/analytics" style="display:block;text-align:center;background:{t['surface_2']};color:{t['text']};padding:13px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;border:1px solid {t['border']};">Voir les analytics</a>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:8px;">
        <a href="https://chamdaane-a11y.github.io/taskflow/#/planification" style="display:block;text-align:center;background:transparent;color:{t['text_2']};padding:11px;border-radius:10px;text-decoration:none;font-weight:500;font-size:12px;border:1px solid {t['border']};">Planifier la semaine prochaine →</a>
      </td></tr>
    </table>
    """

    contenu = (
        section_header + section_kpi + section_progression + section_taux
        + section_activite + section_top_done + section_attente
        + section_categories + section_calibration + section_badges
        + section_objectifs + section_potentiel + section_defi + section_conseil + section_cta
    )
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

def _collecter_stats_hebdo(cursor, user_id, base_user):
    """Récupère toutes les données enrichies pour le rapport hebdo d'un utilisateur."""
    # ── Jours actifs (7 derniers jours, par jour de la semaine) ──
    # COALESCE(terminee_le, updated_at) : terminee_le est figé au toggle,
    # updated_at change à chaque édition → ne reflète pas la date de complétion.
    cursor.execute("""
        SELECT DATE(COALESCE(terminee_le, updated_at)) AS jour,
               COUNT(*) AS count
        FROM taches WHERE user_id=%s AND terminee=TRUE
          AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(COALESCE(terminee_le, updated_at)) ORDER BY jour
    """, (user_id,))
    jours_raw = cursor.fetchall()
    # Construire les 7 derniers jours avec count (0 si rien)
    from datetime import date, timedelta
    today = date.today()
    jours_map = {}
    for r in jours_raw:
        d = r['jour'].isoformat() if hasattr(r['jour'], 'isoformat') else str(r['jour'])
        jours_map[d] = r['count']
    jours_actifs = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        # dow Python : 0=Lundi … 6=Dimanche (différent de SQL)
        jours_actifs.append({"date": d.isoformat(), "dow": d.weekday(), "count": jours_map.get(d.isoformat(), 0)})

    # ── Top 5 tâches haute prio terminées cette semaine ──
    cursor.execute("""
        SELECT titre FROM taches
        WHERE user_id=%s AND terminee=TRUE AND priorite='haute'
          AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY COALESCE(terminee_le, updated_at) DESC LIMIT 5
    """, (user_id,))
    taches_haute_done = [r['titre'] for r in cursor.fetchall()]

    # ── Top 3 tâches haute prio en attente ──
    cursor.execute("""
        SELECT titre FROM taches
        WHERE user_id=%s AND terminee=FALSE AND priorite='haute'
        ORDER BY (deadline IS NULL), deadline ASC, created_at DESC LIMIT 3
    """, (user_id,))
    taches_haute_attente = [r['titre'] for r in cursor.fetchall()]

    # ── Catégories breakdown ──
    cursor.execute("""
        SELECT c.nom, COUNT(t.id) AS count
        FROM taches t
        LEFT JOIN categories c ON t.categorie_id = c.id
        WHERE t.user_id=%s AND t.terminee=TRUE
          AND COALESCE(t.terminee_le, t.updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND c.nom IS NOT NULL
        GROUP BY c.nom ORDER BY count DESC LIMIT 4
    """, (user_id,))
    categories = cursor.fetchall()

    # ── XP par priorité ──
    cursor.execute("""
        SELECT priorite, COUNT(*) AS count
        FROM taches WHERE user_id=%s AND terminee=TRUE
          AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY priorite
    """, (user_id,))
    prio_rows = cursor.fetchall()
    xp_par_prio = {"haute": 0, "moyenne": 0, "basse": 0}
    for r in prio_rows:
        xp_par_prio[r['priorite']] = r['count']

    # ── Heure de pointe (la plus productive sur 7 jours) ──
    cursor.execute("""
        SELECT HOUR(COALESCE(terminee_le, updated_at)) AS h, COUNT(*) AS count
        FROM taches WHERE user_id=%s AND terminee=TRUE
          AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY HOUR(COALESCE(terminee_le, updated_at)) ORDER BY count DESC LIMIT 1
    """, (user_id,))
    h_row = cursor.fetchone()
    heure_pointe = h_row['h'] if h_row else None

    # ── Streak réel ──
    cursor.execute("SELECT streak FROM users WHERE id=%s", (user_id,))
    s_row = cursor.fetchone()
    streak = s_row['streak'] if s_row else 0

    # ── Calibration globale (si données dispo) ──
    cursor.execute("""
        SELECT temps_estime, temps_reel FROM taches
        WHERE user_id=%s AND terminee=TRUE
          AND temps_estime IS NOT NULL AND temps_estime > 0
          AND temps_reel IS NOT NULL AND temps_reel > 0
    """, (user_id,))
    cal_rows = cursor.fetchall()
    calibration_globale = None
    if len(cal_rows) >= 2:
        bien = sum(1 for r in cal_rows if 0.8 <= (r['temps_reel'] / r['temps_estime']) <= 1.2)
        calibration_globale = round(bien / len(cal_rows) * 100)

    # ── Badges débloqués cette semaine ──
    badges_semaine = []
    try:
        cursor.execute("""
            SELECT badge_id FROM user_badges
            WHERE user_id=%s AND obtenu_le >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, (user_id,))
        badge_ids = [r['badge_id'] for r in cursor.fetchall()]
        for bid in badge_ids:
            rule = next((b for b in REGLES_BADGES if b['id'] == bid), None)
            if rule:
                badges_semaine.append({"icon": rule['icon'], "nom": rule['nom']})
    except Exception:
        pass  # table user_badges peut ne pas exister

    # ── Objectifs Goal Reverse en cours ──
    objectifs_en_cours = []
    try:
        from datetime import date as _date
        today_obj = _date.today()
        cursor.execute("""SELECT id, titre, deadline, score_faisabilite FROM objectifs
            WHERE user_id=%s AND statut='actif' ORDER BY cree_le DESC LIMIT 5""", (user_id,))
        goals = cursor.fetchall()
        for g in goals:
            gid = g['id']
            cursor.execute("""SELECT COUNT(*) as total,
                SUM(CASE WHEN terminee=1 THEN 1 ELSE 0 END) as done
                FROM taches WHERE objectif_id=%s""", (gid,))
            gs = cursor.fetchone()
            gt = gs['total'] or 0
            gd = gs['done'] or 0
            cursor.execute("""SELECT COUNT(*) as late FROM taches
                WHERE objectif_id=%s AND terminee=0 AND deadline IS NOT NULL AND deadline < %s""",
                (gid, today_obj))
            glate = (cursor.fetchone()['late'] or 0)
            dl = g['deadline']
            j_rest = None
            if dl:
                dl_d = dl if isinstance(dl, _date) else _date.fromisoformat(str(dl))
                j_rest = (dl_d - today_obj).days
            objectifs_en_cours.append({
                'titre': g['titre'], 'deadline': str(g['deadline']) if g['deadline'] else None,
                'progression': round(gd / gt * 100) if gt else 0,
                'taches_done': gd, 'taches_total': gt,
                'taches_en_retard': glate, 'jours_restants': j_rest,
            })
    except Exception:
        pass

    return {
        "jours_actifs": jours_actifs,
        "taches_haute_done": taches_haute_done,
        "taches_haute_attente": taches_haute_attente,
        "categories": categories,
        "xp_par_prio": xp_par_prio,
        "heure_pointe": heure_pointe,
        "streak": streak,
        "calibration_globale": calibration_globale,
        "badges_semaine": badges_semaine,
        "objectifs_en_cours": objectifs_en_cours,
    }


def job_email_resume_hebdo(force_user_id=None):
    """Envoie le bilan hebdo aux users dont weekly_report_day == aujourd'hui.
    Si force_user_id est fourni : envoie uniquement à cet user (utile pour test/manuel)."""
    try:
        today_dow = datetime.now().weekday()  # 0=Lun … 6=Dim
        db = connecter()
        cursor = db.cursor(dictionary=True)
        if force_user_id:
            where_extra = "AND u.id = %s"
            params = (force_user_id,)
        else:
            where_extra = "AND COALESCE(u.weekly_report_day, 4) = %s"
            params = (today_dow,)
        cursor.execute(f"""
            SELECT u.id, u.nom, u.email, u.points, u.niveau,
                COUNT(CASE WHEN t.terminee = TRUE AND COALESCE(t.terminee_le, t.updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees,
                COUNT(CASE WHEN t.terminee = TRUE AND COALESCE(t.terminee_le, t.updated_at) >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND COALESCE(t.terminee_le, t.updated_at) < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_prec,
                COUNT(CASE WHEN t.terminee = FALSE THEN 1 END) as en_cours,
                COUNT(CASE WHEN t.terminee = FALSE AND t.deadline < CURDATE() AND t.deadline IS NOT NULL THEN 1 END) as en_retard,
                COUNT(t.id) as total
            FROM users u LEFT JOIN taches t ON u.id = t.user_id
            WHERE u.email_verifie = TRUE {where_extra} GROUP BY u.id
        """, params)
        users = cursor.fetchall()
        from datetime import date, timedelta
        semaine_fin = date.today()
        semaine_debut = semaine_fin - timedelta(days=6)
        for u in users:
            # Skip users sans aucune tâche (sauf si force = test manuel)
            if u['total'] == 0 and not force_user_id:
                continue
            user_id = u['id']
            terminees = u['terminees'] or 0
            taux = round((terminees / max(u['total'], 1)) * 100, 0) if terminees else 0
            extra = _collecter_stats_hebdo(cursor, user_id, u)

            # ── Conseil IA enrichi (4-5 phrases, structuré) ──
            conseil_ia = ""
            try:
                top_done = ", ".join(extra['taches_haute_done'][:3]) if extra['taches_haute_done'] else "aucune"
                top_attente = ", ".join(extra['taches_haute_attente'][:2]) if extra['taches_haute_attente'] else "aucune"
                heure = f"{extra['heure_pointe']}h" if extra['heure_pointe'] is not None else "non identifiée"
                contexte = (
                    f"Bilan hebdo de {u['nom']} :\n"
                    f"- {terminees} tâches terminées ({u['terminees_prec'] or 0} sem précédente)\n"
                    f"- {u['en_cours'] or 0} en cours, {u['en_retard'] or 0} en retard\n"
                    f"- Taux : {int(taux)}% · Streak : {extra['streak']} jours · Heure pointe : {heure}\n"
                    f"- Top réussites haute prio : {top_done}\n"
                    f"- Tâches haute prio en attente : {top_attente}\n"
                )
                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": (
                        f"{contexte}\n\nÉcris une analyse personnalisée en 4-5 phrases. Structure :\n"
                        f"1) Constat factuel (cite une tâche ou un chiffre précis).\n"
                        f"2) Ce qui marche / ce qui cloche (sois honnête, pas complaisant).\n"
                        f"3) Un conseil ACTIONNABLE et exigeant pour la semaine prochaine — pousse au-delà du confort.\n"
                        f"4) Termine par un challenge concret, pas un câlin.\n"
                        f"Ton : direct, exigeant, comme un coach de haut niveau qui croit en ton potentiel. "
                        f"Pas de blabla bienveillant générique. Pas de markdown. Tutoiement."
                    )}],
                    max_tokens=400, temperature=0.75
                )
                conseil_ia = completion.choices[0].message.content.strip()
            except Exception as e:
                conseil_ia = "Continue sur ta lancée et concentre-toi sur tes tâches haute priorité dès le matin. Une session de 90 min sans interruption peut tout changer."

            stats = {
                "terminees": terminees, "terminees_prec": u['terminees_prec'] or 0,
                "en_cours": u['en_cours'] or 0, "en_retard": u['en_retard'] or 0,
                "taux": int(taux), "points": u['points'] or 0, "niveau": u['niveau'] or 1,
                "conseil_ia": conseil_ia,
                "semaine_debut": semaine_debut.strftime('%d/%m'),
                "semaine_fin": semaine_fin.strftime('%d/%m/%Y'),
                **extra,
            }
            html = _html_resume_hebdo(u['nom'], stats)
            sujet = f"Bilan · {semaine_debut.strftime('%d/%m')} → {semaine_fin.strftime('%d/%m')} — GetShift"
            threading.Thread(target=envoyer_email, args=(u['email'], sujet, html)).start()
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
    # Bilan hebdo : check tous les jours à 18h, le job filtre par weekly_report_day de chaque user
    schedule.every().day.at("18:00").do(job_email_resume_hebdo)
    schedule.every().day.at("00:00").do(job_backup_quotidien)
    print("[Scheduler] Démarré ✅")
    while True:
        schedule.run_pending()
        time.sleep(60)

# NOTE: le scheduler est lancé en fin de fichier, après la définition de tous
# les job_* (notamment job_backup_quotidien défini après les routes).

# ============================================
# AUTO-MIGRATIONS (idempotentes)
# ============================================
def run_migrations():
    """Migrations idempotentes — vérifient l'existence avant ALTER."""
    def col_exists(curseur, table, col):
        curseur.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = %s AND column_name = %s
        """, (table, col))
        return curseur.fetchone()[0] > 0

    try:
        db = connecter()
        curseur = db.cursor()

        if not col_exists(curseur, 'taches', 'focus_date'):
            curseur.execute("ALTER TABLE taches ADD COLUMN focus_date DATE NULL")
            print("[Migrations] taches.focus_date ✅")

        # Gamification refonte 2026-05-18 — Streak Freeze + tracking terminee_le
        if not col_exists(curseur, 'users', 'streak_freeze_used_at'):
            curseur.execute("ALTER TABLE users ADD COLUMN streak_freeze_used_at DATE NULL")
            print("[Migrations] users.streak_freeze_used_at ✅")

        # Profile timeline — date d'inscription pour calculer "jours d'utilisation"
        if not col_exists(curseur, 'users', 'created_at'):
            curseur.execute("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
            print("[Migrations] users.created_at ✅ (defaults NOW pour anciens)")

        if not col_exists(curseur, 'taches', 'terminee_le'):
            curseur.execute("ALTER TABLE taches ADD COLUMN terminee_le DATETIME NULL")
            # Backfill: les tâches déjà terminées sans timestamp → NOW (on n'a pas l'historique)
            curseur.execute("UPDATE taches SET terminee_le=NOW() WHERE terminee=TRUE AND terminee_le IS NULL")
            print("[Migrations] taches.terminee_le ✅ (+backfill)")

        # Intégration Google Calendar bidirectionnelle (2026-05-21)
        # google_event_id : id de l'event Google créé depuis la tâche (pour update/delete)
        # gcal_sync_mode : 'deadline' (all-day), 'focus' (time block), 'manual' (custom)
        if not col_exists(curseur, 'taches', 'google_event_id'):
            curseur.execute("ALTER TABLE taches ADD COLUMN google_event_id VARCHAR(255) NULL")
            print("[Migrations] taches.google_event_id ✅")
        if not col_exists(curseur, 'taches', 'gcal_sync_mode'):
            curseur.execute("ALTER TABLE taches ADD COLUMN gcal_sync_mode VARCHAR(20) NULL")
            print("[Migrations] taches.gcal_sync_mode ✅")
        # Toggle utilisateur pour activer/désactiver l'auto-sync vers Google Calendar
        if not col_exists(curseur, 'users', 'autosync_calendar'):
            curseur.execute("ALTER TABLE users ADD COLUMN autosync_calendar TINYINT(1) NOT NULL DEFAULT 1")
            print("[Migrations] users.autosync_calendar ✅ (default ON)")
        # gcal_imported_event_id : id de l'event Google dont cette tâche a été créée par import
        if not col_exists(curseur, 'taches', 'gcal_imported_event_id'):
            curseur.execute("ALTER TABLE taches ADD COLUMN gcal_imported_event_id VARCHAR(255) NULL")
            print("[Migrations] taches.gcal_imported_event_id ✅")
        # heure_debut : heure de début préservée depuis les events GCal timed (HH:MM)
        if not col_exists(curseur, 'taches', 'heure_debut'):
            curseur.execute("ALTER TABLE taches ADD COLUMN heure_debut VARCHAR(5) NULL")
            print("[Migrations] taches.heure_debut ✅")
        # source_url : lien vers la source originale (email Gmail, fichier Drive, event GCal)
        if not col_exists(curseur, 'taches', 'source_url'):
            curseur.execute("ALTER TABLE taches ADD COLUMN source_url VARCHAR(500) NULL")
            print("[Migrations] taches.source_url ✅")
        # Contrainte unicité gcal_imported_event_id par user (évite les doublons d'import)
        try:
            curseur.execute("ALTER TABLE taches ADD UNIQUE KEY uq_gcal_event_user (user_id, gcal_imported_event_id)")
            print("[Migrations] taches.uq_gcal_event_user ✅")
        except Exception:
            pass  # index déjà existant
        # Préférences notifications utilisateur (2026-05-22)
        if not col_exists(curseur, 'users', 'notif_prefs'):
            curseur.execute("ALTER TABLE users ADD COLUMN notif_prefs JSON NULL")
            print("[Migrations] users.notif_prefs ✅")

        # gcal_watch_channels : canaux push notifications Google Calendar
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS gcal_watch_channels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                channel_id VARCHAR(255) NOT NULL UNIQUE,
                resource_id VARCHAR(255),
                expiration BIGINT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("[Migrations] gcal_watch_channels ✅")

        # gmail_imported : dédup des emails déjà transformés en tâche
        # 2026-05-26 : empêche que /integrations/gmail/extract-tasks re-propose
        # un email dont l'user a déjà importé une tâche.
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS gmail_imported (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                gmail_message_id VARCHAR(255) NOT NULL,
                tache_id INT NULL,
                imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_msg (user_id, gmail_message_id),
                INDEX idx_user (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (tache_id) REFERENCES taches(id) ON DELETE SET NULL
            )
        """)
        print("[Migrations] gmail_imported ✅")

        # notion_imported : dédup pages + blocs to_do Notion déjà transformés.
        # 2026-05-27 : refonte intégration Notion (Tier 1+2+3).
        # notion_block_id NULL = import au niveau page (contenu textuel).
        # notion_block_id non-NULL = import d'un block to_do précis (sync inverse possible).
        # Cohabitation via colonne calculée hash unique (MySQL ne traite pas NULL=NULL).
        curseur.execute("""
            CREATE TABLE IF NOT EXISTS notion_imported (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                notion_page_id VARCHAR(255) NOT NULL,
                notion_block_id VARCHAR(255) NULL,
                tache_id INT NULL,
                imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                dedup_key VARCHAR(520) GENERATED ALWAYS AS (
                    CONCAT(notion_page_id, ':', COALESCE(notion_block_id, ''))
                ) STORED,
                UNIQUE KEY uq_user_dedup (user_id, dedup_key),
                INDEX idx_user (user_id),
                INDEX idx_block (notion_block_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (tache_id) REFERENCES taches(id) ON DELETE SET NULL
            )
        """)
        print("[Migrations] notion_imported ✅")

        # taches.notion_block_id : permet la sync inverse (cocher tâche → checked=true Notion).
        if not col_exists(curseur, 'taches', 'notion_block_id'):
            curseur.execute("ALTER TABLE taches ADD COLUMN notion_block_id VARCHAR(255) NULL")
            print("[Migrations] taches.notion_block_id ✅")

        # Refonte design 2026-05-21 — nouveau défaut thème = 'light' (Parchemin).
        # Idempotent : on lit le DEFAULT actuel et on l'aligne sur 'light' si besoin.
        try:
            curseur.execute("""
                SELECT COLUMN_DEFAULT FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'theme'
            """)
            row = curseur.fetchone()
            current_default = row[0] if row else None
            if current_default != 'light':
                curseur.execute("ALTER TABLE users MODIFY COLUMN theme VARCHAR(32) NOT NULL DEFAULT 'light'")
                print(f"[Migrations] users.theme DEFAULT 'light' ✅ (était : {current_default!r})")
        except Exception as _e:
            print(f"[Migrations] users.theme DEFAULT skip ({_e})")

        # Correction du backfill destructif du 18 mai (commit b07d7ad).
        # Le UPDATE taches SET terminee_le=NOW() a écrasé toutes les complétions
        # historiques au timestamp de la migration, ET a déclenché
        # ON UPDATE CURRENT_TIMESTAMP sur updated_at — donc COALESCE est aussi mort.
        # Récupération : remap sur created_at (jamais touché par la migration).
        # Best-effort : pour 90% des tâches, créer/terminer est dans la même journée
        # → c'est une approximation à 1-2 jours près, infiniment mieux qu'un pic
        # artificiel sur lundi.
        # Idempotent : après le 1er passage, plus de lignes dans la fenêtre → skip.
        curseur.execute("""
            SELECT COUNT(*) FROM taches
            WHERE terminee=TRUE
              AND terminee_le BETWEEN '2026-05-18 00:00:00' AND '2026-05-18 23:59:59'
        """)
        nb_corrupt = curseur.fetchone()[0]
        if nb_corrupt > 0:
            # On force updated_at = created_at en même temps, sinon le
            # ON UPDATE CURRENT_TIMESTAMP du UPDATE va le re-pousser à NOW() et
            # COALESCE(terminee_le, updated_at) retombera sur la date du déploiement.
            curseur.execute("""
                UPDATE taches
                SET terminee_le = created_at,
                    updated_at = created_at
                WHERE terminee = TRUE
                  AND terminee_le BETWEEN '2026-05-18 00:00:00' AND '2026-05-18 23:59:59'
            """)
            print(f"[Migrations] Correction backfill 18 mai: {nb_corrupt} lignes remappées sur created_at ✅")
        db.commit()

        # Table sous_taches_equipe — référencée par GET /equipes/<id>/taches (sous-requête COUNT)
        # Sans ça, l'endpoint plante 500 et casse le polling Collaboration
        curseur.execute("""CREATE TABLE IF NOT EXISTS sous_taches_equipe (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tache_id INT NOT NULL,
            titre VARCHAR(255) NOT NULL,
            terminee TINYINT(1) DEFAULT 0,
            position INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tache (tache_id),
            FOREIGN KEY (tache_id) REFERENCES taches_equipe(id) ON DELETE CASCADE
        )""")
        print("[Migrations] sous_taches_equipe ✅")

        # 2FA TOTP (2026-05-22)
        if not col_exists(curseur, 'users', 'totp_secret'):
            curseur.execute("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) NULL")
            print("[Migrations] users.totp_secret ✅")
        if not col_exists(curseur, 'users', 'totp_enabled'):
            curseur.execute("ALTER TABLE users ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0")
            print("[Migrations] users.totp_enabled ✅")
        # Anti-replay : dernier compteur TOTP consommé (window 30s)
        if not col_exists(curseur, 'users', 'totp_last_counter'):
            curseur.execute("ALTER TABLE users ADD COLUMN totp_last_counter BIGINT NULL")
            print("[Migrations] users.totp_last_counter ✅")

        # 2FA email OTP (2026-05-23) : remplace TOTP par code 6 chiffres envoyé par email
        if not col_exists(curseur, 'users', 'email_2fa_code'):
            curseur.execute("ALTER TABLE users ADD COLUMN email_2fa_code VARCHAR(6) NULL")
            print("[Migrations] users.email_2fa_code ✅")
        if not col_exists(curseur, 'users', 'email_2fa_code_expiry'):
            curseur.execute("ALTER TABLE users ADD COLUMN email_2fa_code_expiry DATETIME NULL")
            print("[Migrations] users.email_2fa_code_expiry ✅")
        if not col_exists(curseur, 'users', 'email_2fa_attempts'):
            curseur.execute("ALTER TABLE users ADD COLUMN email_2fa_attempts INT NOT NULL DEFAULT 0")
            print("[Migrations] users.email_2fa_attempts ✅")

        # Jour rapport hebdo configurable (2026-05-23) : 0=Lun … 6=Dim, défaut 4=Vendredi
        if not col_exists(curseur, 'users', 'weekly_report_day'):
            curseur.execute("ALTER TABLE users ADD COLUMN weekly_report_day TINYINT NOT NULL DEFAULT 4")
            print("[Migrations] users.weekly_report_day ✅")

        # Pending invitations — flow invitation QR/lien sans localStorage côté ami
        curseur.execute("""CREATE TABLE IF NOT EXISTS pending_invitations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code VARCHAR(50) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            INDEX idx_email (email),
            INDEX idx_code (code)
        )""")
        print("[Migrations] pending_invitations ✅")

        # Cleanup doublons GCal sync-loop (2026-05-27)
        # Avant le fix dédup `google_event_id` dans _do_gcal_import, chaque push d'une tâche
        # vers GCal déclenchait le webhook → re-import comme nouvelle tâche.
        # Critère zéro faux-positif : on supprime t1 (la dup) uniquement si elle pointe via
        # gcal_imported_event_id vers l'event créé par t2 (google_event_id), et seulement si
        # la dup n'a pas été touchée par l'user (pas terminée, pas focus, pas catégorisée).
        curseur.execute("""
            SELECT COUNT(*) FROM taches t1
            INNER JOIN taches t2
              ON t1.user_id = t2.user_id
             AND t1.id != t2.id
             AND t2.google_event_id = t1.gcal_imported_event_id
            WHERE t1.gcal_imported_event_id IS NOT NULL
              AND t1.terminee = 0
              AND t1.focus_date IS NULL
              AND t1.categorie_id IS NULL
        """)
        nb_dup = curseur.fetchone()[0]
        if nb_dup > 0:
            # Note : updated_at sera touché par ON UPDATE CURRENT_TIMESTAMP, mais ici on
            # DELETE — pas d'effet de bord analytics, contrairement au backfill du 18 mai.
            curseur.execute("""
                DELETE t1 FROM taches t1
                INNER JOIN taches t2
                  ON t1.user_id = t2.user_id
                 AND t1.id != t2.id
                 AND t2.google_event_id = t1.gcal_imported_event_id
                WHERE t1.gcal_imported_event_id IS NOT NULL
                  AND t1.terminee = 0
                  AND t1.focus_date IS NULL
                  AND t1.categorie_id IS NULL
            """)
            print(f"[Migrations] Cleanup doublons GCal sync-loop : {nb_dup} tâches supprimées ✅")
            db.commit()

        db.close()
    except Exception as e:
        print(f"[Migrations] erreur : {e}")

print("[BOOT] run_migrations()...", flush=True)
run_migrations()
print("[BOOT] run_migrations() OK — app prête", flush=True)

# ============================================
# AUTHENTIFICATION
# ============================================

GOOGLE_CLIENT_ID = '149080640376-8t2ah2odllgq6t83795dafhdgrajbh61.apps.googleusercontent.com'

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'build': APP_BUILD_MARKER}), 200


@app.route('/debug/push-status', methods=['GET'])
def debug_push_status():
    """Diagnose le pipeline Web Push : VAPID keys, subscriptions en DB,
    et test d'envoi optionnel.
    Usage: GET /debug/push-status (info seule)
       OU: GET /debug/push-status?user_id=1 (test push)
    """
    info = {
        'vapid_public_key_set': bool(VAPID_PUBLIC_KEY),
        'vapid_private_key_set': bool(VAPID_PRIVATE_KEY),
        'vapid_public_prefix': (VAPID_PUBLIC_KEY or '')[:20] + '...' if VAPID_PUBLIC_KEY else None,
        'vapid_claims': VAPID_CLAIMS,
    }
    try:
        db = connecter()
        c = db.cursor(dictionary=True)
        c.execute("SELECT COUNT(*) as nb FROM push_subscriptions")
        info['total_subscriptions'] = c.fetchone()['nb']
        c.execute("SELECT user_id, COUNT(*) as nb FROM push_subscriptions GROUP BY user_id LIMIT 10")
        info['subscriptions_par_user'] = c.fetchall()
        user_id = request.args.get('user_id', type=int)
        if user_id:
            c.execute("SELECT subscription FROM push_subscriptions WHERE user_id=%s LIMIT 1", (user_id,))
            sub = c.fetchone()
            if not sub:
                info['test_send'] = {'success': False, 'error': f'Aucune subscription pour user_id={user_id}'}
            else:
                ok = envoyer_push(sub['subscription'], '[DEBUG] GetShift', 'Test du pipeline push.')
                info['test_send'] = {'success': ok, 'user_id': user_id, 'note': 'check console logs si False'}
        db.close()
    except Exception as e:
        info['db_error'] = str(e)
    return jsonify(info), 200


# ═══════════════════════════════════════════════════════════════════
#  WATCHDOG — surveillance continue + alerte email fondateur + auto-fix sûr
#  Appelé par GitHub Actions (watchdog.yml) toutes les ~20 min, protégé par
#  JOB_SECRET. N'alerte QUE le fondateur (env FOUNDER_ALERT_EMAIL), et
#  uniquement quand un check est en défaut, avec dédup (cooldown) anti-spam.
#  Auto-fix limité à une whitelist sûre (purge subs push invalides). Jamais
#  de modification de code.
# ═══════════════════════════════════════════════════════════════════

FOUNDER_ALERT_EMAIL = os.getenv('FOUNDER_ALERT_EMAIL')

def _ensure_watchdog_table(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS watchdog_alerts (
            issue_key VARCHAR(120) PRIMARY KEY,
            last_sent DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)

def _watchdog_should_alert(cur, db, issue_key, cooldown_h=6):
    """True si on n'a pas déjà alerté pour cette issue dans cooldown_h heures.
    Pose/MAJ l'horodatage quand on décide d'alerter (anti-spam)."""
    _ensure_watchdog_table(cur)
    cur.execute("SELECT last_sent FROM watchdog_alerts WHERE issue_key=%s", (issue_key,))
    row = cur.fetchone()
    last = (row.get('last_sent') if isinstance(row, dict) else row[0]) if row else None
    if last and (datetime.now() - last) < timedelta(hours=cooldown_h):
        return False
    cur.execute("INSERT INTO watchdog_alerts (issue_key, last_sent) VALUES (%s, NOW()) "
                "ON DUPLICATE KEY UPDATE last_sent=NOW()", (issue_key,))
    db.commit()
    return True

def _watchdog_run_checks():
    """Exécute tous les checks + l'auto-fix sûr. Renvoie (checks, healed).
    checks : liste de {key, label, status(ok|warn|red), detail}. healed : actions faites."""
    checks = []
    healed = []
    db = connecter()
    cur = db.cursor(dictionary=True)
    try:
        # 1. DB — si connecter() avait échoué, on serait déjà dans l'except global
        checks.append({'key': 'db', 'label': 'Base de données', 'status': 'ok', 'detail': 'connexion OK'})

        # 2. Pipeline push (VAPID + subscriptions) + auto-fix subs invalides
        if not (VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY):
            checks.append({'key': 'vapid', 'label': 'Clés VAPID', 'status': 'red',
                           'detail': 'VAPID manquante(s) — aucun push possible'})
        else:
            cur.execute("SELECT id, subscription FROM push_subscriptions")
            subs = cur.fetchall()
            bad = []
            for r in subs:
                try:
                    json.loads(r['subscription'])
                except Exception:
                    bad.append(r['id'])
            if bad:
                ph = ",".join(["%s"] * len(bad))
                cur.execute(f"DELETE FROM push_subscriptions WHERE id IN ({ph})", tuple(bad))
                db.commit()
                healed.append(f"{len(bad)} subscription(s) push invalide(s) purgée(s)")
            vivantes = len(subs) - len(bad)
            checks.append({'key': 'push', 'label': 'Subscriptions push',
                           'status': 'warn' if vivantes == 0 else 'ok',
                           'detail': f'{vivantes} subscription(s) vivante(s)'})

        # 3. Config email (Brevo)
        checks.append({'key': 'email', 'label': 'Service email',
                       'status': 'ok' if os.getenv('BREVO_API_KEY') else 'red',
                       'detail': 'Brevo OK' if os.getenv('BREVO_API_KEY') else 'BREVO_API_KEY absente'})

        # 4. Crons notifs — dernière notif envoyée (silence > 30h = anormal)
        try:
            _ensure_notif_table(cur)
            cur.execute("SELECT MAX(sent_at) AS last FROM notifications_envoyees")
            last = cur.fetchone()['last']
            if last is None:
                checks.append({'key': 'cron', 'label': 'Crons notifs', 'status': 'warn',
                               'detail': 'aucune notif jamais envoyée'})
            else:
                h = (datetime.now() - last).total_seconds() / 3600
                checks.append({'key': 'cron', 'label': 'Crons notifs',
                               'status': 'warn' if h > 30 else 'ok',
                               'detail': f'dernière notif il y a {h:.0f}h'})
        except Exception as e:
            checks.append({'key': 'cron', 'label': 'Crons notifs', 'status': 'warn', 'detail': f'indéterminé ({e})'})

        # 5. Taux d'erreurs backend (dernière heure)
        try:
            _ensure_error_log(cur)
            cur.execute("SELECT COUNT(*) AS n FROM error_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)")
            errs = cur.fetchone()['n']
            checks.append({'key': 'errors', 'label': "Taux d'erreurs",
                           'status': 'red' if errs >= 25 else 'warn' if errs >= 8 else 'ok',
                           'detail': f'{errs} erreur(s) sur la dernière heure'})
        except Exception as e:
            checks.append({'key': 'errors', 'label': "Taux d'erreurs", 'status': 'warn', 'detail': f'indéterminé ({e})'})

        # 6. Backup quotidien (dernier succès)
        try:
            cur.execute("SELECT MAX(cree_le) AS last FROM backups_log WHERE statut='succes'")
            last = cur.fetchone()['last']
            if last is None:
                checks.append({'key': 'backup', 'label': 'Backup', 'status': 'warn', 'detail': 'aucun backup réussi enregistré'})
            else:
                h = (datetime.now() - last).total_seconds() / 3600
                checks.append({'key': 'backup', 'label': 'Backup',
                               'status': 'red' if h > 50 else 'warn' if h > 26 else 'ok',
                               'detail': f'dernier backup il y a {h:.0f}h'})
        except Exception:
            checks.append({'key': 'backup', 'label': 'Backup', 'status': 'warn', 'detail': 'table backups_log absente'})
    finally:
        cur.close(); db.close()
    return checks, healed

def _watchdog_email_html(reds, warns, healed):
    t = EMAIL_TOKENS
    def _line(c, color):
        return (f'<tr><td style="padding:10px 14px;border-bottom:1px solid {t["border"]};">'
                f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{color};margin-right:10px;"></span>'
                f'<strong style="color:{t["text"]};font-size:13.5px;">{c["label"]}</strong>'
                f'<span style="color:{t["text_2"]};font-size:12.5px;"> — {c["detail"]}</span></td></tr>')
    rows = "".join(_line(c, t['danger']) for c in reds) + "".join(_line(c, t['warning']) for c in warns)
    healed_html = ""
    if healed:
        items = "".join(f'<li style="margin:0 0 4px;">{h}</li>' for h in healed)
        healed_html = (f'<p style="color:{t["text_2"]};margin:22px 0 6px;font-size:13px;font-weight:600;">Réparé automatiquement</p>'
                       f'<ul style="color:{t["success"]};margin:0;padding-left:18px;font-size:13px;line-height:1.6;">{items}</ul>')
    contenu = f"""
    <h1 style="color:{t['text']};margin:0 0 6px;font-size:21px;font-weight:700;letter-spacing:-0.3px;">Alerte watchdog GetShift</h1>
    <p style="color:{t['text_2']};margin:0 0 22px;font-size:14px;line-height:1.6;">Le surveillant a détecté un ou plusieurs problèmes sur l'application.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:{t['surface_2']};border-radius:12px;border:1px solid {t['border']};overflow:hidden;">{rows}</table>
    {healed_html}
    <p style="color:{t['text_3']};margin:24px 0 0;font-size:12px;line-height:1.6;">Tu reçois cette alerte car tu es l'administrateur de GetShift. Pas de nouvel email pour le même problème avant 6h.</p>
    """
    return _base_email(contenu, "Alerte watchdog GetShift")

@app.route('/watchdog/run', methods=['POST'])
def watchdog_run():
    """Tick de surveillance (cron ~20 min). Lance les checks + auto-fix, et alerte
    le fondateur par email si un check est rouge (dédup 6h par signature d'incident)."""
    checks, healed = _watchdog_run_checks()
    reds = [c for c in checks if c['status'] == 'red']
    warns = [c for c in checks if c['status'] == 'warn']
    alerted = False
    if reds:
        if not FOUNDER_ALERT_EMAIL:
            print("[Watchdog] Problèmes détectés mais FOUNDER_ALERT_EMAIL non définie — pas d'alerte")
        else:
            try:
                db = connecter(); cur = db.cursor(dictionary=True)
                issue_key = "red:" + ",".join(sorted(c['key'] for c in reds))
                if _watchdog_should_alert(cur, db, issue_key, cooldown_h=6):
                    html = _watchdog_email_html(reds, warns, healed)
                    threading.Thread(target=envoyer_email,
                                     args=(FOUNDER_ALERT_EMAIL, "Alerte watchdog — GetShift", html)).start()
                    alerted = True
                cur.close(); db.close()
            except Exception as e:
                print(f"[Watchdog] Envoi alerte échoué: {e}")
    overall = 'red' if reds else 'warn' if warns else 'ok'
    return jsonify({'overall': overall, 'checks': checks, 'healed': healed, 'alerted': alerted}), 200


@app.route('/debug/gcal-status', methods=['GET'])
def debug_gcal_status():
    """Diagnose complet Google Calendar pour un user.
    Usage:
      ?user_id=X                    → state seul (intégration, autosync, scope effectif)
      ?user_id=X&test_write=1       → tente un event test (puis le supprime) pour valider le scope write
      ?user_id=X&task_id=T          → ajoute l'état détaillé de la tâche T
      Combinable.
    """
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'error': 'user_id requis (?user_id=N)'}), 400
    info = {'user_id': user_id}
    try:
        db = connecter()
        c = db.cursor(dictionary=True)
        c.execute("SELECT autosync_calendar FROM users WHERE id=%s", (user_id,))
        u = c.fetchone()
        info['autosync_calendar'] = u.get('autosync_calendar') if u else 'USER_NOT_FOUND'
        c.execute("SELECT COUNT(*) AS n FROM integrations WHERE user_id=%s AND type='google_calendar'", (user_id,))
        info['integration_present'] = c.fetchone()['n'] > 0
        task_id = request.args.get('task_id', type=int)
        if task_id:
            c.execute("SELECT id, titre, deadline, focus_date, terminee, google_event_id, gcal_sync_mode FROM taches WHERE id=%s", (task_id,))
            t = c.fetchone()
            info['task'] = {
                'id': t['id'], 'titre': t['titre'],
                'deadline': str(t['deadline']) if t['deadline'] else None,
                'focus_date': str(t['focus_date']) if t['focus_date'] else None,
                'terminee': bool(t['terminee']),
                'google_event_id': t['google_event_id'],
                'gcal_sync_mode': t['gcal_sync_mode'],
            } if t else None
        db.close()
        creds = get_google_calendar_creds(user_id)
        info['creds_ok'] = bool(creds)
        if creds:
            try:
                service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
                service.calendarList().list(maxResults=1).execute()
                info['read_works'] = True
            except Exception as e:
                info['read_works'] = False
                info['read_error'] = str(e)[:250]
            if request.args.get('test_write') == '1' and info.get('read_works'):
                try:
                    service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
                    now = datetime.now()
                    test_body = {
                        'summary': '[DEBUG] GetShift test write',
                        'description': "Test scope OAuth — sera supprimé.",
                        'start': {'dateTime': (now + timedelta(hours=1)).isoformat(), 'timeZone': 'Europe/Paris'},
                        'end': {'dateTime': (now + timedelta(hours=2)).isoformat(), 'timeZone': 'Europe/Paris'},
                    }
                    ev = service.events().insert(calendarId='primary', body=test_body).execute()
                    info['write_works'] = True
                    info['test_event_id'] = ev.get('id')
                    try:
                        service.events().delete(calendarId='primary', eventId=ev['id']).execute()
                        info['test_event_cleaned'] = True
                    except Exception as e:
                        info['test_event_cleaned'] = False
                        info['cleanup_error'] = str(e)[:200]
                except HttpError as e:
                    info['write_works'] = False
                    info['write_error_status'] = getattr(e.resp, 'status', None) if getattr(e, 'resp', None) else None
                    info['write_error'] = str(e)[:300]
                except Exception as e:
                    info['write_works'] = False
                    info['write_error'] = str(e)[:300]
    except Exception as e:
        info['fatal_error'] = str(e)[:300]
    return jsonify(info), 200


@app.route('/debug/email-status', methods=['GET'])
def debug_email_status():
    """Diagnose le pipeline Brevo : env var, sender, et test d'envoi optionnel.
    Usage: GET /debug/email-status?to=email@test.com (test envoi)
       OU: GET /debug/email-status (info seule, pas d'envoi)
    """
    api_key = os.getenv('BREVO_API_KEY', '')
    info = {
        'brevo_api_key_set': bool(api_key),
        'brevo_api_key_prefix': (api_key[:10] + '...') if api_key else None,
        'mail_default_sender': os.getenv('MAIL_DEFAULT_SENDER', 'chamdaane@gmail.com'),
    }
    to = request.args.get('to')
    if to:
        ok = envoyer_email(
            to,
            '[DEBUG] GetShift — test Brevo',
            '<p>Test du pipeline email. Si tu lis ca, Brevo fonctionne.</p>',
        )
        info['test_send'] = {'success': ok, 'to': to, 'note': 'check Render logs si False'}
    return jsonify(info), 200


# ── Pending invitations (flow QR sans localStorage côté ami) ─────────
def _stocker_invitation_pending(curseur, db, email, code):
    """Stocke un code d'invitation pending pour cet email (TTL 7 jours).
    Idempotent : supprime les anciennes pendings sur même couple email+code."""
    if not code or not email: return
    try:
        curseur.execute("DELETE FROM pending_invitations WHERE email=%s AND code=%s", (email, code))
        curseur.execute(
            "INSERT INTO pending_invitations (email, code, expires_at) VALUES (%s, %s, DATE_ADD(NOW(), INTERVAL 7 DAY))",
            (email, code)
        )
        db.commit()
    except Exception as e:
        print(f"[Invitations] stocker erreur: {e}")

def consommer_invitations_pending(curseur, db, user_id, email):
    """Si pending pour cet email, auto-attache l'user aux équipes correspondantes.
    Retourne la liste des noms d'équipes rejointes (vide si aucune)."""
    rejointes = []
    if not email: return rejointes
    try:
        curseur.execute(
            "SELECT id, code FROM pending_invitations WHERE email=%s AND expires_at > NOW()",
            (email,)
        )
        pendings = curseur.fetchall() or []
        for p in pendings:
            curseur.execute("SELECT id, nom FROM equipes WHERE code_invitation=%s", (p['code'],))
            equipe = curseur.fetchone()
            if equipe:
                curseur.execute(
                    "SELECT id FROM equipe_membres WHERE equipe_id=%s AND user_id=%s",
                    (equipe['id'], user_id)
                )
                if not curseur.fetchone():
                    curseur.execute(
                        "INSERT INTO equipe_membres (equipe_id, user_id, role) VALUES (%s, %s, 'membre')",
                        (equipe['id'], user_id)
                    )
                    rejointes.append(equipe['nom'])
            # Consommé : supprimer le pending (qu'il ait matché ou pas — code invalide expire au lieu de rester)
            curseur.execute("DELETE FROM pending_invitations WHERE id=%s", (p['id'],))
        db.commit()
    except Exception as e:
        print(f"[Invitations] consommer erreur: {e}")
    return rejointes


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
            niveau = user.get('niveau', 1); points = user.get('points', 0); theme = user.get('theme', 'light')
        else:
            cursor.execute("INSERT INTO users (nom, email, password, google_id, email_verifie, points, niveau, theme) VALUES (%s, %s, %s, %s, TRUE, 0, 1, 'light')", (nom, email, secrets.token_hex(32), google_id))
            db.commit()
            user_id = cursor.lastrowid; nom_final = nom; niveau = 1; points = 0; theme = 'light'

        # Si invite_code fourni : consommer immédiatement (Google = email auto-vérifié)
        invite_code = (request.json.get('invite_code') or '').strip()
        equipes_rejointes = []
        if invite_code:
            _stocker_invitation_pending(cursor, db, email, invite_code)
            equipes_rejointes = consommer_invitations_pending(cursor, db, user_id, email)

        cursor.close(); db.close()
        access_token = create_access_token(identity=str(user_id))
        _enregistrer_session(user_id, access_token)
        response = make_response(jsonify({
            "message": "Connexion Google réussie",
            "user": {"id": user_id, "nom": nom_final, "email": email, "niveau": niveau, "points": points, "theme": theme, "avatar": avatar_url},
            "equipes_rejointes": equipes_rejointes,
            "access_token": access_token,  # voie header Bearer (cookie tiers bloqué sur mobile)
        }))
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
        password_hash = hash_password(password)
        verification_token = secrets.token_urlsafe(32)
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if curseur.fetchone():
            curseur.close(); db.close()
            return jsonify({"erreur": "Email déjà utilisé !"}), 400
        curseur.execute("INSERT INTO users (nom, email, password, verification_token, email_verifie) VALUES (%s, %s, %s, %s, FALSE)", (nom, email, password_hash, verification_token))
        db.commit()

        # Pending invitation : stocker pour consommation auto au verify-email
        invite_code = (data.get('invite_code') or '').strip()
        if invite_code:
            _stocker_invitation_pending(curseur, db, email, invite_code)

        curseur.close(); db.close()
        threading.Thread(target=envoyer_email_verification, args=(email, nom, verification_token)).start()
        return jsonify({"message": "Compte créé ! Vérifiez votre email."})
    except Exception as e:
        return erreur_500(e)

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
        db.commit()

        # Récupère l'email pour consommer les pending invitations
        curseur.execute("SELECT email FROM users WHERE id=%s", (user['id'],))
        u = curseur.fetchone()
        equipes_rejointes = consommer_invitations_pending(curseur, db, user['id'], u.get('email') if u else None) if u else []

        db.close()
        # Message bonus si invitation auto-consommée
        bonus_msg = ""
        if equipes_rejointes:
            noms = ", ".join(equipes_rejointes)
            bonus_msg = f'<p style="color:#4caf82;font-size:14px;margin-top:8px">✅ Tu as rejoint l\'équipe : {noms}</p>'
        return f"""<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
            <h1 style="color:#6c63ff">Email vérifié !</h1>
            <p>Votre compte GetShift est maintenant actif.</p>
            {bonus_msg}
            <a href="https://chamdaane-a11y.github.io/taskflow" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:20px">Se connecter →</a>
        </body></html>"""
    except Exception as e:
        return erreur_500(e)

@app.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        if not email or not password:
            return jsonify({"erreur": "Email et mot de passe requis"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id, nom, email, email_verifie, theme, totp_enabled, password FROM users WHERE email = %s", (email,))
        user = curseur.fetchone()
        curseur.close(); db.close()
        if not user or not verify_password(password, user.get('password'), user['id']):
            return jsonify({"erreur": "Email ou mot de passe incorrect !"}), 401
        user.pop('password', None)  # ne jamais propager le hash
        if not user.get('email_verifie'):
            return jsonify({"erreur": "Veuillez vérifier votre email avant de vous connecter !", "non_verifie": True}), 403

        # 2FA : si activé → envoyer un code à 6 chiffres par email + retourner
        # un token temporaire. Le user_id est dans le claim `sub` du temp_token.
        if user.get('totp_enabled'):
            _store_and_send_2fa_code(user['id'], user['email'], user['nom'], contexte='connexion')
            temp_token = create_access_token(
                identity=str(user['id']),
                expires_delta=timedelta(minutes=10),
                additional_claims={'type': 'totp_pending'}
            )
            at = user['email'].index('@')
            masked = user['email'][0] + '*' * max(1, at - 2) + user['email'][at-1:] if at > 1 else user['email']
            return jsonify({"requires_2fa": True, "temp_token": temp_token, "email_masked": masked}), 200

        # Si invite_code fourni OU si pending existe pour cet email → auto-attach
        equipes_rejointes = []
        try:
            db2 = connecter()
            cur2 = db2.cursor(dictionary=True)
            invite_code = (data.get('invite_code') or '').strip()
            if invite_code:
                _stocker_invitation_pending(cur2, db2, user['email'], invite_code)
            equipes_rejointes = consommer_invitations_pending(cur2, db2, user['id'], user['email'])
            cur2.close(); db2.close()
        except Exception as e:
            print(f"[login] consommer invitations erreur: {e}")

        access_token = create_access_token(identity=str(user['id']))
        _enregistrer_session(user['id'], access_token)
        response = make_response(jsonify({
            "message": "Connecté !",
            "user": {"id": user['id'], "nom": user['nom'], "email": user['email'], "theme": user.get('theme', 'light')},
            "equipes_rejointes": equipes_rejointes,
            "access_token": access_token,  # voie header Bearer (cookie tiers bloqué sur mobile)
        }))
        set_access_cookies(response, access_token)
        return response
    except Exception as e:
        return erreur_500(e)

@app.route('/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    try:
        claims = get_jwt()
        if claims:
            jti = claims.get('jti')
            if jti:
                db = connecter(); cur = db.cursor()
                cur.execute("DELETE FROM user_sessions WHERE jti=%s", (jti,))
                db.commit(); cur.close(); db.close()
    except Exception:
        pass
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
        return erreur_500(e)

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
        t = EMAIL_TOKENS
        contenu = f"""
        <h1 style="color:{t['text']};margin:0 0 10px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Réinitialisation du mot de passe</h1>
        <p style="color:{t['text_2']};margin:0 0 24px;font-size:14px;line-height:1.6;">Bonjour <strong style="color:{t['text']};">{user['nom']}</strong>. Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau.</p>
        {_email_cta_btn("Réinitialiser mon mot de passe", lien)}
        <p style="color:{t['text_3']};margin:24px 0 0;font-size:12px;line-height:1.6;">Ce lien expire dans <strong>1h</strong>. Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>
        """
        threading.Thread(target=envoyer_email, args=(email, "Réinitialisation mot de passe — GetShift", _base_email(contenu, "Réinitialisation"))).start()
        return jsonify({"message": "Si cet email existe, un lien a été envoyé."})
    except Exception as e:
        return erreur_500(e)

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
        password_hash = hash_password(password)
        curseur.execute("UPDATE users SET password=%s, reset_token=NULL, reset_token_expiry=NULL WHERE id=%s", (password_hash, user['id']))
        db.commit(); db.close()
        return jsonify({"message": "Mot de passe modifié avec succès !"})
    except Exception as e:
        return erreur_500(e)

# ============================================
# UTILISATEURS
# ============================================

@app.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    _ensure_email_change_columns()
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute(
        "SELECT id, nom, email, points, niveau, theme, streak, derniere_activite, "
        "streak_freeze_used_at, created_at, email_verifie, google_id, password, "
        "email_change_new, email_change_expiry FROM users WHERE id=%s",
        (id,)
    )
    user = curseur.fetchone()
    if user:
        curseur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=TRUE", (id,))
        user['taches_count'] = (curseur.fetchone() or {}).get('nb', 0)
        # Sérialiser les dates pour JSON
        for k in ('derniere_activite', 'streak_freeze_used_at', 'created_at', 'email_change_expiry'):
            if user.get(k) is not None:
                user[k] = user[k].isoformat() if hasattr(user[k], 'isoformat') else str(user[k])
        # Booléens propres
        user['email_verifie'] = bool(user.get('email_verifie'))
        user['google_id'] = user.get('google_id') or None
        user['has_password'] = bool(user.pop('password', None))  # ne jamais exposer le hash
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
        return erreur_500(e)

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
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT password FROM users WHERE id=%s", (id,))
        row = curseur.fetchone()
        if not row or not verify_password(ancien, row.get('password'), id):
            db.close(); return jsonify({"erreur": "Mot de passe actuel incorrect"}), 400
        curseur.execute("UPDATE users SET password=%s WHERE id=%s", (hash_password(nouveau), id))
        db.commit(); db.close()
        return jsonify({"message": "Mot de passe modifié avec succès !"})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/email-change/request', methods=['POST'])
def request_email_change(id):
    try:
        _ensure_email_change_columns()
        data = request.get_json() or {}
        new_email = (data.get('new_email') or '').strip().lower()
        password  = (data.get('password') or '').strip()
        if not new_email or not password:
            return jsonify({"erreur": "Email et mot de passe requis"}), 400
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', new_email):
            return jsonify({"erreur": "Email invalide"}), 400
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT id, nom, email, password, google_id FROM users WHERE id=%s", (id,))
        user = cur.fetchone()
        if not user:
            cur.close(); db.close()
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        if user.get('google_id'):
            cur.close(); db.close()
            return jsonify({"erreur": "Ton compte est géré par Google, change d'abord d'adresse côté Google"}), 400
        if new_email == (user.get('email') or '').lower():
            cur.close(); db.close()
            return jsonify({"erreur": "C'est déjà ton email actuel"}), 400
        if not verify_password(password, user.get('password'), id):
            cur.close(); db.close()
            return jsonify({"erreur": "Mot de passe incorrect"}), 401
        cur.execute("SELECT id FROM users WHERE email=%s AND id!=%s", (new_email, id))
        if cur.fetchone():
            cur.close(); db.close()
            return jsonify({"erreur": "Cet email est déjà utilisé"}), 409
        token = secrets.token_urlsafe(32)
        expiry = datetime.now() + timedelta(hours=24)
        cur.execute(
            "UPDATE users SET email_change_token=%s, email_change_new=%s, email_change_expiry=%s WHERE id=%s",
            (token, new_email, expiry, id)
        )
        db.commit(); cur.close(); db.close()
        envoyer_email_changement(new_email, user['nom'], token)
        return jsonify({"message": "Un email de confirmation a été envoyé à ta nouvelle adresse"})
    except Exception as e:
        return erreur_500(e)

@app.route('/confirm-email-change/<token>', methods=['GET'])
def confirm_email_change(token):
    try:
        _ensure_email_change_columns()
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute(
            "SELECT id, nom, email_change_new, email_change_expiry FROM users WHERE email_change_token=%s",
            (token,)
        )
        user = cur.fetchone()
        if not user:
            cur.close(); db.close()
            return """<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
                <h1 style="color:#e05c5c">Lien invalide ou déjà utilisé</h1>
                <a href="https://chamdaane-a11y.github.io/taskflow" style="color:#6c63ff">Retour à GetShift</a>
            </body></html>""", 400
        if user.get('email_change_expiry') and datetime.now() > user['email_change_expiry']:
            cur.execute(
                "UPDATE users SET email_change_token=NULL, email_change_new=NULL, email_change_expiry=NULL WHERE id=%s",
                (user['id'],)
            )
            db.commit(); cur.close(); db.close()
            return """<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
                <h1 style="color:#e05c5c">Ce lien a expiré</h1>
                <p>Demande un nouveau changement d'email depuis ton profil.</p>
                <a href="https://chamdaane-a11y.github.io/taskflow" style="color:#6c63ff">Retour à GetShift</a>
            </body></html>""", 400
        # Vérifier que personne d'autre n'a pris cet email entre-temps
        cur.execute("SELECT id FROM users WHERE email=%s AND id!=%s", (user['email_change_new'], user['id']))
        if cur.fetchone():
            cur.close(); db.close()
            return """<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
                <h1 style="color:#e05c5c">Cet email est déjà utilisé</h1>
                <a href="https://chamdaane-a11y.github.io/taskflow" style="color:#6c63ff">Retour à GetShift</a>
            </body></html>""", 409
        cur.execute(
            "UPDATE users SET email=%s, email_verifie=TRUE, email_change_token=NULL, email_change_new=NULL, email_change_expiry=NULL WHERE id=%s",
            (user['email_change_new'], user['id'])
        )
        db.commit(); cur.close(); db.close()
        return f"""<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
            <h1 style="color:#6c63ff">Email mis à jour !</h1>
            <p>Ton nouvel email est <strong>{user['email_change_new']}</strong>.</p>
            <p style="color:#888;font-size:13px">Reconnecte-toi avec cette nouvelle adresse.</p>
            <a href="https://chamdaane-a11y.github.io/taskflow" style="display:inline-block;background:linear-gradient(90deg,#6c63ff,#a855f7);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:20px">Se connecter →</a>
        </body></html>"""
    except Exception as e:
        return f"""<html><body style="font-family:Arial;text-align:center;background:#0f0f13;color:#f0f0f5;padding:60px">
            <h1 style="color:#e05c5c">Erreur</h1><p>{e}</p>
        </body></html>""", 500

@app.route('/users/<int:id>/export', methods=['GET'])
def export_user_data(id):
    try:
        db = connecter(); cur = db.cursor(dictionary=True)
        dump = {"exported_at": datetime.now().isoformat(), "version": 1}

        def _safe_fetch(sql, params=()):
            try:
                cur.execute(sql, params)
                rows = cur.fetchall()
                # Sérialiser les datetime
                for row in rows:
                    for k, v in list(row.items()):
                        if hasattr(v, 'isoformat'):
                            row[k] = v.isoformat()
                return rows
            except Exception:
                return []

        dump['profile']         = (_safe_fetch("SELECT id, nom, email, niveau, points, streak, theme, created_at FROM users WHERE id=%s", (id,)) or [None])[0]
        dump['taches']          = _safe_fetch("SELECT * FROM taches WHERE user_id=%s", (id,))
        dump['objectifs']       = _safe_fetch("SELECT * FROM objectifs WHERE user_id=%s", (id,))
        dump['categories']      = _safe_fetch("SELECT * FROM categories WHERE user_id=%s", (id,))
        dump['badges']          = _safe_fetch("SELECT * FROM badges_utilisateurs WHERE user_id=%s", (id,))
        dump['templates']       = _safe_fetch("SELECT * FROM templates WHERE user_id=%s", (id,))
        dump['planification']   = _safe_fetch("SELECT * FROM planification WHERE user_id=%s", (id,))
        dump['tomorrow_plans']  = _safe_fetch("SELECT * FROM tomorrow_plans WHERE user_id=%s", (id,))
        dump['checkin_soir']    = _safe_fetch("SELECT * FROM checkin_soir WHERE user_id=%s", (id,))
        dump['coach_messages']  = _safe_fetch("SELECT * FROM coach_messages WHERE user_id=%s ORDER BY id DESC LIMIT 200", (id,))
        dump['user_memory']     = _safe_fetch("SELECT * FROM user_memory WHERE user_id=%s", (id,))
        dump['integrations']    = _safe_fetch("SELECT id, type, cree_le FROM integrations WHERE user_id=%s", (id,))
        dump['sessions']        = _safe_fetch("SELECT id, device, ip, created_at, last_seen FROM user_sessions WHERE user_id=%s", (id,))

        cur.close(); db.close()
        from flask import Response
        return Response(
            json.dumps(dump, ensure_ascii=False, indent=2, default=str),
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename="getshift-export-{id}-{datetime.now().strftime("%Y%m%d")}.json"'}
        )
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    try:
        data = request.get_json() or {}
        confirmation = (data.get('confirmation') or '').strip()
        password     = (data.get('password') or '').strip()
        if confirmation != 'SUPPRIMER':
            return jsonify({"erreur": "Confirmation invalide (tape SUPPRIMER en majuscules)"}), 400

        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT id, password, google_id FROM users WHERE id=%s", (id,))
        user = cur.fetchone()
        if not user:
            cur.close(); db.close()
            return jsonify({"erreur": "Compte introuvable"}), 404

        # Compte email : exige le mot de passe. Compte Google : confirmation suffit.
        if not user.get('google_id'):
            if not password:
                cur.close(); db.close()
                return jsonify({"erreur": "Mot de passe requis"}), 400
            if not verify_password(password, user.get('password'), id):
                cur.close(); db.close()
                return jsonify({"erreur": "Mot de passe incorrect"}), 401

        # Suppression explicite sur toutes les tables liées
        cur2 = db.cursor()
        tables = [
            'badges_utilisateurs', 'categories', 'checkin_soir', 'coach_daily_messages',
            'coach_messages', 'historique_ia', 'integrations', 'objectifs',
            'planification', 'push_subscriptions', 'taches', 'task_dna_analyses',
            'templates', 'tomorrow_plans', 'user_memory', 'user_sessions',
            'notifications_envoyees', 'oauth_states',
        ]
        for t in tables:
            try:
                cur2.execute(f"DELETE FROM {t} WHERE user_id=%s", (id,))
            except Exception:
                pass
        cur2.execute("DELETE FROM users WHERE id=%s", (id,))
        db.commit(); cur.close(); cur2.close(); db.close()

        response = make_response(jsonify({"message": "Compte supprimé"}))
        unset_jwt_cookies(response)
        return response
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/email-change/cancel', methods=['POST'])
def cancel_email_change(id):
    try:
        _ensure_email_change_columns()
        db = connecter(); cur = db.cursor()
        cur.execute(
            "UPDATE users SET email_change_token=NULL, email_change_new=NULL, email_change_expiry=NULL WHERE id=%s",
            (id,)
        )
        db.commit(); cur.close(); db.close()
        return jsonify({"message": "Changement annulé"})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/sessions', methods=['GET'])
@jwt_required()
def list_sessions(id):
    try:
        if str(get_jwt_identity()) != str(id):
            return jsonify({"erreur": "Accès refusé"}), 403
        current_jti = get_jwt().get('jti', '')
        db = connecter(); cur = db.cursor(dictionary=True)
        _ensure_sessions_table(cur)

        # Migration douce : si la session courante n'a jamais été enregistrée
        # (user logué avant le déploiement de cette feature), on l'inscrit maintenant.
        if current_jti:
            cur.execute("SELECT id FROM user_sessions WHERE jti=%s", (current_jti,))
            if not cur.fetchone():
                device = parse_device(request.headers.get('User-Agent', ''))
                ip = get_client_ip()
                cur.execute(
                    "INSERT INTO user_sessions (user_id, jti, device, ip) VALUES (%s, %s, %s, %s)",
                    (id, current_jti, device, ip)
                )
                db.commit()
            else:
                # Ping last_seen
                cur.execute("UPDATE user_sessions SET last_seen=NOW() WHERE jti=%s", (current_jti,))
                db.commit()

        cur.execute(
            "SELECT id, jti, device, ip, created_at, last_seen FROM user_sessions WHERE user_id=%s ORDER BY last_seen DESC",
            (id,)
        )
        rows = cur.fetchall()
        cur.close(); db.close()
        sessions = [{
            "id":         row['id'],
            "device":     row['device'] or '—',
            "ip":         row['ip'] or '—',
            "created_at": row['created_at'].isoformat() if row['created_at'] else None,
            "last_seen":  row['last_seen'].isoformat() if row['last_seen'] else None,
            "is_current": row['jti'] == current_jti,
        } for row in rows]
        return jsonify({"sessions": sessions})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(id, session_id):
    try:
        if str(get_jwt_identity()) != str(id):
            return jsonify({"erreur": "Accès refusé"}), 403
        db = connecter(); cur = db.cursor()
        cur.execute("DELETE FROM user_sessions WHERE id=%s AND user_id=%s", (session_id, id))
        db.commit(); cur.close(); db.close()
        return jsonify({"message": "Session déconnectée"})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/sessions/others', methods=['DELETE'])
@jwt_required()
def delete_other_sessions(id):
    try:
        if str(get_jwt_identity()) != str(id):
            return jsonify({"erreur": "Accès refusé"}), 403
        current_jti = get_jwt().get('jti', '')
        db = connecter(); cur = db.cursor()
        cur.execute("DELETE FROM user_sessions WHERE user_id=%s AND jti!=%s", (id, current_jti))
        db.commit(); cur.close(); db.close()
        return jsonify({"message": "Autres sessions déconnectées"})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/theme', methods=['PUT'])
def update_theme(id):
    data = request.get_json()
    db = connecter()
    curseur = db.cursor()
    curseur.execute("UPDATE users SET theme=%s WHERE id=%s", (data['theme'], id))
    db.commit(); db.close()
    return jsonify({"message": "Theme mis a jour !"})

@app.route('/users/<int:id>/notif-prefs', methods=['GET'])
def get_notif_prefs(id):
    try:
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT notif_prefs FROM users WHERE id=%s", (id,))
        row = cur.fetchone(); db.close()
        if not row:
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        raw = row.get('notif_prefs')
        prefs = json.loads(raw) if raw else None
        return jsonify({"prefs": prefs})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/notif-prefs', methods=['PUT'])
def update_notif_prefs(id):
    try:
        data = request.get_json()
        prefs = data.get('prefs')
        if not isinstance(prefs, dict):
            return jsonify({"erreur": "prefs doit être un objet"}), 400
        db = connecter(); cur = db.cursor()
        cur.execute("UPDATE users SET notif_prefs=%s WHERE id=%s", (json.dumps(prefs, ensure_ascii=False), id))
        db.commit(); db.close()
        return jsonify({"message": "Préférences sauvegardées"})
    except Exception as e:
        return erreur_500(e)

# ── 2FA email OTP ─────────────────────────────────────────────────────────────

def _generate_2fa_code():
    """Code à 6 chiffres, zero-padded (ex: '042817')."""
    import secrets
    return f"{secrets.randbelow(1_000_000):06d}"

def _send_2fa_code_email(to_email, nom, code, contexte='connexion'):
    """Envoie le code 2FA par email via Brevo. contexte='connexion' ou 'activation'."""
    t = EMAIL_TOKENS
    titre = "Code de connexion" if contexte == 'connexion' else "Activation de la 2FA"
    sous_titre = (
        "Quelqu'un (probablement toi) essaie de se connecter à GetShift."
        if contexte == 'connexion' else
        "Tu actives la double authentification sur ton compte GetShift."
    )
    contenu = f"""
    <h1 style="color:{t['text']};margin:0 0 10px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">{titre}</h1>
    <p style="color:{t['text_2']};margin:0 0 24px;font-size:14px;line-height:1.6;">Salut <strong style="color:{t['text']};">{nom}</strong>. {sous_titre} Entre ce code à 6 chiffres dans GetShift :</p>
    <div style="background:{t['bg']};border:1px solid {t['ember_dark']};border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
      <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:0.4em;color:{t['ember']};">{code}</div>
    </div>
    <p style="color:{t['text_3']};font-size:12.5px;line-height:1.6;margin:0;">Ce code expire dans <strong style="color:{t['text_2']};">10 minutes</strong>.</p>
    <p style="color:{t['text_3']};font-size:12.5px;line-height:1.6;margin:6px 0 0;">Si tu n'as rien demandé, ignore cet email et change ton mot de passe.</p>
    """
    threading.Thread(target=envoyer_email, args=(to_email, f"GetShift — {titre} : {code}", _base_email(contenu, titre))).start()

def _store_and_send_2fa_code(user_id, email, nom, contexte='connexion'):
    """Génère un code, le stocke avec expiry +10min, reset attempts, envoie l'email.
    Retourne le code (pour les tests) ou None si erreur."""
    code = _generate_2fa_code()
    expiry = datetime.now() + timedelta(minutes=10)
    db = connecter(); cur = db.cursor()
    try:
        cur.execute(
            "UPDATE users SET email_2fa_code=%s, email_2fa_code_expiry=%s, email_2fa_attempts=0 WHERE id=%s",
            (code, expiry, user_id)
        )
        db.commit()
    finally:
        cur.close(); db.close()
    _send_2fa_code_email(email, nom, code, contexte)
    return code

def _verify_user_password(user_id, password):
    """Vérifie qu'un password en clair correspond au hash stocké. Refuse les
    comptes Google-only (password NULL) — pour eux, le password n'est pas
    une preuve d'identité."""
    if not password:
        return False, "Mot de passe requis"
    db = connecter(); cur = db.cursor(dictionary=True)
    cur.execute("SELECT password, google_id FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone(); cur.close(); db.close()
    if not row:
        return False, "Utilisateur introuvable"
    if not row.get('password'):
        return False, "Définis d'abord un mot de passe via 'Mot de passe oublié' depuis la page de login"
    if not verify_password(password, row['password'], user_id):
        return False, "Mot de passe incorrect"
    return True, None

def _verify_totp_anti_replay(secret, code, last_counter):
    """Vérifie le code TOTP avec protection anti-replay.
    Retourne le compteur consommé, ou None si invalide / déjà utilisé."""
    if not code or len(code) != 6 or not code.isdigit():
        return None
    totp = pyotp.TOTP(secret)
    now = int(time.time())
    last = last_counter or 0
    # Fenêtre ±30s (offsets en pas de 30s)
    for offset in (0, -1, 1):
        t = now + offset * 30
        counter = t // 30
        if counter <= last:
            continue  # déjà consommé ou plus ancien
        try:
            expected = totp.at(t)
        except Exception:
            continue
        if expected == code:
            return counter
    return None

@app.route('/users/<int:id>/2fa/status', methods=['GET'])
def get_2fa_status(id):
    try:
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT totp_enabled FROM users WHERE id=%s", (id,))
        row = cur.fetchone(); db.close()
        if not row:
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        return jsonify({"enabled": bool(row.get('totp_enabled'))})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/2fa/setup', methods=['POST'])
@limiter.limit("5 per hour")
def setup_2fa(id):
    """Envoie un code à 6 chiffres par email. Exige le mot de passe en amont.
    L'utilisateur entre ensuite ce code via /2fa/verify pour activer la 2FA."""
    try:
        data = request.get_json() or {}
        password = (data.get('password') or '').strip()
        ok, err = _verify_user_password(id, password)
        if not ok:
            return jsonify({"erreur": err}), 400
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT nom, email, totp_enabled FROM users WHERE id=%s", (id,))
        row = cur.fetchone(); cur.close(); db.close()
        if not row:
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        if row.get('totp_enabled'):
            return jsonify({"erreur": "La 2FA est déjà activée. Désactive-la d'abord."}), 400
        _store_and_send_2fa_code(id, row['email'], row['nom'], contexte='activation')
        # On masque l'email pour le retour (ex: c***e@gmail.com)
        email = row['email']; at = email.index('@')
        masked = email[0] + '*' * max(1, at - 2) + email[at-1:] if at > 1 else email
        return jsonify({"message": f"Code envoyé à {masked}", "email_masked": masked})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/2fa/verify', methods=['POST'])
@limiter.limit("10 per minute")
def verify_2fa(id):
    """Vérifie le code 6 chiffres reçu par email et active la 2FA si correct.
    Max 5 tentatives par code, expiry 10 min."""
    try:
        data = request.get_json() or {}
        code = str(data.get('code', '')).strip()
        if not code or len(code) != 6 or not code.isdigit():
            return jsonify({"erreur": "Code à 6 chiffres requis"}), 400
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT email_2fa_code, email_2fa_code_expiry, email_2fa_attempts, totp_enabled FROM users WHERE id=%s", (id,))
        row = cur.fetchone()
        if not row or not row.get('email_2fa_code'):
            cur.close(); db.close()
            return jsonify({"erreur": "Lance d'abord /2fa/setup"}), 400
        if row.get('totp_enabled'):
            cur.close(); db.close()
            return jsonify({"erreur": "Déjà activée"}), 400
        if row['email_2fa_code_expiry'] and row['email_2fa_code_expiry'] < datetime.now():
            cur.close(); db.close()
            return jsonify({"erreur": "Code expiré, redemande-en un nouveau"}), 400
        if (row.get('email_2fa_attempts') or 0) >= 5:
            cur.close(); db.close()
            return jsonify({"erreur": "Trop de tentatives, redemande un nouveau code"}), 400
        if row['email_2fa_code'] != code:
            cur.execute("UPDATE users SET email_2fa_attempts=email_2fa_attempts+1 WHERE id=%s", (id,))
            db.commit(); cur.close(); db.close()
            return jsonify({"erreur": "Code invalide"}), 400
        # Code OK → activer + clear
        cur.execute(
            "UPDATE users SET totp_enabled=1, email_2fa_code=NULL, email_2fa_code_expiry=NULL, email_2fa_attempts=0 WHERE id=%s",
            (id,)
        )
        db.commit(); cur.close(); db.close()
        return jsonify({"message": "2FA activée"})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/2fa/disable', methods=['POST'])
@limiter.limit("10 per minute")
def disable_2fa(id):
    """Désactive la 2FA. Exige le mot de passe (pas le code email) — un voleur
    de session email ne doit pas pouvoir désactiver."""
    try:
        data = request.get_json() or {}
        password = (data.get('password') or '').strip()
        ok, err = _verify_user_password(id, password)
        if not ok:
            return jsonify({"erreur": err}), 400
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT totp_enabled FROM users WHERE id=%s", (id,))
        user_row = cur.fetchone()
        if not user_row:
            cur.close(); db.close(); return jsonify({"erreur": "Utilisateur introuvable"}), 404
        if not user_row.get('totp_enabled'):
            cur.close(); db.close(); return jsonify({"erreur": "La 2FA n'est pas activée"}), 400
        cur.execute(
            "UPDATE users SET totp_enabled=0, email_2fa_code=NULL, email_2fa_code_expiry=NULL, email_2fa_attempts=0 WHERE id=%s",
            (id,)
        )
        db.commit(); cur.close(); db.close()
        return jsonify({"message": "2FA désactivée"})
    except Exception as e:
        return erreur_500(e)

@app.route('/login/totp', methods=['POST'])
@limiter.limit("10 per minute")
def login_totp():
    """Étape 2 de la connexion : vérifie le code 6 chiffres reçu par email
    + émet le JWT de session. Max 5 tentatives, expiry 10 min."""
    try:
        data = request.get_json() or {}
        temp_token = data.get('temp_token', '')
        code = str(data.get('code', '')).strip()
        if not temp_token or not code:
            return jsonify({"erreur": "Token et code requis"}), 400
        if len(code) != 6 or not code.isdigit():
            return jsonify({"erreur": "Code à 6 chiffres requis"}), 400
        try:
            token_data = decode_token(temp_token)
        except Exception:
            return jsonify({"erreur": "Token invalide ou expiré"}), 401
        if token_data.get('type') != 'totp_pending':
            return jsonify({"erreur": "Token invalide"}), 401
        user_id = token_data.get('sub')
        if not user_id:
            return jsonify({"erreur": "Token invalide"}), 401
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT id, nom, email, theme, totp_enabled, email_2fa_code, email_2fa_code_expiry, email_2fa_attempts FROM users WHERE id=%s", (user_id,))
        user = cur.fetchone()
        if not user or not user.get('totp_enabled') or not user.get('email_2fa_code'):
            cur.close(); db.close()
            return jsonify({"erreur": "Code non émis ou 2FA non configurée"}), 400
        if user.get('email_2fa_code_expiry') and user['email_2fa_code_expiry'] < datetime.now():
            cur.close(); db.close()
            return jsonify({"erreur": "Code expiré, reconnecte-toi"}), 400
        if (user.get('email_2fa_attempts') or 0) >= 5:
            cur.close(); db.close()
            return jsonify({"erreur": "Trop de tentatives, reconnecte-toi"}), 400
        if user['email_2fa_code'] != code:
            cur.execute("UPDATE users SET email_2fa_attempts=email_2fa_attempts+1 WHERE id=%s", (user['id'],))
            db.commit(); cur.close(); db.close()
            return jsonify({"erreur": "Code invalide"}), 400
        # Code OK → clear le code pour éviter replay
        cur.execute(
            "UPDATE users SET email_2fa_code=NULL, email_2fa_code_expiry=NULL, email_2fa_attempts=0 WHERE id=%s",
            (user['id'],)
        )
        db.commit(); cur.close(); db.close()
        # Finaliser la session
        invite_code = (data.get('invite_code') or '').strip()
        equipes_rejointes = []
        try:
            db2 = connecter(); cur2 = db2.cursor(dictionary=True)
            if invite_code:
                _stocker_invitation_pending(cur2, db2, user['email'], invite_code)
            equipes_rejointes = consommer_invitations_pending(cur2, db2, user['id'], user['email'])
            cur2.close(); db2.close()
        except Exception as e:
            print(f"[login/totp] invitations erreur: {e}")
        access_token = create_access_token(identity=str(user['id']))
        _enregistrer_session(user['id'], access_token)
        response = make_response(jsonify({
            "message": "Connecté !",
            "user": {"id": user['id'], "nom": user['nom'], "email": user['email'], "theme": user.get('theme', 'light')},
            "equipes_rejointes": equipes_rejointes,
            "access_token": access_token,  # voie header Bearer (cookie tiers bloqué sur mobile)
        }))
        set_access_cookies(response, access_token)
        return response
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/calibration', methods=['GET'])
def get_calibration(id):
    """Task DNA — calibration : ratio temps_reel/temps_estime par catégorie ou priorité.
    Retourne top 3 sous-estimés (ratio > 1) et top 3 sur-estimés (ratio < 1)."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""
            SELECT t.priorite, t.temps_estime, t.temps_reel, c.nom AS categorie_nom
            FROM taches t
            LEFT JOIN categories c ON t.categorie_id = c.id
            WHERE t.user_id=%s
              AND t.terminee=TRUE
              AND t.temps_estime IS NOT NULL AND t.temps_estime > 0
              AND t.temps_reel IS NOT NULL AND t.temps_reel > 0
        """, (id,))
        rows = curseur.fetchall()
        db.close()

        if not rows:
            return jsonify({
                "totalAnalyses": 0, "calibrationGlobale": None,
                "sousEstimes": [], "surEstimes": [],
                "message": "Pas assez de données. Termine des tâches en notant temps_reel."
            })

        # Groupage par catégorie (ou priorité si pas de catégorie)
        groups = {}
        for r in rows:
            key = r['categorie_nom'] or f"Priorité {r['priorite']}"
            groups.setdefault(key, []).append({
                "estime": r['temps_estime'], "reel": r['temps_reel'],
                "ratio": r['temps_reel'] / r['temps_estime']
            })

        analyses = []
        for nom, items in groups.items():
            if len(items) < 2:  # min 2 tâches pour être fiable
                continue
            ratio_moyen = sum(i['ratio'] for i in items) / len(items)
            ecart_pct = round((ratio_moyen - 1) * 100)
            analyses.append({
                "categorie": nom, "ratio": round(ratio_moyen, 2),
                "ecartPct": ecart_pct, "nbTaches": len(items),
            })

        # Tri : sous-estimés (ecart > 0) descendant, sur-estimés (ecart < 0) ascendant
        sous_estimes = sorted([a for a in analyses if a['ecartPct'] > 10], key=lambda x: -x['ecartPct'])[:3]
        sur_estimes = sorted([a for a in analyses if a['ecartPct'] < -10], key=lambda x: x['ecartPct'])[:3]

        # Score calibration globale : pourcentage de tâches dans la zone ±20% du temps estimé
        total_taches = len(rows)
        bien_calibrees = sum(1 for r in rows if 0.8 <= (r['temps_reel'] / r['temps_estime']) <= 1.2)
        calibration_globale = round(bien_calibrees / total_taches * 100) if total_taches > 0 else 0

        return jsonify({
            "totalAnalyses": total_taches,
            "calibrationGlobale": calibration_globale,
            "sousEstimes": sous_estimes,
            "surEstimes": sur_estimes,
        })
    except Exception as e:
        return erreur_500(e)


@app.route('/users/<int:id>/taches-jour/<date>', methods=['GET'])
def get_taches_jour(id, date):
    """Drill-down : tâches actives ou terminées un jour donné (format YYYY-MM-DD)."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        # Tâches terminées ce jour-là (terminee_le, fallback updated_at pour les vieilles lignes)
        # OU créées ce jour
        # OU planifiées ce jour
        curseur.execute("""
            SELECT DISTINCT t.id, t.titre, t.priorite, t.terminee,
                   DATE(COALESCE(t.terminee_le, t.updated_at)) AS terminee_le,
                   DATE(t.created_at) AS creee_le,
                   c.nom AS categorie
            FROM taches t
            LEFT JOIN categories c ON t.categorie_id = c.id
            LEFT JOIN planification p ON p.tache_id = t.id AND DATE(p.date_planifiee) = %s
            WHERE t.user_id = %s
              AND (
                (t.terminee = TRUE AND DATE(COALESCE(t.terminee_le, t.updated_at)) = %s)
                OR DATE(t.created_at) = %s
                OR p.id IS NOT NULL
              )
            ORDER BY t.terminee DESC, t.priorite DESC
        """, (date, id, date, date))
        rows = curseur.fetchall()
        db.close()
        # Conversion dates pour JSON
        for r in rows:
            for key in ['terminee_le', 'creee_le']:
                if r.get(key):
                    r[key] = r[key].isoformat() if hasattr(r[key], 'isoformat') else str(r[key])
        return jsonify({"date": date, "taches": rows, "total": len(rows)})
    except Exception as e:
        return erreur_500(e)


@app.route('/users/<int:id>/gamification', methods=['GET'])
def get_gamification(id):
    """État complet de la gamification : niveau, points, % vers niveau suivant, label, streak."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT points, niveau, streak FROM users WHERE id=%s", (id,))
        u = curseur.fetchone()
        db.close()
        if not u:
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        points = u['points'] or 0
        streak = u['streak'] or 0
        # Source canonique : NIVEAUX (10 paliers, sync frontend data/badges.js)
        niveau, label = niveau_for_points(points)
        seuil_actuel = next(m for n, m, _ in NIVEAUX if n == niveau)
        seuil_suivant = next((m for n, m, _ in NIVEAUX if n == niveau + 1), seuil_actuel + 1)
        delta = max(seuil_suivant - seuil_actuel, 1)
        pct_niveau = max(0, min(100, round((points - seuil_actuel) / delta * 100)))
        return jsonify({
            "points": points,
            "niveau": niveau,
            "label": label,
            "pctNiveau": pct_niveau,
            "pointsToNext": max(seuil_suivant - points, 0),
            "streak": streak,
            "seuilActuel": seuil_actuel,
            "seuilSuivant": seuil_suivant,
        })
    except Exception as e:
        return erreur_500(e)


@app.route('/users/<int:id>/points', methods=['PUT'])
def update_points(id):
    data = request.get_json()
    pts = data['points']
    db = connecter()
    curseur = db.cursor(dictionary=True)
    # ── Capture niveau et streak AVANT pour détecter changements ──
    curseur.execute("SELECT points, niveau, streak FROM users WHERE id=%s", (id,))
    avant = curseur.fetchone() or {}
    niveau_avant = avant.get('niveau') or 1
    streak_avant = avant.get('streak') or 0

    curseur.execute("UPDATE users SET points=points+%s WHERE id=%s", (pts, id))
    db.commit()
    curseur.execute("SELECT points FROM users WHERE id=%s", (id,))
    user = curseur.fetchone()
    total_pts = user['points']
    # Niveau via la constante centralisée (10 paliers — sync avec frontend)
    nouveau_niveau, _ = niveau_for_points(total_pts)
    curseur.execute("UPDATE users SET niveau=%s WHERE id=%s", (nouveau_niveau, id))
    db.commit()

    # ── STREAK avec Streak Freeze + détection comeback ─────────────────
    curseur.execute("SELECT streak, derniere_activite, streak_freeze_used_at FROM users WHERE id=%s", (id,))
    u = curseur.fetchone()
    from datetime import date, timedelta
    aujourd_hui = date.today()
    derniere = u['derniere_activite'].date() if u['derniere_activite'] else None
    streak = u['streak'] or 0
    freeze_used = u.get('streak_freeze_used_at')
    freeze_used_date = freeze_used if isinstance(freeze_used, date) else (freeze_used.date() if freeze_used else None)

    comeback_unlocked = False
    freeze_just_used = False

    if derniere is None:
        streak = 1
    elif derniere == aujourd_hui:
        # Même jour : streak inchangé
        pass
    elif derniere == aujourd_hui - timedelta(days=1):
        streak += 1
    else:
        gap_days = (aujourd_hui - derniere).days
        # Freeze couvre un trou de 2 jours (1 jour manqué) si pas déjà utilisé cette semaine ISO
        memes_semaine = (
            freeze_used_date is not None
            and freeze_used_date.isocalendar()[:2] == aujourd_hui.isocalendar()[:2]
        )
        peut_freeze = (gap_days == 2) and not memes_semaine
        if peut_freeze:
            streak += 1
            freeze_just_used = True
        else:
            if gap_days >= 5:
                comeback_unlocked = True
            streak = 1

    if freeze_just_used:
        curseur.execute("UPDATE users SET streak=%s, derniere_activite=%s, streak_freeze_used_at=%s WHERE id=%s",
                        (streak, aujourd_hui, aujourd_hui, id))
    else:
        curseur.execute("UPDATE users SET streak=%s, derniere_activite=%s WHERE id=%s",
                        (streak, aujourd_hui, id))
    db.commit()

    # Attribution immédiate du badge Phénix avant verifier_badges
    if comeback_unlocked:
        curseur.execute("SELECT 1 FROM badges_utilisateurs WHERE user_id=%s AND badge_id='comeback'", (id,))
        if not curseur.fetchone():
            curseur.execute("INSERT INTO badges_utilisateurs (user_id, badge_id) VALUES (%s, 'comeback')", (id,))
            db.commit()

    curseur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=TRUE", (id,))
    nb_terminees = curseur.fetchone()['nb']
    nouveaux_badges = verifier_badges(curseur, db, id, nb_terminees, total_pts, streak)

    # ── HOOKS NOTIF instant : niveau-up + streak milestones + badges ──
    try:
        # 1. Niveau up
        if nouveau_niveau > niveau_avant:
            label = niveau_label(nouveau_niveau)
            envoyer_push_smart(curseur, db, id, f"levelup_{nouveau_niveau}",
                f"🏆 Niveau {nouveau_niveau} débloqué — {label}",
                f"Tu passes au palier supérieur. Continue à pousser.",
                url="/dashboard", intervalle_jours=365)
        # 2. Streak milestones (3, 7, 14, 30, 100)
        if streak > streak_avant and streak in (3, 7, 14, 30, 100):
            messages_streak = {
                3:  ("🔥 3 jours d'affilée", "C'est le début d'une habitude. Vise 7."),
                7:  ("🏆 7 jours — semaine complète", "Tu fais partie des 10% qui tiennent. Pousse à 14."),
                14: ("⚡ 14 jours — habitude ancrée", "C'est dans tes veines maintenant. 30 c'est l'élite."),
                30: ("👑 30 jours — un mois entier", "Tu ne fais plus d'effort, tu ES productif. Bravo."),
                100:("🌟 100 JOURS", "Tu fais partie des légendes. Tu peux tout."),
            }
            t, b = messages_streak[streak]
            envoyer_push_smart(curseur, db, id, f"streak_{streak}", t, b, "/dashboard", intervalle_jours=365)
        # 3. Nouveaux badges
        for badge in (nouveaux_badges or []):
            envoyer_push_smart(curseur, db, id, f"badge_{badge.get('id', 'x')}",
                f"{badge.get('icon', '🏅')} Nouveau badge : {badge.get('nom', 'Badge')}",
                badge.get('description', 'Continue comme ça !'),
                url="/dashboard", intervalle_jours=365)
    except Exception as e:
        print(f"[Hook notif update_points] {e}")

    db.commit(); db.close()
    return jsonify({"points": total_pts, "niveau": nouveau_niveau, "streak": streak, "nouveaux_badges": nouveaux_badges})

# ============================================
# BADGES + NIVEAUX — refonte 2026-05-18 (4 piliers, anti-burnout)
# ============================================

# 10 paliers — synchronisés avec frontend-react/src/data/badges.js
NIVEAUX = [
    (1,  0,     "Démarrage"),
    (2,  100,   "Apprenti"),
    (3,  250,   "Régulier"),
    (4,  500,   "Discipliné"),
    (5,  1000,  "Stratège"),
    (6,  2000,  "Expert"),
    (7,  4000,  "Maître"),
    (8,  8000,  "Architecte"),
    (9,  15000, "Visionnaire"),
    (10, 30000, "Légende"),
]

def niveau_for_points(pts):
    """Retourne (niveau:int, label:str) à partir des points."""
    current = (1, "Démarrage")
    for n, m, label in NIVEAUX:
        if pts >= m:
            current = (n, label)
        else:
            break
    return current

def niveau_label(niveau):
    for n, _, label in NIVEAUX:
        if n == niveau:
            return label
    return f"Niveau {niveau}"

# ── REGLES_BADGES : 27 badges, 4 piliers ─────────────────────────────
# condition: lambda(t, p, s) pour les badges simples (t=nb terminées, p=points, s=streak)
# complex: nom de fonction dans CONDITIONS_COMPLEXES pour les badges nécessitant une SQL spéciale
REGLES_BADGES = [
    # ── DISCIPLINE ────────────────────────────────────────────────────
    {"id": "streak_3",    "nom": "En route",           "categorie": "discipline", "tier": "common",    "description": "Actif 3 jours consécutifs",                "condition": lambda t, p, s: s >= 3},
    {"id": "streak_7",    "nom": "Semaine parfaite",   "categorie": "discipline", "tier": "rare",      "description": "Actif 7 jours consécutifs",                "condition": lambda t, p, s: s >= 7},
    {"id": "streak_14",   "nom": "Quinzaine d'or",     "categorie": "discipline", "tier": "rare",      "description": "Actif 14 jours consécutifs",               "condition": lambda t, p, s: s >= 14},
    {"id": "streak_21",   "nom": "Habit Loop",         "categorie": "discipline", "tier": "epic",      "description": "21 jours — l'habitude est ancrée",         "condition": lambda t, p, s: s >= 21},
    {"id": "streak_30",   "nom": "Mois de feu",        "categorie": "discipline", "tier": "legendary", "description": "Actif 30 jours consécutifs",               "condition": lambda t, p, s: s >= 30},
    {"id": "streak_100",  "nom": "Centurion du temps", "categorie": "discipline", "tier": "legendary", "description": "100 jours consécutifs — discipline ultime","condition": lambda t, p, s: s >= 100},
    {"id": "comeback",    "nom": "Phénix",             "categorie": "discipline", "tier": "rare",      "description": "Reprendre après 5 jours d'absence",        "complex": "comeback"},

    # ── EXCELLENCE ────────────────────────────────────────────────────
    {"id": "priority_first", "nom": "Premier tir",         "categorie": "excellence", "tier": "common",    "description": "Tâche haute priorité en 1ère action du jour", "complex": "priority_first"},
    {"id": "clean_week",     "nom": "Tableau propre",      "categorie": "excellence", "tier": "rare",      "description": "7 jours sans tâche en retard",                "complex": "clean_week"},
    {"id": "triple_high",    "nom": "Triple impact",       "categorie": "excellence", "tier": "rare",      "description": "3 tâches haute priorité terminées en 1 jour", "complex": "triple_high"},
    {"id": "deep_focus",     "nom": "Flow d'or",           "categorie": "excellence", "tier": "epic",      "description": "Session focus ≥ 90 min sans pause",           "condition": lambda t, p, s: False},  # nécessite infra pomodoro
    {"id": "goal_crusher",   "nom": "Briseur d'objectif",  "categorie": "excellence", "tier": "legendary", "description": "Compléter un Goal Reverse entier",            "complex": "goal_crusher"},

    # ── MAÎTRISE ──────────────────────────────────────────────────────
    {"id": "first_task",        "nom": "Premier pas",          "categorie": "maitrise", "tier": "common",    "description": "Première tâche terminée", "condition": lambda t, p, s: t >= 1},
    {"id": "five_tasks",        "nom": "En rythme",            "categorie": "maitrise", "tier": "common",    "description": "5 tâches terminées",      "condition": lambda t, p, s: t >= 5},
    {"id": "ten_tasks",         "nom": "Productif",            "categorie": "maitrise", "tier": "rare",      "description": "10 tâches terminées",     "condition": lambda t, p, s: t >= 10},
    {"id": "twenty_five_tasks", "nom": "Vitesse de croisière", "categorie": "maitrise", "tier": "rare",      "description": "25 tâches terminées",     "condition": lambda t, p, s: t >= 25},
    {"id": "fifty_tasks",       "nom": "Machine",              "categorie": "maitrise", "tier": "epic",      "description": "50 tâches terminées",     "condition": lambda t, p, s: t >= 50},
    {"id": "century",           "nom": "Centurion",            "categorie": "maitrise", "tier": "legendary", "description": "100 tâches terminées",    "condition": lambda t, p, s: t >= 100},
    {"id": "pts_500",           "nom": "Ascension",            "categorie": "maitrise", "tier": "rare",      "description": "500 points gagnés",       "condition": lambda t, p, s: p >= 500},
    {"id": "pts_2000",          "nom": "Sommet",               "categorie": "maitrise", "tier": "epic",      "description": "2 000 points gagnés",     "condition": lambda t, p, s: p >= 2000},
    {"id": "pts_10000",         "nom": "Cinq chiffres",        "categorie": "maitrise", "tier": "legendary", "description": "10 000 points gagnés",    "condition": lambda t, p, s: p >= 10000},

    # ── SAGESSE — features IA + équilibre ────────────────────────────
    {"id": "tomorrow_user",  "nom": "Plan B+",                "categorie": "sagesse", "tier": "common",    "description": "Première utilisation de Tomorrow Builder",     "complex": "tomorrow_user"},
    {"id": "goal_setter",    "nom": "Cap fixé",               "categorie": "sagesse", "tier": "rare",      "description": "Premier objectif créé avec Goal Reverse",      "complex": "goal_setter"},
    {"id": "ai_coach",       "nom": "Disciple du coach",      "categorie": "sagesse", "tier": "rare",      "description": "5 conversations avec le Coach IA",             "complex": "ai_coach"},
    {"id": "planner_pro",    "nom": "Architecte du lendemain","categorie": "sagesse", "tier": "epic",      "description": "Tomorrow Builder utilisé 7 jours d'affilée",   "complex": "planner_pro"},
    {"id": "ia_power_user",  "nom": "Architecte IA",          "categorie": "sagesse", "tier": "epic",      "description": "Les 3 IA (Tomorrow, Goal, Coach) en 1 semaine","complex": "ia_power_user"},
    {"id": "balance_master", "nom": "Équilibriste",           "categorie": "sagesse", "tier": "epic",      "description": "Streak 7j + 1 jour de pause volontaire",       "complex": "balance_master"},
    {"id": "mentor",         "nom": "Bâtisseur",              "categorie": "sagesse", "tier": "legendary", "description": "Équipe avec ≥ 3 collaborateurs actifs",        "complex": "mentor"},
]

# ── Conditions complexes — évaluées via SQL ──────────────────────────
def _check_comeback(curseur, user_id):
    """A repris l'activité après ≥5 jours d'absence."""
    curseur.execute("SELECT derniere_activite FROM users WHERE id=%s", (user_id,))
    r = curseur.fetchone()
    if not r or not r.get('derniere_activite'): return False
    # Note: ce badge est attribué lors du reset streak. La fonction simple ici
    # vérifie via metadata stockée (set par la logique streak quand reset après gap≥5j).
    # Retour: True si flag _comeback_pending récent. On gère ça via la logique streak directement.
    return False  # géré directement par la logique streak (voir terminer_tache hook)

def _check_priority_first(curseur, user_id):
    """La 1ère tâche terminée d'aujourd'hui était de priorité haute."""
    curseur.execute("""
        SELECT priorite FROM taches
        WHERE user_id=%s AND terminee=TRUE AND DATE(terminee_le)=CURDATE()
        ORDER BY terminee_le ASC LIMIT 1
    """, (user_id,))
    r = curseur.fetchone()
    return bool(r and r.get('priorite') == 'haute')

def _check_clean_week(curseur, user_id):
    """Sur les 7 derniers jours, aucune tâche avec deadline passée et non terminée."""
    # Vérifie l'absence de tâches en retard ANCIENNE (deadline < aujourd'hui mais non terminée)
    # ET que l'user a au moins 1 tâche terminée dans la fenêtre (sinon trivial)
    curseur.execute("""
        SELECT COUNT(*) as nb_retard FROM taches
        WHERE user_id=%s AND terminee=FALSE AND deadline IS NOT NULL
              AND deadline < CURDATE()
    """, (user_id,))
    if (curseur.fetchone() or {}).get('nb_retard', 0) > 0: return False
    curseur.execute("""
        SELECT COUNT(*) as nb_done FROM taches
        WHERE user_id=%s AND terminee=TRUE AND terminee_le >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """, (user_id,))
    return (curseur.fetchone() or {}).get('nb_done', 0) > 0

def _check_triple_high(curseur, user_id):
    """3 tâches de priorité haute terminées le même jour."""
    curseur.execute("""
        SELECT DATE(terminee_le) as jour, COUNT(*) as nb FROM taches
        WHERE user_id=%s AND terminee=TRUE AND priorite='haute' AND terminee_le IS NOT NULL
        GROUP BY DATE(terminee_le)
        HAVING nb >= 3
        LIMIT 1
    """, (user_id,))
    return curseur.fetchone() is not None

def _check_goal_crusher(curseur, user_id):
    """Au moins 1 objectif terminé dans la table objectifs."""
    try:
        curseur.execute("SELECT COUNT(*) as nb FROM objectifs WHERE user_id=%s AND statut='termine'", (user_id,))
        return (curseur.fetchone() or {}).get('nb', 0) > 0
    except Exception:
        return False

def _check_tomorrow_user(curseur, user_id):
    """Au moins 1 planning Tomorrow Builder généré."""
    try:
        curseur.execute("SELECT COUNT(*) as nb FROM tomorrow_plans WHERE user_id=%s", (user_id,))
        return (curseur.fetchone() or {}).get('nb', 0) > 0
    except Exception:
        return False

def _check_goal_setter(curseur, user_id):
    """Au moins 1 objectif créé dans la table objectifs."""
    try:
        curseur.execute("SELECT COUNT(*) as nb FROM objectifs WHERE user_id=%s", (user_id,))
        return (curseur.fetchone() or {}).get('nb', 0) > 0
    except Exception:
        return False

def _check_ai_coach(curseur, user_id):
    """≥ 5 messages utilisateur dans coach_messages."""
    try:
        curseur.execute("SELECT COUNT(*) as nb FROM coach_messages WHERE user_id=%s AND role='user'", (user_id,))
        return (curseur.fetchone() or {}).get('nb', 0) >= 5
    except Exception:
        return False

def _check_planner_pro(curseur, user_id):
    """7 jours d'affilée avec un Tomorrow Builder généré."""
    try:
        curseur.execute("""
            SELECT DISTINCT DATE(cree_le) as jour FROM tomorrow_plans
            WHERE user_id=%s AND cree_le >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
            ORDER BY jour DESC
        """, (user_id,))
        rows = [r['jour'] for r in curseur.fetchall()]
        if len(rows) < 7: return False
        # Compter le plus long run consécutif
        from datetime import timedelta
        run = 1; best = 1
        for i in range(1, len(rows)):
            if rows[i-1] - rows[i] == timedelta(days=1):
                run += 1; best = max(best, run)
            else:
                run = 1
        return best >= 7
    except Exception:
        return False

def _check_ia_power_user(curseur, user_id):
    """Les 3 features IA (tomorrow_plans + objectifs + coach_messages) utilisées dans une fenêtre 7j."""
    try:
        curseur.execute("SELECT 1 FROM tomorrow_plans WHERE user_id=%s AND cree_le >= DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 1", (user_id,))
        if not curseur.fetchone(): return False
        curseur.execute("SELECT 1 FROM objectifs WHERE user_id=%s AND cree_le >= DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 1", (user_id,))
        if not curseur.fetchone(): return False
        curseur.execute("SELECT 1 FROM coach_messages WHERE user_id=%s AND role='user' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 1", (user_id,))
        return curseur.fetchone() is not None
    except Exception:
        return False

def _check_balance_master(curseur, user_id):
    """Streak ≥ 7 + au moins 1 freeze utilisé (preuve de pause volontaire)."""
    curseur.execute("SELECT streak, streak_freeze_used_at FROM users WHERE id=%s", (user_id,))
    r = curseur.fetchone() or {}
    return (r.get('streak') or 0) >= 7 and r.get('streak_freeze_used_at') is not None

def _check_mentor(curseur, user_id):
    """L'utilisateur a créé une équipe avec ≥ 3 collaborateurs actifs (lui inclus)."""
    try:
        curseur.execute("""
            SELECT e.id, COUNT(em.user_id) as nb FROM equipes e
            JOIN equipe_membres em ON em.equipe_id=e.id
            WHERE e.createur_id=%s
            GROUP BY e.id
            HAVING nb >= 3
            LIMIT 1
        """, (user_id,))
        return curseur.fetchone() is not None
    except Exception:
        return False

CONDITIONS_COMPLEXES = {
    "comeback":       _check_comeback,
    "priority_first": _check_priority_first,
    "clean_week":     _check_clean_week,
    "triple_high":    _check_triple_high,
    "goal_crusher":   _check_goal_crusher,
    "tomorrow_user":  _check_tomorrow_user,
    "goal_setter":    _check_goal_setter,
    "ai_coach":       _check_ai_coach,
    "planner_pro":    _check_planner_pro,
    "ia_power_user":  _check_ia_power_user,
    "balance_master": _check_balance_master,
    "mentor":         _check_mentor,
}

def verifier_badges(curseur, db, user_id, nb_terminees, points_total, streak):
    """Évalue toutes les règles. Insère + retourne les nouveaux badges débloqués."""
    curseur.execute("SELECT badge_id FROM badges_utilisateurs WHERE user_id=%s", (user_id,))
    deja_obtenus = {r['badge_id'] for r in curseur.fetchall()}
    nouveaux = []
    for regle in REGLES_BADGES:
        if regle['id'] in deja_obtenus:
            continue
        ok = False
        if "condition" in regle:
            try:
                ok = regle["condition"](nb_terminees, points_total, streak)
            except Exception:
                ok = False
        elif "complex" in regle:
            fn = CONDITIONS_COMPLEXES.get(regle["complex"])
            if fn:
                try: ok = fn(curseur, user_id)
                except Exception: ok = False
        if ok:
            curseur.execute("INSERT INTO badges_utilisateurs (user_id, badge_id) VALUES (%s, %s)", (user_id, regle['id']))
            nouveaux.append({"id": regle['id'], "nom": regle['nom'], "description": regle['description'], "tier": regle.get('tier'), "categorie": regle.get('categorie')})
    return nouveaux

@app.route('/users/<int:id>/badges', methods=['GET'])
def get_badges(id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT badge_id, obtenu_le FROM badges_utilisateurs WHERE user_id=%s", (id,))
        obtenus = {r['badge_id']: r['obtenu_le'] for r in curseur.fetchall()}
        curseur.execute("SELECT points, streak, streak_freeze_used_at FROM users WHERE id=%s", (id,))
        user = curseur.fetchone()
        db.close()
        result = []
        for b in REGLES_BADGES:
            result.append({
                "id": b['id'],
                "nom": b['nom'],
                "description": b['description'],
                "categorie": b.get('categorie'),
                "tier": b.get('tier'),
                "obtenu": b['id'] in obtenus,
                "obtenu_le": str(obtenus[b['id']]) if b['id'] in obtenus else None,
            })
        return jsonify({
            "badges": result,
            "streak": user['streak'] if user else 0,
            "streak_freeze_disponible": _freeze_disponible(user),
            "nb_obtenus": len(obtenus),
            "nb_total": len(REGLES_BADGES),
        })
    except Exception as e:
        return erreur_500(e)

def _freeze_disponible(user):
    """Le Streak Freeze est dispo si pas utilisé cette semaine ISO."""
    if not user: return True
    from datetime import date
    used = user.get('streak_freeze_used_at') if isinstance(user, dict) else None
    if not used: return True
    used_date = used if isinstance(used, date) else (used.date() if used else None)
    if not used_date: return True
    aujourd_hui = date.today()
    return used_date.isocalendar()[:2] != aujourd_hui.isocalendar()[:2]

@app.route('/users/<int:id>/timeline', methods=['GET'])
def get_timeline(id):
    """Reconstruit l'historique du user à partir des tables existantes (pas d'event log dédié).
    Events: inscription + badges débloqués + jalons streak. Triés DESC par date."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)

        # 1. Données user
        curseur.execute("SELECT created_at, streak, points, niveau FROM users WHERE id=%s", (id,))
        u = curseur.fetchone() or {}

        events = []

        # 2. Inscription
        if u.get('created_at'):
            events.append({
                "type": "register",
                "date": u['created_at'].isoformat() if hasattr(u['created_at'], 'isoformat') else str(u['created_at']),
                "title": "Compte créé",
                "description": "Début de l'aventure GetShift",
            })

        # 3. Badges débloqués — enrichis avec config (tier, categorie, description)
        curseur.execute(
            "SELECT badge_id, obtenu_le FROM badges_utilisateurs WHERE user_id=%s ORDER BY obtenu_le DESC",
            (id,)
        )
        rows = curseur.fetchall() or []
        # Lookup config par id pour récup nom + tier + categorie
        config_par_id = {b['id']: b for b in REGLES_BADGES}
        for r in rows:
            cfg = config_par_id.get(r['badge_id'])
            if not cfg or not r.get('obtenu_le'):
                continue
            events.append({
                "type": "badge",
                "date": r['obtenu_le'].isoformat() if hasattr(r['obtenu_le'], 'isoformat') else str(r['obtenu_le']),
                "title": cfg.get('nom', r['badge_id']),
                "description": cfg.get('description', ''),
                "badge_id": r['badge_id'],
                "tier": cfg.get('tier'),
                "categorie": cfg.get('categorie'),
            })

        # 4. Streak actuel comme repère (uniquement si > 0)
        if (u.get('streak') or 0) > 0:
            events.append({
                "type": "streak",
                "date": "now",  # marqueur "ongoing" — frontend sait l'afficher
                "title": f"Streak en cours · {u['streak']} jour{'s' if u['streak'] > 1 else ''}",
                "description": "Continue, ne casse pas la chaîne",
                "streak_value": u['streak'],
            })

        db.close()

        # Tri DESC par date (l'event "streak ongoing" reste en tête)
        from datetime import datetime
        def sort_key(e):
            d = e.get('date')
            if d == 'now':
                return datetime.max  # tout en haut
            try:
                return datetime.fromisoformat(d.replace('Z', '+00:00')) if d else datetime.min
            except Exception:
                return datetime.min
        events.sort(key=sort_key, reverse=True)

        return jsonify({"events": events, "total": len(events)})
    except Exception as e:
        return erreur_500(e)


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
        return erreur_500(e)


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
            COUNT(CASE WHEN terminee=1 AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_semaine,
            COUNT(CASE WHEN terminee=1 AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND COALESCE(terminee_le, updated_at) < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_semaine_prec,
            COUNT(CASE WHEN terminee=1 THEN 1 END) as terminees_total,
            COUNT(CASE WHEN terminee=0 THEN 1 END) as actives,
            COUNT(*) as total
            FROM taches WHERE user_id=%s""", (user_id,))
        cnt = c.fetchone()

        # Source canonique : NIVEAUX (10 paliers, sync frontend data/badges.js)
        points = u['points'] or 0
        niveau_actuel, niveau_nom = niveau_for_points(points)
        if niveau_actuel != (u['niveau'] or 1):
            c.execute("UPDATE users SET niveau=%s WHERE id=%s", (niveau_actuel, user_id))
            db.commit()
        prev_threshold = next(m for n, m, _ in NIVEAUX if n == niveau_actuel)
        next_threshold = next((m for n, m, _ in NIVEAUX if n == niveau_actuel + 1), prev_threshold + 1)
        progres_niveau = max(0, min(100, round((points - prev_threshold) / max(1, next_threshold - prev_threshold) * 100)))

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
            "niveau_label": niveau_nom,
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
        return erreur_500(e)

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
    # Migration lazy : aligne priorite='faible' (héritée des prompts IA) sur 'basse'
    try:
        curseur.execute("UPDATE taches SET priorite='basse' WHERE user_id=%s AND priorite='faible'", (user_id,))
        db.commit()
    except Exception:
        pass
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
        user_id = data['user_id']
        # Dédup Gmail amont : si le message_id a déjà servi à créer une tâche,
        # on bloque AVANT l'INSERT INTO taches (sinon double-clic = doublon).
        gmail_msg_id = data.get('gmail_message_id')
        if gmail_msg_id:
            curseur.execute(
                "SELECT tache_id FROM gmail_imported WHERE user_id=%s AND gmail_message_id=%s",
                (user_id, gmail_msg_id)
            )
            existing = curseur.fetchone()
            if existing:
                db.close()
                return jsonify({"erreur": "Cet email a déjà été importé en tâche", "tache_id": existing[0]}), 409
        # Dédup Notion amont : page_id + block_id (block_id NULL = niveau page).
        notion_page_id = data.get('notion_page_id')
        notion_block_id = data.get('notion_block_id')  # peut être None
        if notion_page_id:
            if notion_block_id:
                curseur.execute(
                    "SELECT tache_id FROM notion_imported WHERE user_id=%s AND notion_page_id=%s AND notion_block_id=%s",
                    (user_id, notion_page_id, notion_block_id)
                )
            else:
                curseur.execute(
                    "SELECT tache_id FROM notion_imported WHERE user_id=%s AND notion_page_id=%s AND notion_block_id IS NULL",
                    (user_id, notion_page_id)
                )
            existing = curseur.fetchone()
            if existing:
                db.close()
                return jsonify({"erreur": "Cette source Notion a déjà été importée", "tache_id": existing[0]}), 409
        # Compte AVANT insertion pour détecter 1ère tâche
        curseur.execute("SELECT COUNT(*) FROM taches WHERE user_id=%s", (user_id,))
        nb_avant = curseur.fetchone()[0]
        curseur.execute("INSERT INTO taches (titre, priorite, deadline, user_id, categorie_id, source_url, notion_block_id) VALUES (%s, %s, %s, %s, %s, %s, %s)", (data['titre'], data.get('priorite', 'moyenne'), data.get('deadline'), user_id, data.get('categorie_id'), data.get('source_url'), notion_block_id))
        db.commit()
        tache_id = curseur.lastrowid
        # Dédup Gmail : on enregistre l'email source pour empêcher la
        # re-proposition par /integrations/gmail/extract-tasks à l'avenir.
        if gmail_msg_id:
            try:
                curseur.execute(
                    "INSERT IGNORE INTO gmail_imported (user_id, gmail_message_id, tache_id) VALUES (%s, %s, %s)",
                    (user_id, gmail_msg_id, tache_id)
                )
                db.commit()
            except Exception as _e:
                print(f"[Gmail dedup] insert failed: {_e}", flush=True)
        # Dédup Notion : on enregistre la source pour empêcher la re-proposition.
        if notion_page_id:
            try:
                curseur.execute(
                    "INSERT IGNORE INTO notion_imported (user_id, notion_page_id, notion_block_id, tache_id) VALUES (%s, %s, %s, %s)",
                    (user_id, notion_page_id, notion_block_id, tache_id)
                )
                db.commit()
            except Exception as _e:
                print(f"[Notion dedup] insert failed: {_e}", flush=True)
        curseur2 = db.cursor(dictionary=True)
        curseur2.execute("SELECT config FROM integrations WHERE user_id=%s AND type='slack'", (user_id,))
        row = curseur2.fetchone()
        if row:
            config = json.loads(row['config'])
            webhook_url = config.get('webhook_url')
            if webhook_url:
                envoyer_notification_slack(webhook_url, f"Nouvelle tâche GetShift : *{data['titre']}* — Priorité: {data.get('priorite', 'moyenne')}")
        # ── HOOK NOTIF : 1ère tâche jamais créée → célébration ──
        try:
            if nb_avant == 0:
                envoyer_push_smart(curseur2, db, user_id, "first_task_ever",
                    "🎉 Première tâche créée !",
                    "Tu viens de planter la première graine. Planifie-la pour la réaliser.",
                    url="/planification", intervalle_jours=365)
            # Bonus : si user crée tâche haute prio → encourager
            elif data.get('priorite') == 'haute':
                envoyer_push_smart(curseur2, db, user_id, "haute_prio_créée",
                    "⚡ Tâche haute priorité ajoutée",
                    "Bouge-la en haut de ta planification — l'impact est ici.",
                    url="/planification", intervalle_jours=1)
        except Exception as e:
            print(f"[Hook notif ajouter_tache] {e}")
        db.close()
        # Auto-sync Google Calendar (async, no-op si désactivé ou pas connecté)
        if data.get('deadline'):
            _autosync_calendar_hook(user_id, tache_id, 'create_from_deadline')
        return jsonify({"message": "Tâche ajoutée !", "id": tache_id})
    except Exception as e:
        return erreur_500(e)

@app.route('/taches/<int:id>', methods=['PUT'])
def terminer_tache(id):
    data = request.get_json()
    db = connecter()
    curseur = db.cursor(dictionary=True)
    if data.get('terminee'):
        curseur.execute("SELECT COUNT(*) as nb_bloquantes FROM dependances d JOIN taches t ON d.depend_de_id = t.id WHERE d.tache_id = %s AND t.terminee = FALSE", (id,))
        if curseur.fetchone()['nb_bloquantes'] > 0:
            db.close(); return jsonify({"erreur": "Cette tâche est bloquée par des dépendances non terminées"}), 400
    # terminee_le = NOW() quand on coche, NULL quand on décoche (utile pour priority_first / triple_high)
    if data.get('terminee'):
        curseur.execute("UPDATE taches SET terminee=TRUE, terminee_le=NOW() WHERE id=%s", (id,))
    else:
        curseur.execute("UPDATE taches SET terminee=FALSE, terminee_le=NULL WHERE id=%s", (id,))
    db.commit()
    # Récupère user_id + notion_block_id (utilisés pour les sync inverses)
    curseur.execute("SELECT user_id, notion_block_id FROM taches WHERE id=%s", (id,))
    info = curseur.fetchone() or {}
    db.close()
    # Auto-sync GCal : si on coche, supprimer l'event Google Calendar associé
    if data.get('terminee') and info.get('user_id'):
        _autosync_calendar_hook(info['user_id'], id, 'delete_event_if_synced')
    # Sync inverse Notion : si la tâche provient d'un bloc to_do, on propage l'état
    if info.get('notion_block_id') and info.get('user_id'):
        threading.Thread(
            target=_notion_set_todo_checked,
            args=(info['user_id'], info['notion_block_id'], bool(data.get('terminee'))),
            daemon=True
        ).start()
    return jsonify({"message": "Tâche mise à jour !"})

def _notion_set_todo_checked(user_id, block_id, checked):
    """Sync inverse — PATCH /v1/blocks/{id} pour cocher/décocher un to_do Notion.
    Best-effort : silencieux en cas d'échec (token expiré, block supprimé, etc.)."""
    try:
        token = get_notion_token(user_id)
        if not token:
            return
        http_requests.patch(
            f"https://api.notion.com/v1/blocks/{block_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
            },
            json={"to_do": {"checked": bool(checked)}},
            timeout=8
        )
    except Exception as e:
        print(f"[Notion sync inverse] block {block_id} → {checked} failed: {e}", flush=True)

@app.route('/taches/<int:id>', methods=['DELETE'])
def supprimer_tache(id):
    db = connecter()
    curseur = db.cursor(dictionary=True)
    # Capter user_id + event_id AVANT le DELETE (sinon la ligne n'existe plus pour le thread)
    curseur.execute("SELECT user_id, google_event_id FROM taches WHERE id=%s", (id,))
    row = curseur.fetchone()
    curseur.execute("DELETE FROM dependances WHERE tache_id=%s OR depend_de_id=%s", (id, id))
    curseur.execute("DELETE FROM taches WHERE id=%s", (id,))
    db.commit(); db.close()
    # Auto-sync : si event Google attaché, le supprimer côté Google
    if row and row.get('google_event_id'):
        _autosync_calendar_hook(row['user_id'], id, 'delete_event',
                                extra={'event_id': row['google_event_id']})
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
        return erreur_500(e)

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
            # Auto-sync : créer ou upgrader event en time block focus
            _autosync_calendar_hook(user_id, id, 'create_or_update_focus')
            return jsonify({"message": "Focus mis à jour", "focus_date": str(focus_date) if focus_date else None})
        else:
            curseur.execute("UPDATE taches SET focus_date = NULL WHERE id = %s", (id,))
            db.commit(); db.close()
            # Auto-sync : downgrade vers 'deadline' si possible, sinon supprimer l'event focus
            _autosync_calendar_hook(user_id, id, 'remove_focus')
            return jsonify({"message": "Focus retiré", "focus_date": None})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/dependances/<int:id>', methods=['DELETE'])
def supprimer_dependance(id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT t.user_id AS owner FROM dependances d JOIN taches t ON d.tache_id=t.id WHERE d.id=%s", (id,))
        r = curseur.fetchone()
        if not r:
            db.close(); return jsonify({"erreur": "Dépendance introuvable"}), 404
        if int(r['owner']) != current_uid():
            db.close(); abort(403)
        curseur.execute("DELETE FROM dependances WHERE id=%s", (id,))
        db.commit(); db.close()
        return jsonify({"message": "Dépendance supprimée !"})
    except Exception as e:
        return erreur_500(e)

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
            curseur.execute("UPDATE taches SET terminee=TRUE, terminee_le=NOW() WHERE id=%s", (tache_id,))
            db.commit(); db.close()
        return jsonify({"reponse": reponse, "modele": modele, "tache_id": tache_id})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        cal_ctx, calendar_used = _build_calendar_context(user_id)
        prompt = (
            f'Planifie ces taches sur 7 jours ({heures_dispo_par_jour}h/jour):\n{taches_str}'
            f'{cal_ctx}'
            '\nReponds UNIQUEMENT en JSON: {"planification": [{"titre": "...", "date": "YYYY-MM-DD", "heure_debut": "HH:MM", "heure_fin": "HH:MM", "raison": "..."}], "conseil": "..."}'
        )
        completion = groq_client.chat.completions.create(model='llama-3.3-70b-versatile', messages=[{"role": "user", "content": prompt}], max_tokens=1500, temperature=0.3)
        reponse = completion.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', reponse, re.S)
        if not match: raise ValueError("Reponse IA invalide")
        plan = json.loads(match.group())
        for item in plan.get('planification', []):
            tache = next((t for t in taches if t['titre'] == item['titre']), None)
            if tache:
                curseur.execute("INSERT INTO planification (user_id, tache_id, date_planifiee, heure_debut, heure_fin, charge_minutes, genere_par_ia) VALUES (%s, %s, %s, %s, %s, %s, TRUE)", (user_id, tache['id'], item['date'], item['heure_debut'], item['heure_fin'], tache.get('temps_estime', 30)))
        db.commit(); db.close()
        return jsonify({"planification": plan['planification'], "conseil": plan.get('conseil', ''), "message": f"{len(plan['planification'])} taches planifiees !", "calendar_used": calendar_used})
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/planifier-semaine-calendar/<int:user_id>', methods=['POST'])
def planifier_semaine_calendar(user_id):
    """Planification IA enrichie avec le contexte Google Calendar.
    Retourne des suggestions (ne persiste rien) — le frontend applique les acceptées.
    Body optionnel : {heures_dispo: int}
    """
    try:
        data = request.get_json(silent=True) or {}
        heures_dispo = int(data.get('heures_dispo', 8))

        db = connecter()
        c = db.cursor(dictionary=True)
        c.execute("""
            SELECT id, titre, priorite, deadline, temps_estime, focus_date
            FROM taches
            WHERE user_id=%s AND terminee=FALSE
            ORDER BY deadline ASC, priorite DESC
        """, (user_id,))
        taches = c.fetchall()
        db.close()

        if not taches:
            return jsonify({"suggestions": [], "message": "Aucune tâche à planifier"})

        today = datetime.now().date()
        to_dt  = today + timedelta(days=7)

        # Fetch Google Calendar events for the week
        gcal_events = []
        service = _gcal_service(user_id)
        gcal_connected = service is not None
        if service:
            try:
                result = service.events().list(
                    calendarId='primary',
                    timeMin=datetime.combine(today, datetime.min.time()).isoformat() + 'Z',
                    timeMax=datetime.combine(to_dt, datetime.min.time()).isoformat() + 'Z',
                    singleEvents=True, orderBy='startTime', maxResults=50,
                ).execute()
                for ev in result.get('items', []):
                    start = ev.get('start', {})
                    end   = ev.get('end', {})
                    start_dt = start.get('dateTime') or start.get('date')
                    end_dt   = end.get('dateTime') or end.get('date', '')
                    if not start_dt:
                        continue
                    all_day = 'dateTime' not in start
                    gcal_events.append({
                        'titre':       ev.get('summary', '(Sans titre)'),
                        'date':        start_dt[:10],
                        'heure_debut': start_dt[11:16] if not all_day else '00:00',
                        'heure_fin':   end_dt[11:16]   if not all_day and len(end_dt) >= 16 else '23:59',
                        'all_day':     all_day,
                    })
            except Exception as e:
                print(f"[IA AutoPlan] Erreur fetch gcal events: {e}")

        today_str = today.strftime('%Y-%m-%d')
        week_str  = to_dt.strftime('%Y-%m-%d')

        taches_str = "\n".join([
            f"- ID={t['id']} | {t['titre']} | prio={t['priorite']} | deadline={str(t['deadline'])[:10] if t['deadline'] else 'aucune'} | durée={t['temps_estime'] or 60}min"
            for t in taches[:20]
        ])

        gcal_str = "\n".join([
            f"- {ev['date']} {ev['heure_debut']}-{ev['heure_fin']} : {ev['titre']}"
            for ev in gcal_events if not ev['all_day']
        ]) or "Aucun créneau occupé"

        prompt = f"""Tu es un coach productivité expert. Aujourd'hui : {today_str}. Planifie sur 7 jours ({today_str} → {week_str}).

TÂCHES À PLANIFIER (max {heures_dispo}h/jour) :
{taches_str}

AGENDA GOOGLE CALENDAR DÉJÀ OCCUPÉ :
{gcal_str}

RÈGLES :
1. Ne jamais proposer un créneau qui chevauche l'agenda Google Calendar
2. Tâches haute priorité ou deadline proche → matinée (09:00-12:00)
3. Tâches moyennes → après-midi (14:00-17:00)
4. Max {heures_dispo}h de focus par jour, évite les week-ends si possible
5. Respecte la durée estimée (durée en minutes)
6. task_id doit être l'ID exact de la tâche (champ ID= ci-dessus)

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après :
{{"suggestions": [{{"task_id": 1, "titre": "...", "day_iso": "YYYY-MM-DD", "start_hhmm": "HH:MM", "end_hhmm": "HH:MM", "reason": "..."}}]}}"""

        completion = groq_client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.3,
        )
        raw = completion.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', raw, re.S)
        if not match:
            raise ValueError("Réponse IA invalide")
        parsed = json.loads(match.group())
        suggestions_raw = parsed.get('suggestions', [])

        # Safety check : retirer toute suggestion qui chevauche un event Google Calendar
        def hhmm_to_mins(t):
            try:
                h, m = str(t).split(':')
                return int(h) * 60 + int(m)
            except Exception:
                return 0

        def overlaps_gcal(sug, ev):
            if ev['all_day'] or sug.get('day_iso') != ev['date']:
                return False
            s1 = hhmm_to_mins(sug.get('start_hhmm', '00:00'))
            e1 = hhmm_to_mins(sug.get('end_hhmm',   '00:00'))
            s2 = hhmm_to_mins(ev['heure_debut'])
            e2 = hhmm_to_mins(ev['heure_fin'])
            return s1 < e2 and e1 > s2

        safe_suggestions = []
        conflicts_avoided = 0
        for sug in suggestions_raw:
            if any(overlaps_gcal(sug, ev) for ev in gcal_events):
                conflicts_avoided += 1
            else:
                safe_suggestions.append(sug)

        return jsonify({
            "suggestions":      safe_suggestions,
            "conflicts_avoided": conflicts_avoided,
            "total_tasks":       len(taches),
            "gcal_connected":    gcal_connected,
        })

    except Exception as e:
        return erreur_500(e)


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
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/sous-taches/<int:id>', methods=['PUT'])
def terminer_sous_tache(id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT t.user_id AS owner FROM sous_taches s JOIN taches t ON s.tache_id=t.id WHERE s.id=%s", (id,))
        r = curseur.fetchone()
        if not r:
            db.close(); return jsonify({"erreur": "Sous-tache introuvable"}), 404
        if int(r['owner']) != current_uid():
            db.close(); abort(403)
        curseur.execute("UPDATE sous_taches SET terminee=%s WHERE id=%s", (data['terminee'], id))
        db.commit(); db.close()
        return jsonify({"message": "Sous-tache mise a jour !"})
    except Exception as e:
        return erreur_500(e)

@app.route('/sous-taches/<int:id>', methods=['DELETE'])
def supprimer_sous_tache(id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT t.user_id AS owner FROM sous_taches s JOIN taches t ON s.tache_id=t.id WHERE s.id=%s", (id,))
        r = curseur.fetchone()
        if not r:
            db.close(); return jsonify({"erreur": "Sous-tache introuvable"}), 404
        if int(r['owner']) != current_uid():
            db.close(); abort(403)
        curseur.execute("DELETE FROM sous_taches WHERE id=%s", (id,))
        db.commit(); db.close()
        return jsonify({"message": "Sous-tache supprimee !"})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/planification', methods=['POST'])
def ajouter_planification():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor()
        curseur.execute("INSERT INTO planification (user_id, tache_id, date_planifiee, heure_debut, heure_fin, charge_minutes, genere_par_ia) VALUES (%s, %s, %s, %s, %s, %s, %s)", (data['user_id'], data['tache_id'], data['date_planifiee'], data.get('heure_debut'), data.get('heure_fin'), data.get('charge_minutes', 0), data.get('genere_par_ia', False)))
        new_id = curseur.lastrowid
        db.commit(); db.close()
        return jsonify({"message": "Planification ajoutee !", "id": new_id})
    except Exception as e:
        return erreur_500(e)

@app.route('/planification/<int:entry_id>', methods=['PATCH'])
def modifier_planification(entry_id):
    """Met à jour un bloc existant — évite les duplications lors d'un drag/move."""
    try:
        data = request.get_json() or {}
        sets, vals = [], []
        for f in ('date_planifiee', 'heure_debut', 'heure_fin', 'charge_minutes'):
            if f in data:
                sets.append(f"{f}=%s"); vals.append(data[f])
        if not sets:
            return jsonify({"erreur": "aucun champ à modifier"}), 400
        vals.append(entry_id)
        db = connecter(); curseur = db.cursor()
        curseur.execute(f"UPDATE planification SET {', '.join(sets)} WHERE id=%s", tuple(vals))
        db.commit(); db.close()
        return jsonify({"message": "Bloc déplacé"})
    except Exception as e:
        return erreur_500(e)

@app.route('/planification/<int:entry_id>', methods=['DELETE'])
def supprimer_planification(entry_id):
    try:
        db = connecter(); curseur = db.cursor()
        curseur.execute("DELETE FROM planification WHERE id=%s", (entry_id,))
        db.commit(); db.close()
        return jsonify({"message": "Bloc supprimé"})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        # Bucket par jour de COMPLÉTION (terminee_le), pas updated_at.
        # updated_at change à chaque édition → toutes les tâches éditées récemment
        # se regroupaient sur le jour de l'édition. terminee_le est le timestamp
        # figé au moment du toggle terminée. COALESCE pour les anciennes complétions
        # qui pourraient avoir terminee_le NULL (avant migration).
        date_col = "COALESCE(terminee_le, updated_at)"
        curseur.execute(f"SELECT DATE({date_col}) as jour, COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND {date_col} >= DATE_SUB(CURDATE(), INTERVAL %s DAY) GROUP BY DATE({date_col}) ORDER BY jour ASC", (user_id, jours))
        par_jour = curseur.fetchall()
        curseur.execute(f"SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND {date_col} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
        cette_semaine = curseur.fetchone()['count']
        curseur.execute(f"SELECT COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND {date_col} >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND {date_col} < DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
        semaine_precedente = curseur.fetchone()['count']
        curseur.execute(f"SELECT HOUR({date_col}) as heure, COUNT(*) as count FROM taches WHERE user_id=%s AND terminee=TRUE AND {date_col} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY HOUR({date_col}) ORDER BY heure", (user_id,))
        par_heure = [0] * 24
        for row in curseur.fetchall():
            if row['heure'] is not None: par_heure[row['heure']] = row['count']
        curseur.execute("SELECT DATE(created_at) as jour, COUNT(*) as count FROM historique_ia WHERE user_id=%s AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY jour ASC", (user_id,))
        ia_par_jour = curseur.fetchall()
        evolution = round(((cette_semaine - semaine_precedente) / max(semaine_precedente, 1)) * 100, 1)
        db.close()
        return jsonify({"total": total, "terminees": terminees, "taux_completion": taux, "priorites": priorites, "par_jour": par_jour, "cette_semaine": cette_semaine, "semaine_precedente": semaine_precedente, "ia_par_jour": ia_par_jour, "par_heure": par_heure, "evolution": evolution})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/equipes/rejoindre', methods=['POST'])
def rejoindre_equipe():
    try:
        data = request.get_json() or {}
        code = (data.get('code') or '').strip()
        user_id = data.get('user_id')

        # Validation entrée
        if not code:
            return jsonify({"erreur": "Code d'invitation requis"}), 400
        if not user_id or not isinstance(user_id, int):
            return jsonify({"erreur": "Tu dois être connecté pour rejoindre une équipe", "code_erreur": "AUTH_REQUIRED"}), 401

        db = connecter()
        curseur = db.cursor(dictionary=True)

        # Vérif user_id existe vraiment (sinon FK 1452 sur l'INSERT)
        curseur.execute("SELECT id FROM users WHERE id=%s", (user_id,))
        if not curseur.fetchone():
            db.close()
            return jsonify({
                "erreur": "Ton compte n'existe plus. Reconnecte-toi.",
                "code_erreur": "USER_INVALID"
            }), 410

        # Vérif code → équipe
        curseur.execute("SELECT * FROM equipes WHERE code_invitation=%s", (code,))
        equipe = curseur.fetchone()
        if not equipe:
            db.close()
            return jsonify({"erreur": "Code d'invitation invalide ou expiré"}), 404

        # Idempotence : déjà membre ?
        curseur.execute("SELECT id FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe['id'], user_id))
        if curseur.fetchone():
            db.close()
            return jsonify({"message": f"Tu es déjà membre de {equipe['nom']}", "equipe": equipe, "deja_membre": True}), 200

        curseur.execute("INSERT INTO equipe_membres (equipe_id, user_id, role) VALUES (%s, %s, 'membre')", (equipe['id'], user_id))
        db.commit()
        db.close()
        return jsonify({"message": f"Tu as rejoint {equipe['nom']} !", "equipe": equipe})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

def _ensure_taches_equipe_columns(curseur):
    """Ajoute completed_at + completed_by si absents (migration lazy)."""
    try:
        curseur.execute("SHOW COLUMNS FROM taches_equipe LIKE 'completed_at'")
        if not curseur.fetchone():
            curseur.execute("ALTER TABLE taches_equipe ADD COLUMN completed_at DATETIME NULL")
    except Exception:
        pass
    try:
        curseur.execute("SHOW COLUMNS FROM taches_equipe LIKE 'completed_by'")
        if not curseur.fetchone():
            curseur.execute("ALTER TABLE taches_equipe ADD COLUMN completed_by INT NULL")
    except Exception:
        pass


@app.route('/equipes/<int:equipe_id>/taches', methods=['GET'])
def get_taches_equipe(equipe_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        # Migration lazy : aligne tout sur le vocabulaire frontend (todo|en_cours|termine)
        try:
            curseur.execute("UPDATE taches_equipe SET statut='todo' WHERE statut='a_faire'")
            db.commit()
        except Exception:
            pass
        _ensure_taches_equipe_columns(curseur)
        _ensure_labels_schema(curseur)
        db.commit()
        curseur.execute("""
            SELECT te.*, u1.nom as createur_nom, u2.nom as assignee_nom,
                u3.nom as completed_by_nom,
                (SELECT COUNT(*) FROM commentaires_tache WHERE tache_id=te.id) as nb_commentaires,
                (SELECT COUNT(*) FROM sous_taches_equipe WHERE tache_id=te.id) as nb_sous_taches,
                (SELECT COUNT(*) FROM sous_taches_equipe WHERE tache_id=te.id AND terminee=1) as nb_sous_taches_done
            FROM taches_equipe te
            JOIN users u1 ON te.createur_id=u1.id
            LEFT JOIN users u2 ON te.assignee_id=u2.id
            LEFT JOIN users u3 ON te.completed_by=u3.id
            WHERE te.equipe_id=%s ORDER BY te.created_at DESC
        """, (equipe_id,))
        taches = curseur.fetchall()

        # Récupère tous les labels en une requête + merge en Python
        curseur.execute("""
            SELECT tl.tache_id, l.id, l.nom, l.couleur
            FROM taches_labels tl
            JOIN labels_equipe l ON tl.label_id=l.id
            WHERE l.equipe_id=%s
        """, (equipe_id,))
        labels_par_tache = {}
        for row in curseur.fetchall():
            labels_par_tache.setdefault(row['tache_id'], []).append({
                'id': row['id'], 'nom': row['nom'], 'couleur': row['couleur']
            })

        for t in taches:
            if t.get('completed_at'):
                t['completed_at'] = t['completed_at'].isoformat() if hasattr(t['completed_at'], 'isoformat') else str(t['completed_at'])
            t['labels'] = labels_par_tache.get(t['id'], [])
        db.close()
        return jsonify(taches)
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/<int:equipe_id>/bootstrap', methods=['GET'])
def bootstrap_equipe(equipe_id):
    """Endpoint groupé : retourne membres + tâches + labels en 1 seule requête HTTP.
    Réduit 3 RTT à 1 (gros gain sur cold start Render + perception fluide)."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)

        # Migrations lazy (idempotentes) — assure que les colonnes/tables existent
        try:
            curseur.execute("UPDATE taches_equipe SET statut='todo' WHERE statut='a_faire'")
            db.commit()
        except Exception:
            pass
        _ensure_taches_equipe_columns(curseur)
        _ensure_labels_schema(curseur)
        db.commit()

        # 1. Membres
        curseur.execute(
            "SELECT u.id, u.nom, u.email, em.role, em.rejoint_le "
            "FROM equipe_membres em JOIN users u ON em.user_id=u.id "
            "WHERE em.equipe_id=%s ORDER BY em.rejoint_le ASC",
            (equipe_id,)
        )
        membres = curseur.fetchall()

        # 2. Labels
        curseur.execute(
            "SELECT id, nom, couleur FROM labels_equipe WHERE equipe_id=%s ORDER BY nom ASC",
            (equipe_id,)
        )
        labels = curseur.fetchall()

        # 3. Tâches (avec créateur/assignee/completed_by + counts sous-tâches & commentaires)
        curseur.execute("""
            SELECT te.*, u1.nom as createur_nom, u2.nom as assignee_nom,
                u3.nom as completed_by_nom,
                (SELECT COUNT(*) FROM commentaires_tache WHERE tache_id=te.id) as nb_commentaires,
                (SELECT COUNT(*) FROM sous_taches_equipe WHERE tache_id=te.id) as nb_sous_taches,
                (SELECT COUNT(*) FROM sous_taches_equipe WHERE tache_id=te.id AND terminee=1) as nb_sous_taches_done
            FROM taches_equipe te
            JOIN users u1 ON te.createur_id=u1.id
            LEFT JOIN users u2 ON te.assignee_id=u2.id
            LEFT JOIN users u3 ON te.completed_by=u3.id
            WHERE te.equipe_id=%s ORDER BY te.created_at DESC
        """, (equipe_id,))
        taches = curseur.fetchall()

        # Labels par tâche (jointure séparée pour éviter une cartesienne)
        curseur.execute("""
            SELECT tl.tache_id, l.id, l.nom, l.couleur
            FROM taches_labels tl
            JOIN labels_equipe l ON tl.label_id=l.id
            WHERE l.equipe_id=%s
        """, (equipe_id,))
        labels_par_tache = {}
        for row in curseur.fetchall():
            labels_par_tache.setdefault(row['tache_id'], []).append({
                'id': row['id'], 'nom': row['nom'], 'couleur': row['couleur']
            })
        for t in taches:
            if t.get('completed_at'):
                t['completed_at'] = t['completed_at'].isoformat() if hasattr(t['completed_at'], 'isoformat') else str(t['completed_at'])
            t['labels'] = labels_par_tache.get(t['id'], [])

        db.close()
        return jsonify({"membres": membres, "labels": labels, "taches": taches})
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/taches/<int:tache_id>/toggle-fait', methods=['PATCH'])
def toggle_tache_fait(tache_id):
    """Toggle done/undone par n'importe quel membre de l'équipe.
    Met à jour statut + completed_at + completed_by + log activité."""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        nom_user = data.get('nom_user', 'Quelqu\'un')
        if not user_id:
            return jsonify({"erreur": "user_id requis"}), 400

        db = connecter()
        curseur = db.cursor(dictionary=True)
        _ensure_taches_equipe_columns(curseur)
        db.commit()

        curseur.execute("SELECT statut, titre, equipe_id, createur_id, assignee_id FROM taches_equipe WHERE id=%s", (tache_id,))
        t = curseur.fetchone()
        if not t:
            db.close()
            return jsonify({"erreur": "Tâche introuvable"}), 404

        nouvelle_action = 'reopen'
        # Workflow validation : si tâche assignée à qqun de différent du créateur,
        # et que le terminer n'est pas le créateur, on passe par "en_validation"
        has_assignee = t.get('assignee_id') is not None
        assignee_diff = has_assignee and t.get('assignee_id') != t.get('createur_id')
        besoin_validation = assignee_diff and user_id != t.get('createur_id')

        if t['statut'] == 'termine':
            # Re-ouvre : retour en 'todo' + clear completion meta
            curseur.execute(
                "UPDATE taches_equipe SET statut='todo', completed_at=NULL, completed_by=NULL WHERE id=%s",
                (tache_id,)
            )
            action = 'a ré-ouvert la tâche'
        elif t['statut'] == 'en_validation':
            # Tâche en attente de validation
            if user_id == t.get('createur_id'):
                # Le créateur valide → termine
                curseur.execute(
                    "UPDATE taches_equipe SET statut='termine' WHERE id=%s",
                    (tache_id,)
                )
                action = 'a validé la tâche'
                nouvelle_action = 'validee'
            else:
                # Autre membre = annule la proposition → retour todo
                curseur.execute(
                    "UPDATE taches_equipe SET statut='todo', completed_at=NULL, completed_by=NULL WHERE id=%s",
                    (tache_id,)
                )
                action = 'a annulé la proposition de validation'
        elif besoin_validation:
            # Propose pour validation au créateur
            curseur.execute(
                "UPDATE taches_equipe SET statut='en_validation', completed_at=NOW(), completed_by=%s WHERE id=%s",
                (user_id, tache_id)
            )
            action = 'a proposé la tâche pour validation'
            nouvelle_action = 'proposee'
        else:
            # Direct au terminé (solo ou créateur lui-même)
            curseur.execute(
                "UPDATE taches_equipe SET statut='termine', completed_at=NOW(), completed_by=%s WHERE id=%s",
                (user_id, tache_id)
            )
            action = 'a terminé la tâche'
            nouvelle_action = 'terminee'
        db.commit()

        # Récupère la tâche enrichie pour la réponse
        curseur.execute("""
            SELECT te.*, u1.nom as createur_nom, u2.nom as assignee_nom, u3.nom as completed_by_nom,
                (SELECT COUNT(*) FROM commentaires_tache WHERE tache_id=te.id) as nb_commentaires,
                (SELECT COUNT(*) FROM sous_taches_equipe WHERE tache_id=te.id) as nb_sous_taches,
                (SELECT COUNT(*) FROM sous_taches_equipe WHERE tache_id=te.id AND terminee=1) as nb_sous_taches_done
            FROM taches_equipe te
            JOIN users u1 ON te.createur_id=u1.id
            LEFT JOIN users u2 ON te.assignee_id=u2.id
            LEFT JOIN users u3 ON te.completed_by=u3.id
            WHERE te.id=%s
        """, (tache_id,))
        tache = curseur.fetchone()
        if tache and tache.get('completed_at'):
            tache['completed_at'] = tache['completed_at'].isoformat() if hasattr(tache['completed_at'], 'isoformat') else str(tache['completed_at'])
        # Inclure les labels dans la réponse pour cohérence frontend
        if tache:
            try:
                curseur.execute("""
                    SELECT l.id, l.nom, l.couleur FROM taches_labels tl
                    JOIN labels_equipe l ON tl.label_id=l.id
                    WHERE tl.tache_id=%s
                """, (tache_id,))
                tache['labels'] = curseur.fetchall() or []
            except Exception:
                tache['labels'] = []

        # Push notification au créateur selon l'action
        if t['createur_id'] != user_id:
            try:
                curseur.execute("SELECT subscription FROM push_subscriptions WHERE user_id=%s", (t['createur_id'],))
                subs = curseur.fetchall()
                if nouvelle_action == 'proposee':
                    push_titre = "📥 Tâche à valider"
                    push_body = f"{nom_user} a marqué « {t['titre'][:50]} » comme terminée — valide ou refuse"
                elif nouvelle_action == 'terminee':
                    push_titre = "🎉 Ta tâche a été terminée"
                    push_body = f"{nom_user} vient de terminer « {t['titre'][:50]} »"
                else:
                    push_titre, push_body = None, None
                if push_titre:
                    for sub_row in subs:
                        envoyer_push(sub_row['subscription'], push_titre, push_body, url="/collaboration")
            except Exception as e:
                print(f"[toggle-fait] push créateur erreur: {e}")

        db.close()

        log_activite(t['equipe_id'], user_id, nom_user, action, t['titre'], tache_id)
        return jsonify(tache)
    except Exception as e:
        return erreur_500(e)

@app.route('/equipes/taches', methods=['POST'])
def creer_tache_equipe():
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        # Migration lazy : aligne le default DB sur 'todo' au lieu de 'a_faire'
        try:
            curseur.execute("UPDATE taches_equipe SET statut='todo' WHERE statut='a_faire'")
        except Exception:
            pass

        # Vérifie que le créateur appartient à l'équipe + récupère son rôle
        curseur.execute(
            "SELECT role FROM equipe_membres WHERE equipe_id=%s AND user_id=%s",
            (data['equipe_id'], data['createur_id'])
        )
        row = curseur.fetchone()
        if not row:
            db.close()
            return jsonify({"erreur": "Non membre de l'equipe"}), 403
        est_admin = row['role'] == 'admin'

        # Guard : un non-admin ne peut assigner qu'à lui-même
        assignee_id = data.get('assignee_id')
        if assignee_id and not est_admin and assignee_id != data['createur_id']:
            db.close()
            return jsonify({"erreur": "Seul un admin peut assigner a un autre membre"}), 403

        # Whitelist du statut côté frontend
        statut_in = data.get('statut', 'todo')
        if statut_in not in ('todo', 'en_cours', 'termine'):
            statut_in = 'todo'
        curseur.execute(
            "INSERT INTO taches_equipe (equipe_id, titre, description, priorite, assignee_id, createur_id, deadline, statut) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (data['equipe_id'], data['titre'], data.get('description', ''),
             data.get('priorite', 'moyenne'), assignee_id,
             data['createur_id'], data.get('deadline'), statut_in)
        )
        tache_id = curseur.lastrowid
        db.commit()
        curseur.execute("SELECT te.*, u1.nom as createur_nom, u2.nom as assignee_nom FROM taches_equipe te JOIN users u1 ON te.createur_id=u1.id LEFT JOIN users u2 ON te.assignee_id=u2.id WHERE te.id=%s", (tache_id,))
        tache = curseur.fetchone()
        db.close()
        nom_user = tache.get('createur_nom', 'Quelqu\'un') if tache else 'Quelqu\'un'
        log_activite(data['equipe_id'], data['createur_id'], nom_user, 'a créé la tâche', data['titre'], tache_id)
        return jsonify(tache)
    except Exception as e:
        return erreur_500(e)

@app.route('/equipes/taches/<int:tache_id>', methods=['PUT'])
def modifier_tache_equipe(tache_id):
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        db = connecter()
        curseur = db.cursor(dictionary=True)

        curseur.execute("SELECT equipe_id, createur_id, titre FROM taches_equipe WHERE id=%s", (tache_id,))
        tache = curseur.fetchone()
        if not tache:
            db.close()
            return jsonify({"erreur": "Tache introuvable"}), 404

        # Récupère le rôle de l'auteur de la requête dans cette équipe
        role_appelant = None
        if user_id:
            curseur.execute(
                "SELECT role FROM equipe_membres WHERE equipe_id=%s AND user_id=%s",
                (tache['equipe_id'], user_id)
            )
            row = curseur.fetchone()
            role_appelant = row['role'] if row else None

        if not role_appelant:
            db.close()
            return jsonify({"erreur": "Non membre de l'equipe"}), 403

        est_admin = role_appelant == 'admin'
        est_createur = user_id == tache['createur_id']

        # Règle d'autorisation :
        # - statut : tout membre (pour bouger la tâche dans le Kanban)
        # - titre/description/priorite/deadline : créateur OU admin
        # - assignee_id : admin uniquement (sinon contournement trivial via création)
        AUTEUR_OR_ADMIN = {'titre', 'description', 'priorite', 'deadline'}
        ADMIN_ONLY = {'assignee_id'}
        FREE = {'statut'}

        for key in data:
            if key in ADMIN_ONLY and not est_admin:
                db.close()
                return jsonify({"erreur": "Seul un admin peut reassigner une tache"}), 403
            if key in AUTEUR_OR_ADMIN and not (est_admin or est_createur):
                db.close()
                return jsonify({"erreur": f"Reserve au createur ou aux admins (champ: {key})"}), 403

        fields, vals = [], []
        for key in AUTEUR_OR_ADMIN | ADMIN_ONLY | FREE:
            if key in data:
                fields.append(f"{key}=%s")
                vals.append(data[key])
        if fields:
            vals.append(tache_id)
            curseur.execute(f"UPDATE taches_equipe SET {', '.join(fields)} WHERE id=%s", vals)
            db.commit()

        db.close()
        if data.get('nom_user'):
            statut_labels = {'todo': 'À faire', 'en_cours': 'En cours', 'termine': 'Terminé'}
            if 'statut' in data:
                action = f"a déplacé vers {statut_labels.get(data['statut'], data['statut'])}"
            else:
                action = 'a modifié la tâche'
            log_activite(tache['equipe_id'], user_id, data['nom_user'], action, tache['titre'], tache_id)
        return jsonify({"message": "Tache mise a jour"})
    except Exception as e:
        return erreur_500(e)

def _ensure_labels_schema(curseur):
    """Crée labels_equipe + taches_labels si absents."""
    curseur.execute("""CREATE TABLE IF NOT EXISTS labels_equipe (
        id INT AUTO_INCREMENT PRIMARY KEY,
        equipe_id INT NOT NULL,
        nom VARCHAR(60) NOT NULL,
        couleur VARCHAR(20) DEFAULT '#6c63ff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_equipe (equipe_id),
        FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE
    )""")
    curseur.execute("""CREATE TABLE IF NOT EXISTS taches_labels (
        tache_id INT NOT NULL,
        label_id INT NOT NULL,
        PRIMARY KEY (tache_id, label_id),
        FOREIGN KEY (tache_id) REFERENCES taches_equipe(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels_equipe(id) ON DELETE CASCADE
    )""")


@app.route('/equipes/<int:equipe_id>/labels', methods=['GET'])
def get_labels_equipe(equipe_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        _ensure_labels_schema(curseur); db.commit()
        curseur.execute("SELECT id, nom, couleur FROM labels_equipe WHERE equipe_id=%s ORDER BY nom ASC", (equipe_id,))
        labels = curseur.fetchall()
        db.close()
        return jsonify(labels)
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/<int:equipe_id>/labels', methods=['POST'])
def creer_label(equipe_id):
    try:
        data = request.get_json() or {}
        nom = (data.get('nom') or '').strip()
        couleur = (data.get('couleur') or '#6c63ff').strip()
        if not nom:
            return jsonify({"erreur": "nom requis"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        _ensure_labels_schema(curseur); db.commit()
        curseur.execute(
            "INSERT INTO labels_equipe (equipe_id, nom, couleur) VALUES (%s, %s, %s)",
            (equipe_id, nom[:60], couleur[:20])
        )
        db.commit()
        label_id = curseur.lastrowid
        curseur.execute("SELECT id, nom, couleur FROM labels_equipe WHERE id=%s", (label_id,))
        label = curseur.fetchone()
        db.close()
        return jsonify(label)
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/labels/<int:label_id>', methods=['PATCH'])
def modifier_label(label_id):
    try:
        data = request.get_json() or {}
        fields, vals = [], []
        if 'nom' in data:
            nom = (data['nom'] or '').strip()
            if not nom:
                return jsonify({"erreur": "nom vide"}), 400
            fields.append("nom=%s"); vals.append(nom[:60])
        if 'couleur' in data:
            fields.append("couleur=%s"); vals.append((data['couleur'] or '#6c63ff').strip()[:20])
        if not fields:
            return jsonify({"erreur": "rien à modifier"}), 400
        vals.append(label_id)
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute(f"UPDATE labels_equipe SET {', '.join(fields)} WHERE id=%s", vals)
        db.commit()
        curseur.execute("SELECT id, nom, couleur FROM labels_equipe WHERE id=%s", (label_id,))
        label = curseur.fetchone()
        db.close()
        return jsonify(label)
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/labels/<int:label_id>', methods=['DELETE'])
def supprimer_label(label_id):
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM labels_equipe WHERE id=%s", (label_id,))
        db.commit()
        db.close()
        return jsonify({"ok": True})
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/taches/<int:tache_id>/labels/<int:label_id>', methods=['POST'])
def assigner_label_tache(tache_id, label_id):
    """Assigne un label à une tâche (idempotent)."""
    try:
        db = connecter()
        curseur = db.cursor()
        _ensure_labels_schema(curseur); db.commit()
        try:
            curseur.execute("INSERT INTO taches_labels (tache_id, label_id) VALUES (%s, %s)", (tache_id, label_id))
            db.commit()
        except Exception:
            # Doublon ignoré (PK composite)
            pass
        db.close()
        return jsonify({"ok": True})
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/taches/<int:tache_id>/labels/<int:label_id>', methods=['DELETE'])
def desassigner_label_tache(tache_id, label_id):
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM taches_labels WHERE tache_id=%s AND label_id=%s", (tache_id, label_id))
        db.commit()
        db.close()
        return jsonify({"ok": True})
    except Exception as e:
        return erreur_500(e)


def _ensure_sous_taches_schema(curseur):
    """Crée la table sous_taches_equipe si absente."""
    curseur.execute("""CREATE TABLE IF NOT EXISTS sous_taches_equipe (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tache_id INT NOT NULL,
        titre VARCHAR(255) NOT NULL,
        terminee TINYINT(1) DEFAULT 0,
        position INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tache (tache_id),
        FOREIGN KEY (tache_id) REFERENCES taches_equipe(id) ON DELETE CASCADE
    )""")


@app.route('/equipes/taches/<int:tache_id>/sous-taches', methods=['GET'])
def get_sous_taches_equipe(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        _ensure_sous_taches_schema(curseur); db.commit()
        curseur.execute("SELECT * FROM sous_taches_equipe WHERE tache_id=%s ORDER BY position ASC, id ASC", (tache_id,))
        sous_taches = curseur.fetchall()
        db.close()
        return jsonify(sous_taches)
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/taches/<int:tache_id>/sous-taches', methods=['POST'])
def creer_sous_tache_equipe(tache_id):
    try:
        data = request.get_json() or {}
        titre = (data.get('titre') or '').strip()
        if not titre:
            return jsonify({"erreur": "titre requis"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        _ensure_sous_taches_schema(curseur); db.commit()
        # Position = max + 1
        curseur.execute("SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM sous_taches_equipe WHERE tache_id=%s", (tache_id,))
        next_pos = (curseur.fetchone() or {}).get('next_pos', 0)
        curseur.execute(
            "INSERT INTO sous_taches_equipe (tache_id, titre, position) VALUES (%s, %s, %s)",
            (tache_id, titre[:255], next_pos)
        )
        db.commit()
        sous_tache_id = curseur.lastrowid
        curseur.execute("SELECT * FROM sous_taches_equipe WHERE id=%s", (sous_tache_id,))
        sous_tache = curseur.fetchone()
        db.close()
        return jsonify(sous_tache)
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/sous-taches/<int:sous_tache_id>/toggle', methods=['PATCH'])
def toggle_sous_tache_equipe(sous_tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT terminee FROM sous_taches_equipe WHERE id=%s", (sous_tache_id,))
        row = curseur.fetchone()
        if not row:
            db.close()
            return jsonify({"erreur": "Sous-tâche introuvable"}), 404
        nouveau = 0 if row['terminee'] else 1
        curseur.execute("UPDATE sous_taches_equipe SET terminee=%s WHERE id=%s", (nouveau, sous_tache_id))
        db.commit()
        db.close()
        return jsonify({"terminee": nouveau})
    except Exception as e:
        return erreur_500(e)


@app.route('/equipes/sous-taches/<int:sous_tache_id>', methods=['DELETE'])
def supprimer_sous_tache_equipe(sous_tache_id):
    try:
        db = connecter()
        curseur = db.cursor()
        curseur.execute("DELETE FROM sous_taches_equipe WHERE id=%s", (sous_tache_id,))
        db.commit()
        db.close()
        return jsonify({"ok": True})
    except Exception as e:
        return erreur_500(e)


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
        return erreur_500(e)

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
                        et = EMAIL_TOKENS
                        # Échapper le contenu pour éviter injection HTML basique
                        contenu_safe = (contenu or "").replace("<","&lt;").replace(">","&gt;")
                        mention_contenu = f"""
                        <h1 style="color:{et['text']};margin:0 0 10px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Nouvelle mention</h1>
                        <p style="color:{et['text_2']};margin:0 0 20px;font-size:14px;line-height:1.6;"><strong style="color:{et['text']};">{auteur}</strong> t'a mentionné dans un commentaire sur la tâche <strong style="color:{et['text']};">« {tache_titre} »</strong>.</p>
                        <div style="background:{et['bg']};border:1px solid {et['border']};border-left:3px solid {et['ember']};border-radius:10px;padding:14px 16px;color:{et['text']};font-size:13.5px;line-height:1.6;margin-bottom:24px;">{contenu_safe}</div>
                        {_email_cta_btn("Répondre dans GetShift", "https://chamdaane-a11y.github.io/taskflow/#/collaboration")}
                        """
                        envoyer_email(mentionné['email'], f"{auteur} t'a mentionné — GetShift", _base_email(mention_contenu, "Nouvelle mention"))
        db.close()
        return jsonify({"message": "Commentaire ajoute"})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/collaboration/repondre/<int:id>', methods=['PUT'])
def repondre_invitation(id):
    try:
        data = request.get_json()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        # Seul le collaborateur invité peut répondre à SON invitation.
        curseur.execute("SELECT collaborateur_id FROM collaborations WHERE id=%s", (id,))
        invit = curseur.fetchone()
        if not invit:
            db.close(); return jsonify({"erreur": "Invitation introuvable"}), 404
        if int(invit['collaborateur_id']) != current_uid():
            db.close(); abort(403)
        curseur.execute("UPDATE collaborations SET statut=%s WHERE id=%s", (data['statut'], id))
        db.commit(); db.close()
        return jsonify({"message": "Reponse enregistree"})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/collaboration/membres/<int:tache_id>', methods=['GET'])
def get_membres(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        if not _implique_dans_tache(curseur, tache_id, current_uid()):
            db.close(); abort(403)
        curseur.execute("SELECT c.*, u.nom, u.email FROM collaborations c JOIN users u ON c.collaborateur_id = u.id WHERE c.tache_id=%s", (tache_id,))
        membres = curseur.fetchall()
        db.close()
        return jsonify(membres)
    except Exception as e:
        return erreur_500(e)

# ============================================
# COMMENTAIRES
# ============================================

@app.route('/commentaires/<int:tache_id>', methods=['GET'])
def get_commentaires(tache_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        if not _implique_dans_tache(curseur, tache_id, current_uid()):
            db.close(); abort(403)
        curseur.execute("SELECT c.*, u.nom FROM commentaires c JOIN users u ON c.user_id = u.id WHERE c.tache_id=%s ORDER BY c.created_at ASC", (tache_id,))
        commentaires = curseur.fetchall()
        db.close()
        return jsonify(commentaires)
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/push/status/<int:user_id>', methods=['GET'])
def push_status(user_id):
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id=%s", (user_id,))
        n = (cursor.fetchone() or {}).get('n', 0)
        cursor.close(); db.close()
        return jsonify({"subscribed": n > 0})
    except Exception as e:
        return erreur_500(e)

@app.route('/push/unsubscribe/<int:user_id>', methods=['DELETE'])
def push_unsubscribe(user_id):
    try:
        db = connecter()
        cursor = db.cursor()
        cursor.execute("DELETE FROM push_subscriptions WHERE user_id=%s", (user_id,))
        db.commit(); cursor.close(); db.close()
        return jsonify({"message": "Désabonné"})
    except Exception as e:
        return erreur_500(e)

@app.route('/push/test/<int:user_id>', methods=['POST'])
def push_test(user_id):
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT subscription FROM push_subscriptions WHERE user_id=%s", (user_id,))
        rows = cursor.fetchall()
        cursor.close(); db.close()
        if not rows:
            return jsonify({"erreur": "Aucun abonnement"}), 404
        sent = 0
        for r in rows:
            if envoyer_push(r['subscription'], "🧪 Test GetShift", "Si tu vois ceci, tes notifs 7h sont opérationnelles", "/tomorrow"):
                sent += 1
        return jsonify({"sent": sent})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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

@app.route('/users/<int:id>/weekly-report-day', methods=['GET'])
def get_weekly_report_day(id):
    """Retourne le jour de la semaine où l'utilisateur reçoit son rapport hebdo.
    0=Lundi … 6=Dimanche. Défaut : 4 (Vendredi)."""
    try:
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("SELECT weekly_report_day FROM users WHERE id=%s", (id,))
        row = cur.fetchone(); cur.close(); db.close()
        if not row:
            return jsonify({"erreur": "Utilisateur introuvable"}), 404
        return jsonify({"day": int(row.get('weekly_report_day') if row.get('weekly_report_day') is not None else 4)})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/weekly-report-day', methods=['PUT'])
def set_weekly_report_day(id):
    """Définit le jour de réception du rapport hebdo (0=Lundi … 6=Dimanche)."""
    try:
        data = request.get_json() or {}
        day = data.get('day')
        if not isinstance(day, int) or day < 0 or day > 6:
            return jsonify({"erreur": "Jour invalide (0-6)"}), 400
        db = connecter(); cur = db.cursor()
        cur.execute("UPDATE users SET weekly_report_day=%s WHERE id=%s", (day, id))
        db.commit(); cur.close(); db.close()
        return jsonify({"message": "Jour mis à jour", "day": day})
    except Exception as e:
        return erreur_500(e)

@app.route('/users/<int:id>/email/resume-hebdo-test', methods=['POST'])
@limiter.limit("3 per hour")
def trigger_resume_hebdo_for_user(id):
    """Test manuel : envoie le rapport hebdo à un user spécifique, ignore son day."""
    threading.Thread(target=job_email_resume_hebdo, args=(id,)).start()
    return jsonify({"message": "Rapport hebdo envoyé (vérifie ton email dans 1 min)"})

@app.route('/debug/resume-hebdo/<int:id>', methods=['GET'])
def debug_resume_hebdo(id):
    """Debug : run job hebdo synchrone pour un user et retourne tout résultat / erreur."""
    import traceback
    result = {"user_id": id, "steps": []}
    try:
        db = connecter(); cur = db.cursor(dictionary=True)
        cur.execute("""
            SELECT u.id, u.nom, u.email, u.points, u.niveau, u.email_verifie,
                COUNT(CASE WHEN t.terminee = TRUE AND COALESCE(t.terminee_le, t.updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees,
                COUNT(CASE WHEN t.terminee = TRUE AND COALESCE(t.terminee_le, t.updated_at) >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND COALESCE(t.terminee_le, t.updated_at) < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_prec,
                COUNT(CASE WHEN t.terminee = FALSE THEN 1 END) as en_cours,
                COUNT(CASE WHEN t.terminee = FALSE AND t.deadline < CURDATE() AND t.deadline IS NOT NULL THEN 1 END) as en_retard,
                COUNT(t.id) as total
            FROM users u LEFT JOIN taches t ON u.id = t.user_id
            WHERE u.id = %s GROUP BY u.id
        """, (id,))
        u = cur.fetchone()
        if not u:
            return jsonify({"erreur": "user introuvable"}), 404
        result["user"] = {"id": u['id'], "nom": u['nom'], "email": u['email'], "email_verifie": bool(u['email_verifie']), "total_taches": u['total']}
        result["steps"].append("user fetched")
        try:
            extra = _collecter_stats_hebdo(cur, u['id'], u)
            result["steps"].append("stats collected")
            result["extra_keys"] = list(extra.keys())
        except Exception as e:
            result["erreur_stats"] = f"{type(e).__name__}: {e}"
            result["traceback_stats"] = traceback.format_exc()
            return jsonify(result), 500
        try:
            terminees = u['terminees'] or 0
            taux = round((terminees / max(u['total'], 1)) * 100, 0) if terminees else 0
            from datetime import date, timedelta
            semaine_fin = date.today()
            semaine_debut = semaine_fin - timedelta(days=6)
            stats = {
                "terminees": terminees, "terminees_prec": u['terminees_prec'] or 0,
                "en_cours": u['en_cours'] or 0, "en_retard": u['en_retard'] or 0,
                "taux": int(taux), "points": u['points'] or 0, "niveau": u['niveau'] or 1,
                "conseil_ia": "Test debug — pas de conseil IA pour gagner du temps.",
                "semaine_debut": semaine_debut.strftime('%d/%m'),
                "semaine_fin": semaine_fin.strftime('%d/%m/%Y'),
                **extra,
            }
            html = _html_resume_hebdo(u['nom'], stats)
            result["steps"].append(f"html generated ({len(html)} chars)")
        except Exception as e:
            result["erreur_html"] = f"{type(e).__name__}: {e}"
            result["traceback_html"] = traceback.format_exc()
            return jsonify(result), 500
        try:
            sujet = f"[DEBUG] Bilan · {semaine_debut.strftime('%d/%m')} → {semaine_fin.strftime('%d/%m')} — GetShift"
            sent = envoyer_email(u['email'], sujet, html)
            result["steps"].append(f"envoyer_email returned: {sent}")
            result["email_envoye"] = bool(sent)
        except Exception as e:
            result["erreur_email"] = f"{type(e).__name__}: {e}"
            result["traceback_email"] = traceback.format_exc()
            return jsonify(result), 500
        cur.close(); db.close()
        return jsonify(result)
    except Exception as e:
        result["erreur_globale"] = f"{type(e).__name__}: {e}"
        result["traceback_globale"] = traceback.format_exc()
        return jsonify(result), 500


# ════════════════════════════════════════════════════════════════════════
# SYSTÈME DE NOTIFICATIONS STYLE NOTION / TODOIST
# Lifecycle + Daily + Instant + Win-back
# Déclenchés par GitHub Actions cron (indépendant de Render qui dort)
# ════════════════════════════════════════════════════════════════════════

# ─── LIFECYCLE : parcours d'onboarding Day 0 → Day 30 ──────────────────
LIFECYCLE_MESSAGES = {
    0: {"titre": "Bienvenue 🚀", "body": "Crée ta première tâche en 30s pour démarrer."},
    1: {"titre": "Hier c'était jour 1 — aujourd'hui on plante les racines",
        "body": "1 tâche aujourd'hui = +1 jour de streak. Vas-y."},
    2: {"titre": "Découvre Tomorrow Builder ⚡",
        "body": "Planifie ta journée parfaite en 1 clic — l'IA s'occupe de tout."},
    3: {"titre": "Coach Alex est là pour toi 🤗",
        "body": "Il analyse ta semaine et te dit ce qui marche. Discute avec lui."},
    5: {"titre": "Tu as commencé — ne lâche pas 🔥",
        "body": "Les 7 premiers jours sont les plus durs. Tu y es presque."},
    7: {"titre": "1 semaine ! 🏆 Voilà ton premier bilan",
        "body": "Ouvre Analytiques pour voir ce que tu as déjà construit."},
    10: {"titre": "Découvre Goal Reverse 🎯",
         "body": "Définis un objectif et l'IA t'aide à le décomposer en étapes."},
    14: {"titre": "Tes patterns émergent — découvre ton Task DNA 🧬",
         "body": "Quel type de tâche tu sous/sur-estimes ? La data parle."},
    21: {"titre": "21 jours = nouvelle habitude 🎉",
         "body": "Tu n'es plus un débutant. Tu deviens régulier."},
    30: {"titre": "1 mois avec GetShift — tu fais partie des 10% qui persistent 🏆",
         "body": "Ouvre ton bilan mensuel : tu vas être fier."},
}


def job_notifs_lifecycle():
    """Parcourt tous les users et envoie la notif lifecycle correspondant à l'âge de leur compte."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nom, DATEDIFF(NOW(), created_at) AS age_jours
            FROM users WHERE email_verifie = TRUE
        """)
        users = cursor.fetchall()
        sent_count = 0
        for u in users:
            age = u['age_jours']
            if age in LIFECYCLE_MESSAGES:
                msg = LIFECYCLE_MESSAGES[age]
                type_notif = f"lifecycle_day_{age}"
                # 1 fois EVER (intervalle 365 jours)
                if envoyer_push_smart(cursor, db, u['id'], type_notif,
                                       msg['titre'], msg['body'],
                                       url="/dashboard", intervalle_jours=365):
                    sent_count += 1
        cursor.close(); db.close()
        print(f"[Lifecycle] {sent_count} notifs envoyées")
        return sent_count
    except Exception as e:
        print(f"[Lifecycle] Erreur: {e}")
        return 0


@app.route('/notifications/lifecycle-tick', methods=['POST'])
def trigger_lifecycle():
    threading.Thread(target=job_notifs_lifecycle).start()
    return jsonify({"message": "Lifecycle tick déclenché"})


# ─── DAILY : matin (planning) / midi (push) / soir (streak warning) ───
def job_notifs_daily_matin():
    """8h UTC : nudge planning du jour selon état utilisateur. Prio au plan Tomorrow Builder s'il existe."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.streak,
                (SELECT COUNT(*) FROM planification p WHERE p.user_id=u.id AND DATE(p.date_planifiee)=CURDATE()) AS planifie_aujourdhui,
                (SELECT COUNT(*) FROM taches t WHERE t.user_id=u.id AND t.terminee=FALSE AND t.priorite='haute') AS haute_attente,
                (SELECT COUNT(*) FROM taches t WHERE t.user_id=u.id AND t.terminee=FALSE) AS total_attente,
                (SELECT planning_json FROM tomorrow_plans tp WHERE tp.user_id=u.id AND DATE(tp.date_planifiee)=CURDATE() ORDER BY tp.cree_le DESC LIMIT 1) AS tb_plan_json
            FROM users u
            WHERE u.email_verifie = TRUE
              AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id=u.id)
        """)
        users = cursor.fetchall()
        sent = 0
        for u in users:
            # Priorité 1 : plan Tomorrow Builder du jour
            tb_plan = u.get('tb_plan_json')
            if tb_plan:
                try:
                    plan_data = json.loads(tb_plan)
                    creneaux = [p for p in plan_data.get('planning', []) if p.get('type') != 'pause']
                    nb = len(creneaux)
                    if nb > 0:
                        premier = creneaux[0]
                        h_pic = plan_data.get('heure_productive', 9)
                        titre = "☀️ Ton plan du jour est prêt"
                        body = f"{nb} créneau{'x' if nb > 1 else ''} • démarre à {premier.get('heure_debut', '?')} • pic à {h_pic}h"
                        if envoyer_push_smart(cursor, db, u['id'], "daily_morning", titre, body, "/tomorrow", intervalle_jours=1):
                            sent += 1
                        continue
                except Exception:
                    pass
            # Priorité 2 : fallback logique existante
            planifie = u['planifie_aujourdhui'] or 0
            haute = u['haute_attente'] or 0
            streak = u['streak'] or 0
            total = u['total_attente'] or 0
            if planifie >= 3:
                titre = f"☀️ {planifie} tâches t'attendent aujourd'hui"
                body = "Ouvre Planification pour démarrer en force."
            elif planifie >= 1:
                titre = f"☀️ {planifie} tâche planifiée aujourd'hui"
                body = "Une journée légère — profite pour avancer sur tes prio haute."
            elif haute >= 1:
                titre = "⚡ Tu as des prio haute en attente"
                body = f"Aucun plan aujourd'hui mais {haute} tâche{'s' if haute > 1 else ''} prio haute t'attend{'ent' if haute > 1 else ''}."
            elif total >= 1:
                titre = "🎯 Planifie ta journée en 30s"
                body = f"{total} tâche{'s' if total > 1 else ''} en attente — décide laquelle tu attaques."
            else:
                titre = "✨ Nouvelle journée, nouvelle page"
                body = "Crée une tâche pour démarrer cette journée avec intention."
            url = "/planification" if (planifie == 0 and total > 0) else "/dashboard"
            if envoyer_push_smart(cursor, db, u['id'], "daily_morning", titre, body, url, intervalle_jours=1):
                sent += 1
        cursor.close(); db.close()
        print(f"[Daily-Matin] {sent} notifs envoyées")
        return sent
    except Exception as e:
        print(f"[Daily-Matin] Erreur: {e}")
        return 0


def job_notifs_daily_midi():
    """13h UTC : encouragement / mi-journée check."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom,
                DATEDIFF(NOW(), u.derniere_activite) AS jours_inactif,
                (SELECT COUNT(*) FROM taches t WHERE t.user_id=u.id AND t.terminee=TRUE AND DATE(COALESCE(t.terminee_le, t.updated_at))=CURDATE()) AS faites_today,
                (SELECT COUNT(*) FROM planification p JOIN taches t ON p.tache_id=t.id WHERE p.user_id=u.id AND DATE(p.date_planifiee)=CURDATE() AND t.terminee=FALSE) AS restantes_today
            FROM users u
            WHERE u.email_verifie = TRUE
              AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id=u.id)
        """)
        users = cursor.fetchall()
        sent = 0
        for u in users:
            faites = u['faites_today'] or 0
            restantes = u['restantes_today'] or 0
            inactif = u['jours_inactif'] if u['jours_inactif'] is not None else 999
            if faites >= 5:
                titre = f"🔥 Déjà {faites} tâches — tu déchires"
                body = "Mi-journée et tu cartonnes. Garde le rythme."
            elif faites >= 1 and restantes >= 1:
                titre = f"💪 {faites} fait, {restantes} restant{'s' if restantes > 1 else ''}"
                body = "Tu es lancé. Encore un push avant la pause déj."
            elif faites == 0 and restantes >= 1:
                titre = f"⚡ Midi — il te reste {restantes} tâche{'s' if restantes > 1 else ''}"
                body = "Ne laisse pas l'aprem te dépasser. 1 tâche maintenant."
            elif inactif <= 1:
                # Jour calme mais user présent : nudge léger plutôt que silence.
                # Réservé aux actifs récents — les churned ont la logique win-back du soir.
                titre = "🎯 Aprèm libre — choisis ton focus"
                body = "Rien de planifié pour aujourd'hui. Décide 1 chose à avancer."
            else:
                continue  # user inactif sans rien à pousser → on laisse le soir gérer
            if envoyer_push_smart(cursor, db, u['id'], "daily_midi", titre, body, "/dashboard", intervalle_jours=1):
                sent += 1
        cursor.close(); db.close()
        print(f"[Daily-Midi] {sent} notifs envoyées")
        return sent
    except Exception as e:
        print(f"[Daily-Midi] Erreur: {e}")
        return 0


def job_notifs_daily_soir():
    """20h UTC : streak warning + bilan + win-back."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.nom, u.streak,
                DATEDIFF(NOW(), u.derniere_activite) AS jours_inactif,
                (SELECT COUNT(*) FROM taches t WHERE t.user_id=u.id AND t.terminee=TRUE AND DATE(COALESCE(t.terminee_le, t.updated_at))=CURDATE()) AS faites_today
            FROM users u
            WHERE u.email_verifie = TRUE
              AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id=u.id)
        """)
        users = cursor.fetchall()
        sent = 0
        for u in users:
            faites = u['faites_today'] or 0
            streak = u['streak'] or 0
            inactif = u['jours_inactif'] if u['jours_inactif'] is not None else 999

            # Win-back graduel
            if inactif == 3:
                if envoyer_push_smart(cursor, db, u['id'], "winback_3j",
                                       "👋 3 jours sans toi", "Tes tâches t'attendent — 1 clic pour reprendre.",
                                       "/dashboard", intervalle_jours=7):
                    sent += 1; continue
            elif inactif == 7:
                if envoyer_push_smart(cursor, db, u['id'], "winback_7j",
                                       "📅 Une semaine sans GetShift", "Reviens, on a des nouveautés pour toi.",
                                       "/dashboard", intervalle_jours=14):
                    sent += 1; continue
            elif inactif >= 14 and inactif < 21:
                if envoyer_push_smart(cursor, db, u['id'], "winback_14j",
                                       "💭 On t'a manqué", "Reviens en 30s et reprends là où tu t'es arrêté.",
                                       "/dashboard", intervalle_jours=30):
                    sent += 1; continue

            # Streak en danger
            if streak >= 2 and faites == 0:
                titre = f"🔥 Streak {streak}j → casse pas la chaîne"
                body = "Plus que 4h. 1 seule tâche suffit pour préserver ta série."
                if envoyer_push_smart(cursor, db, u['id'], "streak_warning", titre, body, "/dashboard", intervalle_jours=1):
                    sent += 1; continue

            # Bilan positif quand bonne journée
            if faites >= 3:
                titre = f"✓ {faites} tâches aujourd'hui"
                body = "Bonne journée. Planifie demain pour enchaîner."
                if envoyer_push_smart(cursor, db, u['id'], "daily_evening_bilan", titre, body, "/planification", intervalle_jours=1):
                    sent += 1
            elif inactif <= 1:
                # User présent aujourd'hui mais journée calme : mot de clôture
                # plutôt qu'un silence total. (Churned → géré par le win-back ci-dessus.)
                if faites >= 1:
                    titre = f"✓ {faites} tâche{'s' if faites > 1 else ''} bouclée{'s' if faites > 1 else ''}"
                    body = "Pose 2 min : qu'est-ce qui compte demain ? Planifie-le."
                else:
                    titre = "Journée presque finie"
                    body = "Pas encore avancé ? 1 tâche en 5 min, ou planifie demain."
                if envoyer_push_smart(cursor, db, u['id'], "daily_evening_soft", titre, body, "/planification", intervalle_jours=1):
                    sent += 1
        cursor.close(); db.close()
        print(f"[Daily-Soir] {sent} notifs envoyées")
        return sent
    except Exception as e:
        print(f"[Daily-Soir] Erreur: {e}")
        return 0


@app.route('/notifications/daily-matin', methods=['POST'])
def trigger_daily_matin():
    threading.Thread(target=job_notifs_daily_matin).start()
    return jsonify({"message": "Daily matin déclenché"})

@app.route('/notifications/daily-midi', methods=['POST'])
def trigger_daily_midi():
    threading.Thread(target=job_notifs_daily_midi).start()
    return jsonify({"message": "Daily midi déclenché"})

@app.route('/notifications/daily-soir', methods=['POST'])
def trigger_daily_soir():
    threading.Thread(target=job_notifs_daily_soir).start()
    return jsonify({"message": "Daily soir déclenché"})

@app.route('/email/test/<int:user_id>', methods=['POST'])
def test_email_user(user_id):
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, nom, email, points, niveau FROM users WHERE id=%s", (user_id,))
        u = cursor.fetchone()
        if not u:
            cursor.close(); db.close()
            return jsonify({"erreur": "User introuvable"}), 404
        # Récupère les vraies stats enrichies pour ce user
        extra = _collecter_stats_hebdo(cursor, user_id, u)
        cursor.execute("""
            SELECT
                COUNT(CASE WHEN t.terminee = TRUE AND COALESCE(t.terminee_le, t.updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees,
                COUNT(CASE WHEN t.terminee = TRUE AND COALESCE(t.terminee_le, t.updated_at) >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND COALESCE(t.terminee_le, t.updated_at) < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_prec,
                COUNT(CASE WHEN t.terminee = FALSE THEN 1 END) as en_cours,
                COUNT(CASE WHEN t.terminee = FALSE AND t.deadline < CURDATE() AND t.deadline IS NOT NULL THEN 1 END) as en_retard,
                COUNT(t.id) as total
            FROM taches t WHERE user_id=%s
        """, (user_id,))
        k = cursor.fetchone() or {}
        cursor.close(); db.close()
        from datetime import date, timedelta
        sf = date.today(); sd = sf - timedelta(days=6)
        terminees = k.get('terminees', 0) or 0
        total = k.get('total', 0) or 0
        taux = round((terminees / max(total, 1)) * 100, 0) if terminees else 0
        stats = {
            "terminees": terminees, "terminees_prec": k.get('terminees_prec', 0) or 0,
            "en_cours": k.get('en_cours', 0) or 0, "en_retard": k.get('en_retard', 0) or 0,
            "taux": int(taux), "points": u['points'] or 0, "niveau": u['niveau'] or 1,
            "conseil_ia": "Test : analyse coach IA enrichie qui s'adapte normalement à tes vraies données. Cette semaine tu as bouclé tes priorités hautes — c'est exactement le bon réflexe. Pour la semaine prochaine, essaie de bloquer 2×90 min sur tes deux tâches haute prio en attente. Tu construis quelque chose de solide.",
            "semaine_debut": sd.strftime('%d/%m'), "semaine_fin": sf.strftime('%d/%m/%Y'),
            **extra,
        }
        html = _html_resume_hebdo(u['nom'], stats)
        envoyer_email(u['email'], f"Bilan [TEST] · {sd.strftime('%d/%m')} → {sf.strftime('%d/%m')} — GetShift", html)
        return jsonify({"message": f"Email de test envoyé à {u['email']} !"})
    except Exception as e:
        import traceback
        return erreur_500(e)

# ============================================
# EMAIL BROADCAST (update produit, annonces)
# ============================================

def _html_broadcast(nom, titre, intro, corps_items, cta_label, cta_href):
    """Email d'annonce produit — même charte GRAPHITE & EMBER que les autres emails."""
    t = EMAIL_TOKENS
    items_html = "".join(
        f'<tr><td style="padding:10px 14px;border-bottom:1px solid {t["border"]};">'
        f'<span style="color:{t["ember"]};font-weight:700;margin-right:8px;">—</span>'
        f'<span style="color:{t["text"]};font-size:13.5px;">{item}</span></td></tr>'
        for item in corps_items
    )
    contenu = f"""
<p style="margin:0 0 6px;font-size:22px;font-weight:700;color:{t['text']};letter-spacing:-0.3px;">{titre}</p>
<p style="margin:0 0 24px;font-size:14px;color:{t['text_2']};line-height:1.7;">{intro}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:{t['surface_2']};border-radius:12px;border:1px solid {t['border']};margin-bottom:28px;">
  <tbody>{items_html}</tbody>
</table>
<p style="margin:0 0 24px;font-size:13px;color:{t['text_3']};line-height:1.7;">
  Ces améliorations sont actives immédiatement — aucune action requise de ta part.
  Si tu étais connecté, il se peut que tu doives te reconnecter une fois.
</p>
{_email_cta_btn(cta_label, cta_href)}
"""
    t = EMAIL_TOKENS
    salut = f'<p style="margin:0 0 20px;font-size:14px;color:{t["text_2"]};">Bonjour {nom},</p>'
    return _base_email(salut + contenu, "Améliorations GetShift")

@app.route('/email/broadcast', methods=['POST'])
def broadcast_email():
    """Envoie un email d'annonce à tous les utilisateurs vérifiés.
    Protégé par JOB_SECRET. Supporte un dry_run pour prévisualiser sans envoyer."""
    require_job_secret()
    try:
        data = request.get_json() or {}
        dry_run = data.get('dry_run', False)
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, nom, email FROM users WHERE email_verifie=TRUE ORDER BY id")
        users = cursor.fetchall()
        cursor.close(); db.close()

        titre  = data.get('titre',  "Améliorations GetShift — 30 mai 2026")
        intro  = data.get('intro',  "Nous avons déployé ce matin plusieurs améliorations importantes sur GetShift.")
        items  = data.get('items',  [
            "Sécurité renforcée sur l'ensemble de l'application",
            "Chiffrement des mots de passe mis à jour (plus robuste)",
            "Protection CSRF activée sur toutes les actions",
            "Notifications push mises à jour — réactivez-les dans Paramètres si besoin",
        ])
        cta_label = data.get('cta_label', "Ouvrir GetShift")
        cta_href  = data.get('cta_href',  "https://chamdaane-a11y.github.io/taskflow")
        subject   = data.get('subject',   f"[GetShift] {titre}")

        sent, skipped = 0, 0
        for u in users:
            if dry_run:
                skipped += 1
                continue
            html = _html_broadcast(u['nom'], titre, intro, items, cta_label, cta_href)
            ok = envoyer_email(u['email'], subject, html)
            if ok: sent += 1
            else:  skipped += 1

        return jsonify({
            "dry_run": dry_run,
            "total_users": len(users),
            "sent": sent,
            "skipped": skipped,
            "preview_html": _html_broadcast("Prénom", titre, intro, items, cta_label, cta_href) if dry_run else None,
        })
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

# ============================================
# OAUTH INTEGRATIONS (Calendar, Drive, Zoom, Notion, Discord)
# ============================================

# ============================================
# GOOGLE CALENDAR — OAuth réel + events
# ============================================

# Full read+write : permet de créer/modifier/supprimer des events depuis GetShift.
# Note : Google ajoute auto userinfo.email + userinfo.profile, OAUTHLIB_RELAX_TOKEN_SCOPE=1 gère le mismatch.
GCAL_SCOPES = ['https://www.googleapis.com/auth/calendar']
GCAL_REDIRECT_URI = "https://getshift-backend.onrender.com/auth/google/calendar/callback"

def _gcal_cid():
    return (os.environ.get('GCAL_CLIENT_ID') or os.environ.get('client_id')
            or os.environ.get('GOOGLE_CALENDAR_CLIENT_ID', ''))

def _gcal_csecret():
    return (os.environ.get('GCAL_CLIENT_SECRET') or os.environ.get('client_secret')
            or os.environ.get('GOOGLE_CALENDAR_CLIENT_SECRET', ''))

def _gcal_flow():
    return Flow.from_client_config({
        "web": {
            "client_id": _gcal_cid(),
            "client_secret": _gcal_csecret(),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GCAL_REDIRECT_URI],
        }
    }, scopes=GCAL_SCOPES)

def _fernet():
    key = os.environ.get('INTEGRATIONS_ENCRYPTION_KEY', '')
    if not key:
        raise RuntimeError("INTEGRATIONS_ENCRYPTION_KEY manquant")
    return Fernet(key.encode() if isinstance(key, str) else key)

def get_google_calendar_creds(user_id):
    """Décrypte les tokens, refresh si expiré, retourne Credentials prêts à l'emploi."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT config FROM integrations WHERE user_id=%s AND type='google_calendar'", (user_id,))
        row = curseur.fetchone()
        db.close()
        if not row or not row['config']:
            return None
        tokens = json.loads(_fernet().decrypt(row['config'].encode()).decode())
        creds = Credentials(
            token=tokens.get('access_token'),
            refresh_token=tokens.get('refresh_token'),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=_gcal_cid(),
            client_secret=_gcal_csecret(),
            scopes=GCAL_SCOPES,
        )
        if tokens.get('expires_at') and tokens['expires_at'] < int(time.time()) + 60:
            creds.refresh(GoogleAuthRequest())
            new_tokens = {
                "access_token": creds.token,
                "refresh_token": creds.refresh_token or tokens.get('refresh_token'),
                "expires_at": int(creds.expiry.timestamp()) if creds.expiry else None,
            }
            enc = _fernet().encrypt(json.dumps(new_tokens).encode()).decode()
            db = connecter()
            curseur = db.cursor()
            curseur.execute("UPDATE integrations SET config=%s WHERE user_id=%s AND type='google_calendar'", (enc, user_id))
            db.commit(); db.close()
        return creds
    except Exception:
        return None

@app.route('/auth/google/calendar')
def auth_google_calendar():
    user_id = request.args.get('user_id')
    if not user_id:
        return "user_id requis", 400
    if not _gcal_cid():
        return """<!DOCTYPE html><html><body><script>
window.opener&&window.opener.postMessage({type:'oauth_error',integration:'google_calendar',error:'Google Calendar non configuré côté serveur'},'*');
setTimeout(()=>window.close(),1500);
</script><p style="font-family:sans-serif;text-align:center;padding:40px;color:#e05c5c">Google Calendar non disponible</p></body></html>""", 500
    flow = _gcal_flow()
    flow.redirect_uri = GCAL_REDIRECT_URI
    state_token = secrets.token_urlsafe(32)
    db = connecter()
    curseur = db.cursor()
    curseur.execute("""CREATE TABLE IF NOT EXISTS oauth_states (
        state VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL,
        integration VARCHAR(50) NOT NULL,
        cree_le DATETIME DEFAULT CURRENT_TIMESTAMP)""")
    curseur.execute("DELETE FROM oauth_states WHERE cree_le < DATE_SUB(NOW(), INTERVAL 1 HOUR)")
    curseur.execute("INSERT INTO oauth_states (state, user_id, integration) VALUES (%s, %s, 'google_calendar')", (state_token, user_id))
    db.commit(); db.close()
    auth_url, _ = flow.authorization_url(
        access_type='offline', prompt='consent',
        state=state_token, include_granted_scopes='true'
    )
    return redirect(auth_url)

@app.route('/auth/google/calendar/callback')
def auth_google_calendar_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    if error:
        return f"""<script>
            window.opener && window.opener.postMessage({{type:'oauth_error',integration:'google_calendar',error:'{error}'}},'*');
            window.close();
        </script>"""
    if not code or not state:
        return "Paramètres OAuth manquants", 400
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("SELECT user_id FROM oauth_states WHERE state=%s AND integration='google_calendar'", (state,))
    row = curseur.fetchone()
    if not row:
        db.close()
        return "State invalide ou expiré", 400
    user_id = row['user_id']
    curseur.execute("DELETE FROM oauth_states WHERE state=%s", (state,))
    db.commit()
    try:
        flow = _gcal_flow()
        flow.redirect_uri = GCAL_REDIRECT_URI
        flow.fetch_token(code=code)
        creds = flow.credentials
        tokens = {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expires_at": int(creds.expiry.timestamp()) if creds.expiry else None,
        }
        encrypted = _fernet().encrypt(json.dumps(tokens).encode()).decode()
        curseur.execute("DELETE FROM integrations WHERE user_id=%s AND type='google_calendar'", (user_id,))
        curseur.execute("INSERT INTO integrations (user_id, type, config) VALUES (%s, 'google_calendar', %s)", (user_id, encrypted))
        db.commit(); db.close()
        # Démarrer le watch push notification en arrière-plan (non bloquant)
        threading.Thread(target=_gcal_setup_watch, args=(user_id,), daemon=True).start()
        return """<script>
            window.opener && window.opener.postMessage({type:'oauth_success',integration:'google_calendar'},'*');
            window.close();
        </script>"""
    except Exception as e:
        db.close()
        return f"<pre>Erreur OAuth</pre>", 500

# ─── Helpers Google Calendar : create/update/delete events depuis une tâche ───

def _build_calendar_context(user_id, from_date=None, to_date=None):
    """Retourne une string décrivant les créneaux occupés sur une période.
    Utilisé pour enrichir les prompts IA (planifier, assistant).
    Retourne ("", False) si Calendar non connecté ou erreur.
    Retourne (context_str, True) si des events ont été trouvés.
    """
    if from_date is None:
        from_date = datetime.now().date()
    if to_date is None:
        to_date = from_date + timedelta(days=7)
    service = _gcal_service(user_id)
    if not service:
        return "", False
    try:
        result = service.events().list(
            calendarId='primary',
            timeMin=datetime.combine(from_date, datetime.min.time()).isoformat() + 'Z',
            timeMax=datetime.combine(to_date, datetime.min.time()).isoformat() + 'Z',
            singleEvents=True, orderBy='startTime', maxResults=50,
        ).execute()
        lignes = []
        for ev in result.get('items', []):
            start = ev.get('start', {})
            end   = ev.get('end', {})
            if 'dateTime' not in start:
                continue  # skip all-day events pour le contexte planning
            lignes.append(
                f"{start['dateTime'][:10]} {start['dateTime'][11:16]}–{end.get('dateTime','')[:16][11:]} : {ev.get('summary','Réservé')[:50]}"
            )
        if not lignes:
            return "", True  # connecté mais aucun event timed
        ctx = "\nAGENDA GOOGLE CALENDAR OCCUPÉ (ne pas proposer de créneaux qui chevauchent) :\n" + "\n".join(lignes[:20])
        return ctx, True
    except Exception as e:
        print(f"[GCal context] Erreur user_id={user_id}: {e}")
        return "", False


def _gcal_service(user_id):
    """Construit un service Google Calendar prêt à l'emploi. None si user pas connecté."""
    creds = get_google_calendar_creds(user_id)
    if not creds:
        return None
    try:
        return build('calendar', 'v3', credentials=creds, cache_discovery=False)
    except Exception as e:
        print(f"[GCal] Erreur build service user_id={user_id}: {e}")
        return None


def _task_to_gcal_body(task, mode, start=None, end=None):
    """Construit le body d'un event Google depuis une tâche GetShift.
    mode='deadline' → all-day event sur task['deadline']
    mode='focus' → time block 09:00 + temps_estime (min) sur task['focus_date']
    mode='manual' → time block avec start/end ISO8601 fournis par le frontend
    Retour : dict body ou None si données insuffisantes.
    """
    titre = (task.get('titre') or '(Sans titre)').strip()
    priorite = (task.get('priorite') or '').lower()
    emoji = {'haute': '🔴', 'moyenne': '🟡', 'basse': '🟢'}.get(priorite, '🔵')
    body = {
        'summary': f"{emoji} {titre}",
        'description': f"Tâche GetShift (priorité : {priorite or 'normale'})\nID interne : {task.get('id')}",
        'source': {'title': 'GetShift', 'url': 'https://chamdaane-a11y.github.io/taskflow'},
    }
    if mode == 'deadline':
        deadline = task.get('deadline')
        if not deadline:
            return None
        d_str = deadline.strftime('%Y-%m-%d') if hasattr(deadline, 'strftime') else str(deadline)[:10]
        d_obj = datetime.strptime(d_str, '%Y-%m-%d').date()
        body['start'] = {'date': d_str}
        body['end'] = {'date': (d_obj + timedelta(days=1)).strftime('%Y-%m-%d')}  # end exclusif côté Google
    elif mode == 'focus':
        focus_date = task.get('focus_date')
        if not focus_date:
            return None
        d_str = focus_date.strftime('%Y-%m-%d') if hasattr(focus_date, 'strftime') else str(focus_date)[:10]
        try:
            duree_min = int(task.get('temps_estime') or 60)
        except Exception:
            duree_min = 60
        if duree_min <= 0:
            duree_min = 60
        start_dt = datetime.strptime(d_str, '%Y-%m-%d').replace(hour=9, minute=0)
        end_dt = start_dt + timedelta(minutes=duree_min)
        body['start'] = {'dateTime': start_dt.isoformat(), 'timeZone': 'Europe/Paris'}
        body['end'] = {'dateTime': end_dt.isoformat(), 'timeZone': 'Europe/Paris'}
    elif mode == 'manual':
        if not start or not end:
            return None
        body['start'] = {'dateTime': start, 'timeZone': 'Europe/Paris'}
        body['end'] = {'dateTime': end, 'timeZone': 'Europe/Paris'}
    else:
        return None
    return body


def _gcal_create_event(user_id, task, mode, start=None, end=None):
    """Crée un event Google depuis une tâche. Retour {event_id, html_link} ou None."""
    service = _gcal_service(user_id)
    if not service:
        return None
    body = _task_to_gcal_body(task, mode, start, end)
    if not body:
        return None
    try:
        ev = service.events().insert(calendarId='primary', body=body).execute()
        return {'event_id': ev.get('id'), 'html_link': ev.get('htmlLink')}
    except HttpError as e:
        if getattr(e, 'resp', None) is not None and e.resp.status == 403:
            print(f"[GCal] 403 insufficient permissions user_id={user_id} — user doit reconnecter Calendar avec scope read+write")
        else:
            print(f"[GCal] HttpError create user_id={user_id}: {e}")
        return None
    except Exception as e:
        print(f"[GCal] Exception create user_id={user_id}: {e}")
        return None


def _gcal_update_event(user_id, event_id, task, mode, start=None, end=None):
    """Patch un event existant. 404 → reset google_event_id en DB (event a disparu côté user)."""
    service = _gcal_service(user_id)
    if not service:
        return None
    body = _task_to_gcal_body(task, mode, start, end)
    if not body:
        return None
    try:
        ev = service.events().patch(calendarId='primary', eventId=event_id, body=body).execute()
        return {'event_id': ev.get('id'), 'html_link': ev.get('htmlLink')}
    except HttpError as e:
        status = getattr(e.resp, 'status', None) if getattr(e, 'resp', None) is not None else None
        if status in (404, 410):
            print(f"[GCal] event {event_id} introuvable côté Google — reset en DB")
            try:
                db = connecter()
                c = db.cursor()
                c.execute("UPDATE taches SET google_event_id=NULL, gcal_sync_mode=NULL WHERE google_event_id=%s AND user_id=%s", (event_id, user_id))
                db.commit(); db.close()
            except Exception:
                pass
            return None
        print(f"[GCal] HttpError update user_id={user_id}: {e}")
        return None
    except Exception as e:
        print(f"[GCal] Exception update user_id={user_id}: {e}")
        return None


def _gcal_delete_event(user_id, event_id):
    """Supprime un event Google. 404/410 = déjà parti = considéré OK."""
    service = _gcal_service(user_id)
    if not service:
        return False
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        return True
    except HttpError as e:
        status = getattr(e.resp, 'status', None) if getattr(e, 'resp', None) is not None else None
        if status in (404, 410):
            return True
        print(f"[GCal] HttpError delete user_id={user_id} event={event_id}: {e}")
        return False
    except Exception as e:
        print(f"[GCal] Exception delete user_id={user_id} event={event_id}: {e}")
        return False


def _autosync_calendar_hook(user_id, task_id, action, extra=None):
    """Lance en thread daemon une synchro Google Calendar pour une tâche.
    Actions :
      'create_from_deadline'   → re-fetch task, créer event all-day si deadline + pas déjà sync
      'create_or_update_focus' → focus_date posé → créer event time block ou upgrader existant
      'remove_focus'           → focus retiré → downgrader event vers 'deadline' si possible, sinon delete
      'delete_event_if_synced' → toggle complete : delete event si google_event_id présent
      'delete_event'           → cas suppression de tâche : event_id passé dans extra={'event_id': '...'}
                                 (la task peut déjà être supprimée en DB au moment où le thread tourne)

    Pré-check global : skip si user.autosync_calendar=0 ou intégration google_calendar absente.
    Exceptions silencieusement loggées : un échec sync ne doit jamais casser l'opération CRUD principale.
    """
    extra = extra or {}

    def _job():
        try:
            print(f"[GCal autosync] START action={action} task_id={task_id} user_id={user_id}", flush=True)
            # Cas dégénéré : delete_event passe directement event_id (task peut être supprimée)
            if action == 'delete_event':
                event_id = extra.get('event_id')
                if event_id:
                    ok = _gcal_delete_event(user_id, event_id)
                    print(f"[GCal autosync] delete_event event={event_id} → {ok}", flush=True)
                return

            db = connecter()
            c = db.cursor(dictionary=True)
            c.execute("""
                SELECT u.autosync_calendar,
                       (SELECT config FROM integrations WHERE user_id=u.id AND type='google_calendar' LIMIT 1) AS gcal_config
                FROM users u WHERE u.id=%s
            """, (user_id,))
            row = c.fetchone()
            if not row or not row.get('autosync_calendar') or not row.get('gcal_config'):
                print(f"[GCal autosync] SKIP user_id={user_id} : autosync={row.get('autosync_calendar') if row else None} integ_present={bool(row and row.get('gcal_config'))}", flush=True)
                db.close()
                return

            c.execute("SELECT * FROM taches WHERE id=%s", (task_id,))
            task = c.fetchone()
            if not task:
                db.close()
                return
            existing_event_id = task.get('google_event_id')
            existing_mode = task.get('gcal_sync_mode')

            if action == 'create_from_deadline':
                if task.get('deadline') and not existing_event_id:
                    result = _gcal_create_event(user_id, task, 'deadline')
                    print(f"[GCal autosync] create_from_deadline task_id={task_id} → {result}", flush=True)
                    if result:
                        c.execute("UPDATE taches SET google_event_id=%s, gcal_sync_mode=%s WHERE id=%s",
                                  (result['event_id'], 'deadline', task_id))
                        db.commit()
                else:
                    print(f"[GCal autosync] create_from_deadline SKIP : deadline={task.get('deadline')} existing_id={existing_event_id}", flush=True)

            elif action == 'create_or_update_focus':
                if task.get('focus_date'):
                    if existing_event_id:
                        result = _gcal_update_event(user_id, existing_event_id, task, 'focus')
                    else:
                        result = _gcal_create_event(user_id, task, 'focus')
                    if result:
                        c.execute("UPDATE taches SET google_event_id=%s, gcal_sync_mode=%s WHERE id=%s",
                                  (result['event_id'], 'focus', task_id))
                        db.commit()

            elif action == 'remove_focus':
                if existing_event_id and existing_mode == 'focus':
                    if task.get('deadline'):
                        result = _gcal_update_event(user_id, existing_event_id, task, 'deadline')
                        if result:
                            c.execute("UPDATE taches SET gcal_sync_mode=%s WHERE id=%s", ('deadline', task_id))
                            db.commit()
                    else:
                        _gcal_delete_event(user_id, existing_event_id)
                        c.execute("UPDATE taches SET google_event_id=NULL, gcal_sync_mode=NULL WHERE id=%s", (task_id,))
                        db.commit()

            elif action == 'delete_event_if_synced':
                if existing_event_id:
                    _gcal_delete_event(user_id, existing_event_id)
                    c.execute("UPDATE taches SET google_event_id=NULL, gcal_sync_mode=NULL WHERE id=%s", (task_id,))
                    db.commit()

            db.close()
        except Exception as e:
            print(f"[GCal autosync] {action} task_id={task_id} user_id={user_id}: {e}")

    threading.Thread(target=_job, daemon=True).start()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.route('/integrations/google-calendar/events/<int:user_id>', methods=['GET'])
def get_calendar_events(user_id):
    """Récupère les events Google Calendar.
    Usage :
      ?date=YYYY-MM-DD              → events du jour (rétrocompat TomorrowBuilder)
      ?from=YYYY-MM-DD&to=YYYY-MM-DD → events sur range (inclusif sur les 2 bornes)
    """
    from_str = request.args.get('from')
    to_str = request.args.get('to')
    date_str = request.args.get('date')

    creds = get_google_calendar_creds(user_id)
    if not creds:
        return jsonify({"events": [], "connected": False})

    try:
        if from_str and to_str:
            time_min = datetime.strptime(from_str, '%Y-%m-%d').isoformat() + 'Z'
            time_max = (datetime.strptime(to_str, '%Y-%m-%d') + timedelta(days=1)).isoformat() + 'Z'
            range_info = {'from': from_str, 'to': to_str}
            max_results = 100
        else:
            if not date_str:
                date_str = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
            date_dt = datetime.strptime(date_str, '%Y-%m-%d')
            time_min = date_dt.isoformat() + 'Z'
            time_max = (date_dt + timedelta(days=1)).isoformat() + 'Z'
            range_info = {'date': date_str}
            max_results = 25

        service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
        result = service.events().list(
            calendarId='primary', timeMin=time_min, timeMax=time_max,
            singleEvents=True, orderBy='startTime', maxResults=max_results
        ).execute()
        events = []
        for ev in result.get('items', []):
            start = ev.get('start', {})
            end = ev.get('end', {})
            start_dt = start.get('dateTime') or start.get('date')
            end_dt = end.get('dateTime') or end.get('date')
            if not start_dt:
                continue
            all_day = 'dateTime' not in start
            events.append({
                'event_id': ev.get('id'),
                'titre': ev.get('summary', '(Sans titre)'),
                'start': start_dt,
                'end': end_dt,
                'heure_debut': start_dt[11:16] if not all_day else '00:00',
                'heure_fin': end_dt[11:16] if not all_day else '23:59',
                'all_day': all_day,
                'location': ev.get('location', ''),
                'html_link': ev.get('htmlLink', ''),
            })
        return jsonify({"events": events, "connected": True, **range_info})
    except Exception as e:
        return jsonify({"events": [], "connected": False, "erreur": "indisponible"}), 200


@app.route('/integrations/google-calendar/sync-task/<int:task_id>', methods=['POST'])
def gcal_sync_task(task_id):
    """Sync manuelle d'une tâche vers Google Calendar.
    Body : {mode: 'deadline'|'focus'|'manual', start?: ISO8601, end?: ISO8601}
    """
    body = request.get_json(silent=True) or {}
    mode = body.get('mode')
    if mode not in ('deadline', 'focus', 'manual'):
        return jsonify({'error': "mode requis : 'deadline' | 'focus' | 'manual'"}), 400
    start = body.get('start')
    end = body.get('end')
    if mode == 'manual' and (not start or not end):
        return jsonify({'error': "start et end (ISO8601) requis pour mode manual"}), 400

    db = connecter()
    c = db.cursor(dictionary=True)
    c.execute("SELECT * FROM taches WHERE id=%s", (task_id,))
    task = c.fetchone()
    if not task:
        db.close()
        return jsonify({'error': 'Tâche introuvable'}), 404
    user_id = task['user_id']
    existing_event_id = task.get('google_event_id')

    if existing_event_id:
        result = _gcal_update_event(user_id, existing_event_id, task, mode, start, end)
    else:
        result = _gcal_create_event(user_id, task, mode, start, end)

    if not result:
        db.close()
        return jsonify({
            'error': 'Échec sync Google Calendar',
            'hint': "Vérifier que Google Calendar est connecté avec les permissions read+write (reconnecter depuis /integrations)"
        }), 502

    c.execute("UPDATE taches SET google_event_id=%s, gcal_sync_mode=%s WHERE id=%s",
              (result['event_id'], mode, task_id))
    db.commit(); db.close()
    return jsonify({
        'success': True,
        'event_id': result['event_id'],
        'html_link': result['html_link'],
        'sync_mode': mode,
    })


@app.route('/integrations/google-calendar/sync-task/<int:task_id>', methods=['DELETE'])
def gcal_unsync_task(task_id):
    """Retire le sync Google Calendar d'une tâche (supprime l'event Google + nettoie la DB)."""
    db = connecter()
    c = db.cursor(dictionary=True)
    c.execute("SELECT user_id, google_event_id FROM taches WHERE id=%s", (task_id,))
    task = c.fetchone()
    if not task:
        db.close()
        return jsonify({'error': 'Tâche introuvable'}), 404
    event_id = task.get('google_event_id')
    if not event_id:
        db.close()
        return jsonify({'success': True, 'note': 'Tâche déjà non synchronisée'})

    ok = _gcal_delete_event(task['user_id'], event_id)
    c.execute("UPDATE taches SET google_event_id=NULL, gcal_sync_mode=NULL WHERE id=%s", (task_id,))
    db.commit(); db.close()
    return jsonify({'success': ok})

GCAL_WEBHOOK_URL = 'https://getshift-backend.onrender.com/integrations/google-calendar/webhook'


def _do_gcal_import(user_id):
    """Import standalone (hors-request) : crée les tâches manquantes depuis les events GCal.
    Appelé par le webhook push et par l'endpoint HTTP.
    Retourne {created, skipped}.
    """
    import uuid as _uuid_mod
    service = _gcal_service(user_id)
    if not service:
        return {'created': 0, 'skipped': 0}
    today = datetime.now().date()
    to_dt = today + timedelta(days=30)
    try:
        result = service.events().list(
            calendarId='primary',
            timeMin=datetime.combine(today, datetime.min.time()).isoformat() + 'Z',
            timeMax=datetime.combine(to_dt, datetime.min.time()).isoformat() + 'Z',
            singleEvents=True, orderBy='startTime', maxResults=100,
        ).execute()
        events = result.get('items', [])
    except Exception as e:
        print(f"[GCal Import] Erreur fetch user_id={user_id}: {e}")
        return {'created': 0, 'skipped': 0}
    db = connecter()
    c = db.cursor(dictionary=True)
    # Dédup anti sync-loop : un event peut être déjà connu de 2 façons.
    # - gcal_imported_event_id : on l'a importé depuis GCal précédemment
    # - google_event_id        : on l'a POUSSÉ vers GCal (sync inverse) → le webhook re-fire
    # Sans le 2e cas, on re-crée une tâche en doublon à chaque sync inverse.
    c.execute("""
        SELECT gcal_imported_event_id AS eid FROM taches
         WHERE user_id=%s AND gcal_imported_event_id IS NOT NULL
        UNION
        SELECT google_event_id AS eid FROM taches
         WHERE user_id=%s AND google_event_id IS NOT NULL
    """, (user_id, user_id))
    already = {row['eid'] for row in c.fetchall()}
    created = 0
    skipped = 0
    for ev in events:
        event_id = ev.get('id')
        titre = (ev.get('summary') or '').strip()
        if not event_id or not titre:
            continue
        if event_id in already:
            skipped += 1
            continue
        start = ev.get('start', {})
        start_dt = start.get('dateTime') or start.get('date')
        if not start_dt:
            continue
        deadline = start_dt[:10]
        all_day = 'dateTime' not in start
        heure_debut = start_dt[11:16] if not all_day and len(start_dt) >= 16 else None
        source_url = ev.get('htmlLink') or None
        c.execute(
            "INSERT INTO taches (titre, priorite, deadline, user_id, gcal_imported_event_id, heure_debut, source_url) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (titre[:200], 'moyenne', deadline, user_id, event_id, heure_debut, source_url),
        )
        created += 1
        already.add(event_id)
    if created > 0:
        db.commit()
        print(f"[GCal Import] {created} tâche(s) créée(s) pour user_id={user_id}", flush=True)
    db.close()
    return {'created': created, 'skipped': skipped}


def _gcal_setup_watch(user_id):
    """Crée (ou renouvelle) un watch channel Google Calendar push pour l'user.
    Stocke channel_id + resource_id + expiration dans gcal_watch_channels.
    Retourne True si succès, False sinon (domaine non vérifié ou erreur).
    """
    import uuid as _uuid_mod
    service = _gcal_service(user_id)
    if not service:
        return False
    channel_id = str(_uuid_mod.uuid4())
    # On demande ~7j (max autorisé par Google)
    expiration_ms = int((datetime.now() + timedelta(days=6, hours=23)).timestamp() * 1000)
    db = connecter()
    c = db.cursor(dictionary=True)
    # Arrêter l'ancien canal s'il existe
    c.execute("SELECT channel_id, resource_id FROM gcal_watch_channels WHERE user_id=%s", (user_id,))
    old = c.fetchone()
    if old:
        try:
            service.channels().stop(body={'id': old['channel_id'], 'resourceId': old['resource_id']}).execute()
        except Exception:
            pass
        c.execute("DELETE FROM gcal_watch_channels WHERE user_id=%s", (user_id,))
        db.commit()
    try:
        resp = service.events().watch(
            calendarId='primary',
            body={
                'id': channel_id,
                'type': 'web_hook',
                'address': GCAL_WEBHOOK_URL,
                'expiration': str(expiration_ms),
            }
        ).execute()
        resource_id       = resp.get('resourceId')
        actual_expiration = int(resp.get('expiration', expiration_ms))
        c.execute(
            "INSERT INTO gcal_watch_channels (user_id, channel_id, resource_id, expiration) VALUES (%s, %s, %s, %s)",
            (user_id, channel_id, resource_id, actual_expiration),
        )
        db.commit()
        print(f"[GCal Watch] Canal créé user_id={user_id} exp={actual_expiration}", flush=True)
        db.close()
        return True
    except Exception as e:
        print(f"[GCal Watch] Erreur setup user_id={user_id}: {e}", flush=True)
        db.close()
        return False


@app.route('/integrations/google-calendar/webhook', methods=['POST'])
def gcal_webhook():
    """Réceptionne les push notifications Google Calendar.
    Google appelle cette URL dès qu'un event est créé/modifié/supprimé.
    """
    channel_id     = request.headers.get('X-Goog-Channel-ID', '')
    resource_state = request.headers.get('X-Goog-Resource-State', '')

    if resource_state == 'sync':
        return '', 200  # message d'init, on confirme

    if resource_state not in ('exists', 'not_exists') or not channel_id:
        return '', 200

    db = connecter()
    c = db.cursor(dictionary=True)
    c.execute("SELECT user_id, resource_id, expiration FROM gcal_watch_channels WHERE channel_id=%s", (channel_id,))
    row = c.fetchone()
    db.close()

    if not row:
        return '', 200

    user_id    = row['user_id']
    expiration = row.get('expiration') or 0

    print(f"[GCal Webhook] Notification user_id={user_id} state={resource_state}", flush=True)

    # Import async (ne bloque pas la réponse — Google attend 200 rapidement)
    threading.Thread(target=_do_gcal_import, args=(user_id,), daemon=True).start()

    # Renouveler le canal si < 24h avant expiration
    now_ms = int(datetime.now().timestamp() * 1000)
    if expiration and expiration - now_ms < 24 * 3600 * 1000:
        threading.Thread(target=_gcal_setup_watch, args=(user_id,), daemon=True).start()

    return '', 200


@app.route('/integrations/google-calendar/import-events/<int:user_id>', methods=['POST'])
def gcal_import_events(user_id):
    """Importe les events Google Calendar à venir (30j) comme tâches GetShift.
    Idempotent — ne recrée pas une tâche déjà importée (check gcal_imported_event_id).
    Retourne {created, skipped, tasks: [{titre, deadline}]}
    """
    service = _gcal_service(user_id)
    if not service:
        return jsonify({'error': 'Google Calendar non connecté'}), 400

    today = datetime.now().date()
    to_dt  = today + timedelta(days=30)
    try:
        result = service.events().list(
            calendarId='primary',
            timeMin=datetime.combine(today, datetime.min.time()).isoformat() + 'Z',
            timeMax=datetime.combine(to_dt, datetime.min.time()).isoformat() + 'Z',
            singleEvents=True, orderBy='startTime', maxResults=100,
        ).execute()
        events = result.get('items', [])
    except Exception as e:
        return erreur_500(e)

    db = connecter()
    c  = db.cursor(dictionary=True)

    # Charger les event_ids déjà connus (import ou sync inverse) pour éviter le sync-loop.
    # Si on ne check pas google_event_id, une tâche poussée vers GCal est re-importée comme doublon.
    c.execute("""
        SELECT gcal_imported_event_id AS eid FROM taches
         WHERE user_id=%s AND gcal_imported_event_id IS NOT NULL
        UNION
        SELECT google_event_id AS eid FROM taches
         WHERE user_id=%s AND google_event_id IS NOT NULL
    """, (user_id, user_id))
    already = {row['eid'] for row in c.fetchall()}

    created_tasks = []
    skipped = 0

    for ev in events:
        event_id = ev.get('id')
        titre = (ev.get('summary') or '').strip()
        if not event_id or not titre:
            continue
        if event_id in already:
            skipped += 1
            continue

        start = ev.get('start', {})
        start_dt = start.get('dateTime') or start.get('date')
        if not start_dt:
            continue
        deadline = start_dt[:10]

        c.execute(
            "INSERT INTO taches (titre, priorite, deadline, user_id, gcal_imported_event_id) VALUES (%s, %s, %s, %s, %s)",
            (titre[:200], 'moyenne', deadline, user_id, event_id),
        )
        created_tasks.append({'titre': titre, 'deadline': deadline})
        already.add(event_id)

    if created_tasks:
        db.commit()

    # Setup watch push notification si pas encore actif (pour les users déjà connectés)
    db2 = connecter()
    c2  = db2.cursor(dictionary=True)
    now_ms = int(datetime.now().timestamp() * 1000)
    c2.execute(
        "SELECT id FROM gcal_watch_channels WHERE user_id=%s AND expiration > %s LIMIT 1",
        (user_id, now_ms)
    )
    has_watch = c2.fetchone()
    db2.close()
    if not has_watch:
        threading.Thread(target=_gcal_setup_watch, args=(user_id,), daemon=True).start()

    db.close()
    return jsonify({'created': len(created_tasks), 'skipped': skipped, 'tasks': created_tasks})


# ============================================
# GMAIL — OAuth réel + extraction tâches IA
# ============================================

GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
GMAIL_REDIRECT_URI = "https://getshift-backend.onrender.com/auth/gmail/callback"

def _gmail_flow():
    return Flow.from_client_config({
        "web": {
            "client_id": _gcal_cid(),
            "client_secret": _gcal_csecret(),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GMAIL_REDIRECT_URI],
        }
    }, scopes=GMAIL_SCOPES)

def get_gmail_creds(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT config FROM integrations WHERE user_id=%s AND type='gmail'", (user_id,))
        row = curseur.fetchone()
        db.close()
        if not row or not row['config']:
            return None
        tokens = json.loads(_fernet().decrypt(row['config'].encode()).decode())
        creds = Credentials(
            token=tokens.get('access_token'),
            refresh_token=tokens.get('refresh_token'),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=_gcal_cid(),
            client_secret=_gcal_csecret(),
            scopes=GMAIL_SCOPES,
        )
        if tokens.get('expires_at') and tokens['expires_at'] < int(time.time()) + 60:
            creds.refresh(GoogleAuthRequest())
            new_tokens = {
                "access_token": creds.token,
                "refresh_token": creds.refresh_token or tokens.get('refresh_token'),
                "expires_at": int(creds.expiry.timestamp()) if creds.expiry else None,
            }
            enc = _fernet().encrypt(json.dumps(new_tokens).encode()).decode()
            db = connecter()
            curseur = db.cursor()
            curseur.execute("UPDATE integrations SET config=%s WHERE user_id=%s AND type='gmail'", (enc, user_id))
            db.commit(); db.close()
        return creds
    except Exception:
        return None

@app.route('/auth/gmail')
def auth_gmail():
    user_id = request.args.get('user_id')
    if not user_id:
        return "user_id requis", 400
    if not _gcal_cid():
        return """<!DOCTYPE html><html><body><script>
window.opener&&window.opener.postMessage({type:'oauth_error',integration:'gmail',error:'Gmail non configuré côté serveur'},'*');
setTimeout(()=>window.close(),1500);
</script><p style="font-family:sans-serif;text-align:center;padding:40px;color:#e05c5c">Gmail non disponible</p></body></html>""", 500
    flow = _gmail_flow()
    flow.redirect_uri = GMAIL_REDIRECT_URI
    state_token = secrets.token_urlsafe(32)
    db = connecter()
    curseur = db.cursor()
    curseur.execute("""CREATE TABLE IF NOT EXISTS oauth_states (
        state VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL,
        integration VARCHAR(50) NOT NULL,
        cree_le DATETIME DEFAULT CURRENT_TIMESTAMP)""")
    curseur.execute("DELETE FROM oauth_states WHERE cree_le < DATE_SUB(NOW(), INTERVAL 1 HOUR)")
    curseur.execute("INSERT INTO oauth_states (state, user_id, integration) VALUES (%s, %s, 'gmail')", (state_token, user_id))
    db.commit(); db.close()
    auth_url, _ = flow.authorization_url(
        access_type='offline', prompt='consent',
        state=state_token, include_granted_scopes='true'
    )
    return redirect(auth_url)

@app.route('/auth/gmail/callback')
def auth_gmail_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    if error:
        return f"""<script>
            window.opener && window.opener.postMessage({{type:'oauth_error',integration:'gmail',error:'{error}'}},'*');
            window.close();
        </script>"""
    if not code or not state:
        return "Paramètres OAuth manquants", 400
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("SELECT user_id FROM oauth_states WHERE state=%s AND integration='gmail'", (state,))
    row = curseur.fetchone()
    if not row:
        db.close()
        return "State invalide ou expiré", 400
    user_id = row['user_id']
    curseur.execute("DELETE FROM oauth_states WHERE state=%s", (state,))
    db.commit()
    try:
        flow = _gmail_flow()
        flow.redirect_uri = GMAIL_REDIRECT_URI
        flow.fetch_token(code=code)
        creds = flow.credentials
        tokens = {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expires_at": int(creds.expiry.timestamp()) if creds.expiry else None,
        }
        encrypted = _fernet().encrypt(json.dumps(tokens).encode()).decode()
        curseur.execute("CREATE TABLE IF NOT EXISTS integrations (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(50) NOT NULL, config LONGTEXT, cree_le DATETIME DEFAULT CURRENT_TIMESTAMP)")
        curseur.execute("DELETE FROM integrations WHERE user_id=%s AND type='gmail'", (user_id,))
        curseur.execute("INSERT INTO integrations (user_id, type, config) VALUES (%s, 'gmail', %s)", (user_id, encrypted))
        db.commit()
    except Exception as e:
        db.close()
        return f"<script>window.opener && window.opener.postMessage({{type:'oauth_error',integration:'gmail',error:'erreur'}},'*'); window.close();</script>"
    db.close()
    return """<script>
        window.opener && window.opener.postMessage({type:'oauth_success',integration:'gmail'},'*');
        window.close();
    </script>"""

def _gmail_decode_body(payload):
    if not payload:
        return ""
    body_data = ""
    if payload.get('body', {}).get('data'):
        body_data = payload['body']['data']
    elif payload.get('parts'):
        for part in payload['parts']:
            if part.get('mimeType') == 'text/plain' and part.get('body', {}).get('data'):
                body_data = part['body']['data']
                break
        if not body_data:
            for part in payload['parts']:
                sub = _gmail_decode_body(part)
                if sub:
                    return sub
    if body_data:
        try:
            return base64.urlsafe_b64decode(body_data + '==').decode('utf-8', errors='ignore')[:2000]
        except Exception:
            return ""
    return ""

@app.route('/integrations/gmail/extract-tasks/<int:user_id>', methods=['GET'])
def gmail_extract_tasks(user_id):
    creds = get_gmail_creds(user_id)
    if not creds:
        return jsonify({"taches": [], "connected": False, "nb_emails": 0})
    try:
        # 1) Emails déjà transformés en tâche (dédup robuste) — on les exclura de l'extraction.
        db_ctx = connecter()
        cur_ctx = db_ctx.cursor(dictionary=True)
        cur_ctx.execute("SELECT gmail_message_id FROM gmail_imported WHERE user_id=%s", (user_id,))
        imported_ids = {r['gmail_message_id'] for r in cur_ctx.fetchall()}
        # 2) Tâches existantes non-terminées (contexte sémantique pour l'IA → évite les doublons métier).
        cur_ctx.execute(
            "SELECT titre FROM taches WHERE user_id=%s AND terminee=FALSE ORDER BY created_at DESC LIMIT 30",
            (user_id,)
        )
        existing_titles = [r['titre'] for r in cur_ctx.fetchall()]
        db_ctx.close()

        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
        # Fenêtre élargie à 7j — la dédup gmail_imported empêche les re-suggestions.
        result = service.users().messages().list(
            userId='me', q='is:unread newer_than:7d -category:promotions -category:social',
            maxResults=30
        ).execute()
        raw_ids = [m['id'] for m in result.get('messages', [])]
        # Filtre : on retire les emails déjà importés.
        msg_ids = [mid for mid in raw_ids if mid not in imported_ids]
        if not msg_ids:
            return jsonify({"taches": [], "connected": True, "nb_emails": 0})
        emails_text = []
        msg_ids_used = []
        for mid in msg_ids[:10]:
            msg = service.users().messages().get(userId='me', id=mid, format='full').execute()
            headers = {h['name']: h['value'] for h in msg.get('payload', {}).get('headers', [])}
            sujet = headers.get('Subject', '(Sans sujet)')[:100]
            expediteur = headers.get('From', '')[:80]
            body = _gmail_decode_body(msg.get('payload', {}))[:400]
            emails_text.append(f"De: {expediteur}\nSujet: {sujet}\nContenu: {body}")
            msg_ids_used.append(mid)
        emails_block = "\n---\n".join(f"[EMAIL_{i}]\n{txt}" for i, txt in enumerate(emails_text))
        existing_block = (
            "\n".join(f"- {t}" for t in existing_titles) if existing_titles
            else "(aucune tâche en cours)"
        )
        prompt = f"""Analyse ces {len(emails_text)} emails et extrais les VRAIES action items (choses concrètes à faire). Ignore newsletters, notifications auto, accusés de réception, marketing, publicités.

TÂCHES DÉJÀ EXISTANTES (à NE PAS reproposer même reformulées) :
{existing_block}

EMAILS:
{emails_block}

Réponds UNIQUEMENT en JSON: {{"taches": [{{"titre": "action concrète courte", "priorite": "haute|moyenne|basse", "duree_min": 15, "contexte_email": "expéditeur — sujet", "email_index": 0}}]}}

Règles:
- Maximum 5 tâches (les plus importantes)
- titre = action verbale ("Répondre à X", "Préparer doc Y", "Confirmer rdv Z")
- priorité haute = deadline proche ou personne importante
- duree_min réaliste en minutes (5/15/30/60)
- email_index = numéro de l'email source (0, 1, 2...) entre les balises [EMAIL_N]
- IMPORTANT : si une action est déjà couverte par une tâche existante ci-dessus (même reformulée différemment), NE LA PROPOSE PAS
- Si aucune vraie tâche nouvelle, retourne {{"taches": []}}"""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500, temperature=0.3
        )
        contenu = response.choices[0].message.content.strip()
        if '```json' in contenu: contenu = contenu.split('```json')[1].split('```')[0].strip()
        elif '```' in contenu: contenu = contenu.split('```')[1].split('```')[0].strip()
        data = json.loads(contenu)
        taches = data.get('taches', [])
        for t in taches:
            idx = t.pop('email_index', None)
            if idx is not None and 0 <= idx < len(msg_ids_used):
                t['gmail_message_id'] = msg_ids_used[idx]
        return jsonify({"taches": taches, "connected": True, "nb_emails": len(emails_text)})
    except Exception as e:
        return jsonify({"taches": [], "connected": False, "erreur": "indisponible"}), 200

@app.route('/integrations/gmail/status/<int:user_id>', methods=['GET'])
def gmail_status(user_id):
    creds = get_gmail_creds(user_id)
    return jsonify({"connected": creds is not None})

# ============================================
# GOOGLE DRIVE — OAuth réel + contexte docs récents
# ============================================

DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly']
DRIVE_REDIRECT_URI = "https://getshift-backend.onrender.com/auth/google/drive/callback"

def _drive_flow():
    return Flow.from_client_config({
        "web": {
            "client_id": _gcal_cid(),
            "client_secret": _gcal_csecret(),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [DRIVE_REDIRECT_URI],
        }
    }, scopes=DRIVE_SCOPES)

def get_drive_creds(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT config FROM integrations WHERE user_id=%s AND type='google_drive'", (user_id,))
        row = curseur.fetchone()
        db.close()
        if not row or not row['config']:
            return None
        tokens = json.loads(_fernet().decrypt(row['config'].encode()).decode())
        creds = Credentials(
            token=tokens.get('access_token'),
            refresh_token=tokens.get('refresh_token'),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=_gcal_cid(),
            client_secret=_gcal_csecret(),
            scopes=DRIVE_SCOPES,
        )
        if tokens.get('expires_at') and tokens['expires_at'] < int(time.time()) + 60:
            creds.refresh(GoogleAuthRequest())
            new_tokens = {
                "access_token": creds.token,
                "refresh_token": creds.refresh_token or tokens.get('refresh_token'),
                "expires_at": int(creds.expiry.timestamp()) if creds.expiry else None,
            }
            enc = _fernet().encrypt(json.dumps(new_tokens).encode()).decode()
            db = connecter()
            curseur = db.cursor()
            curseur.execute("UPDATE integrations SET config=%s WHERE user_id=%s AND type='google_drive'", (enc, user_id))
            db.commit(); db.close()
        return creds
    except Exception:
        return None

@app.route('/auth/google/drive')
def auth_google_drive():
    user_id = request.args.get('user_id')
    if not user_id:
        return "user_id requis", 400
    if not _gcal_cid():
        return """<!DOCTYPE html><html><body><script>
window.opener&&window.opener.postMessage({type:'oauth_error',integration:'google_drive',error:'Drive non configuré côté serveur'},'*');
setTimeout(()=>window.close(),1500);
</script><p style="font-family:sans-serif;text-align:center;padding:40px;color:#e05c5c">Drive non disponible</p></body></html>""", 500
    flow = _drive_flow()
    flow.redirect_uri = DRIVE_REDIRECT_URI
    state_token = secrets.token_urlsafe(32)
    db = connecter()
    curseur = db.cursor()
    curseur.execute("""CREATE TABLE IF NOT EXISTS oauth_states (
        state VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL,
        integration VARCHAR(50) NOT NULL,
        cree_le DATETIME DEFAULT CURRENT_TIMESTAMP)""")
    curseur.execute("DELETE FROM oauth_states WHERE cree_le < DATE_SUB(NOW(), INTERVAL 1 HOUR)")
    curseur.execute("INSERT INTO oauth_states (state, user_id, integration) VALUES (%s, %s, 'google_drive')", (state_token, user_id))
    db.commit(); db.close()
    auth_url, _ = flow.authorization_url(
        access_type='offline', prompt='consent',
        state=state_token, include_granted_scopes='true'
    )
    return redirect(auth_url)

@app.route('/auth/google/drive/callback')
def auth_google_drive_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    if error:
        return f"""<script>window.opener&&window.opener.postMessage({{type:'oauth_error',integration:'google_drive',error:'{error}'}},'*');window.close();</script>"""
    if not code or not state:
        return "Paramètres OAuth manquants", 400
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("SELECT user_id FROM oauth_states WHERE state=%s AND integration='google_drive'", (state,))
    row = curseur.fetchone()
    if not row:
        db.close()
        return "State invalide ou expiré", 400
    user_id = row['user_id']
    curseur.execute("DELETE FROM oauth_states WHERE state=%s", (state,))
    db.commit()
    try:
        flow = _drive_flow()
        flow.redirect_uri = DRIVE_REDIRECT_URI
        flow.fetch_token(code=code)
        creds = flow.credentials
        tokens = {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expires_at": int(creds.expiry.timestamp()) if creds.expiry else None,
        }
        encrypted = _fernet().encrypt(json.dumps(tokens).encode()).decode()
        curseur.execute("CREATE TABLE IF NOT EXISTS integrations (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(50) NOT NULL, config LONGTEXT, cree_le DATETIME DEFAULT CURRENT_TIMESTAMP)")
        curseur.execute("DELETE FROM integrations WHERE user_id=%s AND type='google_drive'", (user_id,))
        curseur.execute("INSERT INTO integrations (user_id, type, config) VALUES (%s, 'google_drive', %s)", (user_id, encrypted))
        db.commit()
    except Exception as e:
        db.close()
        return f"<script>window.opener&&window.opener.postMessage({{type:'oauth_error',integration:'google_drive',error:'erreur'}},'*');window.close();</script>"
    db.close()
    return """<script>
        window.opener && window.opener.postMessage({type:'oauth_success',integration:'google_drive'},'*');
        window.close();
    </script>"""

@app.route('/integrations/google-drive/recent/<int:user_id>', methods=['GET'])
def drive_recent_docs(user_id):
    creds = get_drive_creds(user_id)
    if not creds:
        return jsonify({"docs": [], "connected": False})
    try:
        service = build('drive', 'v3', credentials=creds, cache_discovery=False)
        result = service.files().list(
            q="trashed=false and mimeType != 'application/vnd.google-apps.folder'",
            orderBy="modifiedTime desc",
            pageSize=10,
            fields="files(id,name,mimeType,modifiedTime,webViewLink,iconLink)"
        ).execute()
        docs = []
        for f in result.get('files', []):
            mime = f.get('mimeType', '')
            type_label = 'doc'
            if 'spreadsheet' in mime: type_label = 'sheet'
            elif 'presentation' in mime: type_label = 'slide'
            elif 'document' in mime: type_label = 'doc'
            elif 'pdf' in mime: type_label = 'pdf'
            elif 'image' in mime: type_label = 'image'
            docs.append({
                'id': f.get('id'),
                'titre': f.get('name', 'Sans nom')[:80],
                'type': type_label,
                'modifie_le': f.get('modifiedTime', '')[:10],
                'lien': f.get('webViewLink', ''),
            })
        return jsonify({"docs": docs, "connected": True})
    except Exception as e:
        return jsonify({"docs": [], "connected": False, "erreur": "indisponible"}), 200

@app.route('/integrations/google-drive/to-task', methods=['POST'])
def drive_to_task():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        file_name = (data.get('file_name') or 'Fichier Drive')[:200]
        file_link = data.get('file_link', '')
        if not user_id:
            return jsonify({"erreur": "user_id requis"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        if file_link:
            curseur.execute("SELECT id FROM taches WHERE user_id=%s AND source_url=%s LIMIT 1", (user_id, file_link))
            if curseur.fetchone():
                db.close()
                return jsonify({"message": "Tâche déjà existante", "already_exists": True})
        curseur2 = db.cursor()
        curseur2.execute(
            "INSERT INTO taches (titre, priorite, user_id, source_url) VALUES (%s, %s, %s, %s)",
            (file_name, 'moyenne', user_id, file_link)
        )
        db.commit()
        tache_id = curseur2.lastrowid
        db.close()
        return jsonify({"message": "Tâche créée", "tache_id": tache_id})
    except Exception as e:
        return erreur_500(e)

@app.route('/integrations/google-drive/status/<int:user_id>', methods=['GET'])
def drive_status(user_id):
    return jsonify({"connected": get_drive_creds(user_id) is not None})

@app.route('/auth/zoom')
def auth_zoom():
    user_id = request.args.get('user_id')
    return """<script>
        window.opener.postMessage({type:'oauth_success',integration:'zoom'},'*');
        window.close();
    </script>"""

# ============================================
# NOTION — OAuth réel + lecture pages + extraction IA
# ============================================

NOTION_REDIRECT_URI = "https://getshift-backend.onrender.com/auth/notion/callback"

def _notion_cid():
    return os.environ.get('NOTION_CLIENT_ID', '')

def _notion_csecret():
    return os.environ.get('NOTION_CLIENT_SECRET', '')

def get_notion_token(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT config FROM integrations WHERE user_id=%s AND type='notion'", (user_id,))
        row = curseur.fetchone()
        db.close()
        if not row or not row['config']:
            return None
        tokens = json.loads(_fernet().decrypt(row['config'].encode()).decode())
        return tokens.get('access_token')
    except Exception:
        return None

@app.route('/auth/notion')
def auth_notion():
    user_id = request.args.get('user_id')
    if not user_id:
        return "user_id requis", 400
    if not _notion_cid():
        return """<!DOCTYPE html><html><body><script>
window.opener&&window.opener.postMessage({type:'oauth_error',integration:'notion',error:'Notion non configuré côté serveur'},'*');
setTimeout(()=>window.close(),1500);
</script><p style="font-family:sans-serif;text-align:center;padding:40px;color:#e05c5c">Notion non disponible</p></body></html>""", 500
    state_token = secrets.token_urlsafe(32)
    db = connecter()
    curseur = db.cursor()
    curseur.execute("""CREATE TABLE IF NOT EXISTS oauth_states (
        state VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL,
        integration VARCHAR(50) NOT NULL,
        cree_le DATETIME DEFAULT CURRENT_TIMESTAMP)""")
    curseur.execute("DELETE FROM oauth_states WHERE cree_le < DATE_SUB(NOW(), INTERVAL 1 HOUR)")
    curseur.execute("INSERT INTO oauth_states (state, user_id, integration) VALUES (%s, %s, 'notion')", (state_token, user_id))
    db.commit(); db.close()
    auth_url = (
        f"https://api.notion.com/v1/oauth/authorize"
        f"?client_id={_notion_cid()}&response_type=code"
        f"&owner=user&redirect_uri={urllib.parse.quote(NOTION_REDIRECT_URI)}"
        f"&state={state_token}"
    )
    return redirect(auth_url)

@app.route('/auth/notion/callback')
def auth_notion_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    if error:
        return f"""<script>window.opener&&window.opener.postMessage({{type:'oauth_error',integration:'notion',error:'{error}'}},'*');window.close();</script>"""
    if not code or not state:
        return "Paramètres OAuth manquants", 400
    db = connecter()
    curseur = db.cursor(dictionary=True)
    curseur.execute("SELECT user_id FROM oauth_states WHERE state=%s AND integration='notion'", (state,))
    row = curseur.fetchone()
    if not row:
        db.close()
        return "State invalide ou expiré", 400
    user_id = row['user_id']
    curseur.execute("DELETE FROM oauth_states WHERE state=%s", (state,))
    db.commit()
    try:
        auth_str = f"{_notion_cid()}:{_notion_csecret()}"
        auth_b64 = base64.b64encode(auth_str.encode()).decode()
        resp = http_requests.post(
            "https://api.notion.com/v1/oauth/token",
            headers={
                "Authorization": f"Basic {auth_b64}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            },
            json={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": NOTION_REDIRECT_URI
            },
            timeout=15
        )
        if resp.status_code != 200:
            db.close()
            return f"<script>window.opener&&window.opener.postMessage({{type:'oauth_error',integration:'notion',error:'Erreur token Notion ({resp.status_code})'}},'*');window.close();</script>"
        data = resp.json()
        tokens = {
            "access_token": data.get("access_token"),
            "workspace_id": data.get("workspace_id"),
            "workspace_name": data.get("workspace_name"),
            "bot_id": data.get("bot_id"),
        }
        encrypted = _fernet().encrypt(json.dumps(tokens).encode()).decode()
        curseur.execute("CREATE TABLE IF NOT EXISTS integrations (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(50) NOT NULL, config LONGTEXT, cree_le DATETIME DEFAULT CURRENT_TIMESTAMP)")
        curseur.execute("DELETE FROM integrations WHERE user_id=%s AND type='notion'", (user_id,))
        curseur.execute("INSERT INTO integrations (user_id, type, config) VALUES (%s, 'notion', %s)", (user_id, encrypted))
        db.commit()
    except Exception as e:
        db.close()
        return f"<script>window.opener&&window.opener.postMessage({{type:'oauth_error',integration:'notion',error:'erreur'}},'*');window.close();</script>"
    db.close()
    return """<script>
        window.opener && window.opener.postMessage({type:'oauth_success',integration:'notion'},'*');
        window.close();
    </script>"""

def _notion_page_title(page):
    """Extrait le titre d'une page Notion peu importe le type de la propriété title."""
    props = page.get("properties", {})
    for prop_val in props.values():
        if prop_val.get("type") == "title":
            titles = prop_val.get("title", [])
            if titles:
                return titles[0].get("plain_text", "")[:120]
    # Fallback : icône, ou (Sans titre)
    return "(Sans titre)"

def _notion_rich_text_to_plain(rich_text_arr):
    """Concatène un array rich_text Notion en string brute."""
    return "".join(rt.get("plain_text", "") for rt in (rich_text_arr or []))

def _notion_fetch_blocks(page_id, token, max_blocks=40):
    """Récupère les blocs enfants d'une page. Limite à max_blocks pour éviter les pages géantes."""
    try:
        resp = http_requests.get(
            f"https://api.notion.com/v1/blocks/{page_id}/children",
            headers={
                "Authorization": f"Bearer {token}",
                "Notion-Version": "2022-06-28",
            },
            params={"page_size": max_blocks},
            timeout=10
        )
        if resp.status_code != 200:
            return []
        return resp.json().get("results", [])
    except Exception:
        return []

def _notion_blocks_summary(blocks):
    """
    Parcourt les blocs et sépare :
      - explicit_todos : liste de {block_id, text, checked} pour les to_do non cochés
      - text_content : str (paragraphs / headings / bullets agrégés, max 1200 chars)
    """
    explicit_todos = []
    text_parts = []
    for b in blocks:
        btype = b.get("type")
        if not btype:
            continue
        body = b.get(btype, {})
        rt = body.get("rich_text", [])
        text = _notion_rich_text_to_plain(rt).strip()
        if btype == "to_do":
            if not body.get("checked", False) and text:
                explicit_todos.append({
                    "block_id": b.get("id"),
                    "text": text[:200],
                })
        elif btype in ("paragraph", "heading_1", "heading_2", "heading_3",
                       "bulleted_list_item", "numbered_list_item", "quote", "callout"):
            if text:
                text_parts.append(text)
    text_content = "\n".join(text_parts)[:1200]
    return explicit_todos, text_content

@app.route('/integrations/notion/extract-tasks/<int:user_id>', methods=['GET'])
def notion_extract_tasks(user_id):
    token = get_notion_token(user_id)
    if not token:
        return jsonify({"taches": [], "connected": False, "nb_pages": 0})
    # Optionnel : filtre par database_id sélectionné par l'user dans l'UI
    database_id = request.args.get('database_id')
    try:
        # 1) Dédup : pages/blocs déjà importés
        db_ctx = connecter()
        cur_ctx = db_ctx.cursor(dictionary=True)
        cur_ctx.execute(
            "SELECT notion_page_id, notion_block_id FROM notion_imported WHERE user_id=%s",
            (user_id,)
        )
        imported_set = {(r['notion_page_id'], r['notion_block_id']) for r in cur_ctx.fetchall()}
        # Index séparé pour les imports au niveau page (block_id NULL).
        imported_pages = {p for (p, b) in imported_set if b is None}
        imported_blocks = {b for (_, b) in imported_set if b}
        # 2) Contexte tâches existantes (anti-doublon sémantique)
        cur_ctx.execute(
            "SELECT titre FROM taches WHERE user_id=%s AND terminee=FALSE ORDER BY created_at DESC LIMIT 30",
            (user_id,)
        )
        existing_titles = [r['titre'] for r in cur_ctx.fetchall()]
        db_ctx.close()

        # 3) Récupération pages : soit toute la search, soit DB précise
        if database_id:
            search_resp = http_requests.post(
                f"https://api.notion.com/v1/databases/{database_id}/query",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
                json={
                    "sorts": [{"timestamp": "last_edited_time", "direction": "descending"}],
                    "page_size": 12,
                },
                timeout=15
            )
        else:
            search_resp = http_requests.post(
                "https://api.notion.com/v1/search",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                },
                json={
                    "filter": {"value": "page", "property": "object"},
                    "sort": {"direction": "descending", "timestamp": "last_edited_time"},
                    "page_size": 12
                },
                timeout=15
            )
        if search_resp.status_code != 200:
            return jsonify({"taches": [], "connected": True, "erreur": f"Notion API {search_resp.status_code}"}), 200
        pages = search_resp.json().get("results", [])
        if not pages:
            return jsonify({"taches": [], "connected": True, "nb_pages": 0})

        # 4) Pour chaque page : extraire titre, blocs to_do explicites, contenu texte
        page_payloads = []  # liste de dicts pour l'IA
        direct_todos = []   # to_do explicites convertis directement en candidats
        for idx, page in enumerate(pages[:10]):
            page_id = page.get("id")
            page_url = page.get("url") or f"https://www.notion.so/{page_id.replace('-', '') if page_id else ''}"
            title = _notion_page_title(page)
            blocks = _notion_fetch_blocks(page_id, token, max_blocks=40)
            explicit_todos, text_content = _notion_blocks_summary(blocks)
            # Filter explicit_todos déjà importés
            explicit_todos = [t for t in explicit_todos if t["block_id"] not in imported_blocks]
            # Page entière déjà importée (level page) : on n'envoie pas son contenu à l'IA,
            # mais on garde les to_do non cochés qui n'auraient pas encore été importés.
            page_already_imported = page_id in imported_pages
            for t in explicit_todos:
                direct_todos.append({
                    "titre": t["text"],
                    "priorite": "moyenne",
                    "duree_min": 20,
                    "contexte": title,
                    "notion_page_id": page_id,
                    "notion_block_id": t["block_id"],
                    "notion_page_url": page_url,
                })
            if not page_already_imported and text_content:
                page_payloads.append({
                    "index": idx,
                    "title": title,
                    "url": page_url,
                    "page_id": page_id,
                    "content": text_content,
                })

        # 5) Si pages avec contenu → IA pour extraire l'implicite
        ia_taches = []
        if page_payloads:
            existing_block = (
                "\n".join(f"- {t}" for t in existing_titles) if existing_titles
                else "(aucune tâche en cours)"
            )
            pages_block = "\n---\n".join(
                f"[PAGE_{p['index']}] Titre: {p['title']}\nContenu:\n{p['content']}"
                for p in page_payloads
            )
            prompt = f"""Analyse ces {len(page_payloads)} pages Notion et extrais les VRAIES action items implicites du contenu textuel (pas les to-do explicites, déjà extraits séparément). Ignore les notes purement informatives, les références, les minutes de réunion sans suite.

TÂCHES DÉJÀ EXISTANTES (à NE PAS reproposer même reformulées) :
{existing_block}

PAGES:
{pages_block}

Réponds UNIQUEMENT en JSON: {{"taches": [{{"titre": "action concrète courte", "priorite": "haute|moyenne|basse", "duree_min": 30, "page_index": 0}}]}}

Règles:
- Maximum 4 tâches (les plus importantes implicitement actionnables)
- titre = verbe d'action ("Finaliser X", "Préparer Y", "Répondre à Z")
- IMPORTANT : ne propose RIEN si l'action est déjà couverte par une tâche existante
- page_index = indice de la page source (0, 1, 2...)
- Si aucune nouvelle action implicite, retourne {{"taches": []}}"""
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1200, temperature=0.3
            )
            contenu = response.choices[0].message.content.strip()
            if '```json' in contenu: contenu = contenu.split('```json')[1].split('```')[0].strip()
            elif '```' in contenu: contenu = contenu.split('```')[1].split('```')[0].strip()
            try:
                data = json.loads(contenu)
                for t in data.get('taches', []):
                    p_idx = t.pop('page_index', None)
                    if p_idx is None or p_idx < 0 or p_idx >= len(page_payloads):
                        continue
                    src_page = page_payloads[p_idx]
                    t['notion_page_id'] = src_page['page_id']
                    t['notion_page_url'] = src_page['url']
                    t['contexte'] = src_page['title']
                    ia_taches.append(t)
            except Exception as _e:
                print(f"[Notion IA] parse JSON failed: {_e}", flush=True)

        # 6) Fusion : to_do explicites d'abord (priorité haute confiance), puis IA
        # Limite globale 8 suggestions pour ne pas noyer l'utilisateur.
        merged = (direct_todos + ia_taches)[:8]
        return jsonify({
            "taches": merged,
            "connected": True,
            "nb_pages": len(pages),
            "nb_direct_todos": len(direct_todos),
            "nb_ia": len(ia_taches),
        })
    except Exception as e:
        return jsonify({"taches": [], "connected": False, "erreur": "indisponible"}), 200

@app.route('/integrations/notion/status/<int:user_id>', methods=['GET'])
def notion_status(user_id):
    return jsonify({"connected": get_notion_token(user_id) is not None})

@app.route('/integrations/notion/databases/<int:user_id>', methods=['GET'])
def notion_databases(user_id):
    """Liste les databases Notion accessibles pour permettre le filtre côté UI."""
    token = get_notion_token(user_id)
    if not token:
        return jsonify({"databases": [], "connected": False})
    try:
        resp = http_requests.post(
            "https://api.notion.com/v1/search",
            headers={
                "Authorization": f"Bearer {token}",
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
            },
            json={
                "filter": {"value": "database", "property": "object"},
                "sort": {"direction": "descending", "timestamp": "last_edited_time"},
                "page_size": 25,
            },
            timeout=10
        )
        if resp.status_code != 200:
            return jsonify({"databases": [], "connected": True, "erreur": f"Notion API {resp.status_code}"}), 200
        dbs = []
        for d in resp.json().get("results", []):
            title = "".join(t.get("plain_text", "") for t in (d.get("title") or []))[:80] or "(Sans titre)"
            dbs.append({
                "id": d.get("id"),
                "title": title,
                "url": d.get("url"),
            })
        return jsonify({"databases": dbs, "connected": True})
    except Exception as e:
        return jsonify({"databases": [], "connected": False, "erreur": "indisponible"}), 200

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

@app.route('/integrations/status/<int:user_id>', methods=['GET'])
def integrations_status_global(user_id):
    """Retourne le statut de connexion de toutes les intégrations OAuth en une requête."""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT type FROM integrations WHERE user_id=%s", (user_id,))
        connected_types = {row['type'] for row in curseur.fetchall()}
        db.close()
        return jsonify({
            "google_calendar": "google_calendar" in connected_types,
            "gmail": "gmail" in connected_types,
            "google_drive": "google_drive" in connected_types,
            "notion": "notion" in connected_types,
            "slack": "slack" in connected_types,
            "zoom": "zoom" in connected_types,
            "discord": "discord" in connected_types,
        })
    except Exception as e:
        return erreur_500(e)

@app.route('/auth/disconnect/<integration_id>', methods=['DELETE'])
def disconnect_integration(integration_id):
    try:
        user_id = current_uid()  # JWT — jamais la query (sinon IDOR)
        db = connecter()
        curseur = db.cursor()
        curseur.execute(
            "DELETE FROM integrations WHERE user_id=%s AND type=%s",
            (user_id, integration_id)
        )
        db.commit(); db.close()
        return jsonify({"message": f"{integration_id} déconnecté"})
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

# ============================================
# SPRINT 4 — TOMORROW BUILDER
# ============================================

def calculer_score_energie(user_id, db_cursor):
    try:
        db_cursor.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=1 AND DATE(COALESCE(terminee_le, updated_at)) = CURDATE()", (user_id,))
        taches_aujourd_hui = (db_cursor.fetchone() or {}).get('nb', 0)
        db_cursor.execute("SELECT streak FROM users WHERE id=%s", (user_id,))
        streak = (db_cursor.fetchone() or {}).get('streak', 0)
        db_cursor.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=0 AND deadline < NOW()", (user_id,))
        en_retard = (db_cursor.fetchone() or {}).get('nb', 0)
        score = 60 + min(streak * 3, 20) + min(taches_aujourd_hui * 5, 15) - min(en_retard * 5, 30)
        return max(10, min(100, score))
    except:
        return 60

CATEGORIES_DUREE = {
    'deep_work':     {'mots': ['rédiger', 'rediger', 'analyser', 'concevoir', 'développer', 'developper', 'coder', 'créer', 'creer', 'préparer', 'preparer', 'planifier', 'rechercher', 'écrire', 'ecrire', 'architecturer', 'designer'], 'baseline': 90, 'label': 'Travail profond'},
    'communication': {'mots': ['appeler', 'appel', 'email', 'mail', 'envoyer', 'répondre', 'repondre', 'contacter', 'message', 'écrire à', 'ecrire a', 'relancer', 'recontacter'], 'baseline': 20, 'label': 'Communication'},
    'admin':         {'mots': ['facture', 'paiement', 'payer', 'déclarer', 'declarer', 'dossier', 'formulaire', 'rendez-vous', 'rdv', 'banque', 'impôt', 'impot', 'administratif', 'compta'], 'baseline': 30, 'label': 'Administratif'},
    'creatif':       {'mots': ['design', 'maquette', 'brainstorm', 'prototyper', 'prototype', 'illustrer', 'mockup', 'wireframe', 'logo', 'graphique', 'visuel'], 'baseline': 75, 'label': 'Créatif'},
    'meeting':       {'mots': ['réunion', 'reunion', 'meeting', 'call', 'point ', 'sync', 'entretien', 'visio', 'standup', 'daily', 'retro'], 'baseline': 60, 'label': 'Réunion'},
    'quickwin':      {'mots': ['checker', 'vérifier', 'verifier', 'lire ', 'noter', 'mettre à jour', 'maj', 'cocher', 'archiver', 'classer', 'ranger'], 'baseline': 15, 'label': 'Quick win'},
    'learning':      {'mots': ['apprendre', 'réviser', 'reviser', 'étudier', 'etudier', 'cours', 'formation', 'tutoriel', 'tuto', 'lecture', 'livre', 'doc'], 'baseline': 60, 'label': 'Apprentissage'},
}

def categoriser_titre(titre):
    """Catégorise sémantiquement un titre de tâche. Retourne (categorie_key, baseline_min)."""
    if not titre:
        return ('default', 45)
    t = titre.lower()
    for cat, data in CATEGORIES_DUREE.items():
        for mot in data['mots']:
            if mot in t:
                return (cat, data['baseline'])
    return ('default', 45)

def estimer_duree_tache(titre, priorite):
    """Baseline statique — utilisée comme fallback dans estimer_duree_tache_smart."""
    _, base = categoriser_titre(titre)
    if priorite == 'haute': base = int(base * 1.3)
    elif priorite == 'basse': base = int(base * 0.8)
    return base

def estimer_duree_tache_smart(titre, priorite, user_id, db_cursor):
    """Prédiction de durée personnalisée : baseline + apprentissage sur historique user.
    - Catégorise sémantiquement le titre (7 catégories + default)
    - Récupère les tâches terminées de l'user dans cette catégorie avec temps_reel
    - Moyenne pondérée par récence (exponential decay, demi-vie 30j)
    - Bayesian shrinkage : poids user grandit avec nb d'exemples (n / (n + 5))
    """
    categorie, baseline = categoriser_titre(titre)
    base_with_prio = baseline
    if priorite == 'haute': base_with_prio = int(baseline * 1.3)
    elif priorite == 'basse': base_with_prio = int(baseline * 0.8)
    try:
        db_cursor.execute("""
            SELECT titre, priorite, temps_reel, updated_at
            FROM taches
            WHERE user_id=%s AND terminee=1
              AND temps_reel IS NOT NULL AND temps_reel > 0
              AND updated_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
        """, (user_id,))
        rows = db_cursor.fetchall()
        same_cat = []
        for r in rows:
            cat_r, _ = categoriser_titre(r['titre'])
            if cat_r == categorie:
                same_cat.append(r)
        if len(same_cat) < 2:
            return base_with_prio
        import math
        now = datetime.now()
        weights, values = [], []
        for r in same_cat:
            d_age = max(0, (now - r['updated_at']).days) if r['updated_at'] else 30
            w = math.exp(-d_age / 30.0)
            v = r['temps_reel']
            # Normaliser sur la priorité de référence du titre actuel
            if r['priorite'] == 'haute' and priorite != 'haute': v = v / 1.3
            elif r['priorite'] == 'basse' and priorite != 'basse': v = v / 0.8
            if priorite == 'haute' and r['priorite'] != 'haute': v = v * 1.3
            elif priorite == 'basse' and r['priorite'] != 'basse': v = v * 0.8
            weights.append(w); values.append(v)
        weighted_mean = sum(v * w for v, w in zip(values, weights)) / sum(weights)
        n = len(same_cat)
        alpha = n / (n + 5.0)  # shrinkage : 5 exemples → 50% poids user
        blended = alpha * weighted_mean + (1 - alpha) * base_with_prio
        return max(5, min(240, int(round(blended))))
    except Exception:
        return base_with_prio

def detecter_heure_productive(user_id, db_cursor):
    try:
        db_cursor.execute("SELECT HOUR(COALESCE(terminee_le, updated_at)) as heure, COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=1 AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY HOUR(COALESCE(terminee_le, updated_at)) ORDER BY nb DESC LIMIT 1", (user_id,))
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
            t['duree_estimee'] = estimer_duree_tache_smart(t['titre'], t['priorite'], user_id, curseur)
            if t['deadline']: t['deadline'] = str(t['deadline'])
        niveau_energie = "élevé" if score_energie >= 70 else "moyen" if score_energie >= 40 else "faible"
        demain = (datetime.now() + timedelta(days=1)).strftime('%A %d %B %Y')
        prompt_taches = "\n".join([f"- [{t['priorite'].upper()}] {t['titre']} | {t['duree_estimee']}min | {t.get('deadline', 'non définie')}" for t in taches[:10]])
        checkin_context = ""
        try:
            curseur.execute("SELECT taux_completion, score_energie_reel, taches_json, note_libre FROM checkin_soir WHERE user_id=%s ORDER BY cree_le DESC LIMIT 1", (user_id,))
            dernier_checkin = curseur.fetchone()
            if dernier_checkin:
                taux = dernier_checkin['taux_completion']
                energie_reel = dernier_checkin['score_energie_reel']
                taches_checkin = json.loads(dernier_checkin['taches_json'] or '[]')
                depassements = [f"{t['titre']} ({t.get('duree_reelle',0)}min vs {t.get('duree_prevue',0)}min)" for t in taches_checkin if t.get('duree_reelle',0) > t.get('duree_prevue',0) * 1.3]
                checkin_context = f"\nContexte hier: completion {taux}%, énergie ressentie {energie_reel}/100"
                if depassements: checkin_context += f", dépassements: {', '.join(depassements[:2])}"
                if dernier_checkin.get('note_libre'): checkin_context += f". Note user: {dernier_checkin['note_libre'][:80]}"
        except:
            pass
        calendar_context = ""
        try:
            gcal_creds = get_google_calendar_creds(user_id)
            if gcal_creds:
                service = build('calendar', 'v3', credentials=gcal_creds, cache_discovery=False)
                demain_dt = datetime.now() + timedelta(days=1)
                t_min = demain_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + 'Z'
                t_max = (demain_dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + 'Z'
                evts = service.events().list(calendarId='primary', timeMin=t_min, timeMax=t_max, singleEvents=True, orderBy='startTime', maxResults=15).execute()
                lignes = []
                for ev in evts.get('items', []):
                    start = ev.get('start', {})
                    end = ev.get('end', {})
                    if 'dateTime' in start and 'dateTime' in end:
                        lignes.append(f"{start['dateTime'][11:16]}→{end['dateTime'][11:16]} {ev.get('summary','Réservé')[:40]}")
                if lignes:
                    calendar_context = f"\nCRÉNEAUX DÉJÀ OCCUPÉS (Google Calendar — INTERDIT de planifier dessus): {' | '.join(lignes[:8])}"
        except Exception:
            pass
        prompt = f"""Crée le planning optimal pour demain ({demain}).
Score énergie: {score_energie}/100 ({niveau_energie}), heure productive: {heure_productive}h{checkin_context}{calendar_context}
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
        return erreur_500(e)

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
        return erreur_500(e)

@app.route('/ia/tomorrow-builder/<int:user_id>/export-ical', methods=['GET'])
def export_tomorrow_ical(user_id):
    try:
        date_str = request.args.get('date')
        if not date_str:
            date_str = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT planning_json FROM tomorrow_plans WHERE user_id=%s AND DATE(date_planifiee)=%s ORDER BY cree_le DESC LIMIT 1", (user_id, date_str))
        row = cursor.fetchone()
        db.close()
        if not row:
            return jsonify({"erreur": "Aucun plan pour cette date"}), 404
        plan_data = json.loads(row['planning_json'])
        creneaux = plan_data.get('planning', [])
        # RFC 5545 : iCal format basique
        cal_id = f"getshift-{user_id}-{date_str}@taskflow.app"
        now = datetime.now().strftime('%Y%m%dT%H%M%SZ')
        events = []
        for p in creneaux:
            if p.get('type') == 'pause':
                continue
            titre = p.get('titre', 'Tâche sans titre')
            heure_debut = p.get('heure_debut', '09:00')
            heure_fin = p.get('heure_fin', '10:00')
            duree = p.get('duree_minutes', 60)
            h_start, m_start = heure_debut.split(':')
            dt_start = f"{date_str.replace('-', '')}T{h_start}{m_start}00"
            h_end = int(h_start) + (int(m_start) + duree) // 60
            m_end = (int(m_start) + duree) % 60
            if h_end >= 24:
                dt_end = (datetime.strptime(date_str, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y%m%d')
                dt_end += f"T{h_end % 24:02d}{m_end:02d}00"
            else:
                dt_end = f"{date_str.replace('-', '')}T{h_end:02d}{m_end:02d}00"
            uid = f"getshift-{user_id}-{date_str}-{titre[:20].replace(' ', '-')}@taskflow.app"
            priorite = p.get('priorite', 'moyenne')
            description = f"Priorité: {priorite} | {duree}min"
            event = f"""BEGIN:VEVENT
UID:{uid}
DTSTAMP:{now}
DTSTART:{dt_start}
DTEND:{dt_end}
SUMMARY:{titre}
DESCRIPTION:{description}
END:VEVENT"""
            events.append(event)
        ical = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GetShift//TaskFlow//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:GetShift {date_str}
X-WR-TIMEZONE:Europe/Paris
BEGIN:VTIMEZONE
TZID:Europe/Paris
BEGIN:STANDARD
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
END:DAYLIGHT
END:VTIMEZONE
{chr(10).join(events)}
END:VCALENDAR"""
        response = make_response(ical)
        response.headers['Content-Type'] = 'text/calendar; charset=utf-8'
        response.headers['Content-Disposition'] = f'attachment; filename="getshift-{date_str}.ics"'
        return response
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/tomorrow-builder/<int:user_id>/update', methods=['PATCH'])
def update_tomorrow_plan(user_id):
    try:
        data = request.get_json()
        planning_data = data.get('planning')
        if not planning_data:
            return jsonify({"erreur": "planning requis"}), 400
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("SELECT id FROM tomorrow_plans WHERE user_id=%s ORDER BY cree_le DESC LIMIT 1", (user_id,))
        row = curseur.fetchone()
        if row:
            curseur.execute("UPDATE tomorrow_plans SET planning_json=%s WHERE id=%s", (json.dumps(planning_data), row['id']))
            db.commit()
        db.close()
        return jsonify({"message": "Planning mis à jour"})
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/checkin-soir/<int:user_id>/today', methods=['GET'])
def get_checkin_today(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""CREATE TABLE IF NOT EXISTS checkin_soir (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            date_checkin DATE NOT NULL,
            taches_json LONGTEXT,
            score_energie_reel INT,
            note_libre TEXT,
            taux_completion INT,
            cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )""")
        today = datetime.now().strftime('%Y-%m-%d')
        curseur.execute("SELECT * FROM tomorrow_plans WHERE user_id=%s AND date_planifiee=%s ORDER BY cree_le DESC LIMIT 1", (user_id, today))
        row = curseur.fetchone()
        curseur.execute("SELECT * FROM checkin_soir WHERE user_id=%s AND date_checkin=%s LIMIT 1", (user_id, today))
        checkin_existant = curseur.fetchone()
        db.close()
        if not row:
            return jsonify({"taches": [], "date_planifiee": today, "checkin_fait": bool(checkin_existant)})
        planning_data = json.loads(row['planning_json'])
        taches = [p for p in (planning_data.get('planning') or []) if p.get('type') == 'tache']
        return jsonify({
            "taches": taches,
            "date_planifiee": str(row['date_planifiee']),
            "checkin_fait": bool(checkin_existant),
            "checkin_data": json.loads(checkin_existant['taches_json']) if checkin_existant else None
        })
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/checkin-soir', methods=['POST'])
def soumettre_checkin():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        taches = data.get('taches', [])
        score_energie_reel = data.get('score_energie_reel', 60)
        note_libre = data.get('note_libre', '')
        if not user_id:
            return jsonify({"erreur": "user_id requis"}), 400
        faites = sum(1 for t in taches if t.get('fait') or t.get('partiel'))
        taux_completion = round(faites / len(taches) * 100) if taches else 0
        db = connecter()
        curseur = db.cursor(dictionary=True)
        curseur.execute("""CREATE TABLE IF NOT EXISTS checkin_soir (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            date_checkin DATE NOT NULL,
            taches_json LONGTEXT,
            score_energie_reel INT,
            note_libre TEXT,
            taux_completion INT,
            cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )""")
        today = datetime.now().strftime('%Y-%m-%d')
        curseur.execute("DELETE FROM checkin_soir WHERE user_id=%s AND date_checkin=%s", (user_id, today))
        curseur.execute(
            "INSERT INTO checkin_soir (user_id, date_checkin, taches_json, score_energie_reel, note_libre, taux_completion) VALUES (%s,%s,%s,%s,%s,%s)",
            (user_id, today, json.dumps(taches), score_energie_reel, note_libre, taux_completion)
        )
        db.commit(); db.close()
        return jsonify({"message": "Check-in enregistré", "taux_completion": taux_completion})
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/energie-courbe/<int:user_id>', methods=['GET'])
def energie_courbe(user_id):
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        # Baseline circadien scientifique (énergie typique humaine par heure)
        BASELINE = {
            6: 35, 7: 50, 8: 65, 9: 78, 10: 88, 11: 85,
            12: 75, 13: 58, 14: 52, 15: 62, 16: 72, 17: 70,
            18: 62, 19: 55, 20: 48, 21: 40, 22: 30
        }
        HEURES = list(range(6, 23))
        curseur.execute("""
            SELECT HOUR(COALESCE(terminee_le, updated_at)) as heure, COUNT(*) as nb
            FROM taches WHERE user_id=%s AND terminee=1
            AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY HOUR(COALESCE(terminee_le, updated_at))
        """, (user_id,))
        rows = {r['heure']: r['nb'] for r in curseur.fetchall()}
        total = sum(rows.values())
        max_nb = max(rows.values(), default=1)
        # Plus de données → plus de poids sur les vraies habitudes (max 65%)
        weight_user = min(total / 80.0, 0.65)
        weight_base = 1.0 - weight_user
        courbe = []
        for h in HEURES:
            user_score = (rows.get(h, 0) / max_nb) * 100 if total > 0 else 0
            blended = weight_user * user_score + weight_base * BASELINE.get(h, 50)
            courbe.append({"heure": h, "score": round(blended)})
        heure_pic = max(courbe, key=lambda x: x['score'])['heure']
        score_global = calculer_score_energie(user_id, curseur)
        db.close()
        return jsonify({
            "courbe": courbe,
            "heure_pic": heure_pic,
            "score_global": score_global,
            "has_user_data": total > 0
        })
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/duree-stats/<int:user_id>', methods=['GET'])
def duree_stats(user_id):
    """Bilan apprentissage des durées : par catégorie sémantique, ratio reel/baseline, confiance."""
    try:
        db = connecter()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT titre, priorite, temps_estime, temps_reel, updated_at
            FROM taches
            WHERE user_id=%s AND terminee=1
              AND temps_reel IS NOT NULL AND temps_reel > 0
              AND updated_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
        """, (user_id,))
        rows = cursor.fetchall()
        db.close()
        if not rows:
            return jsonify({"total": 0, "categories": [], "precision_globale": None, "conseil": None})
        # Regroupe par catégorie sémantique
        par_cat = {}
        for r in rows:
            cat, baseline = categoriser_titre(r['titre'])
            par_cat.setdefault(cat, {'baseline': baseline, 'rows': []})
            par_cat[cat]['rows'].append(r)
        categories = []
        bien_calibrees_total = 0
        total = 0
        for cat, d in par_cat.items():
            items = d['rows']
            if len(items) < 2:
                continue
            moy_reel = sum(i['temps_reel'] for i in items) / len(items)
            moy_estime = sum((i['temps_estime'] or d['baseline']) for i in items) / len(items)
            ratio = moy_reel / max(moy_estime, 1)
            ecart_pct = round((ratio - 1) * 100)
            label_categorie = CATEGORIES_DUREE.get(cat, {}).get('label', 'Autres')
            categories.append({
                "categorie": cat,
                "label": label_categorie,
                "nb": len(items),
                "moyenne_reelle_min": round(moy_reel),
                "baseline_min": d['baseline'],
                "ratio": round(ratio, 2),
                "ecart_pct": ecart_pct
            })
            total += len(items)
            bien_calibrees_total += sum(1 for i in items if i['temps_estime'] and 0.8 <= i['temps_reel'] / i['temps_estime'] <= 1.2)
        categories.sort(key=lambda x: -x['nb'])
        precision = round(bien_calibrees_total / total * 100) if total > 0 else None
        # Conseil : catégorie la plus sous-estimée
        sous_estimes = sorted([c for c in categories if c['ecart_pct'] > 15], key=lambda x: -x['ecart_pct'])
        conseil = None
        if sous_estimes:
            top = sous_estimes[0]
            conseil = f"Tu sous-estimes les tâches « {top['label'].lower()} » de +{top['ecart_pct']}%. GetShift ajuste auto."
        elif precision is not None and precision >= 70:
            conseil = f"Tes estimations sont précises à {precision}% — bonne calibration."
        return jsonify({
            "total": sum(c['nb'] for c in categories),
            "categories": categories,
            "precision_globale": precision,
            "conseil": conseil
        })
    except Exception as e:
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        return erreur_500(e)

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
        system_prompt = coach['persona'] + f"\n\nPROFIL DE {ctx['prenom'].upper()}:\n- Taches: {ctx['taches_actives']} actives | {ctx['taches_terminees']} terminées | {ctx['taches_en_retard']} en retard\n- Taux: {ctx['taux_completion']}% | Streak: {ctx['streak']} jours\nReponds en francais, 3-5 phrases max. JAMAIS de markdown : pas d'astérisques (*), pas de **gras**, pas de ## titres. MAJUSCULES pour insister si besoin."
        analytics_ctx = data.get('analytics_context')
        if analytics_ctx:
            system_prompt += f"\n\nDONNÉES ANALYTIQUES EN TEMPS RÉEL (page Analytics):\n- Streak: {analytics_ctx.get('streak', 0)} jours consécutifs\n- Score focus: {analytics_ctx.get('focusScore', 0)}/100\n- Risque burnout: {'OUI ⚠️' if analytics_ctx.get('burnoutRisk') else 'Non'}\n- Vélocité: {analytics_ctx.get('velocity', 0)} tâches/jour actif\n- Évolution vs période précédente: {analytics_ctx.get('wow', 0)}%\n- Chronotype: pic de productivité à {analytics_ctx.get('peakHour', 0)}h ({analytics_ctx.get('chronotype', '?')})\n- Règle 80/20: {analytics_ctx.get('lowRatio', 0)}% de tâches à faible priorité\n- Tâches complétées sur la période: {analytics_ctx.get('total', 0)}\nTu as accès à ces données en temps réel. Utilise-les précisément dans tes réponses."
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
        return erreur_500(e)


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
        return erreur_500(e)


@app.route('/ia/coach/rapport/<int:user_id>', methods=['GET'])
def coach_rapport(user_id):
    try:
        style = request.args.get('style', 'bienveillant')
        coach = COACH_STYLES.get(style, COACH_STYLES['bienveillant'])
        db = connecter()
        curseur = db.cursor(dictionary=True)
        ctx = get_coach_context(user_id, curseur)
        curseur.execute("SELECT COUNT(*) as nb FROM taches WHERE user_id=%s AND terminee=1 AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)", (user_id,))
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
        return erreur_500(e)

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
        return erreur_500(e)

# ============================================
# SPRINT 7 — GOAL REVERSE ENGINEERING
# ============================================

def _clipper_dates_plan(plan, deadline_str):
    """Force toutes les dates du plan à être <= deadline. Llama hallucine souvent.
    Réécrit date_fin des jalons et deadline des tâches. Retourne le plan modifié."""
    if not deadline_str:
        return plan
    try:
        from datetime import date as _date
        deadline_d = _date.fromisoformat(str(deadline_str))
    except Exception:
        return plan
    aujourd_hui = datetime.now().date()
    if deadline_d <= aujourd_hui:
        return plan

    total_jours = (deadline_d - aujourd_hui).days
    jalons = plan.get('jalons') or []
    nb_j = max(1, len(jalons))

    for i, jalon in enumerate(jalons):
        # date_fin du jalon = répartition linéaire entre aujourd'hui et deadline
        target_jour = round((i + 1) / nb_j * total_jours)
        date_fin_calc = aujourd_hui + timedelta(days=target_jour)
        # On garde la date IA si elle est cohérente, sinon on remplace
        try:
            df_ia = _date.fromisoformat(str(jalon.get('date_fin', '')))
            if df_ia > deadline_d or df_ia <= aujourd_hui:
                jalon['date_fin'] = date_fin_calc.isoformat()
            elif i > 0:
                # vérifie chronologie : doit être >= jalon précédent
                df_prev = _date.fromisoformat(str(jalons[i-1].get('date_fin', '')))
                if df_ia < df_prev:
                    jalon['date_fin'] = date_fin_calc.isoformat()
        except Exception:
            jalon['date_fin'] = date_fin_calc.isoformat()

        # Clip les deadlines des tâches : doivent être <= date_fin du jalon
        date_fin_jalon = _date.fromisoformat(jalon['date_fin'])
        for tache in (jalon.get('taches') or []):
            try:
                dt = _date.fromisoformat(str(tache.get('deadline', '')))
                if dt > deadline_d or dt > date_fin_jalon or dt <= aujourd_hui:
                    tache['deadline'] = date_fin_jalon.isoformat()
            except Exception:
                tache['deadline'] = date_fin_jalon.isoformat()

    # Recalibre duree_semaines pour matcher la réalité
    plan['duree_semaines'] = max(1, (total_jours + 6) // 7)
    return plan


def _ensure_objectifs_schema(curseur):
    """Crée table objectifs + colonne objectif_id sur taches si absent."""
    curseur.execute("""CREATE TABLE IF NOT EXISTS objectifs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        titre VARCHAR(255) NOT NULL,
        deadline DATE,
        niveau VARCHAR(20),
        duree_semaines INT,
        score_faisabilite INT,
        conseil_global TEXT,
        risques_json TEXT,
        jalons_json LONGTEXT,
        coach_style VARCHAR(30),
        statut VARCHAR(20) DEFAULT 'actif',
        cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)""")
    curseur.execute("SHOW COLUMNS FROM taches LIKE 'objectif_id'")
    if not curseur.fetchone():
        try:
            curseur.execute("ALTER TABLE taches ADD COLUMN objectif_id INT NULL")
            curseur.execute("ALTER TABLE taches ADD INDEX idx_objectif_id (objectif_id)")
        except Exception:
            pass

@app.route('/ia/goal-reverse', methods=['POST'])
def goal_reverse():
    data = request.json
    user_id = data.get('user_id')
    objectif = data.get('objectif')
    deadline = data.get('deadline')
    niveau = data.get('niveau', 'realiste')
    coach_style = data.get('coach_style', 'bienveillant')
    aujourd_hui = datetime.now().strftime('%Y-%m-%d')

    # ── Contexte user pour personnaliser le plan ──
    contexte_user = ""
    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)
        score_energie = calculer_score_energie(user_id, curseur)
        heure_productive = detecter_heure_productive(user_id, curseur)
        niveau_e = "élevé" if score_energie >= 70 else "moyen" if score_energie >= 40 else "faible"

        # Durées typiques par catégorie sémantique (Task DNA)
        cat_durees = {}
        for cat_titre in [("Préparer doc", "deep_work"), ("Répondre email", "communication"),
                          ("Remplir formulaire", "admin"), ("Brainstormer idée", "creatif"),
                          ("Réunion équipe", "meeting"), ("Tâche rapide", "quickwin"),
                          ("Apprendre concept", "learning")]:
            try:
                d = estimer_duree_tache_smart(cat_titre[0], "moyenne", user_id, curseur)
                cat_durees[cat_titre[1]] = d
            except Exception:
                pass

        # Tâches existantes proches du domaine de l'objectif (top 5)
        curseur.execute("""SELECT titre FROM taches WHERE user_id=%s AND terminee=0
                           ORDER BY deadline ASC LIMIT 8""", (user_id,))
        taches_existantes = [r['titre'] for r in curseur.fetchall()]
        db.close()

        ctx_parts = [f"Énergie user: {score_energie}/100 ({niveau_e})",
                     f"Heure de pic: {heure_productive}h"]
        if cat_durees:
            ctx_parts.append(f"Durées moyennes user par type (min): {cat_durees}")
        if taches_existantes:
            ctx_parts.append(f"Tâches déjà actives (à NE PAS dupliquer): {' | '.join(taches_existantes[:5])}")
        contexte_user = "\n".join(ctx_parts)
    except Exception as e:
        print(f"[goal_reverse] Contexte user erreur: {e}")
        contexte_user = ""

    # ── Coach persona ──
    coach = COACH_STYLES.get(coach_style, COACH_STYLES['bienveillant'])
    coach_intro = coach['persona']
    coach_nom = coach['nom']

    # ── Calcul EXACT du nombre de semaines disponibles (Llama est nul en dates) ──
    try:
        from datetime import date as _date
        d_deadline = _date.fromisoformat(str(deadline))
        d_today = datetime.now().date()
        jours_dispo = max(1, (d_deadline - d_today).days)
        semaines_dispo = max(1, (jours_dispo + 6) // 7)
    except Exception:
        jours_dispo = 30
        semaines_dispo = 4

    nb_jalons_recommande = min(8, max(2, semaines_dispo))

    prompt = f"""{coach_intro}

Tu fais du Goal Reverse Engineering : pars de l'objectif final et reconstruis le chemin à rebours, étape par étape. Tu dois PERSONNALISER selon le contexte réel de l'utilisateur.

OBJECTIF: {objectif}
AUJOURD'HUI: {aujourd_hui}
DEADLINE FINALE ABSOLUE: {deadline} (AUCUNE date ne doit dépasser cette deadline)
TEMPS DISPONIBLE: EXACTEMENT {jours_dispo} jours = {semaines_dispo} semaines
NIVEAU D'AMBITION: {niveau}

CONTEXTE USER (utilise ces données pour calibrer les durées et la charge):
{contexte_user or "(contexte indisponible — utilise des durées génériques)"}

RÈGLES STRICTES — RESPECTER ABSOLUMENT:
1. duree_semaines = {semaines_dispo} (NE PAS dépasser, NE PAS réduire arbitrairement)
2. AUCUNE date_fin de jalon ne peut être > {deadline}
3. AUCUNE deadline de tâche ne peut être > {deadline}
4. Toutes les dates doivent être entre {aujourd_hui} et {deadline} inclus
5. Le DERNIER jalon DOIT se terminer entre J-3 et {deadline} (pile sur la deadline)
6. jalons = entre 2 et {nb_jalons_recommande} jalons, ordonnés chronologiquement
7. semaine commence à 1 et s'incrémente de 1 par jalon (1, 2, 3...)
8. Max 4 tâches par jalon
9. score_faisabilite = note 0-100 (basé sur niveau + délai + complexité)
10. conseil_global = signé "{coach_nom}", max 2 phrases, reflète ton personnage
11. risques = 2-4 risques concrets (deadlines serrées, dépendances, charge)
12. duree_estimee en minutes (calibre avec les durées user si possible)

EXEMPLE DE RÉPARTITION DES DATES (pour {semaines_dispo} semaines):
- Jalon 1 → date_fin = aujourd'hui + ~{jours_dispo // max(1, nb_jalons_recommande)} jours
- Dernier jalon → date_fin = {deadline}

FORMAT JSON STRICT (rien d'autre, pas de markdown):
{{
  "duree_semaines": {semaines_dispo},
  "score_faisabilite": <int>,
  "conseil_global": "<string>",
  "risques": ["<string>", "..."],
  "jalons": [{{
    "semaine": <int>,
    "titre": "<string>",
    "date_fin": "YYYY-MM-DD",
    "difficulte": "faible|moyenne|élevée",
    "taches": [{{"titre": "<string>", "duree_estimee": <int>, "priorite": "basse|moyenne|haute", "deadline": "YYYY-MM-DD"}}]
  }}]
}}"""
    try:
        response = groq_client.chat.completions.create(model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}], temperature=0.6, max_tokens=2500)
        raw = response.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'): raw = raw[4:]
        if raw.endswith('```'):
            raw = raw[:-3]
        result = json.loads(raw.strip())
        # Garde-fou : clip toutes les dates qui dépassent la deadline
        result = _clipper_dates_plan(result, deadline)
        result['_coach'] = {'nom': coach['nom'], 'emoji': coach['emoji']}
        return jsonify(result)
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/goal-reverse/importer', methods=['POST'])
def goal_reverse_importer():
    data = request.json
    user_id = data.get('user_id')
    taches = data.get('taches', [])
    # Métadonnées objectif pour persistance
    objectif_titre = data.get('objectif_titre')
    objectif_deadline = data.get('objectif_deadline')
    objectif_niveau = data.get('objectif_niveau')
    objectif_plan = data.get('objectif_plan', {})
    objectif_coach = data.get('coach_style', 'bienveillant')
    ids_crees = []
    objectif_id = None
    try:
        conn = connecter()
        cursor = conn.cursor(dictionary=True)
        _ensure_objectifs_schema(cursor)
        # Idempotence : si on a déjà créé cet objectif récemment (double-clic, retry réseau,
        # React StrictMode), on renvoie l'existant sans réinsérer. La paire (user, titre, deadline)
        # est un identifiant naturel suffisant : il faudrait délibérément créer 2 objectifs
        # strictement identiques pour entrer en collision, ce qui n'a pas de sens fonctionnel.
        if objectif_titre and objectif_deadline:
            cursor.execute(
                """SELECT id FROM objectifs
                    WHERE user_id=%s AND titre=%s AND deadline=%s
                    ORDER BY cree_le DESC LIMIT 1""",
                (user_id, objectif_titre[:255], objectif_deadline)
            )
            existing = cursor.fetchone()
            if existing:
                cursor.execute("SELECT id FROM taches WHERE objectif_id=%s", (existing['id'],))
                existing_ids = [r['id'] for r in cursor.fetchall()]
                cursor.close(); conn.close()
                return jsonify({
                    "message": f"Objectif déjà importé ({len(existing_ids)} tâches existantes)",
                    "ids": existing_ids,
                    "objectif_id": existing['id'],
                    "already_exists": True,
                })
            cursor.execute("""INSERT INTO objectifs
                (user_id, titre, deadline, niveau, duree_semaines, score_faisabilite,
                 conseil_global, risques_json, jalons_json, coach_style)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (user_id, objectif_titre[:255], objectif_deadline, objectif_niveau,
                 objectif_plan.get('duree_semaines'), objectif_plan.get('score_faisabilite'),
                 objectif_plan.get('conseil_global'),
                 json.dumps(objectif_plan.get('risques', []), ensure_ascii=False),
                 json.dumps(objectif_plan.get('jalons', []), ensure_ascii=False),
                 objectif_coach))
            objectif_id = cursor.lastrowid
        for t in taches:
            # Normalisation : 'faible' (synonyme IA) → 'basse' pour cohérence frontend
            prio = t['priorite']
            if prio == 'faible':
                prio = 'basse'
            elif prio not in ('haute', 'moyenne', 'basse'):
                prio = 'moyenne'
            if objectif_id:
                cursor.execute("INSERT INTO taches (titre, priorite, deadline, user_id, objectif_id) VALUES (%s, %s, %s, %s, %s)",
                    (t['titre'], prio, t['deadline'], user_id, objectif_id))
            else:
                cursor.execute("INSERT INTO taches (titre, priorite, deadline, user_id) VALUES (%s, %s, %s, %s)",
                    (t['titre'], prio, t['deadline'], user_id))
            ids_crees.append(cursor.lastrowid)
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": f"{len(ids_crees)} tâches importées avec succès",
                        "ids": ids_crees, "objectif_id": objectif_id})
    except Exception as e:
        return erreur_500(e)

@app.route('/ia/goal-reverse/list/<int:user_id>', methods=['GET'])
def goal_reverse_list(user_id):
    """Liste les objectifs actifs avec progress, prochain jalon, urgence."""
    try:
        from datetime import date as _date
        today = _date.today()
        db = connecter()
        curseur = db.cursor(dictionary=True)
        _ensure_objectifs_schema(curseur)
        curseur.execute("""SELECT * FROM objectifs WHERE user_id=%s AND statut='actif'
                           ORDER BY cree_le DESC""", (user_id,))
        objectifs = curseur.fetchall()
        result = []
        for o in objectifs:
            oid = o['id']
            # Progression globale
            curseur.execute("""SELECT COUNT(*) as total,
                SUM(CASE WHEN terminee=1 THEN 1 ELSE 0 END) as done
                FROM taches WHERE objectif_id=%s""", (oid,))
            stats = curseur.fetchone()
            total = stats['total'] or 0
            done = stats['done'] or 0

            # Prochaine tâche non terminée (deadline la plus proche)
            curseur.execute("""SELECT titre, deadline FROM taches
                WHERE objectif_id=%s AND terminee=0
                ORDER BY (deadline IS NULL), deadline ASC LIMIT 1""", (oid,))
            next_t = curseur.fetchone()
            prochaine_etape = next_t['titre'] if next_t else None

            # Tâches en retard (deadline dépassée, non terminées)
            curseur.execute("""SELECT COUNT(*) as late FROM taches
                WHERE objectif_id=%s AND terminee=0
                  AND deadline IS NOT NULL AND deadline < %s""", (oid, today))
            late_row = curseur.fetchone()
            taches_en_retard = late_row['late'] or 0

            # Jours restants jusqu'à la deadline objectif
            jours_restants = None
            if o['deadline']:
                dl = o['deadline'] if isinstance(o['deadline'], _date) else _date.fromisoformat(str(o['deadline']))
                jours_restants = (dl - today).days

            result.append({
                'id': oid,
                'titre': o['titre'],
                'deadline': str(o['deadline']) if o['deadline'] else None,
                'niveau': o['niveau'],
                'score_faisabilite': o['score_faisabilite'],
                'progression': round(done / total * 100) if total else 0,
                'taches_total': total,
                'taches_done': done,
                'cree_le': str(o['cree_le']),
                'prochaine_etape': prochaine_etape,
                'taches_en_retard': taches_en_retard,
                'needs_replanning': taches_en_retard >= 2,
                'jours_restants': jours_restants,
            })
        db.close()
        return jsonify({"objectifs": result})
    except Exception as e:
        return jsonify({"error": "indisponible", "objectifs": []}), 200


@app.route('/ia/goal-reverse/iterate', methods=['POST'])
def goal_reverse_iterate():
    """Mode Iterate : modifie un plan existant sans regénérer from scratch.
    Préserve la cohérence (jalons existants, tâches déjà importées) et applique
    une instruction utilisateur en langage naturel."""
    try:
        data = request.json or {}
        instruction = (data.get('instruction') or '').strip()
        plan = data.get('plan') or {}
        objectif = (data.get('objectif') or '').strip()
        deadline = data.get('deadline') or ''
        niveau = data.get('niveau', 'realiste')
        coach_style = data.get('coach_style', 'bienveillant')
        if not instruction:
            return jsonify({"erreur": "Instruction requise"}), 400
        if not plan or 'jalons' not in plan:
            return jsonify({"erreur": "Plan actuel requis"}), 400

        coach = COACH_STYLES.get(coach_style, COACH_STYLES['bienveillant'])
        aujourd_hui = datetime.now().strftime('%Y-%m-%d')

        # On envoie une version compacte du plan pour ne pas exploser le contexte
        plan_compact = {
            'duree_semaines': plan.get('duree_semaines'),
            'score_faisabilite': plan.get('score_faisabilite'),
            'conseil_global': plan.get('conseil_global'),
            'risques': plan.get('risques', []),
            'jalons': [
                {
                    'semaine': j.get('semaine'),
                    'titre': j.get('titre'),
                    'date_fin': j.get('date_fin'),
                    'difficulte': j.get('difficulte'),
                    'taches': [
                        {'titre': t.get('titre'), 'duree_estimee': t.get('duree_estimee'),
                         'priorite': t.get('priorite'), 'deadline': t.get('deadline')}
                        for t in (j.get('taches') or [])
                    ]
                } for j in (plan.get('jalons') or [])
            ]
        }

        prompt = f"""{coach['persona']}

Tu fais du Goal Reverse Engineering en mode ITERATE.
L'utilisateur a déjà un plan généré. Il veut le MODIFIER, pas tout regénérer.
Tu dois préserver la cohérence (titres de jalons existants quand pertinent, structure générale)
et appliquer son instruction de façon CHIRURGICALE.

OBJECTIF: {objectif}
DEADLINE FINALE: {deadline}
NIVEAU: {niveau}
AUJOURD'HUI: {aujourd_hui}

PLAN ACTUEL:
{json.dumps(plan_compact, ensure_ascii=False)}

INSTRUCTION DE L'UTILISATEUR:
"{instruction}"

RÈGLES (RESPECTER ABSOLUMENT):
- Modifie SEULEMENT ce que l'instruction demande, garde le reste tel quel
- AUCUNE date_fin ni deadline ne peut être > {deadline} (deadline absolue)
- Le dernier jalon DOIT se terminer entre J-3 et {deadline}
- Toutes les dates entre {aujourd_hui} et {deadline} inclus
- Si l'instruction étend la durée mais ça dépasserait {deadline}, recale dans le délai dispo
- Si l'instruction réduit/fusionne, ne perds pas d'information critique
- Recalcule score_faisabilite si la charge change
- conseil_global signé "{coach['nom']}", max 2 phrases, mentionne la modification
- Max 8 jalons, max 4 tâches par jalon

FORMAT JSON STRICT (rien d'autre) — même schéma que le plan actuel:
{{
  "duree_semaines": <int>,
  "score_faisabilite": <int>,
  "conseil_global": "<string>",
  "risques": ["<string>"],
  "jalons": [{{"semaine": <int>, "titre": "<string>", "date_fin": "YYYY-MM-DD",
    "difficulte": "faible|moyenne|élevée",
    "taches": [{{"titre": "<string>", "duree_estimee": <int>, "priorite": "basse|moyenne|haute", "deadline": "YYYY-MM-DD"}}]}}]
}}"""

        response = groq_client.chat.completions.create(model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}], temperature=0.5, max_tokens=2500)
        raw = response.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'): raw = raw[4:]
        if raw.endswith('```'):
            raw = raw[:-3]
        result = json.loads(raw.strip())
        # Garde-fou : clip toutes les dates qui dépassent la deadline
        result = _clipper_dates_plan(result, deadline)
        result['_coach'] = {'nom': coach['nom'], 'emoji': coach['emoji']}
        result['_iteration'] = instruction
        return jsonify(result)
    except Exception as e:
        return erreur_500(e)


# Templates de Goal Reverse Engineering — objectifs inspirants pré-formatés
GOAL_TEMPLATES = [
    {
        "id": "saas",
        "emoji": "🚀",
        "categorie": "Business",
        "titre": "Lancer un SaaS",
        "objectif": "Lancer un SaaS avec 100 premiers utilisateurs payants",
        "duree_mois": 3,
        "niveau": "ambitieux",
        "description": "Du MVP au product-market fit — landing, acquisition, premiers paiements",
        "couleur": "#6c63ff",
    },
    {
        "id": "concours",
        "emoji": "🎓",
        "categorie": "Études",
        "titre": "Préparer un concours",
        "objectif": "Réussir le concours / l'examen avec un score top 20%",
        "duree_mois": 6,
        "niveau": "ambitieux",
        "description": "Planning de révision structuré + annales + simulations chronométrées",
        "couleur": "#e08a3c",
    },
    {
        "id": "marathon",
        "emoji": "🏃",
        "categorie": "Sport",
        "titre": "Courir un marathon",
        "objectif": "Finir mon premier marathon en moins de 4h30",
        "duree_mois": 4,
        "niveau": "realiste",
        "description": "Plan d'entraînement progressif, nutrition, sorties longues, récup",
        "couleur": "#4caf82",
    },
    {
        "id": "livre",
        "emoji": "📖",
        "categorie": "Création",
        "titre": "Écrire un livre",
        "objectif": "Écrire et publier mon premier livre (60 000 mots)",
        "duree_mois": 6,
        "niveau": "realiste",
        "description": "Plan détaillé, sessions d'écriture quotidiennes, relecture, édition",
        "couleur": "#a855f7",
    },
    {
        "id": "youtube",
        "emoji": "🎥",
        "categorie": "Création",
        "titre": "Lancer une chaîne YouTube",
        "objectif": "Atteindre 1000 abonnés YouTube avec une chaîne thématique",
        "duree_mois": 3,
        "niveau": "ambitieux",
        "description": "Setup, ligne édito, 1 vidéo/semaine, miniatures, optimisation SEO",
        "couleur": "#e05c5c",
    },
    {
        "id": "langue",
        "emoji": "🗣️",
        "categorie": "Apprentissage",
        "titre": "Apprendre une langue (B2)",
        "objectif": "Atteindre le niveau B2 dans une nouvelle langue",
        "duree_mois": 6,
        "niveau": "realiste",
        "description": "Vocabulaire, grammaire, immersion, conversations, écoute active",
        "couleur": "#22a06b",
    },
    {
        "id": "job",
        "emoji": "💼",
        "categorie": "Carrière",
        "titre": "Trouver un nouveau job",
        "objectif": "Décrocher un poste qui me correspond avec +20% de salaire",
        "duree_mois": 3,
        "niveau": "ambitieux",
        "description": "CV, LinkedIn, networking, préparation entretiens, négociation",
        "couleur": "#3b82f6",
    },
    {
        "id": "voyage",
        "emoji": "✈️",
        "categorie": "Vie perso",
        "titre": "Préparer un grand voyage",
        "objectif": "Organiser un voyage solo de 1 mois dans un pays étranger",
        "duree_mois": 2,
        "niveau": "realiste",
        "description": "Budget, itinéraire, billets, vaccins, logements, sécurité",
        "couleur": "#06b6d4",
    },
]

@app.route('/ia/goal-reverse/templates', methods=['GET'])
def goal_reverse_templates():
    """Liste des templates inspirants pré-formatés."""
    return jsonify({"templates": GOAL_TEMPLATES})


@app.route('/ia/goal-reverse/<int:objectif_id>/replanning', methods=['POST'])
def goal_reverse_replanning(objectif_id):
    """Auto-replanning IA : redistribue les tâches en retard sur les semaines restantes."""
    try:
        from datetime import date as _date
        today = _date.today()
        db = connecter()
        curseur = db.cursor(dictionary=True)

        curseur.execute("SELECT * FROM objectifs WHERE id=%s", (objectif_id,))
        objectif = curseur.fetchone()
        if not objectif:
            return jsonify({"erreur": "Objectif introuvable"}), 404

        # Tâches en retard
        curseur.execute("""SELECT titre, deadline FROM taches
            WHERE objectif_id=%s AND terminee=0 AND deadline IS NOT NULL AND deadline < %s
            ORDER BY deadline""", (objectif_id, today))
        retard = [r['titre'] for r in curseur.fetchall()]

        # Tâches à venir (non terminées, deadline OK ou pas de deadline)
        curseur.execute("""SELECT titre, deadline FROM taches
            WHERE objectif_id=%s AND terminee=0
              AND (deadline IS NULL OR deadline >= %s)
            ORDER BY (deadline IS NULL), deadline""", (objectif_id, today))
        a_venir = [r['titre'] for r in curseur.fetchall()]

        # Deadline finale de l'objectif
        deadline_finale = str(objectif['deadline']) if objectif['deadline'] else "non définie"
        dl_obj = objectif['deadline'] if isinstance(objectif['deadline'], _date) else (
            _date.fromisoformat(str(objectif['deadline'])) if objectif['deadline'] else None
        )
        semaines_restantes = max(1, ((dl_obj - today).days // 7) if dl_obj else 4)

        prompt = f"""Tu es un coach expert en planification agile.

L'utilisateur a un objectif : "{objectif['titre']}" (deadline : {deadline_finale}).
Il reste {semaines_restantes} semaine(s) jusqu'à la deadline.

Tâches EN RETARD (à réintégrer) : {retard}
Tâches encore à faire : {a_venir}

Propose un replanning en JSON strict, sans markdown, sans commentaire :
{{
  "analyse": "1-2 phrases : pourquoi il est en retard et quel ajustement clé",
  "jalons_restants": [
    {{"semaine": 1, "titre": "Sprint X", "taches": ["tache1", "tache2"]}},
    ...
  ],
  "conseil": "1 conseil ACTIONNABLE pour ne plus être en retard"
}}

Les jalons_restants doivent couvrir toutes les tâches en retard + à venir, réparties sur {semaines_restantes} semaines.
Sois réaliste : max 4-5 tâches par semaine."""

        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800, temperature=0.5
        )
        raw = completion.choices[0].message.content.strip()
        start = raw.find('{'); end = raw.rfind('}') + 1
        plan = json.loads(raw[start:end]) if start != -1 else {}

        db.close()
        return jsonify({"objectif_id": objectif_id, "replanning": plan})
    except Exception as e:
        return erreur_500(e)


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
    """Extrait les faits durables sur l'utilisateur via LLM (llama-3.1-8b-instant).
    Appelée en thread daemon → n'impacte pas la latence de la réponse principale.
    """
    try:
        prompt = f"""Analyse cet échange et extrais UNIQUEMENT les informations factuelles et durables sur l'utilisateur (pas sur les tâches ponctuelles).
Réponds en JSON valide : liste d'objets ou liste vide [].

Catégories autorisées : profil | preferences | habitudes | objectifs | contexte

Format : [{{"categorie": "...", "cle": "identifiant_court", "valeur": "fait concis < 200 chars"}}]

Règles :
- Max 4 observations par échange
- cle = identifiant stable (ex: "metier", "horaire_travail", "outil_favori", "projet_principal")
- valeur = fait concis, jamais une copie brute du message
- Ignore les demandes ponctuelles (créer une tâche, résumer, chercher...)
- Si rien de durable, renvoie []

Message : {message[:350]}
Réponse : {reponse[:150]}

JSON uniquement :"""

        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.1,
        )
        raw = (completion.choices[0].message.content or '').strip()

        import re as _re
        match = _re.search(r'\[.*?\]', raw, _re.DOTALL)
        if not match:
            return
        observations_raw = json.loads(match.group())
        if not isinstance(observations_raw, list):
            return

        valid_cats = {'profil', 'preferences', 'habitudes', 'objectifs', 'contexte'}
        observations = []
        for o in observations_raw[:4]:
            if not isinstance(o, dict):
                continue
            cat = o.get('categorie', 'contexte')
            if cat not in valid_cats:
                cat = 'contexte'
            cle = str(o.get('cle', 'info'))[:100].strip()
            valeur = str(o.get('valeur', ''))[:250].strip()
            if cle and valeur:
                observations.append({"categorie": cat, "cle": cle, "valeur": valeur})

        if observations:
            sauvegarder_memoire(user_id, observations)

    except Exception as e:
        print(f"[Mémoire] Extraction LLM échouée: {e}")

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
    prio_order = {'haute': 0, 'moyenne': 1, 'basse': 2}
    en_cours = sorted([t for t in taches if not t.get('terminee')], key=lambda t: prio_order.get(t.get('priorite', 'basse'), 2))
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
2. FORMAT — Texte clair et direct. JAMAIS d'astérisques (*), JAMAIS de **gras**, JAMAIS de ## titres, JAMAIS de markdown. Listes avec tirets simples (-) ou numéros (1. 2. 3.) uniquement. Phrases qui se lisent à voix haute.
3. ACTIONNABLE — Chaque réponse se termine par une action concrète faisable dans les 5 minutes
4. PROACTIF — Si tu détectes procrastination, surcharge ou pattern négatif, tu le dis sans détour
5. CONNECTÉ — Si tu vois un pattern dans le Focus du jour ou DNA, tu l'exploites pour conseiller
6. SOURCES — Si tu utilises des données web, tu cites ("Selon [source]...")
7. LANGUE — Français par défaut
8. LONGUEUR — Question simple = réponse percutante ; complexe = analyse complète mais sans bavardage
9. PERSONA — Si tu joues un coach (Alex/Max/Nova), garde son ton dans CHAQUE phrase, pas seulement la première
10. DATE — Tu connais toujours la date et l'heure actuelles (voir bloc DATE & HEURE ci-dessus). Ne jamais prétendre l'ignorer.
11. AGENT — Tu n'expliques pas ce que tu vas faire avec des phrases comme "je vais créer la tâche". Tu APPELLES directement les outils disponibles (creer_tache, terminer_tache, lister_membres_equipe, creer_tache_equipe, assigner_tache_equipe, naviguer_vers, etc.) puis tu confirmes en une phrase le résultat.

RAPPEL FORMAT : aucun astérisque, aucun caractère # en début de ligne. Si tu veux insister sur un mot, mets-le en MAJUSCULES, jamais entre étoiles.

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
    {
        "type": "function",
        "function": {
            "name": "lister_membres_equipe",
            "description": "Liste les membres d'une équipe avec leur id et nom. Si equipe_id non précisé et l'user n'a qu'une seule équipe, prend la sienne. À utiliser AVANT d'assigner une tâche à un collègue pour trouver son id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "equipe_id": {"type": "integer", "description": "ID de l'équipe (optionnel si l'user n'a qu'une équipe)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "creer_tache_equipe",
            "description": "Crée une tâche dans une équipe partagée (page Collaboration), avec assignation optionnelle à un membre. Si equipe_id non précisé et l'user n'a qu'une seule équipe, prend la sienne.",
            "parameters": {
                "type": "object",
                "properties": {
                    "titre": {"type": "string", "description": "Titre court et actionnable"},
                    "description": {"type": "string", "description": "Description détaillée (optionnel)"},
                    "priorite": {"type": "string", "enum": ["haute", "moyenne", "basse"]},
                    "deadline_iso": {"type": "string", "description": "Deadline ISO 8601 ou null"},
                    "assignee_nom": {"type": "string", "description": "Nom du collègue à qui assigner (l'IA cherchera le user_id correspondant)"},
                    "equipe_id": {"type": "integer", "description": "ID équipe (optionnel)"}
                },
                "required": ["titre"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assigner_tache_equipe",
            "description": "Assigne une tâche d'équipe existante à un membre. Recherche la tâche par mots-clés si pas d'id, et le membre par nom.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tache_id": {"type": "integer", "description": "ID tâche équipe (préférer si dispo)"},
                    "recherche": {"type": "string", "description": "Mots-clés pour trouver la tâche si pas d'ID"},
                    "assignee_nom": {"type": "string", "description": "Nom du collègue cible"},
                    "equipe_id": {"type": "integer", "description": "ID équipe (optionnel)"}
                },
                "required": ["assignee_nom"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "naviguer_vers",
            "description": "Ouvre une page de l'application. À utiliser quand l'utilisateur demande à aller quelque part ou quand une action requiert d'être sur une page précise. Valeurs : dashboard, planification, collaboration, analytics, tomorrow-builder, goal-reverse, profile, settings, ia.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page": {"type": "string", "enum": ["dashboard", "planification", "collaboration", "analytics", "tomorrow-builder", "goal-reverse", "profile", "settings", "ia"]},
                    "section": {"type": "string", "description": "Sous-section (ex: 'integrations' pour settings)"}
                },
                "required": ["page"]
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


def trouver_tache_equipe_par_recherche(curseur, equipe_id: int, recherche: str):
    """Trouve la première tâche équipe active matchant les mots-clés."""
    if not recherche or not equipe_id:
        return None
    mots = set(recherche.lower().split())
    curseur.execute("SELECT id, titre, statut FROM taches_equipe WHERE equipe_id=%s AND statut!='termine' ORDER BY created_at DESC LIMIT 50", (equipe_id,))
    for t in curseur.fetchall():
        mots_titre = set((t['titre'] or '').lower().split())
        if mots & mots_titre:
            return t
    return None


def resoudre_equipe_user(curseur, user_id: int, equipe_id_arg=None):
    """Retourne (equipe_id, role) pour l'utilisateur. Si equipe_id_arg fourni, vérifie membership.
    Sinon, prend l'unique équipe de l'user. Retourne (None, None) si ambigu/aucune."""
    if equipe_id_arg:
        curseur.execute("SELECT role FROM equipe_membres WHERE equipe_id=%s AND user_id=%s", (equipe_id_arg, user_id))
        r = curseur.fetchone()
        return (equipe_id_arg, r['role']) if r else (None, None)
    curseur.execute("SELECT equipe_id, role FROM equipe_membres WHERE user_id=%s", (user_id,))
    rows = curseur.fetchall()
    if len(rows) == 1:
        return (rows[0]['equipe_id'], rows[0]['role'])
    return (None, None)


def trouver_membre_par_nom(curseur, equipe_id: int, nom: str):
    """Retourne le user_id d'un membre dont le nom contient 'nom' (case insensitive)."""
    if not nom or not equipe_id:
        return None
    curseur.execute(
        "SELECT u.id, u.nom FROM equipe_membres em JOIN users u ON em.user_id=u.id WHERE em.equipe_id=%s",
        (equipe_id,)
    )
    nom_lower = nom.strip().lower()
    candidats = curseur.fetchall()
    for m in candidats:
        if nom_lower == (m['nom'] or '').lower():
            return m
    for m in candidats:
        if nom_lower in (m['nom'] or '').lower():
            return m
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
            cur.execute("UPDATE taches SET terminee=TRUE, terminee_le=NOW() WHERE id=%s AND user_id=%s", (tache_id, user_id))
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
                COUNT(CASE WHEN terminee=1 AND COALESCE(terminee_le, updated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as terminees_semaine,
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

        elif nom_fonction == "lister_membres_equipe":
            equipe_id, _ = resoudre_equipe_user(cur, user_id, arguments.get('equipe_id'))
            if not equipe_id:
                cur.execute("SELECT e.id, e.nom FROM equipe_membres em JOIN equipes e ON em.equipe_id=e.id WHERE em.user_id=%s", (user_id,))
                equipes = cur.fetchall()
                db.close()
                return {"tool": nom_fonction, "ok": False, "erreur": "Aucune équipe ou plusieurs équipes — précise equipe_id", "equipes_disponibles": equipes}
            cur.execute(
                "SELECT u.id, u.nom, em.role FROM equipe_membres em JOIN users u ON em.user_id=u.id WHERE em.equipe_id=%s ORDER BY em.rejoint_le ASC",
                (equipe_id,)
            )
            membres = cur.fetchall()
            result.update({"equipe_id": equipe_id, "membres": membres, "nb": len(membres)})

        elif nom_fonction == "creer_tache_equipe":
            titre = (arguments.get('titre') or '').strip()
            if not titre: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Titre vide"}
            equipe_id, role = resoudre_equipe_user(cur, user_id, arguments.get('equipe_id'))
            if not equipe_id:
                db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Équipe introuvable ou ambiguë (l'user a plusieurs équipes — précise equipe_id)"}
            assignee_id = None
            assignee_nom_resolu = None
            if arguments.get('assignee_nom'):
                membre = trouver_membre_par_nom(cur, equipe_id, arguments['assignee_nom'])
                if not membre:
                    db.close(); return {"tool": nom_fonction, "ok": False, "erreur": f"Membre '{arguments['assignee_nom']}' introuvable dans l'équipe"}
                assignee_id = membre['id']
                assignee_nom_resolu = membre['nom']
                if assignee_id != user_id and role != 'admin':
                    db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Seul un admin peut assigner à un autre membre"}
            priorite = arguments.get('priorite', 'moyenne')
            description = arguments.get('description', '')
            deadline = arguments.get('deadline_iso')
            cur.execute(
                "INSERT INTO taches_equipe (equipe_id, titre, description, priorite, assignee_id, createur_id, deadline, statut) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, 'todo')",
                (equipe_id, titre, description, priorite, assignee_id, user_id, deadline)
            )
            new_id = cur.lastrowid
            db.commit()
            try:
                cur.execute("SELECT nom FROM users WHERE id=%s", (user_id,))
                nom_user = (cur.fetchone() or {}).get('nom', 'Quelqu\'un')
                log_activite(equipe_id, user_id, nom_user, 'a créé la tâche', titre, new_id)
            except Exception:
                pass
            result.update({"id": new_id, "equipe_id": equipe_id, "titre": titre, "assignee_id": assignee_id, "assignee_nom": assignee_nom_resolu, "page_concernee": "collaboration"})

        elif nom_fonction == "assigner_tache_equipe":
            equipe_id, role = resoudre_equipe_user(cur, user_id, arguments.get('equipe_id'))
            if not equipe_id:
                db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Équipe introuvable ou ambiguë"}
            membre = trouver_membre_par_nom(cur, equipe_id, arguments.get('assignee_nom', ''))
            if not membre:
                db.close(); return {"tool": nom_fonction, "ok": False, "erreur": f"Membre '{arguments.get('assignee_nom')}' introuvable"}
            if membre['id'] != user_id and role != 'admin':
                db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Seul un admin peut assigner à un autre membre"}
            tache_id = arguments.get('tache_id')
            if not tache_id:
                t = trouver_tache_equipe_par_recherche(cur, equipe_id, arguments.get('recherche', ''))
                if not t: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche équipe introuvable"}
                tache_id = t['id']; titre_t = t['titre']
            else:
                cur.execute("SELECT titre FROM taches_equipe WHERE id=%s AND equipe_id=%s", (tache_id, equipe_id))
                r = cur.fetchone()
                if not r: db.close(); return {"tool": nom_fonction, "ok": False, "erreur": "Tâche introuvable dans cette équipe"}
                titre_t = r['titre']
            cur.execute("UPDATE taches_equipe SET assignee_id=%s WHERE id=%s", (membre['id'], tache_id))
            db.commit()
            try:
                cur.execute("SELECT nom FROM users WHERE id=%s", (user_id,))
                nom_user = (cur.fetchone() or {}).get('nom', 'Quelqu\'un')
                log_activite(equipe_id, user_id, nom_user, f'a assigné à {membre["nom"]} la tâche', titre_t, tache_id)
            except Exception:
                pass
            result.update({"id": tache_id, "titre": titre_t, "assignee_id": membre['id'], "assignee_nom": membre['nom'], "page_concernee": "collaboration"})

        elif nom_fonction == "naviguer_vers":
            page = arguments.get('page', '').strip().lower()
            section = arguments.get('section')
            pages_valides = {"dashboard", "planification", "collaboration", "analytics", "tomorrow-builder", "goal-reverse", "profile", "settings", "ia"}
            if page not in pages_valides:
                db.close(); return {"tool": nom_fonction, "ok": False, "erreur": f"Page inconnue : {page}"}
            result.update({"page": page, "section": section, "navigation": True})

        else:
            db.close()
            return {"tool": nom_fonction, "ok": False, "erreur": f"Outil inconnu : {nom_fonction}"}

        cur.close(); db.close()
        return result
    except Exception as e:
        try: db.close()
        except: pass
        import traceback
        return {"tool": nom_fonction, "ok": False, "erreur": "Erreur interne"}


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

        curseur.execute("SELECT id, titre, priorite, deadline, terminee, focus_date FROM taches WHERE user_id=%s ORDER BY terminee ASC, FIELD(priorite,'haute','moyenne','basse') ASC, deadline ASC LIMIT 25", (user_id,))
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

        # Contexte Google Calendar — injecté si connecté (non bloquant)
        cal_ctx, calendar_used = _build_calendar_context(user_id)
        if cal_ctx:
            system_prompt += cal_ctx

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
            "calendar_used": calendar_used,
        })

    except Exception as e:
        import traceback
        print(f"[GetShift AI] Erreur: {e}")
        return erreur_500(e)

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
                yield f"data: {json.dumps({'type': 'error', 'message': 'Erreur interne'})}\n\n"

        return Response(stream_with_context(generate()), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        })
    except Exception as e:
        import traceback
        return erreur_500(e)


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
            COUNT(CASE WHEN terminee=1 AND DATE(COALESCE(terminee_le, updated_at))=CURDATE() THEN 1 END) as terminees_aujourdhui,
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
        return jsonify({"erreur": "Erreur interne", "suggestions": []}), 500


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
        return erreur_500(e)


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
        return erreur_500(e)


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
        return jsonify({"erreur": "Erreur interne", "items": []}), 500

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
                return jsonify({"erreur": "Lecture Excel impossible"}), 500

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
                return jsonify({"erreur": "Lecture Word impossible"}), 500

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
                return jsonify({"erreur": "Vision IA indisponible"}), 500
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
        return erreur_500(e)


@app.route('/ia/expand-abreviations', methods=['POST'])
def route_expand_abreviations():
    data = request.get_json()
    texte = data.get('texte', '')
    expande = expand_abreviations(texte)
    return jsonify({"original": texte, "expande": expande, "modifie": texte != expande})


# ============================================
# BACKUP AUTOMATIQUE QUOTIDIEN — MINUIT

def _val_sql(val):
    """Sérialise une valeur Python en littéral SQL safe."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "1" if val else "0"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, datetime):
        return f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'"
    if hasattr(val, 'strftime'):
        return f"'{val.strftime('%Y-%m-%d')}'"
    escaped = str(val).replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"

def job_backup_quotidien():
    """
    Backup quotidien à minuit — version mémoire-efficiente :
    - Écrit ligne par ligne dans /tmp (pas d'accumulation en RAM)
    - fetchmany(500) pour éviter de charger toute la table d'un coup
    - Email : stats seulement (pas de pièce jointe → pas de base64 en RAM)
    """
    debut = datetime.now()
    tmp_path = '/tmp/gs_backup.sql'
    print(f"[Backup] Démarrage à {debut.strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        db = connecter()
        curseur = db.cursor(dictionary=True)

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

        curseur.execute("SHOW TABLES")
        tables = [list(row.values())[0] for row in curseur.fetchall()]
        # Exclure les tables volumineuses non critiques et le backup récursif
        tables_exclure = {'backups_data', 'ia_messages'}
        tables = [t for t in tables if t not in tables_exclure]

        nb_lignes_total = 0

        # ── Écriture streaming vers /tmp — zéro accumulation en RAM ──
        with open(tmp_path, 'w', encoding='utf-8') as f:
            f.write(f"-- GetShift Database Backup\n")
            f.write(f"-- Date : {debut.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"-- Tables : {len(tables)}\n")
            f.write("SET FOREIGN_KEY_CHECKS=0;\n\n")

            for table in tables:
                try:
                    curseur.execute(f"SHOW CREATE TABLE `{table}`")
                    create_result = curseur.fetchone()
                    create_sql = list(create_result.values())[1]
                    f.write(f"-- Table : {table}\n")
                    f.write(f"DROP TABLE IF EXISTS `{table}`;\n")
                    f.write(f"{create_sql};\n\n")

                    curseur.execute(f"SELECT * FROM `{table}`")
                    batch = curseur.fetchmany(500)
                    while batch:
                        nb_lignes_total += len(batch)
                        colonnes = list(batch[0].keys())
                        cols_str = ", ".join(f"`{c}`" for c in colonnes)
                        for row in batch:
                            vals_str = ", ".join(_val_sql(v) for v in row.values())
                            f.write(f"INSERT INTO `{table}` ({cols_str}) VALUES ({vals_str});\n")
                        batch = curseur.fetchmany(500)
                    f.write("\n")
                except Exception as e:
                    f.write(f"-- ERREUR table {table}: {e}\n\n")

            f.write("SET FOREIGN_KEY_CHECKS=1;\n")
            f.write(f"-- Fin — {nb_lignes_total} lignes exportées\n")

        # Lire le fichier une seule fois pour le stocker en DB, puis libérer
        with open(tmp_path, 'r', encoding='utf-8') as f:
            contenu_sql = f.read()

        taille_ko = len(contenu_sql.encode('utf-8')) // 1024
        duree = (datetime.now() - debut).total_seconds()
        nom_backup = f"getshift_backup_{debut.strftime('%Y%m%d_%H%M%S')}.sql"

        curseur.execute("""
            INSERT INTO backups_log (nom, taille_ko, nb_tables, nb_lignes_total, statut, duree_secondes)
            VALUES (%s, %s, %s, %s, 'succes', %s)
        """, (nom_backup, taille_ko, len(tables), nb_lignes_total, round(duree, 2)))
        backup_id = curseur.lastrowid
        curseur.execute("""
            INSERT INTO backups_data (backup_log_id, contenu) VALUES (%s, %s)
        """, (backup_id, contenu_sql))
        db.commit()

        # Libérer la string avant le cleanup (évite de tenir 2 copies en même temps)
        del contenu_sql

        curseur.execute("""
            DELETE bd FROM backups_data bd
            JOIN backups_log bl ON bd.backup_log_id = bl.id
            WHERE bl.id NOT IN (
                SELECT id FROM (SELECT id FROM backups_log ORDER BY cree_le DESC LIMIT 7) AS r
            )
        """)
        curseur.execute("""
            DELETE FROM backups_log
            WHERE id NOT IN (
                SELECT id FROM (SELECT id FROM backups_log ORDER BY cree_le DESC LIMIT 7) AS r
            )
        """)
        db.commit()
        curseur.close()
        db.close()

        try:
            import os as _os; _os.remove(tmp_path)
        except Exception:
            pass

        print(f"[Backup] OK — {taille_ko} Ko, {nb_lignes_total} lignes, {len(tables)} tables, {round(duree,1)}s")
        _envoyer_backup_email(nom_backup, taille_ko, nb_lignes_total, len(tables), round(duree, 2))

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


def _envoyer_backup_email(nom, taille_ko, nb_lignes, nb_tables, duree):
    """Envoie un email de confirmation de backup (stats uniquement, pas de pièce jointe)."""
    try:
        date_str = datetime.now().strftime('%d/%m/%Y à %H:%M')

        html = f"""
        <div style="font-family:Arial;max-width:540px;margin:auto;background:#111118;color:#e8e8f0;padding:0;border-radius:16px;overflow:hidden;border:1px solid #2a2a3a;">
            <div style="background:#1a1a24;padding:24px 32px;border-bottom:1px solid #2a2a3a;">
                <span style="font-size:18px;font-weight:800;color:#e8e8f0;letter-spacing:-0.5px;">GetShift</span>
                <span style="float:right;font-size:10px;color:#6b6b80;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">Backup quotidien</span>
            </div>
            <div style="padding:32px;">
                <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#e8e8f0;">Backup réussi</h2>
                <p style="margin:0 0 24px;font-size:13px;color:#6b6b80;">{date_str}</p>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:separate;border-spacing:6px;">
                    <tr>
                        <td width="25%">
                            <div style="background:#1a1a24;border:1px solid #2a2a3a;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:22px;font-weight:800;color:#e8e8f0;">{nb_tables}</div>
                                <div style="font-size:10px;color:#6b6b80;margin-top:2px;text-transform:uppercase;letter-spacing:0.8px;">Tables</div>
                            </div>
                        </td>
                        <td width="25%">
                            <div style="background:#1a1a24;border:1px solid #2a2a3a;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:22px;font-weight:800;color:#e8e8f0;">{nb_lignes}</div>
                                <div style="font-size:10px;color:#6b6b80;margin-top:2px;text-transform:uppercase;letter-spacing:0.8px;">Lignes</div>
                            </div>
                        </td>
                        <td width="25%">
                            <div style="background:#1a1a24;border:1px solid #E07A3E33;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:22px;font-weight:800;color:#E07A3E;">{taille_ko}</div>
                                <div style="font-size:10px;color:#6b6b80;margin-top:2px;text-transform:uppercase;letter-spacing:0.8px;">Ko</div>
                            </div>
                        </td>
                        <td width="25%">
                            <div style="background:#1a1a24;border:1px solid #2a2a3a;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:22px;font-weight:800;color:#e8e8f0;">{duree}s</div>
                                <div style="font-size:10px;color:#6b6b80;margin-top:2px;text-transform:uppercase;letter-spacing:0.8px;">Durée</div>
                            </div>
                        </td>
                    </tr>
                </table>

                <div style="background:#1a1a24;border:1px solid #2a2a3a;border-radius:10px;padding:14px;margin-bottom:20px;">
                    <div style="font-size:10px;color:#6b6b80;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Fichier</div>
                    <div style="font-size:13px;color:#e8e8f0;font-family:monospace;">{nom}</div>
                    <div style="font-size:11px;color:#44445a;margin-top:4px;">Stocké dans Aiven — 7 derniers conservés.</div>
                </div>

                <div style="font-size:12px;color:#44445a;border-top:1px solid #2a2a3a;padding-top:16px;">
                    Prochain backup : demain à minuit.
                </div>
            </div>
        </div>"""

        ok = envoyer_email(
            'chamdaane@gmail.com',
            f"Backup GetShift — {datetime.now().strftime('%d/%m/%Y')}",
            html,
        )
        if ok:
            print(f"[Backup] Email envoyé à chamdaane@gmail.com ({taille_ko} Ko)")
        else:
            print(f"[Backup] Erreur email: envoyer_email a retourné False")

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
        return erreur_500(e)


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
        return erreur_500(e)





# ============================================
# Scheduler — lancé ici pour que tous les job_* soient déjà définis
print("[BOOT] Démarrage scheduler...", flush=True)
threading.Thread(target=demarrer_scheduler, daemon=True).start()
print("[BOOT] Scheduler thread lancé", flush=True)


# ============================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)