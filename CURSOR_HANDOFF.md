# GetShift — Guide de passation (pour Cursor / tout autre assistant)

> Lis ce fichier EN ENTIER avant de coder. Il contient l'architecture, le flux de
> déploiement, les conventions critiques et les pièges déjà rencontrés. Respecte-le
> à la lettre — plusieurs bugs passés viennent de la violation de ces règles.
> Dernière mise à jour : 2026-06-04.

---

## 1. C'est quoi GetShift

App de productivité dopée à l'IA (gestion de tâches, planning IA, objectifs,
collaboration, analytics, gamification). Cible : étudiants & travailleurs.
Fondateur solo : Hamdaane CHITOU (étudiant data science, Bénin). 6 langues
(fr, en, es, pt, de, ar). Freemium (Gratuit / Pro 4,99 €).

- **Domaine** : https://usegetshift.com (Cloudflare DNS → GitHub Pages, HTTPS).
- **Repo** : github.com/chamdaane-a11y/taskflow — **PUBLIC** (⚠️ jamais de secret commité).
- **Marque affichée** : « GetShift » partout. L'assistant IA s'appelle « GetShift AI ».

---

## 2. Stack & arborescence

| Partie | Tech | Dossier |
|---|---|---|
| Frontend | React + Vite, HashRouter, framer-motion, i18next (6 langues), chart.js, axios | `frontend-react/` |
| Backend | Flask (1 seul fichier ~11 700 lignes), gunicorn | `backend/app.py` |
| DB | MySQL (pool `mysql.connector`) | `backend/database.py` |
| Docs | génération DOCX/PDF via python-docx + LibreOffice | `docs/` |

- Frontend pages : `frontend-react/src/pages/` (Dashboard, IAChat = page IA, TomorrowBuilder,
  GoalReverse, Analytics, Planification, Collaboration, Settings, Profile, Help, Landing,
  FounderConsole, Onboarding…). Hook central : `src/pages/useDashboard.js`.
- Composants partagés : `src/components/` (AppSidebar, BottomNavMobile, PushNotifToggle,
  GuidedTour [désactivé], PageGuide [désactivé]…).
- i18n : `src/i18n.js` + `public/locales/<lng>/translation.json` (1477 clés × 6 langues).

---

## 3. Déploiement (CRITIQUE à comprendre)

**Tout part d'un `git push origin main`** :
- **Frontend** → GitHub Actions (`.github/workflows/deploy.yml`) fait `npm ci && npm run build`
  puis publie `frontend-react/dist` sur GitHub Pages. `public/CNAME` = `usegetshift.com`.
  base Vite = `/`. SPA en HashRouter (routes `#/...`) + `404.html` pour les deep-links.
- **Backend** → Render (`getshift-backend.onrender.com`) **auto-déploie sur push** (config dans
  le dashboard Render, PAS de `render.yaml`). Procfile : `backend/Procfile`
  (gunicorn 1 worker, 8 threads, `--max-requests 600`, `--preload`).
- ⚠️ **Render = free tier 512 Mo** → OOM possible (redémarre, 500 transitoires). `--max-requests`
  recycle le worker pour limiter ça. Le backend **dort** quand inactif → 1er appel = 5-10 s (cold start).

**Vérifier un déploiement** : `curl -s -o /dev/null -w "%{http_code}" https://usegetshift.com/`
(200) et `.../health` côté backend. Le front met ~2-3 min, le back ~2-4 min.

---

## 4. Conventions NON NÉGOCIABLES

### 4.1 Colonnes timestamp (cf. `CLAUDE.md`)
- `created_at` (INSERT, jamais modifié), `updated_at` (auto ON UPDATE — **AUCUN usage analytics**),
  `terminee_le` (date de complétion), `focus_date`.
- **Pour « tâche complétée le X » : TOUJOURS `COALESCE(terminee_le, updated_at)`.** Jamais
  `DATE(updated_at)` nu. Un **pre-commit hook** (`.githooks/pre-commit`) bloque les usages nus.
  Setup après clone : `git config core.hooksPath .githooks`.
- Migrations : jamais `UPDATE table SET col=NOW()` sur des lignes non modifiées (corrompt `updated_at`).

### 4.2 MySQL — pièges du connecteur (déjà rencontrés)
- **`DATE_FORMAT(col, '%Y-%m-%d')` avec des paramètres `%s` dans la requête** → le connecteur ne
  déséchappe PAS `%%`, MySQL ressort la chaîne littérale (`%Y-%m-%d`). **Solution : formater les
  dates en Python** (`d.strftime(...)`), pas en SQL.
- **`LIMIT %s` paramétré** peut échouer → utiliser un littéral clampé en int (`f"... LIMIT {n}"`
  avec `n = max(1, min(int(x), MAX))`).
- **ONLY_FULL_GROUP_BY strict** : toute requête `GROUP BY` doit respecter la dépendance
  fonctionnelle (ne sélectionner que les colonnes groupées + agrégats).
- Injection SQL : les f-strings SQL n'interpolent QUE des noms de colonnes/tables **whitelistés**
  en dur ; les valeurs passent toujours par `%s`. Garde ce pattern.

