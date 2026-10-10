// agendas.js: logic of the home page (views/agendas.ejs)

const userLabel = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const list = document.getElementById('agenda-list');
const lens = document.getElementById('agenda-lens');
const calendarHint = document.getElementById('calendar-hint');
const emptyMessage = document.getElementById('empty');
const errorBox = document.getElementById('error');
const createBtn = document.getElementById('create-btn');
const weekLabel = document.getElementById('week-label');
const miniLabel = document.getElementById('mini-label');
const miniGrid = document.getElementById('mini-grid');
const weekBody = document.getElementById('week-body');
const weekDays = document.getElementById('week-days');
const weekColumns = document.getElementById('week-columns');
const hours = document.getElementById('hours');

// Creation sheet
const dialog = document.getElementById('create-dialog');
const createForm = document.getElementById('create-form');
const dialogError = document.getElementById('dialog-error');
const saveBtn = document.getElementById('save-btn');
const tacheFields = document.getElementById('tache-fields');
const agendaFields = document.getElementById('agenda-fields');
const tacheInputs = document.getElementById('tache-inputs');
const noAgendaNote = document.getElementById('no-agenda-note');
const tacheTitle = document.getElementById('tache-title');
const tacheDate = document.getElementById('tache-date');
const tacheStart = document.getElementById('tache-start');
const tacheEnd = document.getElementById('tache-end');
const tacheLocation = document.getElementById('tache-location');
const tacheDescription = document.getElementById('tache-description');
const pickerBtn = document.getElementById('picker-btn');
const pickerPanel = document.getElementById('picker-panel');
const pickerChips = document.getElementById('picker-chips');
const pickerOptions = document.getElementById('picker-options');
const agendaName = document.getElementById('agenda-name');
const colorCustom = document.getElementById('color-custom');
const colorCustomRadio = document.getElementById('color-custom-radio');
const agendaPreview = document.getElementById('agenda-preview');
const agendaPreviewName = document.getElementById('agenda-preview-name');

// Details of a tache
const eventDialog = document.getElementById('event-dialog');
const eventTitle = document.getElementById('event-title');
const eventWhen = document.getElementById('event-when');
const eventLocationRow = document.getElementById('event-location-row');
const eventLocation = document.getElementById('event-location');
const eventAgenda = document.getElementById('event-agenda');
const eventDescription = document.getElementById('event-description');

const HOUR_HEIGHT = 48; // px, must match --hour-height in style.css

const today = new Date();
let weekStart = startOfWeek(today);                                   // Monday of the week shown on the right
let miniMonth = new Date(today.getFullYear(), today.getMonth(), 1);  // month shown in the mini calendar

let agendas = [];
let evenements = [];
let selectedAgendaId = null;      // agenda whose taches are shown; null = empty calendar
let pickedAgendaIds = new Set();  // agendas ticked in the sheet for the new tache
let activeCard = null;            // card of the tache whose details are open

/**
 * Shows an error message in the sidebar error box
 * @param {string} message the message to show
 */
function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

/**
 * Sends the user back to the login page (used when the session is missing or expired)
 */
function goToLogin() {
    window.location.href = '/';
}

/**
 * Returns a new date shifted by a number of days (the original date is not changed)
 * @param {Date} date the starting date
 * @param {number} days number of days to add (negative to go back)
 * @returns {Date} the shifted date, at midnight
 */
function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Returns the Monday of the week containing the date
 * @param {Date} date any day of the week
 * @returns {Date} the Monday of that week, at midnight
 */
function startOfWeek(date) {
    return addDays(date, -((date.getDay() + 6) % 7));
}

/**
 * Tells whether two dates fall on the same calendar day
 * @param {Date} a first date
 * @param {Date} b second date
 * @returns {boolean} true if both dates are the same day
 */
function isSameDay(a, b) {
    return a.toDateString() === b.toDateString();
}

