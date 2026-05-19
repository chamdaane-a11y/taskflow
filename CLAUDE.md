# GetShift — notes pour Claude

## Contrat des colonnes timestamp (CRITIQUE)

La table `taches` a plusieurs colonnes datetime. **Chacune a une sémantique
précise, ne pas les confondre :**

| Colonne | Quand elle est posée | Quand elle change | Usage analytics |
|---|---|---|---|
| `created_at` | INSERT (creation de la tâche) | **Jamais** | "date de création" |
| `updated_at` | INSERT + chaque UPDATE (auto via `ON UPDATE CURRENT_TIMESTAMP`) | À chaque édition (titre, prio, deadline, statut, etc.) | **AUCUN usage analytics autorisé** |
| `terminee_le` | UPDATE quand `terminee` passe à TRUE | Reset à NULL si on dé-toggle | "date de complétion" |
| `focus_date` | Marquage focus du jour | Action utilisateur explicite | "tâches focus de tel jour" |

### Règle absolue

**N'utilise jamais `updated_at` comme proxy pour la date d'un événement de
cycle de vie.** Pour "tâche complétée le X", c'est toujours
`COALESCE(terminee_le, updated_at)` — le COALESCE protège les rares lignes
qui auraient `terminee_le=NULL` (avant migration).

### Pourquoi cette règle existe

Bug observé : toutes les complétions s'accumulaient sur le jour du déploiement
de la migration `ALTER TABLE taches ADD terminee_le` + son backfill
`UPDATE taches SET terminee_le=NOW() WHERE terminee=TRUE`. Le `UPDATE` a
déclenché `ON UPDATE CURRENT_TIMESTAMP` sur `updated_at` de toutes les
tâches déjà terminées → données historiques d'analytics détruites. Le bug
était latent depuis le jour 1 (analytics groupait par `DATE(updated_at)`),
la migration l'a juste rendu visible.

Cf. commit `44b80f1` et `268574d` pour le fix complet.

### Garde-fou automatique

Un pre-commit hook (`.git/hooks/pre-commit`) bloque tout `terminee=TRUE`
combiné à `DATE(updated_at)` / `HOUR(updated_at)` / `updated_at >= DATE_SUB`
/ `ORDER BY updated_at`. Si tu as besoin de bypass exceptionnel (genre
query qui veut vraiment "tâches dernièrement éditées"), `--no-verify`
fonctionne mais réfléchis bien.

## Discipline migration

Pour tout futur `ALTER TABLE + backfill` :

- **Jamais** `UPDATE table SET col=NOW()` sur des lignes qu'on n'a pas
  modifiées par ailleurs. Ça corrompt `updated_at` des lignes touchées.
- Préférer `UPDATE table SET col=COALESCE(updated_at, NOW())` pour préserver
  l'info historique en best-effort.
- Mieux : pas de backfill du tout, laisser les nouvelles écritures peupler.
- Toujours penser : "Quels analytics existants pointent sur les colonnes
  que je vais toucher ?"
