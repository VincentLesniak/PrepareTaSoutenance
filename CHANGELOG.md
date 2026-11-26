# Journal des modifications (CHANGELOG)

Toutes les évolutions notables de PrepareTaSoutenance sont listées ici, de la
plus récente à la plus ancienne.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et
les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/)
(MAJEUR.MINEUR.CORRECTIF).

## [Non publié]

## [0.2.0]

### Ajouté
- Formulaire de contact qui envoie un mail à l'auteur via
  FormSubmit (réglé dans `data/site.json`) : bouton « Écris-moi » dans le
  pied de page et lien « Signaler une erreur sur cette question » après
  chaque réponse, qui joint l'identifiant et le texte de la question.
- Limite d'envoi dans le navigateur : un message toutes les 2 minutes et
  5 messages par jour au plus, plus un champ piège contre les robots.

### Modifié
- Le pied de page propose le formulaire au lieu du lien GitHub.
- Les meilleurs scores sont rangés sous `pts-best:` au lieu de `rtp-best:`
  (ancien nom du projet) ; les scores déjà enregistrés sont repris.
- Les raccourcis clavier du quiz sont désactivés pendant la saisie d'un message.
- Les fichiers CSS et JS sont versionnés (`?v=0.2.0`) pour que le navigateur ne garde pas l'ancienne version en cache.
- Le projet s'appelle désormais PrepareTaSoutenance (titre, en-tête, slogan,
  README). Nouvelle adresse du site :
  https://vincentlesniak.github.io/PrepareTaSoutenance/.

## [0.1.1]

### Ajouté
- Environ 70 nouvelles questions PiePHP : le sujet (étapes, schéma MVC, relations,
  My cinema), HTTP et sessions, routes dynamiques, « trouve le bug »,
  « que se passe-t-il si… », comparaison avec Laravel et Symfony (Eloquent,
  Blade, middleware, migrations, CSRF, PSR-4, Active Record).
- `validate-questions.mjs` refuse un projet où la bonne réponse est trop
  souvent la plus longue, ou toujours au même rang de longueur.
- README : règles pour écrire de bonnes questions.

### Modifié
- Toutes les réponses réécrites : longueurs équilibrées (la bonne réponse
  est la plus longue dans 24 % des cas au lieu de 86 %) et pièges crédibles.

### Supprimé
- Une vingtaine de questions « par cœur » ou dépendantes de la configuration (nom md5 du
  cache, regex exacte de checkName(), sprintf %2$s, double_encode...).

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