/**
 * Puts the first letter of a text in upper case
 * @param {string} text the text to capitalize
 * @returns {string} the text with an upper case first letter
 */
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Writes a number on two digits, e.g. 7 -> "07"
 * @param {number} n the number to pad
 * @returns {string} the number on at least two digits
 */
function pad(n) {
    return String(n).padStart(2, '0');
}

/**
 * Formats a date for an <input type="date">, in local time
 * @param {Date} date the date to format
 * @returns {string} the date as "YYYY-MM-DD"
 */
function toDateInput(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/**
 * Formats the time of a date for an <input type="time">, in local time
 * @param {Date} date the date to format
 * @returns {string} the time as "HH:MM"
 */
function toTimeInput(date) {
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
}

/**
 * Formats the time of a date for display, French style
 * @param {Date} date the date to format
 * @returns {string} the time as "HH:MM"
 */
function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Finds a loaded agenda by its id
 * @param {string} id the id of the agenda
 * @returns {Object|undefined} the agenda, or undefined if it is not loaded
 */
function findAgenda(id) {
    return agendas.find((a) => a.id === id);
}

// ---------- Sidebar: agendas act as a filter ----------

/**
 * Builds one <li> for an agenda in the sidebar: its color dot, its name and its number of taches.
 * Clicking it shows only its taches; clicking it again shows every agenda.
 * textContent is used so a name can never inject HTML.
 * @param {Object} agenda the agenda to show ({ id, name, color, createdAt })
 * @returns {HTMLLIElement} the list item to insert
 */
function createAgendaRow(agenda) {
    const item = document.createElement('li');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'agenda-item';
    button.dataset.id = agenda.id;
    button.title = 'Créé le ' + new Date(agenda.createdAt).toLocaleDateString('fr-FR');
    button.style.setProperty('--agenda-color', agenda.color);
    button.setAttribute('aria-pressed', String(agenda.id === selectedAgendaId));

    const dot = document.createElement('span');
    dot.className = 'agenda-dot';
    dot.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'agenda-name';
    name.textContent = agenda.name;

    const count = evenements.filter((e) => e.agendaId === agenda.id).length;
    const badge = document.createElement('span');
    badge.className = 'agenda-count';
    badge.textContent = count || '';
    badge.setAttribute('aria-label', count + (count > 1 ? ' tâches' : ' tâche'));

    // Clicking the shown agenda again empties the calendar
    button.addEventListener('click', () => selectAgenda(agenda.id === selectedAgendaId ? null : agenda.id));

    button.append(dot, name, badge);
    item.append(button);
    return item;
}

/**
 * Redraws the list of agendas in the sidebar and places the highlight on the selected one
 */
function renderAgendaList() {
    list.replaceChildren(...agendas.map(createAgendaRow));
    emptyMessage.hidden = agendas.length > 0;
    moveLens();
    updateCalendarHint();
}

/**
 * Shows only the taches of one agenda in the week view and highlights it in the sidebar
 * @param {string|null} id the id of the agenda to show, or null for an empty calendar
 */
function selectAgenda(id) {
    selectedAgendaId = id;
    list.querySelectorAll('.agenda-item').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.id === id));
    });
    moveLens();
    updateCalendarHint();
    renderEvents();
}

/**
 * Shows a hint over the empty calendar while no agenda is selected
 * (create an agenda first if there is none yet)
 */
function updateCalendarHint() {
    calendarHint.textContent = agendas.length
        ? 'Sélectionnez un agenda pour afficher ses tâches'
        : 'Créez un agenda pour commencer';
    const gone = selectedAgendaId !== null;
    calendarHint.classList.toggle('gone', gone);
    calendarHint.setAttribute('aria-hidden', String(gone));
}

/**
 * Moves the glass highlight (lens) behind the selected agenda and gives it that agenda's color.
 * Hides the lens when no agenda is selected.
 */
