# Google OAuth Verification — Rationale par scope (GetShift)

Document à copier-coller section par section dans le formulaire Google OAuth verification.
Version bilingue FR/EN — utilise l'anglais pour la soumission (review plus rapide).

---

## A) App Information (générique)

### App Name
GetShift

### App Domain
https://getshift.app
(ou ton domaine GitHub Pages actuel — adapte si différent)

### Privacy Policy URL
https://getshift.app/#/privacy

### Terms of Service URL
https://getshift.app/#/cgu

### App description (≈300 mots)

**Français** :
> GetShift est un assistant de productivité personnel basé sur l'intelligence artificielle, conçu principalement pour les étudiants et les jeunes travailleurs. L'application aide les utilisateurs à gérer leurs tâches, planifier leur journée, et rester focus grâce à des fonctionnalités comme un Pomodoro intégré, un système de gamification (niveaux, badges, streaks), et un assistant conversationnel.
>
> Les intégrations Google sont **optionnelles** et **explicitement activées par l'utilisateur** depuis la page Réglages → Intégrations. Elles permettent à GetShift de proposer des suggestions de tâches à partir des emails, événements et fichiers de l'utilisateur, et de synchroniser les deadlines avec Google Calendar.
>
> Aucune donnée Google n'est partagée avec un tiers, utilisée pour de la publicité, ni revendue. Les tokens OAuth sont stockés chiffrés (Fernet) côté serveur. Seuls les liens vers les ressources d'origine (URL Gmail, URL Calendar event, URL Drive) sont conservés en base — jamais le contenu lui-même.

**English** :
> GetShift is a personal AI-powered productivity assistant, designed mainly for students and young professionals. The app helps users manage tasks, plan their day, and stay focused with features like a built-in Pomodoro timer, a gamification system (levels, badges, streaks), and a conversational assistant.
>
> Google integrations are **optional** and **explicitly enabled by the user** from the Settings → Integrations page. They allow GetShift to suggest tasks from the user's emails, events, and files, and to sync deadlines with Google Calendar.
>
> No Google data is shared with any third party, used for advertising, or sold. OAuth tokens are stored encrypted (Fernet) server-side. Only links to the original resources (Gmail URL, Calendar event URL, Drive URL) are stored in the database — never the content itself.

---

## B) Scope 1 — Google Calendar
`https://www.googleapis.com/auth/calendar`

### Q: What features in your application require this scope?

**English** (à copier dans le formulaire) :
> GetShift uses the Calendar scope for **bi-directional synchronization** between the user's tasks and their Google Calendar:
>
> 1. **Read events** — fetch upcoming events to display the user's day in the Planning view, detect time conflicts when scheduling tasks, and import meaningful events as tasks (e.g., "Prepare slides for client meeting").
> 2. **Create events** — when the user sets a deadline on a task or pins it to a focus slot, GetShift creates the corresponding Google Calendar event so the task is visible in their existing calendar workflow.
> 3. **Update events** — if the user changes a task's date, time or title in GetShift, the linked Calendar event is updated to match.
> 4. **Delete events** — when the user completes or deletes a task, the corresponding event is removed from Calendar to keep it clean.
> 5. **Real-time webhook** — GetShift subscribes to Calendar push notifications so that events created or modified directly in Google Calendar are reflected in GetShift within seconds.
>
> All of this is initiated and controlled by the user from the GetShift interface. The user can disconnect at any time from Settings → Integrations.

**Français** (pour ta compréhension) :
> GetShift utilise le scope Calendar pour une synchronisation bidirectionnelle entre les tâches de l'utilisateur et son Google Calendar (lecture, création, modification, suppression d'events + webhook temps réel).

### Q: How does it benefit users?

> Users keep a single source of truth for their schedule. Tasks created in GetShift automatically appear in their existing Google Calendar (used on phone, computer, watch). Conflicts between meetings and planned tasks are detected before the user commits to a schedule. They don't have to manually duplicate work between two systems.

### Q: Why couldn't you use a narrower scope?

> We need write access to create, update and delete events as part of the bi-directional sync (not just read). The narrower `calendar.events` scope was considered but our webhook integration requires `calendar` for the channel subscription. We do **not** access free/busy or settings of other calendars — only the primary calendar of the authenticated user.

---

## C) Scope 2 — Gmail (read-only)
`https://www.googleapis.com/auth/gmail.readonly`

### Q: What features in your application require this scope?

**English** :
> GetShift uses the Gmail read-only scope to power its **AI Task Extraction** feature, accessed from the Tomorrow Builder page:
>
> 1. The user explicitly clicks **"Scan my emails"** in the Tomorrow Builder UI. There is no background scanning.
> 2. GetShift fetches at most 10 of the user's most recent unread emails from the last 7 days (excluding promotional and social categories, which Gmail labels automatically).
> 3. Only the **subject, sender, and a 400-character snippet** of the body are passed to an LLM (Llama 3.3, via Groq) to extract actionable items (e.g., "Reply to John about Q3 contract").
> 4. The user is shown the AI suggestions and **manually selects** which ones to import as tasks. Nothing is auto-created.
> 5. When a task is imported, GetShift stores **only a URL pointing back to the original email** (`https://mail.google.com/mail/#all/{message_id}`) — never the email content itself.
> 6. The Gmail `message_id` is recorded in a deduplication table so the same email is never re-suggested.
>
> The user can disconnect Gmail at any time from Settings → Integrations.

### Q: How does it benefit users?

> Users no longer have to manually create tasks for things they receive by email. The AI filters out newsletters, automated notifications, and irrelevant emails, leaving only true action items. This saves an estimated 10-15 minutes of inbox triage per day for active email users.

### Q: Why couldn't you use a narrower scope?

