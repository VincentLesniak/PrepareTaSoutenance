# ReviseTonProjet

Application ayant pour objectif de t'aider à réviser ta soutenance à venir.

Un quiz en ligne : tu choisis un projet, un thème et un nombre de questions,
puis tu réponds à des questions à quatre choix. Chaque réponse est corrigée
et expliquée, et tu peux revoir tes erreurs à la fin.

Projets disponibles :

| Projet | Questions | Thèmes | Source |
|--------|-----------|--------|--------|
| PiePHP | 200 | 21 (index.php, .htaccess, autoload, Core, Router, Controller, Request, Database, ORM, Entity, relations, moteur de templates, models, controllers, vues, SQL, sécurité, tests & CI, syntaxe PHP...) | [Claude_Test](https://github.com/VincentLesniak/Claude_Test) |

## La stack

Le site est **100 % statique** : HTML, CSS et JavaScript sans framework ni
étape de build, les questions sont dans des fichiers JSON.

Pourquoi ? GitHub Pages ne sert que des fichiers statiques : il ne peut pas
exécuter de PHP ni de base de données. Tout le quiz tourne donc dans le
navigateur, et un workflow GitHub Actions publie les fichiers sur Pages.

## Arborescence

```
ReviseTonProjet/
├── index.html                  La page unique du quiz
├── css/style.css               Le style (thème clair et sombre)
├── js/app.js                   La logique du quiz
├── data/
│   ├── projects.json           La liste des projets à réviser
│   └── piephp.json             Les 200 questions de PiePHP
├── scripts/
│   └── validate-questions.mjs  Vérifie les fichiers de questions
└── .github/workflows/
    └── deploy-pages.yml        Vérification + déploiement sur GitHub Pages
```

## Lancer le site en local

Le navigateur refuse de lire les fichiers JSON si on ouvre `index.html` en
double-cliquant dessus : il faut un petit serveur web. Depuis la racine du
dépôt :

```bash
python3 -m http.server 8000
```

puis ouvre http://localhost:8000/. (Avec PHP : `php -S localhost:8000`.)

Pour vérifier les questions avant de commiter :

```bash
node scripts/validate-questions.mjs
```

## Ajouter un projet

Le quiz ne connaît aucun projet à l'avance : tout est dans `data/`.

1. Crée `data/<id>.json` sur le modèle de `data/piephp.json` :

   ```json
   {
     "id": "monprojet",
     "title": "Mon projet",
     "description": "Une phrase sur le projet.",
     "source": "https://github.com/...",
     "version": "1.0.0",
     "categories": [
       { "id": "routage", "label": "Routage" }
     ],
     "questions": [
       {
         "id": "monprojet-001",
         "category": "routage",
         "file": "src/Router.php",
         "question": "Que renvoie Router::get() si aucune route ne correspond ?",
         "choices": ["null", "false", "Une exception", "Un tableau vide"],
         "answer": 0,
         "explanation": "Le Core tente alors le routage automatique."
       }
     ]
   }
   ```

   - `choices` : exactement 4 réponses, toutes différentes ;
   - `answer` : la **position** de la bonne réponse dans `choices` (0 à 3).
     L'ordre est de toute façon mélangé à l'affichage ;
   - `file` : le fichier du projet concerné (affiché sous la question).

2. Ajoute une ligne dans `data/projects.json` :

   ```json
   { "id": "monprojet", "title": "Mon projet", "description": "...", "file": "data/monprojet.json" }
   ```

3. Lance `node scripts/validate-questions.mjs`, puis ouvre une pull request.

Astuce : `https://<site>/#monprojet` ouvre directement le quiz sur ce projet.

## Déploiement sur GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` :

- vérifie les questions et la syntaxe du JavaScript à chaque push et pull request ;
- publie le site sur GitHub Pages à chaque push sur la branche `0.1.0`
  (ou à la main, depuis l'onglet **Actions** → **Run workflow**).

À faire une seule fois dans les réglages du dépôt :

1. **Settings → Pages → Build and deployment → Source** : choisir
   **GitHub Actions**.
2. **Settings → Environments → github-pages → Deployment branches and tags** :
   ajouter la branche `0.1.0` (par défaut, seule la branche par défaut,
   `main`, a le droit de déployer).

Le site est ensuite visible à l'adresse
https://vincentlesniak.github.io/ReviseTonProjet/.

## Branches

- `main` : on n'y pousse jamais directement ;
- `dev` : la branche d'intégration ;
- `0.1.0` : la version en cours, celle qui est déployée.
