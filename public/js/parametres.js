const fileInput = document.getElementById('settings-file');
const preview = document.getElementById('settings-preview');
const nameInput = document.getElementById('settings-name');
const colorInput = document.getElementById('settings-color');
const submitButton = document.getElementById('settings-import-submit');
const importMessage = document.getElementById('settings-import-message');
const exportMessage = document.getElementById('settings-export-message');
const exportAllButton = document.getElementById('settings-export-all');
let importContent = null;
let fileVersion = 0;
let importing = false;

function showMessage(element, text, error = false) {
    element.textContent = text;
    element.className = error ? 'error' : 'settings-success';
    element.hidden = false;
}

function handleError(element, error) {
    if (error.status === 401) window.location.href = '/';
    else showMessage(element, error.message || 'Opération impossible. Réessayez.', true);
}

async function exportCalendar(id, button) {
    button.disabled = true;
    exportMessage.hidden = true;
    try {
        const blob = id === null ? await api.exportAgendas() : await api.exportAgenda(id);
        downloadFile(blob, id === null ? 'chronosquad-agendas.zip' : 'agenda-' + id + '.ics');
        showMessage(exportMessage, 'Votre téléchargement est prêt.');
    } catch (error) {
        handleError(exportMessage, error);
    } finally {
        button.disabled = false;
    }
}

async function loadAgendas() {
    const agendas = await api.getAgendas();
    const list = document.getElementById('settings-agendas');
    list.replaceChildren();
    for (const agenda of agendas) {
        const item = document.createElement('li');
        const dot = document.createElement('span');
        dot.className = 'settings-agenda-dot';
        dot.style.backgroundColor = agenda.color;
        dot.setAttribute('aria-hidden', 'true');
        const info = document.createElement('div');
        info.className = 'settings-agenda-info';
        const name = document.createElement('strong');
        name.textContent = agenda.name;
        const owner = document.createElement('span');
        owner.textContent = 'Propriétaire : ' + agenda.ownerName;
        info.append(name, owner);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-glass';
        button.textContent = 'Exporter .ics';
        button.setAttribute('aria-label', 'Exporter ' + agenda.name);
        button.addEventListener('click', () => exportCalendar(agenda.id, button));
        item.append(dot, info, button);
        list.append(item);
    }
    const empty = document.getElementById('settings-empty');
    empty.hidden = agendas.length > 0;
    empty.textContent = 'Aucun agenda pour le moment. Importez un fichier ou créez un agenda depuis le calendrier.';
    exportAllButton.disabled = agendas.length === 0;
}

fileInput.addEventListener('change', async () => {
    const version = ++fileVersion;
    importContent = null;
    preview.hidden = true;
    submitButton.disabled = true;
    importMessage.hidden = true;
    document.getElementById('settings-import-link').hidden = true;
    const file = fileInput.files[0];
    if (!file) return;
    if (!/\.ics$/i.test(file.name) || file.size > 1024 * 1024) {
        showMessage(importMessage, 'Choisissez un fichier .ics de 1 Mo maximum.', true);
        return;
    }
    showMessage(importMessage, 'Vérification du fichier…');
    try {
        const contenu = await file.text();
        const data = await api.previewImport(contenu);
        if (version !== fileVersion) return;
        importContent = contenu;
        nameInput.value = data.name;
        colorInput.value = data.color;
        document.getElementById('settings-count').textContent = data.evenements.length + ' événement(s) à importer';
        const list = document.getElementById('settings-preview-list');
        list.replaceChildren();
        for (const event of data.evenements.slice(0, 3)) {
            const item = document.createElement('li');
            const title = document.createElement('strong');
            title.textContent = event.title;
            const date = document.createElement('span');
            date.textContent = event.allDay
                ? new Date(event.start).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) + ' · Journée entière'
                : new Date(event.start).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
            item.append(title, date);
            list.append(item);
        }
        importMessage.hidden = true;
        preview.hidden = false;
        submitButton.disabled = false;
    } catch (error) {
        if (version === fileVersion) handleError(importMessage, error);
    }
});

document.getElementById('settings-import-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (importing || !importContent) return;
    importing = true;
    submitButton.disabled = true;
    fileInput.disabled = true;
    submitButton.textContent = 'Import en cours…';
    try {
        const result = await api.importAgenda(nameInput.value.trim(), colorInput.value, importContent);
        showMessage(importMessage, 'L’agenda « ' + result.agenda.name + ' » a été importé.');
        document.getElementById('settings-import-link').hidden = false;
        importContent = null;
        preview.hidden = true;
        fileInput.value = '';
        await loadAgendas();
    } catch (error) {
        handleError(importMessage, error);
    } finally {
        importing = false;
        fileInput.disabled = false;
        submitButton.disabled = !importContent;
        submitButton.textContent = 'Importer l’agenda';
    }
});

exportAllButton.addEventListener('click', () => exportCalendar(null, exportAllButton));

async function initSettings() {
    try {
        await api.getMe();
        await loadAgendas();
    } catch (error) {
        handleError(exportMessage, error);
    }
}

initSettings();