> The `gmail.readonly` scope is the minimum scope that allows reading the body of messages, which is necessary for the LLM to determine whether an email contains an actionable item. Narrower scopes like `gmail.metadata` would only expose headers (subject, sender) — insufficient to detect actions described in the email body. We do **not** send, modify, or delete any emails — read-only is the strict upper bound of what we do.

---

## D) Scope 3 — Google Drive (metadata read-only)
`https://www.googleapis.com/auth/drive.metadata.readonly`

### Q: What features in your application require this scope?

**English** :
> GetShift uses the Drive metadata read-only scope to suggest connecting tasks to relevant Drive files:
>
> 1. From the Tomorrow Builder page, GetShift lists the user's **recently edited Drive files** (name, type, last-modified date, and `webViewLink` URL).
> 2. The user can click "Create a task" next to any file to link a GetShift task to that document (e.g., a task "Finalize Q3 report" linked to the actual Google Doc).
> 3. **No file content is ever read.** We only access the metadata: file name, modification date, MIME type, and the `webViewLink` (the shareable URL).
> 4. When a task is linked to a Drive file, GetShift stores only the `webViewLink` URL. Clicking the Drive logo on the task card opens the file directly in Drive.
>
> The user can disconnect Drive at any time from Settings → Integrations.

### Q: How does it benefit users?

> Users can quickly turn "the document I was working on yesterday" into a tracked task, with one click. The integration bridges Drive (where work happens) and GetShift (where work is tracked), without duplicating data.

### Q: Why couldn't you use a narrower scope?

> The `drive.metadata.readonly` scope is already the most restrictive scope available for listing the user's files. Even narrower scopes like `drive.file` would only expose files explicitly opened/created by our app, which defeats the purpose of suggesting recent files the user already works on. We deliberately **avoid** `drive.readonly` or `drive` because we never need file content.

---

## E) Limited Use Compliance Statement

À inclure dans la **Privacy Policy** (page `/privacy`) si pas déjà fait. Voici le texte exact attendu par Google :

**English (obligatoire dans la Privacy Policy)** :
> GetShift's use and transfer of information received from Google APIs to any other app will adhere to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the **Limited Use** requirements.
>
> Specifically:
> - GetShift uses Google user data only to provide and improve user-facing features in GetShift.
> - GetShift does not transfer Google user data to third parties except as necessary to provide or improve user-facing features.
> - GetShift does not use Google user data for serving advertisements.
> - GetShift does not allow humans to read Google user data, unless: (a) we have the user's affirmative agreement for specific messages, (b) it's necessary for security purposes (e.g., investigating abuse), (c) it's necessary to comply with applicable law, or (d) the data has been aggregated and anonymized.

**Français (version résumée pour la Privacy Policy en français)** :
> GetShift respecte les exigences de **Limited Use** de la [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).
>
> Concrètement :
> - Les données Google de l'utilisateur sont utilisées uniquement pour les fonctionnalités visibles dans l'interface GetShift.
> - Aucun transfert à des tiers, hors prestataires techniques strictement nécessaires.
> - Aucune utilisation pour de la publicité ou du profilage marketing.
> - Aucun humain n'accède aux données Google d'un utilisateur, sauf : consentement explicite de l'utilisateur, raison de sécurité, obligation légale, ou données agrégées/anonymisées.

---

## F) Demo Video (à uploader sur YouTube — Non répertorié)

URL à fournir dans le formulaire : `https://youtu.be/XXXXXXXXX`

Contenu obligatoire (voir script séparé) :
1. OAuth consent screen avec les 3 scopes affichés
2. Démonstration d'usage de **chaque** scope (Calendar, Gmail, Drive)
3. Référence à la Privacy Policy
4. Durée recommandée : 2-3 minutes

---

## G) Checklist avant soumission

- [ ] Privacy Policy publiée et accessible publiquement à `/privacy`
- [ ] Privacy Policy contient le paragraphe "Limited Use" (section E)
- [ ] Terms of Service publiés à `/cgu`
- [ ] Logo de l'app uploadé dans Google Cloud Console (taille recommandée : 120×120 px)
- [ ] App homepage publique accessible à `https://getshift.app`
- [ ] Vidéo YouTube uploadée en **Non répertorié** (PAS Privée — Google doit pouvoir y accéder)
- [ ] Tous les domaines autorisés ajoutés dans "Authorized domains" de l'OAuth consent screen
- [ ] Tous les URIs de callback ajoutés dans les credentials OAuth :
  - `https://getshift-backend.onrender.com/auth/google/callback` (Calendar)
  - `https://getshift-backend.onrender.com/auth/gmail/callback` (Gmail)
  - `https://getshift-backend.onrender.com/auth/google/drive/callback` (Drive)

---

## H) Conseils anti-rejet

D'après l'expérience commune des dev qui passent la review Google :

1. **La vidéo est le piège #1**. Si tu te contentes de montrer le consent screen sans démontrer chaque scope en action → rejet quasi-systématique.
2. **Limited Use Policy** doit apparaître **mot pour mot** dans la Privacy Policy. Pas une paraphrase. Pas un résumé. Le texte exact (section E).
3. **Pas de "marketing speak"** dans le rationale. Google veut des phrases techniques précises. "Pour offrir une expérience unique" → mauvais. "To extract action items from email body via LLM" → bon.
4. **Anglais > Français** pour la review. Plus de reviewers anglophones, queue plus courte. Tes textes ci-dessus sont déjà en anglais.
5. **Délai de review** : compter **2 à 6 semaines** pour les scopes sensibles (Gmail, Drive). Ne pas paniquer si Google met du temps.
6. Si Google demande des modifications, **réponds dans la même thread email** avec les changements précis — ne refais pas une nouvelle soumission.