function moveLens() {
    const active = list.querySelector('.agenda-item[aria-pressed="true"]');
    if (!active) {
        lens.classList.remove('visible');
        return;
    }

    // Appearing: place it at once instead of sliding from its last position
    const appearing = !lens.classList.contains('visible');
    if (appearing) lens.classList.add('jump');

    lens.style.setProperty('--agenda-color', active.style.getPropertyValue('--agenda-color'));
    lens.style.height = active.offsetHeight + 'px';
    lens.style.transform = 'translateY(' + active.offsetTop + 'px)';

    if (appearing) {
        lens.getBoundingClientRect(); // apply the position before turning transitions back on
        lens.classList.remove('jump');
    }
    lens.classList.add('visible');
}

/**
 * Draws the mini calendar of the sidebar: 6 weeks, Monday first.
 * The shown week and today are highlighted; clicking a day shows its week.
 */
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

/**
 * Draws the week view: header with the 7 days, one column per day, today highlighted,
 * then places the taches of the week
 */
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
        column.dataset.day = i;
        if (isToday) column.append(createNowLine());
        weekColumns.append(column);
    }
    renderEvents();
}

// ---------- Taches in the week view ----------

/**
 * Places the taches of the selected agenda in the day columns, in its color.
 * Nothing is shown while no agenda is selected.
 */
function renderEvents() {
    weekColumns.querySelectorAll('.event').forEach((el) => el.remove());

    const shown = evenements.filter((e) => e.agendaId === selectedAgendaId && findAgenda(e.agendaId));

    let index = 0; // staggers the entrance animation
    for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i);
        const dayEnd = addDays(weekStart, i + 1);

        // Part of each tache that falls on this day (a tache can run past midnight)
        const segments = shown
            .map((ev) => ({
                ev,
                start: Math.max(new Date(ev.start).getTime(), dayStart.getTime()),
                end: Math.min(new Date(ev.end).getTime(), dayEnd.getTime()),
            }))
            .filter((s) => s.end > s.start)
            .sort((a, b) => a.start - b.start || b.end - a.end);

        layoutLanes(segments);
        const column = weekColumns.children[i];
        segments.forEach((segment) => column.append(createEventBlock(segment, dayStart, index++)));
    }
}

/**
 * Places overlapping taches side by side: each segment gets a lane, and every segment
 * of a group of overlaps knows how many lanes the group uses.
 * Writes the result in the segments (lane, lanes).
 * @param {Array<{start: number, end: number}>} segments the taches of one day, sorted by start time
 */
function layoutLanes(segments) {
    let group = [];
    let laneEnds = [];
    let groupEnd = 0;

    const closeGroup = () => {
        group.forEach((s) => { s.lanes = laneEnds.length; });
        group = [];
        laneEnds = [];
    };

    for (const s of segments) {
        if (group.length && s.start >= groupEnd) closeGroup();
        let lane = laneEnds.findIndex((end) => end <= s.start);
        if (lane === -1) lane = laneEnds.length;
        laneEnds[lane] = s.end;
        s.lane = lane;
        group.push(s);
        groupEnd = group.length === 1 ? s.end : Math.max(groupEnd, s.end);
    }
    closeGroup();
}

/**
 * Builds the card of one tache in a day column: title, time and place, in its agenda's color
 * @param {{ev: Object, start: number, end: number, lane: number, lanes: number}} segment the part of the tache on this day and its lane
 * @param {Date} dayStart midnight of the day of the column
 * @param {number} index position of the card in the week, used to stagger its entrance animation
 * @returns {HTMLButtonElement} the card to insert in the column; clicking it opens the details
 */
