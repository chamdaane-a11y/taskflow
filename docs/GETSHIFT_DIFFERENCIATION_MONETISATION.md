# GetShift — Différenciation & Monétisation

> Doc de travail, 2026-06-03. Objectif : (1) en quoi GetShift se démarque,
> (2) ce qui pousse à payer, (3) comment en tirer de l'argent — avec une lecture
> honnête du délai.

---

## 1. En quoi GetShift se démarque vraiment

La plupart des apps de productivité (Todoist, TickTick, Notion, Things…) sont des
**listes de tâches**. Tu écris, tu coches. L'IA, quand elle existe, **suggère**.

GetShift se démarque sur **3 angles** que la concurrence n'a pas réunis :

### Angle 1 — Une IA qui AGIT, pas une IA qui bavarde
- L'assistant GetShift **exécute** : il crée des tâches, **navigue dans l'app**,
  planifie ta journée, décompose un objectif. Tu lui parles en langage normal,
  il fait l'action.
- Chez les autres, l'IA te répond un texte. Chez GetShift, elle **bouge les pièces
  à ta place**. C'est la différence entre un conseiller et un assistant.

### Angle 2 — La planification par l'énergie, pas juste par l'heure
- **Tomorrow Builder** place tes tâches selon **tes pics d'énergie** et tes
  priorités, pas juste sur un créneau horaire vide.
- **Goal Reverse** prend un grand objectif (« lancer mon side-project », « réviser
  le concours ») et le **décompose en étapes datées** prêtes à devenir des tâches.
- Personne ne fait *« dis-moi ton but → voici le plan jour par jour → c'est déjà
  dans ton agenda »* aussi simplement.

### Angle 3 — Le coach qui te garde dans le jeu
- Un **coach** (3 personnalités) t'envoie chaque jour un mot : encouragement,
  rappel, ou défi adapté à ton rythme. + niveaux, badges, streaks.
- La productivité, le vrai problème ce n'est pas « lister », c'est **tenir dans la
  durée**. GetShift ajoute la couche **motivation/rétention** que les listes nues
  n'ont pas.

### Les multiplicateurs (ce qui crée le verrou)
- **Intégrations réelles** : Google Agenda (sync 2 sens temps réel), Gmail (extrait
  des tâches des mails), Drive, Notion. Plus tu connectes, plus c'est dur de partir.
- **6 langues** : FR, EN, ES, PT, DE, AR. Très rare pour une app indé → ça ouvre
  l'Afrique francophone, l'Amérique latine, le monde arabophone, là où la
  concurrence anglo-saxonne est faible.
- **GetShift School** (B2B2C, au-dessus de Moodle) : une porte d'entrée
  institutionnelle que les apps grand public n'ont pas.

**Phrase de positionnement (à réutiliser partout) :**
> « GetShift, ce n'est pas une to-do list de plus. C'est l'assistant IA qui
> planifie ta journée, transforme tes objectifs en étapes, et te tient dans la
> durée — pendant que les autres te laissent une liste vide. »

---

## 2. Ce qui pousse les gens à PAYER (le Pro)

Règle d'or : **le gratuit doit être utile, le payant doit être irrésistible pour
ceux qui s'en servent vraiment.** Le levier de conversion = **l'IA et la
planification**, parce que c'est ce qui coûte (tokens) ET ce qui a le plus de valeur.

Découpe Gratuit / Pro suggérée :

| Fonction | Gratuit | Pro (4,99 €/mois) |
|---|---|---|
| Tâches, catégories, focus du jour | ✅ illimité | ✅ |
| Assistant IA (créer/agir) | ✅ **quota/jour** (ex. 10 actions) | ✅ **illimité** |
| Tomorrow Builder (plan IA) | ✅ 1×/jour | ✅ illimité + ajustements |
| Goal Reverse (décomposition) | 1 objectif actif | illimité |
| Intégrations (Agenda/Gmail/Drive/Notion) | 1 intégration | **toutes** |
| Analytics avancés + rapport hebdo | aperçu | complet |
| Collaboration / équipes | 1 équipe, 2 membres | illimité |
| Coach | basique | personnalités + insights |

