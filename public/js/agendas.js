// agendas.js: logic of agendas.html (home page)

const userLabel = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const list = document.getElementById('agenda-list');
const emptyMessage = document.getElementById('empty');
const form = document.getElementById('agenda-form');
const errorBox = document.getElementById('error');
const submitBtn = form.querySelector('button[type="submit"]');

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function goToLogin() {
    window.location.href = '../index.html';
}

// Builds one <li> for a calendar. textContent is used so a name can never inject HTML.
function addAgendaRow(agenda) {
    const item = document.createElement('li');

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = agenda.color;

    const name = document.createElement('span');
    name.textContent = agenda.name;

    const date = document.createElement('span');
    date.className = 'agenda-date';
    date.textContent = 'créé le ' + new Date(agenda.createdAt).toLocaleDateString('fr-FR');

    item.append(dot, name, date);
    list.append(item);
    emptyMessage.hidden = true;
}

async function init() {
    try {
        const user = await api.getMe();
        userLabel.textContent = user.username;

        const agendas = await api.getAgendas();
        agendas.forEach(addAgendaRow);
        emptyMessage.hidden = agendas.length > 0;
    } catch (err) {
        if (err.status === 401) goToLogin();
        else showError('Chargement impossible. Rechargez la page.');
    }
}

logoutBtn.addEventListener('click', async () => {
    try {
        await api.logout();
    } finally {
        goToLogin();
    }
});

form.addEventListener('input', () => { errorBox.hidden = true; });

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = form.elements.name.value.trim();
    const color = form.color.value;

    if (!name) {
        showError("Saisissez un nom pour l'agenda.");
        return;
    }

    submitBtn.disabled = true;
    try {
        const agenda = await api.createAgenda(name, color);
        addAgendaRow(agenda);
        form.elements.name.value = '';
        form.elements.name.focus();
    } catch (err) {
        if (err.status === 401) goToLogin();
        else if (err.status === 400) showError("Le nom de l'agenda est obligatoire.");
        else showError('Création impossible. Réessayez.');
    } finally {
        submitBtn.disabled = false;
    }
});

init();