function createEventBlock(segment, dayStart, index) {
    const { ev } = segment;
    const agenda = findAgenda(ev.agendaId);
    const top = (segment.start - dayStart.getTime()) / 60000;
    const minutes = (segment.end - segment.start) / 60000;

    const block = document.createElement('button');
    block.type = 'button';
    block.className = 'event' + (minutes < 50 ? ' compact' : '');
    block.style.setProperty('--agenda-color', agenda.color);
    block.style.setProperty('--i', index);
    block.style.top = (top / 60) * HOUR_HEIGHT + 'px';
    block.style.height = Math.max((minutes / 60) * HOUR_HEIGHT, 22) + 'px';
    block.style.left = 'calc(' + (segment.lane / segment.lanes) * 100 + '% + 3px)';
    block.style.width = 'calc(' + 100 / segment.lanes + '% - 6px)';

    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const time = formatTime(start) + ' – ' + formatTime(end);
    block.title = ev.title + '\n' + time + '\n' + agenda.name + (ev.location ? '\n' + ev.location : '');

    const title = document.createElement('span');
    title.className = 'event-title';
    title.textContent = ev.title;

    const when = document.createElement('span');
    when.className = 'event-time';
    when.textContent = time;

    block.append(title, when);

    if (ev.location) {
        const where = document.createElement('span');
        where.className = 'event-location';
        where.textContent = ev.location;
        block.append(where);
    }

    block.addEventListener('click', () => openEvent(ev, block));
    return block;
}

// ---------- Details of a tache ----------

/**
 * Describes when a tache happens, e.g. "Samedi 10 octobre · 10:00 – 11:00"
 * @param {Date} start start of the tache
 * @param {Date} end end of the tache
 * @returns {string} the day and the times (both days if it runs past midnight)
 */
function formatWhen(start, end) {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const startDay = capitalize(start.toLocaleDateString('fr-FR', options));
    if (isSameDay(start, end)) return startDay + ' · ' + formatTime(start) + ' – ' + formatTime(end);
    return startDay + ', ' + formatTime(start) + ' – ' + end.toLocaleDateString('fr-FR', options) + ', ' + formatTime(end);
}

/**
 * Opens the details of a tache (date, time, place, agenda, description) next to its card
 * @param {Object} ev the tache to show ({ title, start, end, location, description, agendaId })
 * @param {HTMLElement} card the card of the tache in the week view
 */
function openEvent(ev, card) {
    const agenda = findAgenda(ev.agendaId);
    eventDialog.style.setProperty('--agenda-color', agenda.color);
    eventTitle.textContent = ev.title;
    eventWhen.textContent = formatWhen(new Date(ev.start), new Date(ev.end));
    eventLocation.textContent = ev.location || '';
    eventLocationRow.hidden = !ev.location;
    eventAgenda.textContent = agenda.name;
    eventDescription.textContent = ev.description || 'Aucune description';
    eventDescription.classList.toggle('empty', !ev.description);

    clearActiveCard();
    activeCard = card;
    card.classList.add('active');
    eventDialog.showModal();
    placeEventDialog(card);
}

/**
 * Closes the details of the tache
 */
function closeEvent() {
    clearActiveCard();
    eventDialog.close();
}

/**
 * Removes the highlight from the card whose details were open
 */
function clearActiveCard() {
    if (activeCard) activeCard.classList.remove('active');
    activeCard = null;
}

/**
 * Places the details beside the card: on its right if there is room, otherwise on its left,
 * always kept inside the window. On small screens the CSS docks it at the bottom instead.
 * @param {HTMLElement} card the card of the tache in the week view
 */
function placeEventDialog(card) {
    const gap = 12;
    const margin = 16;
    const rect = card.getBoundingClientRect();
    const width = eventDialog.offsetWidth;
    const height = eventDialog.offsetHeight;

    const onRight = rect.right + gap + width <= window.innerWidth - margin;
    const x = onRight ? rect.right + gap : Math.max(margin, rect.left - gap - width);
    const y = Math.min(Math.max(margin, rect.top), window.innerHeight - margin - height);

    eventDialog.style.setProperty('--x', x + 'px');
    eventDialog.style.setProperty('--y', y + 'px');
    eventDialog.dataset.side = onRight ? 'right' : 'left';
}

/**
 * Creates the red line showing the current time, to place in today's column
 * @returns {HTMLDivElement} the line
 */