### 4.3 Frontend
- **HashRouter** : naviguer via `navigate('/route', { state })`, jamais de `#fragment`.
- **Noms de marque en anglais** dans l'UI : « Tomorrow Builder », « Goal » restent EN (labels en
  dur dans `AppSidebar` NAV_ITEMS). « GetShift AI » = nom de l'IA partout.
- Auth : un **interceptor axios global** (`src/main.jsx`) ajoute `Authorization: Bearer <token>`
  depuis localStorage. Re-login requis après un changement de domaine/origin.

### 4.4 Push notifications (VAPID)
- `pywebpush` **mute** le dict `vapid_claims` (il y injecte `aud`/`exp`). **Toujours passer une
  copie fraîche** : `vapid_claims=dict(VAPID_CLAIMS)`. Sinon l'`exp` se fige → tous les pushs
  échouent en 401 après expiration (bug du « +100h sans notif »).
- Clés VAPID dans les env Render (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` en PEM `\n`-échappé).

---

## 5. Auth & sécurité

- Garde centrale : `@app.before_request _enforce_auth` (`backend/app.py` ~ligne 345).
  - `PUBLIC_ENDPOINTS` : login/register/health/vapid-public-key/OAuth callbacks…
  - `JOB_ENDPOINTS` : crons/backup → header `Authorization: Bearer <JOB_SECRET>`.
  - Sinon : JWT requis + ownership (le `user_id` du body est forcé à l'identité JWT — anti-IDOR).
- **Console Fondateur** : toute route `/admin/*` → 403 sauf si `_is_founder(uid)`
  (`FOUNDER_USER_ID` en env Render). Endpoints : overview, signups, timeseries, security,
  system, activity, errors, adoption, user/<id>, test-push.
- Hash mots de passe : scrypt (werkzeug) + rehash transparent des vieux SHA-256 au login.
- ⚠️ **Dette sécu connue** : `GROQ_API_KEY` est dans l'historique git public (1er commit) →
  **à roter** (révoquer sur la console Groq + maj Render). Les clés VAPID ont été rotées.
  Les autres secrets (SECRET/JWT/DB/Brevo/OAuth/Notion) ont été ajoutés APRÈS retrait du `.env`
  → pas dans l'historique.

---

## 6. Variables d'environnement (Render)

`SECRET_KEY`, `JWT_SECRET_KEY` (l'app refuse de démarrer sans), `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `GROQ_API_KEY`, `BREVO_API_KEY` (emails), `FOUNDER_USER_ID`,
`JOB_SECRET` (crons), identifiants DB, OAuth Google (client id/secret) + Notion + Tavily.
`.env` et `*.pem` sont gitignorés — **ne jamais les committer**.

---

## 7. Lancer en local

```bash
# Frontend
cd frontend-react && npm install && npm run dev      # build : npm run build

# Backend (nécessite un .env avec les secrets + accès DB)
cd backend && pip install -r requirements.txt && python app.py
```

Le frontend tape par défaut `https://getshift-backend.onrender.com` (constante `API` en dur
dans chaque page) — pour du local backend, adapter.

---

## 8. Générer les docs (.md → .docx/.pdf)

```bash
cd docs && python3 _md_to_docx.py FICHIER.md
soffice --headless --norestore "-env:UserInstallation=file:///tmp/lo" --convert-to pdf --outdir . FICHIER.docx
```
(Lancer soffice en avant-plan ; le tuer entre deux runs : `pkill -9 soffice.bin`.)

---

## 9. État actuel & chantiers ouverts

- ✅ Migration domaine usegetshift.com, SEO de base (meta, JSON-LD, robots, sitemap, og-image, favicon).
- ✅ IA unifiée « GetShift AI » (3 tons réglables, plus de personas Alex/Max/Nova). Page /ia épurée.
- ✅ Console Fondateur complète (6 onglets). Mémoire IA réparée (schéma user_memory).
- ✅ Push notifs réparées (claims VAPID + rotation clés). Sécurité durcie (IDOR, secrets fail-closed).
- 🟡 **GROQ_API_KEY à roter** (cf. §5). Render 512 Mo (surveiller l'onglet Erreurs de la console).
  GCal : import auto au chargement du dashboard (le webhook expire) — vérifier la reconnexion OAuth.
- 🟡 Intégrations Zoom / Slack / Discord : à faire (Discord en priorité — public étudiant).
- 🟡 Lancement LinkedIn en cours (cf. `docs/LINKEDIN_LANCEMENT.md`, `docs/PITCH_GETSHIFT.md`,
  `docs/GETSHIFT_DIFFERENCIATION_MONETISATION.md`, `docs/PLAN_ARGENT_EN_LIGNE_17ANS.md`).

---

## 10. Workflow Git attendu

- Commits clairs, en français, finissant par `Co-Authored-By: ...` si généré par IA.
- **Tester avant de pousser** : `npm run build` (frontend) + `python3 -m py_compile backend/app.py`.
- Pousser sur `main` déclenche les 2 déploiements. Vérifier le live après (curl / la page).
- Le fondateur est **perfectionniste** et **ne veut aucune erreur** : ne jamais shipper de l'UI
  mobile à l'aveugle — vérifier ou demander une capture.