**Pourquoi ça convertit :** l'utilisateur accroché bute sur le **quota IA** ou la
**2ᵉ intégration** au moment exact où il en tire de la valeur → il paie pour lever
la limite. On ne fait jamais payer pour *commencer*, on fait payer pour *aller plus loin*.

**Déclencheurs d'upgrade à mettre dans l'app (plus tard) :**
- Quand le quota IA du jour est atteint → « Passe en Pro pour continuer ».
- Quand on connecte une 2ᵉ intégration → paywall doux.
- Après 7 jours de streak → « Tu es du genre régulier. Pro débloque X. »

---

## 3. Comment en tirer de l'argent — lecture HONNÊTE du délai

Je ne vais pas te mentir, parce que ça ne t'aide pas :

**Une app de productivité B2C neuve ne fait PAS d'argent demain.** À 4,99 €/mois, il
faut des **centaines d'abonnés** pour que ça compte, et la conversion gratuit→payant
en SaaS tourne autour de **2–5 %**. Donc 1 000 inscrits ≈ 20–50 payants ≈ 100–250 €/mois.
Ça se construit en **semaines/mois**, pas en un jour.

Donc, par ordre de **vitesse d'encaissement réelle** :

### A. Le plus rapide : B2B / institutionnel (GetShift School)
- **Un contrat école/incubateur > 100 abonnés individuels.** Le pilote **Sèmè City**
  est ton meilleur levier court terme : un accord à quelques centaines/milliers
  d'euros se signe en une réunion, pas en 1 000 inscriptions.
- Action : transformer le pilote en **offre payante** (licence par établissement /
  par étudiant). C'est là que l'argent rentre vite si tu pousses.

### B. Moyen terme : B2C en self-serve (le LinkedIn + le produit)
- Activer Stripe, lancer le Pro, et **alimenter le haut du tunnel** via LinkedIn
  (cf. `LINKEDIN_LANCEMENT.md`). C'est un flux régulier mais lent au début.

### C. Bridge cash (honnête, hors GetShift)
- Si l'enjeu immédiat c'est juste **payer Claude le mois prochain** : ne mise pas
  là-dessus sur GetShift seul d'ici demain. Options réalistes : passer sur un
  **plan Claude moins cher** le temps que ça décolle, ou un petit revenu de service
  (setup/coaching productivité, dev freelance ponctuel) pour financer l'outil.
  Ce n'est pas un échec — c'est ce que font 90 % des fondateurs solo au début.

**Ce que je te recommande concrètement, dans l'ordre :**
1. **Cette semaine** : pousser le pilote Sèmè City vers un **premier euro B2B**.
2. **En parallèle** : lancer la campagne LinkedIn pour remplir le tunnel B2C.
3. **Quand il y a du volume** : activer Stripe + les paywalls doux ci-dessus.

---

## 4. Le point SEO (pourquoi « getshift » ne s'affiche pas sur Google)

C'est **normal** et ça ne veut pas dire que c'est cassé :
1. **Le domaine a quelques jours.** Google met **jours→semaines** à crawler et
   indexer un site neuf. Le sitemap a été soumis le 3 juin — l'indexation n'est pas
   instantanée.
2. **Collision de marque.** « GetShift » est déjà utilisé par d'autres (notamment
   une app de staffing US). Tu es en concurrence sur le mot exact → difficile de
   sortir 1ᵉʳ sans autorité.
3. **Peu de backlinks = peu d'autorité.** Google n'a aucune raison de te remonter
   tant que personne ne pointe vers toi.

**Ce qui accélère (à faire) :**
- Search Console → **« Demander l'indexation »** sur `https://usegetshift.com/`.
- **Backlinks** : ton post LinkedIn, Product Hunt, annuaires de startups, ton GitHub,
  bio Twitter/IG → chaque lien aide.
- **Réalité** : au lancement, les gens te découvriront par tes **liens directs**
  (LinkedIn, bouche-à-oreille), **pas** par la recherche Google. La recherche, c'est
  un canal qui paie dans 2–3 mois, pas maintenant. Ne compte pas dessus pour le lancement.
