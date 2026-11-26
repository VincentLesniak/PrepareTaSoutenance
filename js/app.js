/*
 * PrepareTaSoutenance : le quiz, en JavaScript sans dépendance.
 *
 * Données :
 *   data/projects.json      la liste des projets (id, titre, fichier) ;
 *   data/<projet>.json      les catégories et les questions d'un projet ;
 *   data/site.json          les réglages du site (adresse du formulaire de contact).
 * Ajouter un projet = ajouter son fichier JSON et une ligne dans
 * projects.json, sans toucher à ce code.
 *
 * Écrans : accueil (choix) → quiz (une question à la fois) → résultat.
 */
'use strict';

(function () {
    const LETTERS = ['1', '2', '3', '4'];

    const state = {
        projects: [],
        project: null,       // le contenu de data/<projet>.json
        categoryLabels: {},  // id de catégorie -> libellé
        queue: [],           // les questions du quiz en cours
        index: 0,
        score: 0,
        answered: false,
        mistakes: [],
        contactEndpoint: '',
        contactFallback: '',
    };

    const $ = (id) => document.getElementById(id);
    const screens = { home: $('screen-home'), quiz: $('screen-quiz'), result: $('screen-result') };

    function show(name) {
        Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
        window.scrollTo(0, 0);
    }

    // localStorage peut être indisponible (navigation privée, stockage bloqué).
    function storageGet(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(key, value) {
        try { window.localStorage.setItem(key, value); } catch (e) { /* sans effet */ }
    }

    // Mélange de Fisher-Yates, sur une copie.
    function shuffle(list) {
        const copy = list.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    async function fetchJson(url) {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`${url} : HTTP ${response.status}`);
        }
        return response.json();
    }

    function showLoadError(message) {
        const el = $('load-error');
        el.textContent = message;
        el.hidden = false;
    }

    // ------------------------------------------------------------------ accueil

    async function init() {
        migrateOldScores();
        loadSiteSettings();
        try {
            const data = await fetchJson('data/projects.json');
            state.projects = data.projects;
        } catch (e) {
            showLoadError('Impossible de charger la liste des projets. Ouvre le site via un serveur web '
                + '(par exemple « python3 -m http.server »), pas en double-cliquant sur index.html.');
            return;
        }

        const select = $('project-select');
        state.projects.forEach((p) => select.add(new Option(p.title, p.id)));

        // #piephp dans l'adresse présélectionne le projet (lien à partager).
        const fromHash = decodeURIComponent(window.location.hash.slice(1));
        if (state.projects.some((p) => p.id === fromHash)) {
            select.value = fromHash;
        }

        select.addEventListener('change', () => loadProject(select.value));
        $('category-select').addEventListener('change', updateBestScore);
        $('count-select').addEventListener('change', updateBestScore);
        await loadProject(select.value);
    }

    async function loadProject(id) {
        const meta = state.projects.find((p) => p.id === id);
        $('start-button').disabled = true;
        $('load-error').hidden = true;
        if (!meta) {
            return;
        }
        $('project-description').textContent = meta.description || '';
        history.replaceState(null, '', '#' + encodeURIComponent(id));

        try {
            state.project = await fetchJson(meta.file);
        } catch (e) {
            showLoadError(`Impossible de charger les questions de ${meta.title}.`);
            return;
        }

        state.categoryLabels = {};
        state.project.categories.forEach((c) => { state.categoryLabels[c.id] = c.label; });

        const counts = {};
        state.project.questions.forEach((q) => { counts[q.category] = (counts[q.category] || 0) + 1; });

        const select = $('category-select');
        select.innerHTML = '';
        select.add(new Option(`Tous les thèmes (${state.project.questions.length})`, 'all'));
        state.project.categories
            .filter((c) => counts[c.id])
            .forEach((c) => select.add(new Option(`${c.label} (${counts[c.id]})`, c.id)));

        updateBestScore();
        $('start-button').disabled = false;
    }

    function bestScoreKey() {
        return `pts-best:${state.project.id}:${$('category-select').value}`;
    }

    // Avant la 0.2.0, les scores étaient rangés sous « rtp-best:… » (ancien nom
    // du projet). On les recopie une fois sous la nouvelle clé.
    function migrateOldScores() {
        try {
            const storage = window.localStorage;
            for (let i = storage.length - 1; i >= 0; i--) {
                const oldKey = storage.key(i);
                if (oldKey && oldKey.startsWith('rtp-best:')) {
                    const newKey = 'pts-best:' + oldKey.slice('rtp-best:'.length);
                    if (storage.getItem(newKey) === null) {
                        storage.setItem(newKey, storage.getItem(oldKey));
                    }
                    storage.removeItem(oldKey);
                }
            }
        } catch (e) { /* stockage indisponible : rien à migrer */ }
    }

    function updateBestScore() {
        const el = $('best-score');
        const best = state.project ? storageGet(bestScoreKey()) : null;
        el.hidden = best === null;
        if (best !== null) {
            el.textContent = `Ton meilleur score sur ce thème : ${best} %`;
        }
    }

    // ------------------------------------------------------------------ quiz

    function startQuiz(questions) {
        state.queue = questions;
        state.index = 0;
        state.score = 0;
        state.mistakes = [];
        show('quiz');
        renderQuestion();
    }

    function startFromSettings(event) {
        event.preventDefault();
        const category = $('category-select').value;
        const count = Number($('count-select').value);
        let pool = state.project.questions;
        if (category !== 'all') {
            pool = pool.filter((q) => q.category === category);
        }
        pool = shuffle(pool);
        startQuiz(count > 0 ? pool.slice(0, count) : pool);
    }

    function renderQuestion() {
        const q = state.queue[state.index];
        const total = state.queue.length;
        state.answered = false;

        $('progress-text').textContent = `Question ${state.index + 1} / ${total}`;
        $('score-text').textContent = `Score : ${state.score}`;
        $('progress-bar').style.width = `${(state.index / total) * 100}%`;
        const label = state.categoryLabels[q.category] || q.category;
        $('question-category').textContent = label;
        $('question-file').textContent = q.file || '';
        // Pas de doublon quand le thème porte déjà le nom du fichier (ex. Core/ORM.php).
        $('question-file').hidden = !q.file || label.includes(q.file);
        $('question-text').textContent = q.question;
        $('feedback').hidden = true;
        $('next-button').hidden = true;

        // Les réponses sont mélangées à chaque passage : on retient l'ordre
        // pour retrouver l'index d'origine de la bonne réponse.
        const order = shuffle([0, 1, 2, 3]);
        const list = $('choices');
        list.innerHTML = '';
        order.forEach((original, position) => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.original = String(original);

            const key = document.createElement('span');
            key.className = 'key';
            key.textContent = LETTERS[position];
            const text = document.createElement('span');
            text.textContent = q.choices[original]; // textContent : jamais interprété comme du HTML

            button.append(key, text);
            button.addEventListener('click', () => answer(original));
            li.appendChild(button);
            list.appendChild(li);
        });
        list.querySelector('button').focus({ preventScroll: true });
    }

    function answer(original) {
        if (state.answered) {
            return;
        }
        state.answered = true;
        const q = state.queue[state.index];
        const good = original === q.answer;
        if (good) {
            state.score++;
        } else {
            state.mistakes.push(q);
        }

        $('choices').querySelectorAll('button').forEach((button) => {
            const value = Number(button.dataset.original);
            button.disabled = true;
            if (value === q.answer) {
                button.classList.add('correct');
            } else if (value === original) {
                button.classList.add('wrong');
            }
        });

        const feedback = $('feedback');
        feedback.className = 'feedback ' + (good ? 'good' : 'bad');
        $('feedback-verdict').textContent = good
            ? 'Bonne réponse !'
            : `Raté. La bonne réponse : ${q.choices[q.answer]}`;
        $('feedback-explanation').textContent = q.explanation || '';
        feedback.hidden = false;

        $('score-text').textContent = `Score : ${state.score}`;
        const next = $('next-button');
        next.textContent = state.index + 1 < state.queue.length ? 'Suivante' : 'Voir le résultat';
        next.hidden = false;
        next.focus({ preventScroll: true });
    }

    function nextQuestion() {
        state.index++;
        if (state.index < state.queue.length) {
            renderQuestion();
        } else {
            showResult();
        }
    }

    // ------------------------------------------------------------------ résultat

    function showResult() {
        const total = state.queue.length;
        const percent = total ? Math.round((state.score / total) * 100) : 0;
        $('result-score').textContent = `${state.score} / ${total} (${percent} %)`;

        let message = 'Courage : relis les fichiers concernés et recommence.';
        if (percent === 100) message = 'Parfait ! Tu es prêt pour la soutenance.';
        else if (percent >= 80) message = 'Très bien ! Il reste quelques points à revoir.';
        else if (percent >= 50) message = 'Pas mal. Revois tes erreurs ci-dessous.';
        $('result-message').textContent = message;

        const key = bestScoreKey();
        const best = Number(storageGet(key));
        if (!storageGet(key) || percent > best) {
            storageSet(key, String(percent));
        }

        const list = $('mistakes');
        list.innerHTML = '';
        state.mistakes.forEach((q) => {
            const li = document.createElement('li');
            const question = document.createElement('p');
            question.textContent = q.question;
            const answerText = document.createElement('p');
            answerText.className = 'answer';
            answerText.textContent = q.choices[q.answer];
            const explanation = document.createElement('p');
            explanation.className = 'muted';
            explanation.textContent = `${q.explanation || ''} (${q.file || state.categoryLabels[q.category]})`;
            li.append(question, answerText, explanation);
            list.appendChild(li);
        });
        const hasMistakes = state.mistakes.length > 0;
        $('mistakes-title').hidden = !hasMistakes;
        $('retry-wrong-button').hidden = !hasMistakes;

        show('result');
    }

    // ------------------------------------------------------------------ contact

    // Le site est statique : il ne peut pas envoyer de mail lui-même. Le
    // formulaire est envoyé à un service externe (Formspree, par exemple)
    // qui transfère le message par mail. Son adresse est dans data/site.json.
    async function loadSiteSettings() {
        try {
            const site = await fetchJson('data/site.json');
            state.contactEndpoint = (site.contact && site.contact.endpoint) || '';
            state.contactFallback = (site.contact && site.contact.fallbackUrl) || '';
        } catch (e) { /* pas de réglages : le formulaire affichera une solution de repli */ }
    }

    function setContactStatus(kind, message) {
        const el = $('contact-status');
        el.className = 'status ' + kind;
        el.textContent = message;
        el.hidden = !message;
    }

    function openContact(question) {
        const form = $('contact-form');
        form.reset();
        setContactStatus('', '');
        $('contact-submit').disabled = false;
        $('contact-submit').hidden = false;
        $('contact-cancel').textContent = 'Annuler';

        const info = $('contact-question-info');
        if (question) {
            const label = `${state.project.title} · ${question.id} : ${question.question}`;
            $('contact-question').value = label;
            info.textContent = `Question concernée : ${label}`;
            $('contact-subject').value = 'Erreur dans une question';
        } else {
            $('contact-question').value = '';
            info.textContent = '';
        }
        info.hidden = !question;

        const dialog = $('contact-dialog');
        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
        } else {
            dialog.setAttribute('open', '');
        }
        $('contact-message').focus();
    }

    function closeContact() {
        const dialog = $('contact-dialog');
        if (typeof dialog.close === 'function') {
            dialog.close();
        } else {
            dialog.removeAttribute('open');
        }
    }

    async function sendContact(event) {
        event.preventDefault();
        const form = $('contact-form');
        const message = $('contact-message');
        const email = $('contact-email');
        if (!message.value.trim()) {
            setContactStatus('bad', 'Écris ton message avant d\'envoyer.');
            message.focus();
            return;
        }
        if (!email.checkValidity()) {
            setContactStatus('bad', 'Cette adresse e-mail n\'est pas valide.');
            email.focus();
            return;
        }
        if (!state.contactEndpoint) {
            setContactStatus('bad', 'L\'envoi n\'est pas encore configuré. '
                + (state.contactFallback ? `Écris-moi sur ${state.contactFallback}` : ''));
            return;
        }

        const data = new FormData(form);
        data.append('_subject', `[PrepareTaSoutenance] ${data.get('sujet')}`);
        data.append('page', window.location.href);
        if (data.get('email')) {
            data.append('_replyto', data.get('email'));
        }

        const submit = $('contact-submit');
        submit.disabled = true;
        setContactStatus('', 'Envoi en cours…');
        try {
            const response = await fetch(state.contactEndpoint, {
                method: 'POST',
                body: data,
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            setContactStatus('good', 'Merci, ton message est envoyé !');
            submit.hidden = true;
            $('contact-cancel').textContent = 'Fermer';
        } catch (e) {
            submit.disabled = false;
            setContactStatus('bad', 'L\'envoi a échoué. Vérifie ta connexion et réessaie.');
        }
    }

    // ------------------------------------------------------------------ événements

    $('setup-form').addEventListener('submit', startFromSettings);
    $('next-button').addEventListener('click', nextQuestion);
    $('quit-button').addEventListener('click', () => { updateBestScore(); show('home'); });
    $('restart-button').addEventListener('click', () => { updateBestScore(); show('home'); });
    $('retry-wrong-button').addEventListener('click', () => startQuiz(shuffle(state.mistakes)));
    $('contact-open').addEventListener('click', () => openContact(null));
    $('report-button').addEventListener('click', () => openContact(state.queue[state.index]));
    $('contact-close').addEventListener('click', closeContact);
    $('contact-cancel').addEventListener('click', closeContact);
    $('contact-form').addEventListener('submit', sendContact);

    document.addEventListener('keydown', (event) => {
        // Pas de raccourci pendant qu'on écrit dans le formulaire de contact.
        if (screens.quiz.hidden || $('contact-dialog').open
            || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        const position = LETTERS.indexOf(event.key);
        if (position !== -1 && !state.answered) {
            const button = $('choices').querySelectorAll('button')[position];
            if (button) {
                button.click();
            }
        } else if (event.key === 'Enter' && state.answered
            && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) {
            // Un bouton qui a le focus gère déjà Entrée lui-même (Suivante, Signaler…).
            nextQuestion();
        }
    });

    init();
})();