function createNowLine() {
    const line = document.createElement('div');
    line.className = 'now-line';
    line.id = 'now-line';
    placeNowLine(line);
    return line;
}

/**
 * Moves the current time line to the current hour and minute
 * @param {HTMLElement} line the line to move
 */
function placeNowLine(line) {
    const now = new Date();
    line.style.top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT + 'px';
}

/**
 * Writes the hour labels on the left of the week view (00:00 to 23:00) and the time zone
 */
function renderHours() {
    for (let h = 0; h < 24; h++) {
        const label = document.createElement('span');
        label.textContent = String(h).padStart(2, '0') + ':00';
        hours.append(label);
    }
    const offset = -today.getTimezoneOffset() / 60;
    document.getElementById('tz-label').textContent = 'GMT' + (offset >= 0 ? '+' : '−') + String(Math.abs(offset)).padStart(2, '0');
}

/**
 * Shows the week containing the date, in both the week view and the mini calendar
 * @param {Date} date any day of the week to show
 */
function showWeekOf(date) {
    weekStart = startOfWeek(date);
    miniMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    renderWeek();
    renderMini();
}

/**
 * Moves the week view by a number of weeks
 * @param {number} delta number of weeks to move (-1 = previous, +1 = next)
 */
function changeWeek(delta) {
    showWeekOf(addDays(weekStart, delta * 7));
}

/**
 * Starts the page: draws the calendar, loads the user, their agendas and their taches.
 * Sends the user to the login page if they are not logged in.
 */
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

        [agendas, evenements] = await Promise.all([api.getAgendas(), api.getEvenements()]);
        renderAgendaList();
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

document.getElementById('event-close').addEventListener('click', closeEvent);

// A click outside the details closes them
eventDialog.addEventListener('click', (event) => {
    if (event.target === eventDialog) closeEvent();
});

// Escape: the dialog closes itself, the card only needs to lose its highlight
eventDialog.addEventListener('cancel', clearActiveCard);
eventDialog.addEventListener('close', clearActiveCard);

// Clicking an empty slot of the week opens the sheet on that day and half hour
weekColumns.addEventListener('click', (event) => {
    if (event.target.closest('.event')) return;
    const column = event.target.closest('.day-column');
    if (!column) return;

    const y = event.clientY - column.getBoundingClientRect().top;
    const halfHours = Math.min(47, Math.floor((y / HOUR_HEIGHT) * 2));
    const start = addDays(weekStart, Number(column.dataset.day));
    start.setMinutes(halfHours * 30);
    openCreate({ kind: 'tache', start });
});

// ---------- Creation sheet ----------

/**
 * Returns the next full hour from now, e.g. 14:20 -> 15:00
 * @returns {Date} the next full hour
 */
function nextFullHour() {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return date;
}

/**
 * Opens the creation sheet with an empty form
 * @param {Object} [options]
 * @param {'tache'|'agenda'} [options.kind] what to create; by default a tache, or an agenda if there is none yet
 * @param {Date} [options.start] day and time to prefill for the tache; by default the next full hour
 */
function openCreate({ kind, start } = {}) {
    createForm.reset();
    dialogError.hidden = true;

    const begin = start || nextFullHour();
    const end = new Date(begin.getTime() + 60 * 60 * 1000);
    tacheDate.value = toDateInput(begin);
    tacheStart.value = toTimeInput(begin);
    tacheEnd.value = isSameDay(begin, end) ? toTimeInput(end) : '23:59';

    // The new tache goes to the shown agenda, or to the first one
    const preset = selectedAgendaId || (agendas[0] && agendas[0].id);
    pickedAgendaIds = new Set(preset ? [preset] : []);
    renderPicker();
    togglePicker(false);

    colorCustomRadio.value = colorCustom.value;
    updateAgendaPreview();

    setKind(kind || (agendas.length ? 'tache' : 'agenda'));
    dialog.showModal();
    createBtn.setAttribute('aria-expanded', 'true');
    focusFirstField();
}

