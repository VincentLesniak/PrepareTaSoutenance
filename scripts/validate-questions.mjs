// Vérifie les fichiers de questions avant chaque déploiement.
// Utilisation, depuis la racine du dépôt : node scripts/validate-questions.mjs
// Aucune dépendance : seulement Node.js (préinstallé sur GitHub Actions).
// Code de sortie 0 si tout est bon, 1 sinon (le workflow échoue alors).

import { readFileSync, existsSync } from 'node:fs';

// Règles anti-biais (voir plus bas), appliquées à partir de 40 questions.
const MIN_QUESTIONS_FOR_BIAS = 40;
const MAX_LONGEST_PERCENT = 35;
const MAX_RANK_PERCENT = 40;

const errors = [];
const fail = (where, message) => errors.push(`${where} : ${message}`);
const isText = (value) => typeof value === 'string' && value.trim() !== '';

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
        fail(path, `JSON illisible (${e.message})`);
        return null;
    }
}

const index = readJson('data/projects.json');
const projects = index && Array.isArray(index.projects) ? index.projects : [];
if (index && projects.length === 0) {
    fail('data/projects.json', 'la liste "projects" est vide ou absente');
}

const projectIds = new Set();
let total = 0;

for (const meta of projects) {
    const where = `data/projects.json (${meta.id ?? '?'})`;
    for (const key of ['id', 'title', 'file']) {
        if (!isText(meta[key])) fail(where, `champ "${key}" manquant`);
    }
    if (projectIds.has(meta.id)) fail(where, 'id de projet en double');
    projectIds.add(meta.id);
    if (!isText(meta.file) || !existsSync(meta.file)) {
        fail(where, `fichier introuvable : ${meta.file}`);
        continue;
    }

    const data = readJson(meta.file);
    if (!data) continue;
    const file = meta.file;
    if (data.id !== meta.id) fail(file, `"id" vaut "${data.id}", attendu "${meta.id}"`);

    const categories = new Set();
    for (const c of data.categories ?? []) {
        if (!isText(c.id) || !isText(c.label)) fail(file, 'catégorie sans id ou sans label');
        if (categories.has(c.id)) fail(file, `catégorie en double : ${c.id}`);
        categories.add(c.id);
    }
    if (categories.size === 0) fail(file, 'aucune catégorie');

    const ids = new Set();
    const texts = new Set();
    for (const [i, q] of (data.questions ?? []).entries()) {
        const at = `${file} question ${q.id ?? '#' + (i + 1)}`;
        if (!isText(q.id)) fail(at, 'id manquant');
        else if (ids.has(q.id)) fail(at, 'id en double');
        ids.add(q.id);
        if (!categories.has(q.category)) fail(at, `catégorie inconnue : ${q.category}`);
        if (!isText(q.question)) fail(at, 'texte de la question manquant');
        else if (texts.has(q.question)) fail(at, 'question en double');
        texts.add(q.question);
        if (!Array.isArray(q.choices) || q.choices.length !== 4 || !q.choices.every(isText)) {
            fail(at, 'il faut exactement 4 réponses non vides');
        } else if (new Set(q.choices).size !== 4) {
            fail(at, 'deux réponses sont identiques');
        }
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
            fail(at, '"answer" doit être un entier entre 0 et 3 (position de la bonne réponse)');
        }
        if (!isText(q.explanation)) fail(at, 'explication manquante');
    }
    if (ids.size === 0) fail(file, 'aucune question');

    // Biais de longueur : si la bonne réponse est trop souvent la plus
    // longue (ou toujours au même rang de longueur), on peut la deviner
    // sans connaître le cours. Au hasard, chaque rang tombe 1 fois sur 4.
    const valid = (data.questions ?? []).filter((q) => Array.isArray(q.choices) && q.choices.length === 4
        && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3 && q.choices.every(isText));
    if (valid.length >= MIN_QUESTIONS_FOR_BIAS) {
        const ranks = [0, 0, 0, 0];
        let longest = 0;
        for (const q of valid) {
            const lengths = q.choices.map((choice) => choice.length);
            const good = lengths[q.answer];
            const sorted = [...lengths].sort((a, b) => a - b);
            ranks[sorted.indexOf(good)]++;
            if (good === sorted[3] && sorted[3] > sorted[2]) longest++;
        }
        const percent = (n) => Math.round((n / valid.length) * 100);
        if (percent(longest) > MAX_LONGEST_PERCENT) {
            fail(file, `la bonne réponse est la plus longue dans ${percent(longest)} % des questions `
                + `(maximum ${MAX_LONGEST_PERCENT} %) : raccourcis-la ou allonge les pièges`);
        }
        ranks.forEach((count, rank) => {
            if (percent(count) > MAX_RANK_PERCENT) {
                fail(file, `la bonne réponse a le rang de longueur ${rank + 1}/4 dans ${percent(count)} % `
                    + `des questions (maximum ${MAX_RANK_PERCENT} %)`);
            }
        });
        console.log(`  longueur de la bonne réponse, de la plus courte à la plus longue : `
            + ranks.map((count) => `${percent(count)} %`).join(' / '));
    }
    total += ids.size;
    console.log(`${meta.title} : ${ids.size} questions, ${categories.size} thèmes`);
}

if (errors.length > 0) {
    console.error(`\n${errors.length} erreur(s) :`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
}
console.log(`OK : ${projects.length} projet(s), ${total} questions valides.`);
