# GetShift

**Application de productivité IA — pour étudiants et travailleurs qui veulent performer, pas juste cocher des cases.**

> Live → [usegetshift.com](https://usegetshift.com/)  
> Backend → [getshift-backend.onrender.com](https://getshift-backend.onrender.com/health)

---

## Vision

**GetShift répond aux besoins de l'utilisateur — jamais l'inverse.**

L'application doit se plier à la réalité de la personne. L'IA propose, elle n'impose jamais. Le contrôle final reste toujours à l'humain. Aucun "happy path" obligatoire : l'utilisateur entre par où il veut, sort quand il veut.

**Mission :** rendre l'utilisateur maximalement performant. Si une feature n'y contribue pas, elle n'a pas sa place dans GetShift.

**Ce qui différencie GetShift de Todoist / Notion / TickTick :**

| Feature signature | Ce que c'est |
|---|---|
| **Task DNA** | Score IA 0–100 sur la viabilité d'une tâche avant même de la créer (clarté, effort, blocages, estimation) |
| **Bin Packing AI** | Tomorrow Builder — construit ton planning du lendemain en tenant compte de ton énergie, tes meetings Calendar et ton backlog |
| **AI Coach personas** | Alex (strict), Max (motivant), Nova (analytique) — relation émotionnelle avec l'IA, pas un simple chatbot |
| **Google Calendar bidirectionnel** | Sync tâches → events Calendar (deadline, focus, manuel) + overlay Calendar dans Planification + conflict detection |
| **Gamification visible** | 10 niveaux, 4 piliers de badges, streaks, streak freeze — tout sur le Dashboard, pas caché dans un profil |
| **Goal Reverse** | L'IA décompose un objectif ambitieux en sous-tâches réalistes avec jalons et critères de succès |
| **Chrome Extension** | Capture les tâches depuis Zoom, Meet, Drive, Notion, Slack sans quitter la page |

---

## Cibles

- **Étudiants** — structure, motivation, gamification, planification d'études + projets perso
- **Travailleurs** (freelances, salariés, indépendants) — focus, priorisation, réduction charge mentale, fin de journée avec sentiment d'accomplissement

---

## Stack technique

| Couche | Technologie | Hébergement |
|---|---|---|
| Frontend | React 19 + Vite 8 | GitHub Pages |
| Backend | Flask 3.1 + Python 3.14 | Render (free tier) |
| Base de données | MySQL | Aiven (free tier) |
| IA | Groq API — `llama-3.3-70b-versatile` | — |
| Emails transactionnels | Brevo | — |
| Push notifications | Web Push (VAPID) | — |
| Auth | JWT (flask-jwt-extended) + Google OAuth | — |
| CI/CD | GitHub Actions | — |

---

## Structure du projet

```
mon_site/
├── backend/                        # API Flask
│   ├── app.py                      # Monolithe ~9 500 lignes — tous les endpoints + jobs + emails
│   ├── database.py                 # connecter() — wrapper MySQL (vars env MYSQL*)
│   ├── requirements.txt
│   ├── runtime.txt                 # python-3.14 (Render lit ce fichier)
│   ├── Procfile                    # web: gunicorn app:app (gunicorn 23+ requis)
│   └── vapid_*.pem                 # Clés VAPID pour Web Push
│
├── frontend-react/                 # Application React
│   ├── public/
│   │   ├── sw.js                   # Service Worker — cache offline v15
│   │   ├── manifest.json           # PWA manifest
│   │   ├── favicon.svg
│   │   ├── logo.svg                # Logo Concept B (plaques décalées, ember gradient)
│   │   ├── 404.html                # Fallback SPA routing pour GitHub Pages
│   │   └── icons/                  # Icônes PWA 72→512px
│   ├── src/
│   │   ├── App.jsx                 # HashRouter + 18 routes
│   │   ├── main.jsx                # Entry point + GoogleOAuthProvider
│   │   ├── db.js                   # IndexedDB — cache offline des tâches
│   │   ├── themes.js               # Définitions thèmes Parchemin / Graphite
│   │   ├── useTheme.js             # applyTheme() + event gs:theme-change
│   │   ├── useMediaQuery.js        # Hook breakpoint responsive
│   │   ├── useOffline.js           # Détection online/offline
│   │   ├── theme/
│   │   │   └── tokens.css          # Variables CSS design system (--ember, --bg-base, etc.)
│   │   ├── data/
│   │   │   └── badges.js           # Config 4 piliers × N badges — BADGES_CONFIG, TIER_STYLES
│   │   ├── utils/
│   │   │   └── parseTask.js        # Parser NLP — "demain 15h prio haute" → {titre, deadline, priorite}
│   │   ├── components/
│   │   │   ├── AppSidebar.jsx      # Sidebar gauche partagée (desktop + drawer mobile)
│   │   │   ├── BottomNavMobile.jsx # Navigation bas mobile (5 icônes)
│   │   │   ├── GetShiftMark.jsx    # Composant logo officiel — source unique de vérité
│   │   │   ├── MobileBackButton.jsx
│   │   │   ├── ProchainBadgeBanner.jsx
│   │   │   └── useSidebarUser.js   # Hook — lit localStorage user + calcule niveau/points/pctNiveau
│   │   └── pages/                  # Pages routées + sous-composants
│   │       ├── Landing.jsx
│   │       ├── Splash.jsx
│   │       ├── Login.jsx / Register.jsx / ForgotPassword.jsx / ResetPassword.jsx
│   │       ├── Onboarding.jsx      # Full-screen 7 étapes — intégrations OAuth + profil utilisateur
│   │       ├── Dashboard.jsx       # Page principale — KPIs, focus du jour, IA, gamification
│   │       ├── useDashboard.js     # Logique métier Dashboard — state global tâches/user/offline
│   │       ├── Profile.jsx         # Niveau, badges, streak, timeline
│   │       ├── IAChat.jsx          # Chat coach Alex/Max/Nova + 8 outils IA (dont Task DNA)
│   │       ├── Analytics.jsx       # Charts Chart.js — productivité, Task DNA calibration
│   │       ├── Planification.jsx   # Kanban + Calendrier + overlay Google Calendar
│   │       ├── CalendarGrid.jsx    # Grille semaine drag-and-drop
│   │       ├── KanbanColumn.jsx    # Colonne Kanban + menu sync Calendar
│   │       ├── TimeBlock.jsx       # Bloc horaire planification + badge conflit
│   │       ├── calendarUtils.js    # detectConflicts() + helpers date/heure
│   │       ├── useCalendarEvents.js # Hook — fetch events Google Calendar
│   │       ├── TomorrowBuilder.jsx # Bin Packing AI — planning du lendemain
│   │       ├── GoalReverse.jsx     # Décomposition objectif en sous-tâches IA
│   │       ├── Collaboration.jsx   # Équipes + invitations + tâches partagées
│   │       ├── Settings.jsx        # Apparence, Intégrations, Notifications, Compte
│   │       ├── Help.jsx            # Documentation complète (12 sections, TOC, scrollspy)
│   │       ├── OutilsIntegrations.jsx # UI connect/disconnect OAuth (Calendar, Drive, Gmail, Notion, Slack)
│   │       ├── AgendaSection.jsx   # Section "Agenda du jour" dans Dashboard
│   │       ├── PlanificationInsights.jsx
│   │       ├── PomodoroWidget.jsx  # Timer Pomodoro avec Wake Lock API
│   │       ├── CoachFloat.jsx      # Bouton flottant chat IA (toutes pages)
│   │       ├── ExportModal.jsx     # Export CSV/JSON
│   │       ├── CustomIcons.jsx     # TemplateIconBox + ICON_MAP catégories
│   │       └── CGU.jsx
│
├── getshift-extension/             # Chrome Extension (Manifest V3)
│   ├── manifest.json               # Permissions : activeTab, storage, notifications, identity
│   ├── background.js               # Service worker extension
│   ├── content.js / content.css    # Injecté sur Zoom/Meet/Drive/Notion/Slack
│   ├── popup.html
│   └── icons/
│
├── frontend/                       # Legacy — ancien frontend HTML/JS (avant migration React, non utilisé)
│
├── .github/workflows/
│   ├── deploy.yml                  # Build + deploy GitHub Pages sur push main
│   ├── notifications-daily.yml     # 3 ticks/jour (7h, 11h, 18h UTC) → push notifications
│   ├── weekly-report.yml           # Vendredi 17h UTC → email récap hebdo
│   ├── keep-alive.yml              # Ping Render pour éviter le cold start
│   └── claude.yml                  # Claude Code bot pour issues/PRs GitHub
│
├── .githooks/
│   └── pre-commit                  # Bloque DATE(updated_at) nu dans les requêtes SQL
│
├── CLAUDE.md                       # Instructions pour Claude Code (contrat colonnes timestamp, règles migration)
└── README.md                       # Ce fichier
```

---

## Pages & routes

| URL (`#/...`) | Page | Description |
|---|---|---|
| `/` | Landing | Page publique marketing |
| `/splash` | Splash | Écran de chargement + vérification session |
| `/login` | Login | Email + mot de passe ou Google OAuth |
| `/register` | Register | Inscription + email de vérification |
| `/forgot-password` | ForgotPassword | Demande de reset |
| `/reset-password/:token` | ResetPassword | Nouveau mot de passe via lien email |
| `/dashboard` | **Dashboard** | Page principale — hub central de l'app |
| `/profile` | Profile | Niveau, XP, badges, streaks, timeline |
| `/ia` | IAChat | Chat IA multi-coach + 8 outils (Task DNA, planification, etc.) |
| `/analytics` | Analytics | Graphiques productivité, Task DNA calibration |
| `/planification` | Planification | Kanban / Calendrier / Time blocks + overlay Calendar |
| `/tomorrow` | TomorrowBuilder | Bin Packing AI — planning intelligent du lendemain |
| `/goal` | GoalReverse | Décomposition IA d'un objectif en sous-tâches réalistes |
| `/collaboration` | Collaboration | Équipes, invitations, tâches partagées |
| `/settings` | Settings | Apparence, Intégrations OAuth, Notifications, Compte |
| `/help` | Help | Documentation produit complète (12 sections, TOC sidebar) |
| `/cgu` | CGU | Conditions générales d'utilisation |

---

## Démarrage local

### Prérequis

- Node.js 20+
- Python 3.14+
- MySQL 8+ (ou accès Aiven)

### Frontend

```bash
cd frontend-react
npm ci
npm run dev
# → http://localhost:5173/
```

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # renseigner les variables
python app.py
# → http://localhost:5000
```

Puis dans `frontend-react/src/pages/Dashboard.jsx` (et autres pages), remplacer :
```js
const API = 'https://getshift-backend.onrender.com'
// par
const API = 'http://localhost:5000'
```

### Pre-commit hook (analytics data safety)

```bash
git config core.hooksPath .githooks
```

Ce hook bloque tout usage de `DATE(updated_at)` nu dans les requêtes SQL — voir `CLAUDE.md` pour le contexte.

---

## Variables d'environnement (backend)

| Variable | Description |
|---|---|
| `MYSQLHOST` | Hôte MySQL (ex: Aiven) |
| `MYSQLUSER` | Utilisateur MySQL |
| `MYSQLPASSWORD` | Mot de passe MySQL |
| `MYSQLDATABASE` | Nom de la base |
| `MYSQLPORT` | Port MySQL (ex: 22694) |
| `GROQ_API_KEY` | Clé API Groq (LLM) |
| `BREVO_API_KEY` | Clé API Brevo (emails transactionnels) |
| `JWT_SECRET_KEY` | Secret JWT flask-jwt-extended |
| `GOOGLE_CLIENT_ID` | OAuth Google — client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth Google — secret |
| `GCAL_CLIENT_ID` | OAuth Google Calendar spécifique (peut être identique) |
| `GCAL_CLIENT_SECRET` | OAuth Google Calendar spécifique |
| `NOTION_CLIENT_ID` | OAuth Notion |
| `NOTION_CLIENT_SECRET` | OAuth Notion |
| `VAPID_PRIVATE_KEY` | Clé privée Web Push |
| `VAPID_PUBLIC_KEY` | Clé publique Web Push |
| `INTEGRATIONS_ENCRYPTION_KEY` | Clé Fernet — chiffre les tokens OAuth en DB |
| `FRONTEND_URL` | `https://usegetshift.com` |

---

## Base de données — schéma principal

Les tables sont créées au démarrage via `CREATE TABLE IF NOT EXISTS` + `run_migrations()` pour les `ALTER TABLE` idempotents.

| Table | Rôle |
|---|---|
| `users` | Comptes — nom, email, password (SHA256), google_id, points, niveau, streak, theme, notif_prefs |
| `taches` | Tâches — titre, priorite (haute/moyenne/basse), deadline, terminee, statut (Kanban), focus_date, temps_estime, google_event_id, gcal_sync_mode |
| `sous_taches` | Sous-tâches liées à une tâche |
| `categories` | Catégories utilisateur (nom + couleur) |
| `dependances` | Prérequis entre tâches |
| `templates` | Templates de tâches (25 seeds par défaut + custom) |
| `template_taches` | Tâches d'un template |
| `task_dna_analyses` | Historique des analyses Task DNA (score, prediction, catégorie) |
| `tomorrow_plans` | Plans Bin Packing AI (JSON du planning + score énergie) |
| `planification` | Time blocks — tache_id, date, heure_debut, heure_fin |
| `coach_messages` | Historique conversations IA coach |
| `user_memory` | Mémoire conversationnelle IA — clé/valeur par catégorie |
| `historique_ia` | Log requêtes IA génériques |
| `equipes` / `equipe_membres` | Équipes de collaboration + membres |
| `taches_equipe` | Tâches partagées dans une équipe |
| `commentaires_tache` / `commentaires` | Commentaires sur tâches |
| `collaborations` | Partages 1-to-1 entre utilisateurs |
| `integrations` | Tokens OAuth chiffrés Fernet (google_calendar, google_drive, gmail, notion) |
| `push_subscriptions` | Souscriptions Web Push navigateur |
| `badges_utilisateurs` | Badges débloqués par utilisateur |
| `user_sessions` | Sessions actives — device, IP, last_seen, JTI JWT |
| `notifications_envoyees` | Anti-doublon push — user_id + type + timestamp |
| `gcal_watch_channels` | Canaux webhook Google Calendar temps réel |
| `oauth_states` | États CSRF temporaires flux OAuth |
| `backups_log` / `backups_data` | Sauvegardes base de données |

### Règle critique — colonnes timestamp

La table `taches` a **3** colonnes temporelles aux sémantiques distinctes :

- `created_at` — date de création, **ne change jamais**
- `updated_at` — mis à jour automatiquement (`ON UPDATE CURRENT_TIMESTAMP`) à chaque modification — **interdit en analytics**
- `terminee_le` — posé quand `terminee` passe à TRUE, reset à NULL si dé-togglé — **seul champ légitime pour "date de complétion"**

Toujours utiliser `COALESCE(terminee_le, updated_at)` pour les analytics de complétion.

---

## API — endpoints principaux

### Auth & Utilisateurs
```
POST   /register                          Inscription
POST   /login                             Connexion
POST   /auth/google                       OAuth Google
GET    /verify-email/<token>              Vérification email
POST   /forgot-password                   Reset password
POST   /reset-password
GET    /users/<id>                        Profil utilisateur
PUT    /users/<id>/nom                    Changer le nom
PUT    /users/<id>/password               Changer le mot de passe
PUT    /users/<id>/theme                  Changer le thème
GET    /users/<id>/notif-prefs            Préférences notifications
PUT    /users/<id>/notif-prefs            Sauvegarder préférences
GET    /users/<id>/export                 Export JSON de toutes les données
GET    /users/<id>/badges                 Badges + streak
GET    /users/<id>/gamification           Niveau, points, % prochain niveau
GET    /users/<id>/calibration            Calibration Task DNA (ratio temps réel/estimé)
POST   /users/<id>/email-change/request   Demande changement email
DELETE /users/<id>                        Suppression de compte
```

### Tâches
```
GET    /taches/<user_id>                  Liste des tâches
POST   /taches                            Créer une tâche
PUT    /taches/<id>                       Modifier (titre, priorité, deadline, terminee…)
DELETE /taches/<id>                       Supprimer
PATCH  /taches/<id>/statut               Kanban (todo / en_cours / terminee)
PATCH  /taches/<id>/focus                Épingler au Focus du jour
GET    /taches/rappels/<user_id>          Tâches avec deadline proche
```

### IA — features signatures
```
POST   /ia/task-dna                       Task DNA — score viabilité 0–100
GET    /ia/task-dna/stats/<user_id>       Historique + calibration DNA
POST   /ia/planifier                      Plan hebdomadaire IA
GET    /ia/tomorrow-builder/<user_id>     Générer le planning du lendemain (Bin Packing)
POST   /ia/goal-reverse                   Décomposer un objectif en sous-tâches
POST   /ia/coach/chat                     Chat avec coach (Alex / Max / Nova)
POST   /ia/smart-planning/trigger         Déclencher le Bin Packing automatique
POST   /ia/sous-taches-contextuelles      Décomposer une tâche en sous-tâches
POST   /ia/generer-taches                 Générer 5 tâches depuis un objectif
GET    /ia/procrastination/<user_id>      Analyser patterns de procrastination
```

### Google Calendar (intégration bidirectionnelle)
```
GET    /auth/google/calendar/start        Démarrer le flux OAuth Calendar
GET    /integrations/google-calendar/events/<user_id>   Events du jour / d'une période
POST   /integrations/google-calendar/sync-task/<id>     Sync tâche → event (deadline/focus/manuel)
DELETE /integrations/google-calendar/sync-task/<id>     Désynchroniser
POST   /integrations/google-calendar/webhook            Webhook temps réel Google
```

### Notifications push
```
POST   /push/subscribe                    Enregistrer une souscription Web Push
POST   /notifications/daily-matin         Tick matin (déclenché par GitHub Actions)
POST   /notifications/daily-midi          Tick midi
POST   /notifications/daily-soir          Tick soir (streak warning + win-back)
POST   /notifications/lifecycle-tick      Notifications onboarding (J+1, J+7, J+30)
GET    /health                            Status + build marker
```

---

## Intégrations OAuth

| Service | Status | Périmètre |
|---|---|---|
| **Google Calendar** | Réel — OAuth `calendar` (read+write) | Affichage events, sync tâches → events, webhook temps réel, conflict detection |
| **Google Drive** | Réel — OAuth `drive.readonly` | Lecture fichiers Drive dans le contexte IA |
| **Gmail** | Réel — OAuth `gmail.readonly` | Lecture emails dans le contexte IA |
| **Notion** | Réel — OAuth Notion API | Lecture pages Notion dans le contexte IA |
| **Slack** | Webhook uniquement | Envoi de notifications dans un channel Slack |

Les tokens OAuth sont chiffrés avec une clé Fernet (`INTEGRATIONS_ENCRYPTION_KEY`) avant stockage en DB.

---

## Système de notifications

GetShift envoie des push notifications Web Push via **3 canaux déclenchés par GitHub Actions** :

| Cron | Heure Paris | Description |
|---|---|---|
| `0 7 * * *` | 8h | Planning du jour (Tomorrow Builder ou fallback logique) |
| `0 11 * * *` | 12h | Encouragement mi-journée |
| `0 18 * * *` | 19h | Streak warning + winback |
| `0 17 * * 5` | 18h (vendredi) | Email récap hebdomadaire |

Avant chaque tick, le workflow "réveille" le backend Render (cold start ~30s) avec 3 tentatives.

Chaque envoi vérifie la table `notifications_envoyees` pour éviter les doublons (anti-spam par type + intervalle).

---

## Design system — Graphite & Ember

Deux thèmes exclusifs, conçus pour le deep work. Aucun violet/bleu IA. Aucun blanc pur ni noir absolu.

| Token CSS | Rôle |
|---|---|
| `--bg-base` | Fond principal (Parchemin `#F4F1EB` / Graphite `#0E1011`) |
| `--surface-1` | Cards, sidebars |
| `--surface-2` | Inputs, hovers |
| `--text-primary` | Texte principal |
| `--text-secondary` | Texte secondaire, labels |
| `--border-subtle` | Bordures discrètes |
| `--ember` | Accent principal `#E07A3E` — CTA, actif, highlight |
| `--ember-soft` | Fond ember léger (backgrounds de cartes actives) |
| `--ember-hover` | Ember plus sombre pour les hover states |
| `--font-ui` | Geist, Inter, system-ui |

### Logo GetShift (`<GetShiftMark />`)

Composant React partagé `src/components/GetShiftMark.jsx` — source unique de vérité du logo.  
Concept : deux plaques carrées décalées (back plate outline, front plate filled) sur fond ember gradient.

```jsx
import GetShiftMark from '../components/GetShiftMark'
<GetShiftMark size={32} showAccent={true} />
```

---

## Chrome Extension

Dossier `getshift-extension/` — **Manifest V3**.

**Sites détectés :**
- Zoom (`*.zoom.us/j/*`)
- Google Meet
- Google Drive / Docs
- Notion
- Slack
- Discord

Injecte un bouton "Créer une tâche GetShift" sur ces pages.  
Communique avec `getshift-backend.onrender.com`.

**Installation manuelle (dev) :**
1. `chrome://extensions` → activer "Mode développeur"
2. "Charger l'extension non empaquetée" → sélectionner `getshift-extension/`

---

## CI/CD

| Workflow | Déclencheur | Action |
|---|---|---|
| `deploy.yml` | Push sur `main` | Build Vite + deploy GitHub Pages |
| `notifications-daily.yml` | Cron 3×/jour + manuel | Ticks matin/midi/soir + lifecycle |
| `weekly-report.yml` | Cron vendredi 17h UTC | Email récap hebdo |
| `keep-alive.yml` | Cron régulier | Ping `/health` pour maintenir le backend Render éveillé |
| `claude.yml` | Issues/PRs GitHub | Claude Code bot pour review / aide |

---

## Points de vigilance

| Sujet | Détail |
|---|---|
| **Repo GitHub** | Nommé `taskflow` (legacy avant rebrand) — site public : `usegetshift.com` |
| **HashRouter** | Toutes les URLs ont `#` (`/#/dashboard`) — obligatoire pour GitHub Pages (pas de serveur SSR) |
| **Cold start Render** | Free tier → backend dort après 15 min d'inactivité → premier appel prend ~30s |
| **Backend monolithe** | Tout dans `app.py` (~9 500 lignes) — blueprints Flask à prévoir |
| **Pas de migrations formelles** | Tables via `CREATE TABLE IF NOT EXISTS` + `run_migrations()` au démarrage |
| **Doublon ExportModal** | `src/components/ExportModal.jsx` ET `src/pages/ExportModal.jsx` — vérifier lequel est importé avant toucher |
| **Legacy frontend** | `frontend/` (HTML/JS vanilla) n'est plus utilisé mais reste dans le repo |
| **updated_at interdit en analytics** | Voir `CLAUDE.md` — le pre-commit hook bloque les requêtes SQL nu sur cette colonne |

---

## Licence

Projet personnel — solo developer. Non open-source pour l'instant.

---

*Construit avec React, Flask, Groq, et beaucoup de café.*