/**
 * Closes the creation sheet
 */
function closeCreate() {
    dialog.close();
}

/**
 * Tells what the sheet is creating
 * @returns {'tache'|'agenda'} the selected kind
 */
function currentKind() {
    return createForm.elements.kind.value;
}

/**
 * Switches the sheet between creating a tache and creating an agenda
 * @param {'tache'|'agenda'} kind what to create
 */
function setKind(kind) {
    createForm.elements.kind.value = kind;
    const isTache = kind === 'tache';
    const canAddTache = agendas.length > 0;

    tacheFields.hidden = !isTache;
    agendaFields.hidden = isTache;
    tacheInputs.hidden = !canAddTache;
    noAgendaNote.hidden = canAddTache;
    saveBtn.hidden = isTache && !canAddTache;
    saveBtn.textContent = isTache ? 'Créer la tâche' : "Créer l'agenda";
    dialogError.hidden = true;
}

/**
 * Puts the focus in the first field of the shown form (title of the tache or name of the agenda)
 */
function focusFirstField() {
    if (currentKind() === 'agenda') agendaName.focus();
    else if (agendas.length) tacheTitle.focus();
}

/**
 * Shows an error message inside the creation sheet
 * @param {string} message the message to show
 */
function showDialogError(message) {
    dialogError.textContent = message;
    dialogError.hidden = false;
}

/**
 * Redraws the agenda picker of the sheet: the chips and the checkbox list
 */
function renderPicker() {
    renderPickerChips();
    renderPickerOptions();
}

/**
 * Redraws the chips of the agendas chosen for the tache (or a placeholder if none)
 */
function renderPickerChips() {
    pickerChips.replaceChildren();
    const picked = agendas.filter((a) => pickedAgendaIds.has(a.id));
    if (picked.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'picker-placeholder';
        placeholder.textContent = 'Choisir un ou plusieurs agendas';
        pickerChips.append(placeholder);
    }
    picked.forEach((agenda) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.setProperty('--agenda-color', agenda.color);
        chip.textContent = agenda.name;
        pickerChips.append(chip);
    });
}

/**
 * Redraws the checkbox list of the agenda picker, one line per agenda in its color
 */
function renderPickerOptions() {
    pickerOptions.replaceChildren(...agendas.map((agenda) => {
        const item = document.createElement('li');
        const label = document.createElement('label');
        label.className = 'picker-option';
        label.style.setProperty('--agenda-color', agenda.color);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = agenda.id;
        checkbox.checked = pickedAgendaIds.has(agenda.id);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) pickedAgendaIds.add(agenda.id);
            else pickedAgendaIds.delete(agenda.id);
            renderPickerChips();
            dialogError.hidden = true;
        });

        const name = document.createElement('span');
        name.className = 'agenda-name';
        name.textContent = agenda.name;

        label.append(checkbox, name);
        item.append(label);
        return item;
    }));
}

/**
 * Tells whether the agenda picker list is open
 * @returns {boolean} true if the list is open
 */
function isPickerOpen() {
    return pickerBtn.getAttribute('aria-expanded') === 'true';
}

/**
 * Opens or closes the agenda picker list
 * @param {boolean} open true to open the list, false to close it
 */
function togglePicker(open) {
    pickerBtn.setAttribute('aria-expanded', String(open));
    pickerPanel.classList.toggle('open', open);
    pickerPanel.inert = !open;
}

/**
 * Updates the preview of the new agenda with the typed name and the chosen color
 */
function updateAgendaPreview() {
    agendaPreview.style.setProperty('--agenda-color', createForm.elements.color.value);
    agendaPreviewName.textContent = agendaName.value.trim() || "Nom de l'agenda";
}

/**
 * Checks the agenda form, creates the agenda and adds it to the sidebar
 * @returns {Promise<boolean>} true if the agenda was created, false if a field is invalid
 */
