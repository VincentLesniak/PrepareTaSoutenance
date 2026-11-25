# Journal des modifications (CHANGELOG)

Toutes les évolutions notables de ReviseTonProjet sont listées ici, de la
plus récente à la plus ancienne.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et
les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/)
(MAJEUR.MINEUR.CORRECTIF).

## [Non publié]

## [0.1.0]

### Ajouté
- Quiz statique (HTML, CSS, JavaScript sans dépendance) : une question à la
  fois, quatre réponses, correction expliquée, score et révision des erreurs.
- Choix du projet à réviser, du thème et du nombre de questions.
- Projet PiePHP : 200 questions sur 21 thèmes, écrites à partir du code de
  Claude_Test (index.php, .htaccess, Core/, src/, database.sql, CI...).
- `scripts/validate-questions.mjs` : vérifie les fichiers de questions.
- Workflow GitHub Actions : vérification à chaque push, déploiement sur
  GitHub Pages depuis la branche `0.1.0`.
