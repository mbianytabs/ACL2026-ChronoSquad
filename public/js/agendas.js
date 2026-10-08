// agendas.js: logic of agendas.html (home page)

const userLabel = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const list = document.getElementById('agenda-list');
const emptyMessage = document.getElementById('empty');
const form = document.getElementById('agenda-form');
const errorBox = document.getElementById('error');
const submitBtn = form.querySelector('button[type="submit"]');
const newAgendaBtn = document.getElementById('new-agenda-btn');
const weekLabel = document.getElementById('week-label');
const miniLabel = document.getElementById('mini-label');
const miniGrid = document.getElementById('mini-grid');
const weekBody = document.getElementById('week-body');
const weekDays = document.getElementById('week-days');
const weekColumns = document.getElementById('week-columns');
const hours = document.getElementById('hours');

const HOUR_HEIGHT = 48; // px, must match --hour-height in style.css

const today = new Date();
let weekStart = startOfWeek(today);                                   // Monday of the week shown on the right
let miniMonth = new Date(today.getFullYear(), today.getMonth(), 1);  // month shown in the mini calendar

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function goToLogin() {
    window.location.href = '../index.html';
}

// Returns a new date shifted by a number of days
function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Returns the Monday of the week containing the date
function startOfWeek(date) {
    return addDays(date, -((date.getDay() + 6) % 7));
}

function isSameDay(a, b) {
    return a.toDateString() === b.toDateString();
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Builds one <li> for a calendar: a checkbox in the agenda's color and its name.
// textContent is used so a name can never inject HTML.
function addAgendaRow(agenda) {
    const item = document.createElement('li');

    const label = document.createElement('label');
    label.className = 'agenda-item';
    label.title = 'Créé le ' + new Date(agenda.createdAt).toLocaleDateString('fr-FR');
    label.style.setProperty('--agenda-color', agenda.color);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;

    const name = document.createElement('span');
    name.className = 'agenda-name';
    name.textContent = agenda.name;

    label.append(checkbox, name);
    item.append(label);
    list.append(item);
    emptyMessage.hidden = true;
}

// Shows or hides the creation form (toggled by the Créer button)
function toggleForm(open) {
    form.hidden = !open;
    newAgendaBtn.setAttribute('aria-expanded', String(open));
    if (open) form.elements.name.focus();
}

// Mini calendar in the sidebar: 6 weeks, Monday first. Clicking a day shows its week.
function renderMini() {
    miniLabel.textContent = capitalize(miniMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

    const start = startOfWeek(miniMonth);
    const weekEnd = addDays(weekStart, 6);

    miniGrid.replaceChildren();
    for (let i = 0; i < 42; i++) {
        const day = addDays(start, i);

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'mini-day';
        cell.textContent = day.getDate();
        cell.setAttribute('aria-label', day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
        if (day.getMonth() !== miniMonth.getMonth()) cell.classList.add('other-month');
        if (day >= weekStart && day <= weekEnd) cell.classList.add('in-week');
        if (isSameDay(day, today)) {
            cell.classList.add('today');
            cell.setAttribute('aria-current', 'date');
        }

        cell.addEventListener('click', () => showWeekOf(day));
        miniGrid.append(cell);
    }
}

// Week view: header with the 7 days, one column per day, today highlighted
function renderWeek() {
    const weekEnd = addDays(weekStart, 6);
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    weekLabel.textContent = sameMonth
        ? capitalize(weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
        : capitalize(weekStart.toLocaleDateString('fr-FR', { month: 'short' })) + ' – '
          + weekEnd.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

    weekDays.replaceChildren();
    weekColumns.replaceChildren();
    for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const isToday = isSameDay(day, today);

        const head = document.createElement('div');
        head.className = 'week-day' + (isToday ? ' today' : '');

        const name = document.createElement('span');
        name.className = 'week-day-name';
        name.textContent = day.toLocaleDateString('fr-FR', { weekday: 'short' });

        const number = document.createElement('span');
        number.className = 'week-day-number';
        number.textContent = day.getDate();
        if (isToday) number.setAttribute('aria-current', 'date');

        head.append(name, number);
        weekDays.append(head);

        const column = document.createElement('div');
        column.className = 'day-column' + (isToday ? ' today' : '');
        if (isToday) column.append(createNowLine());
        weekColumns.append(column);
    }
}

// Red line showing the current time, placed in today's column
function createNowLine() {
    const line = document.createElement('div');
    line.className = 'now-line';
    line.id = 'now-line';
    placeNowLine(line);
    return line;
}

function placeNowLine(line) {
    const now = new Date();
    line.style.top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT + 'px';
}

// Hour labels on the left of the week view (00:00 to 23:00)
function renderHours() {
    for (let h = 0; h < 24; h++) {
        const label = document.createElement('span');
        label.textContent = String(h).padStart(2, '0') + ':00';
        hours.append(label);
    }
    const offset = -today.getTimezoneOffset() / 60;
    document.getElementById('tz-label').textContent = 'GMT' + (offset >= 0 ? '+' : '−') + String(Math.abs(offset)).padStart(2, '0');
}

// Shows the week containing the date, in both the week view and the mini calendar
function showWeekOf(date) {
    weekStart = startOfWeek(date);
    miniMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    renderWeek();
    renderMini();
}

// Moves the week view by a number of weeks (-1 = previous, +1 = next)
function changeWeek(delta) {
    showWeekOf(addDays(weekStart, delta * 7));
}

async function init() {
    renderHours();
    showWeekOf(today);
    // Start the view a little before the current hour (never before 07:00)
    weekBody.scrollTop = Math.max(7, today.getHours() - 2) * HOUR_HEIGHT;
    setInterval(() => {
        const line = document.getElementById('now-line');
        if (line) placeNowLine(line);
    }, 60 * 1000);

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

newAgendaBtn.addEventListener('click', () => toggleForm(form.hidden));
document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
document.getElementById('today-btn').addEventListener('click', () => showWeekOf(today));
document.getElementById('mini-prev').addEventListener('click', () => {
    miniMonth = new Date(miniMonth.getFullYear(), miniMonth.getMonth() - 1, 1);
    renderMini();
});
document.getElementById('mini-next').addEventListener('click', () => {
    miniMonth = new Date(miniMonth.getFullYear(), miniMonth.getMonth() + 1, 1);
    renderMini();
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
        toggleForm(false);
    } catch (err) {
        if (err.status === 401) goToLogin();
        else if (err.status === 400) showError("Le nom de l'agenda est obligatoire.");
        else showError('Création impossible. Réessayez.');
    } finally {
        submitBtn.disabled = false;
    }
});

init();