async function submitAgenda() {
    const name = agendaName.value.trim();
    if (!name) {
        showDialogError("Saisissez un nom pour l'agenda.");
        agendaName.focus();
        return false;
    }

    const agenda = await api.createAgenda(name, createForm.elements.color.value);
    agendas.push(agenda);
    renderAgendaList();
    return true;
}

/**
 * Checks the tache form and creates the tache in every chosen agenda (one copy per agenda),
 * then shows its week so the user sees it
 * @returns {Promise<boolean>} true if the tache was created, false if a field is invalid
 */
async function submitTache() {
    const title = tacheTitle.value.trim();
    const start = new Date(tacheDate.value + 'T' + tacheStart.value);
    const end = new Date(tacheDate.value + 'T' + tacheEnd.value);

    if (!title) {
        showDialogError('Saisissez un titre pour la tâche.');
        tacheTitle.focus();
        return false;
    }
    if (isNaN(start) || isNaN(end)) {
        showDialogError('Choisissez une date, une heure de début et une heure de fin.');
        return false;
    }
    if (end <= start) {
        showDialogError("L'heure de fin doit être après l'heure de début.");
        tacheEnd.focus();
        return false;
    }
    if (pickedAgendaIds.size === 0) {
        showDialogError('Choisissez au moins un agenda.');
        togglePicker(true);
        return false;
    }

    const data = {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        location: tacheLocation.value.trim(),
        description: tacheDescription.value.trim(),
    };
    const created = await Promise.all([...pickedAgendaIds].map((id) => api.createEvenement(id, data)));
    evenements.push(...created);

    // Make sure the new tache is visible: its week, in an agenda it was added to
    if (!pickedAgendaIds.has(selectedAgendaId)) selectedAgendaId = [...pickedAgendaIds][0];
    renderAgendaList();
    showWeekOf(start);
    weekBody.scrollTo({ top: Math.max(0, start.getHours() - 2) * HOUR_HEIGHT, behavior: 'smooth' });
    return true;
}

createBtn.addEventListener('click', () => openCreate());
document.getElementById('close-dialog').addEventListener('click', closeCreate);
document.getElementById('cancel-btn').addEventListener('click', closeCreate);
document.getElementById('go-agenda-btn').addEventListener('click', () => {
    setKind('agenda');
    agendaName.focus();
});

createForm.elements.kind.forEach((radio) => {
    radio.addEventListener('change', () => {
        setKind(radio.value);
        togglePicker(false);
    });
});

pickerBtn.addEventListener('click', () => togglePicker(!isPickerOpen()));

agendaName.addEventListener('input', updateAgendaPreview);
agendaFields.addEventListener('change', updateAgendaPreview);

// The custom swatch takes the color chosen in the native picker
colorCustom.addEventListener('input', () => {
    colorCustomRadio.value = colorCustom.value;
    colorCustomRadio.checked = true;
    colorCustomRadio.closest('.swatch').style.setProperty('--swatch', colorCustom.value);
    updateAgendaPreview();
});

createForm.addEventListener('input', () => { dialogError.hidden = true; });

// Escape closes the agenda list first, then the sheet
dialog.addEventListener('cancel', (event) => {
    if (isPickerOpen()) {
        event.preventDefault();
        togglePicker(false);
        pickerBtn.focus();
    }
});

// A click on the dimmed page around the sheet closes it
dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeCreate();
});

dialog.addEventListener('close', () => {
    createBtn.setAttribute('aria-expanded', 'false');
});

createForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    saveBtn.disabled = true;
    try {
        const done = currentKind() === 'agenda' ? await submitAgenda() : await submitTache();
        if (done) closeCreate();
    } catch (err) {
        if (err.status === 401) goToLogin();
        else if (err.status === 400) showDialogError('Vérifiez les champs puis réessayez.');
        else showDialogError('Création impossible. Réessayez.');
    } finally {
        saveBtn.disabled = false;
    }
});

window.addEventListener('resize', moveLens);

init();
