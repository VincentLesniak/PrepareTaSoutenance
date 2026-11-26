# PrepareTaSoutenance

Application ayant pour objectif de t'aider à réviser ta soutenance à venir.

Un quiz en ligne : tu choisis un projet, un thème et un nombre de questions,
puis tu réponds à des questions à quatre choix. Chaque réponse est corrigée
et expliquée, et tu peux revoir tes erreurs à la fin.

Projets disponibles :

| Projet | Questions | Thèmes | Source |
|--------|-----------|--------|--------|
| PiePHP | 252 | 26 (le sujet, chaque fichier du Core et de src/, HTTP et sessions, routes dynamiques, sécurité, « trouve le bug », « que se passe-t-il si… », comparaison avec Laravel et Symfony, tests & CI, syntaxe PHP...) | [Claude_Test](https://github.com/VincentLesniak/Claude_Test) et le sujet |

## La stack

Le site est **100 % statique** : HTML, CSS et JavaScript sans framework ni
étape de build, les questions sont dans des fichiers JSON.

Pourquoi ? GitHub Pages ne sert que des fichiers statiques : il ne peut pas
exécuter de PHP ni de base de données. Tout le quiz tourne donc dans le
navigateur, et un workflow GitHub Actions publie les fichiers sur Pages.

## Arborescence

```
PrepareTaSoutenance/
├── index.html                  La page unique du quiz
├── css/style.css               Le style (thème clair et sombre)
├── js/app.js                   La logique du quiz
├── data/
│   ├── projects.json           La liste des projets à réviser
│   ├── site.json               Les réglages du site (formulaire de contact)
│   └── piephp.json             Les 252 questions de PiePHP
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

### Écrire de bonnes questions

- **Des longueurs comparables.** Si la bonne réponse est toujours la plus
  longue (ou la plus précise), on la devine sans connaître le cours. Le
  script refuse un projet où elle est la plus longue dans plus de 35 % des
  questions, ou toujours au même rang de longueur (plus de 40 %). Mets les
  détails dans `explanation`, pas dans la réponse.
- **Des pièges crédibles.** Une mauvaise réponse doit être une vraie
  confusion (302 au lieu de 303, `self::` au lieu de `static::`,
  `include` au lieu de `require_once`), jamais une réponse absurde.
- **Ce que le jury demande, pas du par cœur.** Préfère « pourquoi ? »,
  « que se passe-t-il si… ? », « trouve le bug » au nom exact d'une
  constante ou d'une regex.
- **Vrai quelle que soit la configuration.** Évite les questions dont la
  réponse dépend d'un réglage de `php.ini` (comme `output_buffering`).

Astuce : `https://<site>/#monprojet` ouvre directement le quiz sur ce projet.

## Formulaire de contact

Le bouton « Écris-moi » du pied de page et le lien « Signaler une erreur sur
cette question » ouvrent un formulaire. GitHub Pages ne peut pas envoyer de
mail : le formulaire est envoyé à [Formspree](https://formspree.io), un
service gratuit (50 messages par mois) qui transfère chaque message par mail.
L'adresse de réception reste chez Formspree, elle n'apparaît jamais dans le
code du site.

Mise en place, une seule fois :

1. Crée un compte sur https://formspree.io avec l'adresse qui doit recevoir
   les messages, puis crée un formulaire (« New form »).
2. Copie son adresse, de la forme `https://formspree.io/f/abcdwxyz`.
3. Colle-la dans `data/site.json` :

   ```json
   { "contact": { "endpoint": "https://formspree.io/f/abcdwxyz", "fallbackUrl": "https://github.com/VincentLesniak" } }
   ```

4. Envoie un premier message depuis le site et confirme-le dans le mail de
   Formspree.

Tant que `endpoint` est vide, le formulaire s'affiche mais indique que l'envoi
n'est pas configuré et renvoie vers `fallbackUrl`. Le mail reçu contient le
sujet, le message, l'e-mail de la personne (facultatif) et, pour un
signalement, l'identifiant et le texte de la question.

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
https://vincentlesniak.github.io/PrepareTaSoutenance/.

## Branches

- `main` : on n'y pousse jamais directement ;
- `dev` : la branche d'intégration ;
- `0.1.0` : la version en cours, celle qui est déployée.
