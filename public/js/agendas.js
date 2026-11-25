const userLabel = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const list = document.getElementById('agenda-list');
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

const dialog = document.getElementById('create-dialog');
const createForm = document.getElementById('create-form');
const dialogError = document.getElementById('dialog-error');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const sheetTitle = document.getElementById('create-title');
const kindSwitch = document.getElementById('kind-switch');
const tacheFields = document.getElementById('tache-fields');
const agendaFields = document.getElementById('agenda-fields');
const tacheTitle = document.getElementById('tache-title');
const tacheDate = document.getElementById('tache-date');
const tacheStart = document.getElementById('tache-start');
const tacheEnd = document.getElementById('tache-end');
const tacheRecurrence = document.getElementById('tache-recurrence');
const tacheRecurrenceEnd = document.getElementById('tache-recurrence-end');
const recurrenceEndField = document.getElementById('recurrence-end-field');
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

const eventDialog = document.getElementById('event-dialog');
const eventTitle = document.getElementById('event-title');
const eventWhen = document.getElementById('event-when');
const eventLocationRow = document.getElementById('event-location-row');
const eventLocation = document.getElementById('event-location');
const eventAgenda = document.getElementById('event-agenda');
const eventDescription = document.getElementById('event-description');
const eventError = document.getElementById('event-error');
const eventDeleteBtn = document.getElementById('event-delete');
const eventScope = document.getElementById('event-scope');
const eventScopeLabel = document.getElementById('event-scope-label');
const eventMainActions = document.getElementById('event-main-actions');

const shareDialog = document.getElementById('share-dialog');
const shareTitle = document.getElementById('share-title');
const shareForm = document.getElementById('share-form');
const shareUsername = document.getElementById('share-username');
const shareAddBtn = document.getElementById('share-add');
const shareError = document.getElementById('share-error');
const shareStatus = document.getElementById('share-status');
const shareList = document.getElementById('share-list');
const shareEmpty = document.getElementById('share-empty');
const shareRemoveBtn = document.getElementById('share-remove');

const searchInput = document.getElementById('search-input');
const searchFilterBtn = document.getElementById('search-filter-btn');
const searchFilters = document.getElementById('search-filters');
const searchTitle = document.getElementById('search-title');
const searchFilterCount = document.getElementById('search-filter-count');
const searchStartDate = document.getElementById('search-start-date');
const searchEndDate = document.getElementById('search-end-date');
const searchPeriodError = document.getElementById('search-period-error');
const searchAgenda = document.getElementById('search-agenda');
const searchLocation = document.getElementById('search-location');
const searchResetBtn = document.getElementById('search-reset-btn');
const searchSubmitBtn = document.getElementById('search-submit-btn');
const searchResults = document.getElementById('search-results');
const searchResultsCount = document.getElementById('search-results-count');
const searchResultsList = document.getElementById('search-results-list');
const searchEmpty = document.getElementById('search-empty');

const HOUR_HEIGHT = 48;

const today = new Date();
let weekStart = startOfWeek(today);
let miniMonth = new Date(today.getFullYear(), today.getMonth(), 1);

let currentUser = null;
let agendas = [];
let evenements = [];
let calendarEvenements = [];
let selectedAgendaIds = new Set();
let calendarStateKey = null;
let pickedAgendaIds = new Set();
let activeCard = null;
let shownEvent = null;
// Identifiants (de série) des événements sélectionnés dans le calendrier.
let selectedEventIds = new Set();
let editing = null;
let draft = null;
let sharingAgenda = null;
let partages = [];

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function goToLogin() {
    window.location.href = '/';
}

function addDays(date, days) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + days
    );
}

function startOfWeek(date) {
    return addDays(
        date,
        -((date.getDay() + 6) % 7)
    );
}

function isSameDay(a, b) {
    return a.toDateString() === b.toDateString();
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function pad(n) {
    return String(n).padStart(2, '0');
}

function toDateInput(date) {
    return (
        date.getFullYear()
        + '-'
        + pad(date.getMonth() + 1)
        + '-'
        + pad(date.getDate())
    );
}

function restoreCalendarState() {
    const key = 'chronosquad.calendar.' + currentUser.id;
    let state = history.state?.[key];

    if (!state) {
        try {
            state = JSON.parse(localStorage.getItem(key));
        } catch {
            // Le calendrier reste utilisable si le stockage est indisponible.
        }
    }

    const savedWeek = parseIsoDate(state?.weekStart);
    const savedMonth = parseIsoDate(state?.miniMonth);
    if (savedWeek && toDateInput(savedWeek) === state.weekStart) {
        weekStart = startOfWeek(savedWeek);
    }
    if (savedMonth && toDateInput(savedMonth) === state.miniMonth) {
        miniMonth = new Date(savedMonth.getFullYear(), savedMonth.getMonth(), 1);
    }
    if (Array.isArray(state?.agendaIds)) {
        const savedIds = new Set(state.agendaIds);
        selectedAgendaIds = new Set(
            agendas.map(agenda => agenda.id).filter(id => savedIds.has(id))
        );
    }

    calendarStateKey = key;
    saveCalendarState({ rememberForLogin: false });
}

function saveCalendarState({ rememberForLogin = true } = {}) {
    if (!calendarStateKey) return;

    const state = {
        weekStart: toDateInput(weekStart),
        miniMonth: toDateInput(miniMonth),
        agendaIds: [...selectedAgendaIds]
    };

    try {
        history.replaceState({ [calendarStateKey]: state }, '');
    } catch {
        // Certaines navigations limitent les écritures dans l'historique.
    }

    if (!rememberForLogin) return;

    try {
        localStorage.setItem(calendarStateKey, JSON.stringify(state));
    } catch {
        // Le stockage peut être bloqué par le navigateur.
    }
}

function toTimeInput(date) {
    return (
        pad(date.getHours())
        + ':'
        + pad(date.getMinutes())
    );
}

function formatTime(date) {
    return date.toLocaleTimeString(
        'fr-FR',
        {
            hour: '2-digit',
            minute: '2-digit'
        }
    );
}

function findAgenda(id) {
    return agendas.find(
        (a) => a.id === id
    );
}

function isOwnAgenda(agenda) {
    return (
        !currentUser
        || agenda.ownerId === undefined
        || agenda.ownerId === currentUser.id
    );
}

function isSharedAgenda(agenda) {
    return (
        !isOwnAgenda(agenda)
        || (agenda.sharedWith || []).length > 0
    );
}

function pluralize(count, word) {
    return (
        count
        + ' '
        + word
        + (count > 1 ? 's' : '')
    );
}


/* =========================================================
   RECHERCHE DE RENDEZ-VOUS
   ========================================================= */

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function getSearchEventKey(ev) {
    return String(ev.recurringEventId || ev.id)
        + '|'
        + new Date(ev.start).toISOString();
}

function syncSearchAgendaOptions() {
    if (!searchAgenda) return;

    const previousValue = searchAgenda.value;

    searchAgenda.replaceChildren();

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Tous les agendas';
    searchAgenda.append(allOption);

    agendas.forEach((agenda) => {
        const option = document.createElement('option');
        option.value = String(agenda.id);
        option.textContent = agenda.name;
        searchAgenda.append(option);
    });

    if (
        [...searchAgenda.options].some(
            (option) => option.value === previousValue
        )
    ) {
        searchAgenda.value = previousValue;
    }
}

function toggleSearchFilters(forceOpen) {
    if (!searchFilters || !searchFilterBtn) return;

    const shouldOpen =
        forceOpen !== undefined
            ? forceOpen
            : searchFilters.hidden;

    searchFilters.hidden = !shouldOpen;

    searchFilterBtn.setAttribute(
        'aria-expanded',
        String(shouldOpen)
    );
}

function getSearchCriteria() {
    return {
        query: normalizeSearchText(searchInput?.value),
        title: normalizeSearchText(searchTitle?.value),
        startDate: searchStartDate?.value || '',
        endDate: searchEndDate?.value || '',
        agendaId: searchAgenda?.value || '',
        location: normalizeSearchText(searchLocation?.value),
    };
}

// Nombre de critères actifs dans le panneau « Filtres »
// (le texte de la barre de recherche n'en fait pas partie).
function countActiveFilters(criteria) {
    return [
        criteria.title,
        criteria.startDate || criteria.endDate,
        criteria.agendaId,
        criteria.location
    ].filter(Boolean).length;
}

function hasSearchCriteria(criteria) {
    return Boolean(criteria.query) || countActiveFilters(criteria) > 0;
}

function updateSearchFilterCount() {
    if (!searchFilterCount) return;

    const count = countActiveFilters(getSearchCriteria());

    searchFilterCount.hidden = count === 0;
    searchFilterCount.textContent = String(count);

    searchFilterBtn?.setAttribute(
        'aria-label',
        count === 0
            ? 'Afficher les critères de recherche'
            : 'Afficher les critères de recherche (' + count + ' actif' + (count > 1 ? 's' : '') + ')'
    );
}

function isSearchPeriodValid(criteria) {
    const valid = !(
        criteria.startDate
        && criteria.endDate
        && criteria.startDate > criteria.endDate
    );

    if (searchPeriodError) {
        searchPeriodError.hidden = valid;
    }

    return valid;
}

// Un rendez-vous correspond s'il chevauche la période :
// « Du » seul = à partir de ce jour, « Au » seul = jusqu'à ce jour inclus.
function eventInSearchPeriod(ev, criteria) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);

    if (criteria.startDate) {
        const from = parseIsoDate(criteria.startDate);

        if (start < from && end <= from) return false;
    }

    if (criteria.endDate) {
        const to = parseIsoDate(criteria.endDate);
        to.setDate(to.getDate() + 1);

        if (start >= to) return false;
    }

    return true;
}

function eventMatchesSearch(ev, criteria) {
    const agenda = findAgenda(ev.agendaId);

    const title = normalizeSearchText(ev.title);
    const location = normalizeSearchText(ev.location);
    const description = normalizeSearchText(ev.description);
    const agendaName = normalizeSearchText(agenda?.name);

    if (criteria.query) {
        const quickMatch =
            title.includes(criteria.query)
            || location.includes(criteria.query)
            || description.includes(criteria.query)
            || agendaName.includes(criteria.query);

        if (!quickMatch) return false;
    }

    if (
        criteria.title
        && !title.includes(criteria.title)
    ) {
        return false;
    }

    if (
        criteria.location
        && !location.includes(criteria.location)
    ) {
        return false;
    }

    if (
        criteria.agendaId
        && String(ev.agendaId) !== criteria.agendaId
    ) {
        return false;
    }

    if (!eventInSearchPeriod(ev, criteria)) {
        return false;
    }

    return true;
}

function formatSearchResultDate(ev) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);

    return (
        capitalize(
            start.toLocaleDateString(
                'fr-FR',
                {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }
            )
        )
        + ' · '
        + formatTime(start)
        + ' – '
        + formatTime(end)
    );
}

function openSearchResult(ev) {
    const start = new Date(ev.start);

    selectedAgendaIds.add(ev.agendaId);

    showWeekOf(start);
    renderAgendaList();
    renderEvents();

    const key = getSearchEventKey(ev);

    requestAnimationFrame(() => {
        const card = [
            ...weekColumns.querySelectorAll(
                '.event:not(.draft)'
            )
        ].find(
            (element) =>
                element.dataset.searchEventKey === key
        );

        if (card) {
            card.scrollIntoView({
                block: 'center',
                behavior: 'smooth'
            });

            card.click();
        }
    });

    if (searchResults) {
        searchResults.hidden = true;
    }
}

function renderSearchResults(matches) {
    if (
        !searchResults
        || !searchResultsList
        || !searchResultsCount
        || !searchEmpty
    ) {
        return;
    }

    searchResults.hidden = false;
    searchResultsList.replaceChildren();

    searchResultsCount.textContent =
        matches.length === 1
            ? '1 rendez-vous trouvé'
            : matches.length + ' rendez-vous trouvés';

    searchEmpty.hidden = matches.length !== 0;

    matches.forEach((ev) => {
        const agenda = findAgenda(ev.agendaId);

        const item = document.createElement('li');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-result-item';

        const title = document.createElement('strong');
        title.className = 'search-result-title';
        title.textContent = ev.title || 'Sans titre';

        const when = document.createElement('span');
        when.className = 'search-result-when';
        when.textContent = formatSearchResultDate(ev);

        const meta = document.createElement('span');
        meta.className = 'search-result-meta';

        const details = [];

        if (agenda?.name) {
            details.push('Agenda : ' + agenda.name);
        }

        if (ev.location) {
            details.push('Lieu : ' + ev.location);
        }

        meta.textContent = details.join(' · ');

        button.append(title, when);

        if (meta.textContent) {
            button.append(meta);
        }

        button.addEventListener(
            'click',
            () => openSearchResult(ev)
        );

        item.append(button);
        searchResultsList.append(item);
    });
}

function performSearch() {
    const criteria = getSearchCriteria();

    updateSearchFilterCount();

    if (!isSearchPeriodValid(criteria)) {
        toggleSearchFilters(true);
        return;
    }

    if (!hasSearchCriteria(criteria)) {
        if (searchResults) {
            searchResults.hidden = true;
        }

        return;
    }

    const matches =
        calendarEvenements
            .filter(
                (ev) =>
                    eventMatchesSearch(
                        ev,
                        criteria
                    )
            )
            .sort(
                (a, b) =>
                    new Date(a.start)
                    -
                    new Date(b.start)
            );

    
    toggleSearchFilters(false);

    
    renderSearchResults(matches);
}

// Vide uniquement les critères du panneau « Filtres » :
// le texte recherché est conservé et la recherche est relancée.
function resetSearchFilters() {
    if (searchTitle) searchTitle.value = '';
    if (searchStartDate) searchStartDate.value = '';
    if (searchEndDate) searchEndDate.value = '';
    if (searchAgenda) searchAgenda.value = '';
    if (searchLocation) searchLocation.value = '';
    if (searchPeriodError) searchPeriodError.hidden = true;

    updateSearchFilterCount();

    if (getSearchCriteria().query) {
        performSearch();
        toggleSearchFilters(true);
    } else if (searchResults) {
        searchResults.hidden = true;
    }

    searchStartDate?.nextElementSibling
        ?.querySelector('.date-trigger')
        ?.focus();
}

// Échap dans la barre : tout est effacé (texte et critères).
function resetSearch() {
    if (searchInput) searchInput.value = '';
    if (searchTitle) searchTitle.value = '';
    if (searchStartDate) searchStartDate.value = '';
    if (searchEndDate) searchEndDate.value = '';
    if (searchAgenda) searchAgenda.value = '';
    if (searchLocation) searchLocation.value = '';
    if (searchPeriodError) searchPeriodError.hidden = true;

    updateSearchFilterCount();

    if (searchResults) {
        searchResults.hidden = true;
    }

    if (searchResultsList) {
        searchResultsList.replaceChildren();
    }

    if (searchResultsCount) {
        searchResultsCount.textContent = '';
    }

    if (searchEmpty) {
        searchEmpty.hidden = true;
    }

    searchInput?.focus();
}

function createAgendaRow(agenda) {
    const item = document.createElement('li');

    const row = document.createElement('label');
    row.className = 'agenda-item';
    row.title =
        'Créé le '
        + new Date(
            agenda.createdAt
        ).toLocaleDateString('fr-FR');

    row.style.setProperty(
        '--agenda-color',
        agenda.color
    );

    const checkbox =
        document.createElement('input');

    checkbox.type = 'checkbox';
    checkbox.className =
        'agenda-check visually-hidden';

    checkbox.value = agenda.id;

    checkbox.checked =
        selectedAgendaIds.has(
            agenda.id
        );

    checkbox.addEventListener(
        'change',
        () =>
            toggleAgenda(
                agenda.id,
                checkbox.checked
            )
    );

    const box =
        document.createElement('span');

    box.className =
        'agenda-box';

    box.setAttribute(
        'aria-hidden',
        'true'
    );

    box.innerHTML =
        '<svg viewBox="0 0 24 24">'
        + '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
        + '</svg>';

    row.append(
        checkbox,
        box
    );

    if (isSharedAgenda(agenda)) {
        const label =
            isOwnAgenda(agenda)
                ? 'Partagé avec '
                    + pluralize(
                        agenda.sharedWith.length,
                        'personne'
                    )
                : 'Partagé par '
                    + (
                        agenda.ownerName
                        || 'un autre utilisateur'
                    );

        const shared =
            document.createElement('span');

        shared.className =
            'agenda-shared';

        shared.title =
            label;

        shared.setAttribute(
            'role',
            'img'
        );

        shared.setAttribute(
            'aria-label',
            label
        );

        shared.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true">'
            + '<circle cx="9" cy="8" r="3.2"/>'
            + '<path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/>'
            + '<path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2"/>'
            + '<path d="M17.5 13.8c2.1.6 3.5 2.6 3.5 5.2"/>'
            + '</svg>';

        row.append(shared);
    }

    const name =
        document.createElement('span');

    name.className =
        'agenda-name';

    name.textContent =
        agenda.name;

    const count =
        evenements.filter(
            (e) =>
                e.agendaId
                ===
                agenda.id
        ).length;

    const badge =
        document.createElement('span');

    badge.className =
        'agenda-count';

    badge.textContent =
        count || '';

    badge.setAttribute(
        'aria-label',
        count
        + (
            count > 1
                ? ' tâches'
                : ' tâche'
        )
    );

    row.append(
        name,
        badge
    );

    item.append(row);

    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'agenda-edit agenda-more';
    more.textContent = '⋮';
    more.title = 'Actions de l’agenda';
    more.setAttribute('aria-label', 'Actions de l’agenda ' + agenda.name);
    more.setAttribute('aria-haspopup', 'dialog');
    more.setAttribute('aria-controls', 'agenda-menu');
    more.addEventListener('click', () => openAgendaMenu(agenda, more));
    item.append(more);
    return item;
}

const agendaMenu = document.getElementById('agenda-menu');
let menuAgenda = null;
let menuAnchor = null;

function openAgendaMenu(agenda, anchor) {
    menuAgenda = agenda;
    menuAnchor = anchor;
    agendaMenu.style.setProperty('--agenda-color', agenda.color);
    document.getElementById('agenda-menu-share').hidden = !isOwnAgenda(agenda);
    agendaMenu.showModal();
    placePopover(agendaMenu, anchor);
}

agendaMenu.addEventListener('click', event => {
    if (event.target === agendaMenu) agendaMenu.close();
});

document.getElementById('agenda-menu-edit').addEventListener('click', () => {
    agendaMenu.close();
    openEditAgenda(menuAgenda);
});

document.getElementById('agenda-menu-share').addEventListener('click', () => {
    agendaMenu.close();
    openShare(menuAgenda, menuAnchor);
});

document.getElementById('agenda-menu-export').addEventListener('click', async () => {
    const agenda = menuAgenda;
    agendaMenu.close();
    try {
        downloadFile(await api.exportAgenda(agenda.id), 'agenda-' + agenda.id + '.ics');
    } catch (error) {
        if (error.status === 401) goToLogin();
        else showError(error.message || 'Export impossible.');
    }
});

document.getElementById('agenda-menu-import').addEventListener('click', () => {
    const agenda = menuAgenda;
    agendaMenu.close();
    openImport(agenda.id);
});

function renderAgendaList() {
    list.replaceChildren(
        ...agendas.map(
            createAgendaRow
        )
    );

    emptyMessage.hidden =
        agendas.length > 0;

    updateCalendarHint();
}

function toggleAgenda(
    id,
    checked
) {
    cancelDraft();

    if (checked) {
        selectedAgendaIds.add(id);
    } else {
        selectedAgendaIds.delete(id);
    }

    saveCalendarState();

    updateCalendarHint();

    renderEvents();
}

function updateCalendarHint() {
    calendarHint.textContent =
        agendas.length
            ? 'Cochez un ou plusieurs agendas pour afficher leurs tâches'
            : 'Créez un agenda pour commencer';

    const gone =
        selectedAgendaIds.size > 0;

    calendarHint.classList.toggle(
        'gone',
        gone
    );

    calendarHint.setAttribute(
        'aria-hidden',
        String(gone)
    );
}

function renderMini() {
    miniLabel.textContent =
        capitalize(
            miniMonth.toLocaleDateString(
                'fr-FR',
                {
                    month: 'long',
                    year: 'numeric'
                }
            )
        );

    const start =
        startOfWeek(
            miniMonth
        );

    const weekEnd =
        addDays(
            weekStart,
            6
        );

    miniGrid.replaceChildren();

    for (
        let i = 0;
        i < 42;
        i++
    ) {
        const day =
            addDays(
                start,
                i
            );

        const cell =
            document.createElement(
                'button'
            );

        cell.type =
            'button';

        cell.className =
            'mini-day';

        cell.textContent =
            day.getDate();

        cell.setAttribute(
            'aria-label',
            day.toLocaleDateString(
                'fr-FR',
                {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                }
            )
        );

        if (
            day.getMonth()
            !==
            miniMonth.getMonth()
        ) {
            cell.classList.add(
                'other-month'
            );
        }

        if (
            day >= weekStart
            &&
            day <= weekEnd
        ) {
            cell.classList.add(
                'in-week'
            );
        }

        if (
            isSameDay(
                day,
                today
            )
        ) {
            cell.classList.add(
                'today'
            );

            cell.setAttribute(
                'aria-current',
                'date'
            );
        }

        cell.addEventListener(
            'click',
            () =>
                showWeekOf(
                    day
                )
        );

        miniGrid.append(
            cell
        );
    }
}
function renderWeek() {
    const weekEnd =
        addDays(
            weekStart,
            6
        );

    const sameMonth =
        weekStart.getMonth()
        ===
        weekEnd.getMonth();

    weekLabel.textContent =
        sameMonth
            ? capitalize(
                weekStart.toLocaleDateString(
                    'fr-FR',
                    {
                        month: 'long',
                        year: 'numeric'
                    }
                )
            )
            : capitalize(
                weekStart.toLocaleDateString(
                    'fr-FR',
                    {
                        month: 'short'
                    }
                )
            )
            + ' – '
            + weekEnd.toLocaleDateString(
                'fr-FR',
                {
                    month: 'short',
                    year: 'numeric'
                }
            );

    weekDays.replaceChildren();

    weekColumns.replaceChildren();

    draft = null;

    for (
        let i = 0;
        i < 7;
        i++
    ) {
        const day =
            addDays(
                weekStart,
                i
            );

        const isToday =
            isSameDay(
                day,
                today
            );

        const head =
            document.createElement(
                'div'
            );

        head.className =
            'week-day'
            + (
                isToday
                    ? ' today'
                    : ''
            );

        const name =
            document.createElement(
                'span'
            );

        name.className =
            'week-day-name';

        name.textContent =
            day.toLocaleDateString(
                'fr-FR',
                {
                    weekday: 'short'
                }
            );

        const number =
            document.createElement(
                'span'
            );

        number.className =
            'week-day-number';

        number.textContent =
            day.getDate();

        if (isToday) {
            number.setAttribute(
                'aria-current',
                'date'
            );
        }

        head.append(
            name,
            number
        );

        weekDays.append(
            head
        );

        const column =
            document.createElement(
                'div'
            );

        column.className =
            'day-column'
            + (
                isToday
                    ? ' today'
                    : ''
            );

        column.dataset.day =
            i;

        if (isToday) {
            column.append(
                createNowLine()
            );
        }

        weekColumns.append(
            column
        );
    }

    renderEvents();
}

function updateRecurrenceEndVisibility() {
    const hasRecurrence =
        tacheRecurrence.value !== 'none';

    recurrenceEndField.hidden =
        !hasRecurrence;

    tacheRecurrenceEnd.disabled =
        !hasRecurrence;

    if (!hasRecurrence) {
        tacheRecurrenceEnd.value = '';
    }
}

// Période dont les occurrences des séries sont chargées : 6 mois avant et
// 1 an après la semaine affichée (vue et recherche). Elle est rechargée
// quand on s'approche de ses bords.
let occurrenceRange = null;

function occurrenceRangeAround(date) {
    const week = startOfWeek(date);

    return {
        start: addDays(week, -26 * 7),
        end: addDays(week, 52 * 7)
    };
}

function needsOccurrenceReload() {
    return Boolean(occurrenceRange)
        && evenements.some((ev) => ev.recurrenceFrequency)
        && (
            weekStart < addDays(occurrenceRange.start, 7)
            || addDays(weekStart, 7) > addDays(occurrenceRange.end, -7)
        );
}

async function refreshCalendarEvenements() {
    const range = occurrenceRangeAround(weekStart);
    occurrenceRange = range;

    const results = await Promise.all(
        evenements.map(async (ev) => {
            if (!ev.recurrenceFrequency) {
                return [ev];
            }

            try {
                const result = await api.getOccurrences(
                    ev.id,
                    range.start.toISOString(),
                    range.end.toISOString()
                );

                const occurrences =
                    result && Array.isArray(result.occurrences)
                        ? result.occurrences
                        : [];

                // Aucune occurrence dans la période : rien à afficher.
                return occurrences.map((occurrence, index) => ({
                    ...ev,
                    start: occurrence.start,
                    end: occurrence.end,
                    title: occurrence.title ?? ev.title,
                    description: occurrence.description ?? ev.description,
                    location: occurrence.location ?? ev.location,
                    occurrenceStart: occurrence.occurrenceStart,
                    modified: Boolean(occurrence.modified),
                    occurrenceIndex: index,
                    recurringEventId: ev.id
                }));

            } catch (err) {
                if (err.status === 401) {
                    goToLogin();
                    return [];
                }

                return [ev];
            }
        })
    );

    // Une navigation plus récente a pu relancer le chargement entre-temps.
    if (occurrenceRange === range) {
        calendarEvenements = results.flat();
    }
}

function renderEvents() {
    weekColumns
        .querySelectorAll(
            '.event:not(.draft)'
        )
        .forEach(
            (el) =>
                el.remove()
        );

    const shown =
        calendarEvenements.filter(
            (e) =>
                selectedAgendaIds.has(
                    e.agendaId
                )
        );

    let index = 0;

    for (
        let i = 0;
        i < 7;
        i++
    ) {
        const dayStart =
            addDays(
                weekStart,
                i
            );

        const dayEnd =
            addDays(
                weekStart,
                i + 1
            );

        const segments =
            shown
                .map(
                    (ev) => ({
                        ev,

                        start:
                            Math.max(
                                new Date(
                                    ev.start
                                ).getTime(),

                                dayStart.getTime()
                            ),

                        end:
                            Math.min(
                                new Date(
                                    ev.end
                                ).getTime(),

                                dayEnd.getTime()
                            )
                    })
                )
                .filter(
                    (s) =>
                        s.end > s.start
                )
                .sort(
                    (a, b) =>
                        a.start
                        -
                        b.start
                        ||
                        b.end
                        -
                        a.end
                );

        layoutLanes(
            segments
        );

        const column =
            weekColumns.children[i];

        segments.forEach(
            (segment) =>
                column.append(
                    createEventBlock(
                        segment,
                        dayStart,
                        index++
                    )
                )
        );
    }
}

function layoutLanes(segments) {
    let group = [];
    let laneEnds = [];
    let groupEnd = 0;

    const closeGroup = () => {
        group.forEach(
            (s) => {
                s.lanes =
                    laneEnds.length;
            }
        );

        group = [];
        laneEnds = [];
    };

    for (const s of segments) {
        if (
            group.length
            &&
            s.start >= groupEnd
        ) {
            closeGroup();
        }

        let lane =
            laneEnds.findIndex(
                (end) =>
                    end <= s.start
            );

        if (lane === -1) {
            lane =
                laneEnds.length;
        }

        laneEnds[lane] =
            s.end;

        s.lane =
            lane;

        group.push(
            s
        );

        groupEnd =
            group.length === 1
                ? s.end
                : Math.max(
                    groupEnd,
                    s.end
                );
    }

    closeGroup();
}

function createEventBlock(
    segment,
    dayStart,
    index
) {
    const { ev } =
        segment;

    const agenda =
        findAgenda(
            ev.agendaId
        );

    const top =
        (
            segment.start
            -
            dayStart.getTime()
        )
        /
        60000;

    const minutes =
        (
            segment.end
            -
            segment.start
        )
        /
        60000;

    const block =
        document.createElement(
            'button'
        );

    block.type =
        'button';

    block.className =
        'event'
        +
        (
            minutes < 50
                ? ' compact'
                : ''
        );

    block.dataset.searchEventKey =
        getSearchEventKey(ev);

    block.dataset.seriesId =
        String(seriesIdOf(ev));

    block.classList.toggle(
        'selected',
        selectedEventIds.has(seriesIdOf(ev))
    );

    block.setAttribute(
        'aria-pressed',
        String(selectedEventIds.has(seriesIdOf(ev)))
    );

    block.style.setProperty(
        '--agenda-color',
        agenda.color
    );

    block.style.setProperty(
        '--i',
        index
    );

    block.style.top =
        (
            top
            /
            60
        )
        *
        HOUR_HEIGHT
        +
        'px';

    block.style.height =
        Math.max(
            (
                minutes
                /
                60
            )
            *
            HOUR_HEIGHT,
            22
        )
        +
        'px';

    block.style.left =
        'calc('
        +
        (
            segment.lane
            /
            segment.lanes
        )
        *
        100
        +
        '% + 3px)';

    block.style.width =
        'calc('
        +
        100
        /
        segment.lanes
        +
        '% - 6px)';

    const start =
        new Date(
            ev.start
        );

    const end =
        new Date(
            ev.end
        );

    const time =
        formatTime(start)
        +
        ' – '
        +
        formatTime(end);

    block.title =
        ev.title
        +
        '\n'
        +
        time
        +
        '\n'
        +
        agenda.name
        +
        (
            ev.location
                ? '\n' + ev.location
                : ''
        );

    const title =
        document.createElement(
            'span'
        );

    title.className =
        'event-title';

    title.textContent =
        ev.title;

    const when =
        document.createElement(
            'span'
        );

    when.className =
        'event-time';

    when.textContent =
        time;

    block.append(
        title,
        when
    );

    if (ev.location) {
        const where =
            document.createElement(
                'span'
            );

        where.className =
            'event-location';

        where.textContent =
            ev.location;

        block.append(
            where
        );
    }

    block.addEventListener(
        'click',
        (event) => {
            // Ctrl/⌘/Maj + clic, ou clic simple quand une sélection
            // est en cours : (dé)sélectionne au lieu d'ouvrir.
            if (
                event.ctrlKey
                || event.metaKey
                || event.shiftKey
                || selectedEventIds.size > 0
            ) {
                toggleEventSelection(ev);
                return;
            }

            openEvent(
                ev,
                block
            );
        }
    );

    return block;
}


/* =========================================================
   SÉLECTION MULTIPLE : DÉPLACER / DUPLIQUER
   ---------------------------------------------------------
   Une occurrence d'un événement récurrent représente toute
   sa série : on sélectionne donc l'identifiant de la série.
   ========================================================= */

const selectionBar = document.getElementById('selection-bar');
const selectionCount = document.getElementById('selection-count');
const selectionAgenda = document.getElementById('selection-agenda');
const selectionMoveBtn = document.getElementById('selection-move');
const selectionCopyBtn = document.getElementById('selection-copy');
const selectionError = document.getElementById('selection-error');

let selectionBusy = false;

function seriesIdOf(ev) {
    return ev.recurringEventId || ev.id;
}

function toggleEventSelection(ev) {
    const id = seriesIdOf(ev);

    if (selectedEventIds.has(id)) selectedEventIds.delete(id);
    else selectedEventIds.add(id);

    updateSelectionUI();
}

function clearEventSelection() {
    if (selectionBusy) {
        return;
    }

    selectedEventIds.clear();
    updateSelectionUI();
}

function selectedEvenements() {
    return evenements.filter((e) => selectedEventIds.has(e.id));
}

function syncSelectionAgendaOptions() {
    const previous = selectionAgenda.value;
    const sources = new Set(selectedEvenements().map((e) => e.agendaId));

    selectionAgenda.replaceChildren(
        ...agendas.map((agenda) => {
            const option = document.createElement('option');

            option.value = String(agenda.id);
            option.textContent = agenda.name;

            return option;
        })
    );

    if (agendas.some((a) => String(a.id) === previous)) {
        selectionAgenda.value = previous;
    } else {
        // Par défaut : le premier agenda qui n'est pas celui des événements.
        const other = agendas.find((a) => !sources.has(a.id)) || agendas[0];

        if (other) selectionAgenda.value = String(other.id);
    }
}

function updateSelectionUI() {
    // Les événements supprimés entre-temps ne restent pas sélectionnés.
    for (const id of selectedEventIds) {
        if (!evenements.some((e) => e.id === id)) {
            selectedEventIds.delete(id);
        }
    }

    const selectedKeys = new Set([...selectedEventIds].map(String));

    weekColumns
        .querySelectorAll('.event[data-series-id]')
        .forEach((block) => {
            const on = selectedKeys.has(block.dataset.seriesId);

            block.classList.toggle('selected', on);
            block.setAttribute('aria-pressed', String(on));
        });

    const count = selectedEventIds.size;

    document.body.classList.toggle('selecting-events', count > 0);
    selectionBar.hidden = count === 0;

    if (count === 0) {
        selectionError.hidden = true;
        return;
    }

    selectionCount.textContent =
        pluralize(count, 'événement')
        + ' sélectionné'
        + (count > 1 ? 's' : '');

    syncSelectionAgendaOptions();

    selectionMoveBtn.disabled = selectionBusy || agendas.length === 0;
    selectionCopyBtn.disabled = selectionBusy || agendas.length === 0;
}

async function applySelection(action) {
    const agendaId = selectionAgenda.value;
    const target = findAgenda(agendaId);
    const chosen = selectedEvenements();

    if (!target || chosen.length === 0 || selectionBusy) {
        return;
    }

    // Déplacer vers l'agenda où ils se trouvent déjà ne change rien.
    const ids = (
        action === 'move'
            ? chosen.filter((e) => e.agendaId !== target.id)
            : chosen
    ).map((e) => e.id);

    if (ids.length === 0) {
        selectionError.textContent =
            'Ces événements sont déjà dans « ' + target.name + ' ».';
        selectionError.hidden = false;
        return;
    }

    selectionBusy = true;
    selectionError.hidden = true;
    selectionMoveBtn.disabled = true;
    selectionCopyBtn.disabled = true;

    try {
        if (action === 'move') {
            await api.moveEvenements(ids, target.id);
        } else {
            await api.copyEvenements(ids, target.id);
        }

        evenements = await api.getEvenements();
        selectedAgendaIds.add(target.id);
        saveCalendarState();

        await refreshCalendarEvenements();

        selectionBusy = false;
        selectedEventIds.clear();

        renderAgendaList();
        renderEvents();
        updateSelectionUI();

    } catch (err) {
        if (err.status === 401) {
            goToLogin();
            return;
        }

        selectionError.textContent =
            err.message
            || (action === 'move'
                ? 'Déplacement impossible. Réessayez.'
                : 'Duplication impossible. Réessayez.');
        selectionError.hidden = false;

    } finally {
        selectionBusy = false;
        selectionMoveBtn.disabled = selectedEventIds.size === 0;
        selectionCopyBtn.disabled = selectedEventIds.size === 0;
    }
}

selectionMoveBtn.addEventListener('click', () => applySelection('move'));
selectionCopyBtn.addEventListener('click', () => applySelection('copy'));

document
    .getElementById('selection-clear')
    .addEventListener('click', clearEventSelection);

document
    .getElementById('event-select')
    .addEventListener('click', () => {
        const ev = shownEvent;

        closeEvent();

        if (ev && !selectedEventIds.has(seriesIdOf(ev))) {
            toggleEventSelection(ev);
        }
    });

document.addEventListener('keydown', (event) => {
    if (
        event.key === 'Escape'
        && selectedEventIds.size > 0
        && !document.querySelector(':popover-open')
        && !document.querySelector('dialog[open]')
    ) {
        clearEventSelection();
    }
});

function formatWhen(
    start,
    end
) {
    const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    };

    const startDay =
        capitalize(
            start.toLocaleDateString(
                'fr-FR',
                options
            )
        );

    if (
        isSameDay(
            start,
            end
        )
    ) {
        return (
            startDay
            +
            ' · '
            +
            formatTime(start)
            +
            ' – '
            +
            formatTime(end)
        );
    }

    return (
        startDay
        +
        ', '
        +
        formatTime(start)
        +
        ' – '
        +
        end.toLocaleDateString(
            'fr-FR',
            options
        )
        +
        ', '
        +
        formatTime(end)
    );
}

function openEvent(
    ev,
    card
) {
    const agenda =
        findAgenda(
            ev.agendaId
        );

    eventDialog.style.setProperty(
        '--agenda-color',
        agenda.color
    );

    eventTitle.textContent =
        ev.title;

    eventWhen.textContent =
        formatWhen(
            new Date(
                ev.start
            ),
            new Date(
                ev.end
            )
        );

    eventLocation.textContent =
        ev.location || '';

    eventLocationRow.hidden =
        !ev.location;

    eventAgenda.textContent =
        agenda.name;

    eventDescription.textContent =
        ev.description
        ||
        'Aucune description';

    eventDescription.classList.toggle(
        'empty',
        !ev.description
    );

    eventError.hidden =
        true;

    eventDeleteBtn.hidden = false;
    document.getElementById('event-edit').hidden = false;

    hideScope();

    disarmDelete(
        eventDeleteBtn
    );

    shownEvent =
        ev;

    clearActiveCard();

    activeCard =
        card;

    card.classList.add(
        'active'
    );

    eventDialog.showModal();

    placePopover(
        eventDialog,
        card
    );
}

function closeEvent() {
    clearActiveCard();

    eventDialog.close();
}

function clearActiveCard() {
    if (activeCard) {
        activeCard.classList.remove(
            'active'
        );
    }

    activeCard =
        null;
}

function isArmed(button) {
    return button.classList.contains(
        'confirm'
    );
}

function armDelete(
    button,
    label
) {
    button.classList.add(
        'confirm'
    );

    button.textContent =
        label;
}

function disarmDelete(button) {
    button.classList.remove(
        'confirm'
    );

    button.textContent =
        button.dataset.label
        ||
        'Supprimer';
}

// Choix explicite pour un événement récurrent : agir sur l'occurrence
// affichée ou sur toute la série.
let pendingScopeAction = null;

function askScope(action) {
    pendingScopeAction = action;

    eventScopeLabel.textContent =
        action === 'delete'
            ? 'Cet événement se répète. Que voulez-vous supprimer ?'
            : 'Cet événement se répète. Que voulez-vous modifier ?';

    eventScope.classList.toggle('danger', action === 'delete');
    eventScope.hidden = false;
    eventMainActions.hidden = true;
    eventError.hidden = true;

    document.getElementById('event-scope-one').focus();
}

function hideScope() {
    pendingScopeAction = null;
    eventScope.hidden = true;
    eventMainActions.hidden = false;
}

async function runScopeAction(scope) {
    const action = pendingScopeAction;

    hideScope();

    if (action === 'edit') {
        editShownEvent(scope);
    } else if (action === 'delete') {
        await deleteShownEvent(scope);
    }
}

function editShownEvent(scope = 'series') {
    const ev =
        shownEvent;

    const originalEvent =
        evenements.find(
            (event) =>
                event.id
                ===
                (
                    ev.recurringEventId
                    ||
                    ev.id
                )
        );

    closeEvent();

    if (originalEvent) {
        openEditTache(
            originalEvent,
            scope === 'occurrence' ? ev : null
        );
    }
}

// `scope` : 'occurrence' ou 'series' pour un événement récurrent.
async function deleteShownEvent(scope = null) {
    const recurring =
        Boolean(shownEvent && shownEvent.recurringEventId);

    if (recurring && !scope) {
        askScope('delete');
        return;
    }

    if (
        !recurring
        &&
        !isArmed(
            eventDeleteBtn
        )
    ) {
        armDelete(
            eventDeleteBtn,
            'Confirmer la suppression'
        );

        return;
    }

    const ev =
        shownEvent;

    const eventId =
        ev.recurringEventId
        ||
        ev.id;

    eventDeleteBtn.disabled =
        true;

    try {
        if (scope === 'occurrence') {
            await api.deleteOccurrence(
                eventId,
                ev.occurrenceStart
            );

            await refreshCalendarEvenements();

            renderEvents();

        } else {
            await api.deleteEvenement(
                eventId
            );

            await removeEvenement(
                eventId
            );
        }

        closeEvent();

    } catch (err) {
        if (
            err.status === 401
        ) {
            goToLogin();

        } else {
            eventError.textContent =
                err.message
                ||
                'Suppression impossible. Réessayez.';

            eventError.hidden =
                false;
        }

    } finally {
        eventDeleteBtn.disabled =
            false;

        disarmDelete(
            eventDeleteBtn
        );
    }
}

async function removeEvenement(id) {
    evenements =
        evenements.filter(
            (e) =>
                e.id !== id
        );

    await refreshCalendarEvenements();

    renderAgendaList();

    renderEvents();
}

function placePopover(
    popover,
    anchor
) {
    const gap =
        12;

    const margin =
        16;

    const rect =
        anchor.getBoundingClientRect();

    const width =
        popover.offsetWidth;

    const height =
        popover.offsetHeight;

    const onRight =
        rect.right
        +
        gap
        +
        width
        <=
        window.innerWidth
        -
        margin;

    const x =
        onRight
            ? rect.right
                +
                gap
            : Math.max(
                margin,
                rect.left
                -
                gap
                -
                width
            );

    const y =
        Math.min(
            Math.max(
                margin,
                rect.top
            ),
            window.innerHeight
            -
            margin
            -
            height
        );

    popover.style.setProperty(
        '--x',
        x + 'px'
    );

    popover.style.setProperty(
        '--y',
        y + 'px'
    );

    popover.dataset.side =
        onRight
            ? 'right'
            : 'left';
}

function createNowLine() {
    const line =
        document.createElement(
            'div'
        );

    line.className =
        'now-line';

    line.id =
        'now-line';

    placeNowLine(
        line
    );

    return line;
}

function placeNowLine(line) {
    const now =
        new Date();

    line.style.top =
        (
            (
                now.getHours()
                *
                60
                +
                now.getMinutes()
            )
            /
            60
        )
        *
        HOUR_HEIGHT
        +
        'px';
}

function renderHours() {
    for (
        let h = 0;
        h < 24;
        h++
    ) {
        const label =
            document.createElement(
                'span'
            );

        label.textContent =
            String(h)
                .padStart(
                    2,
                    '0'
                )
            +
            ':00';

        hours.append(
            label
        );
    }

    const offset =
        -today.getTimezoneOffset()
        /
        60;

    document
        .getElementById(
            'tz-label'
        )
        .textContent =
            'GMT'
            +
            (
                offset >= 0
                    ? '+'
                    : '−'
            )
            +
            String(
                Math.abs(
                    offset
                )
            )
                .padStart(
                    2,
                    '0'
                );
}
function showWeekOf(date) {
    weekStart =
        startOfWeek(
            date
        );

    miniMonth =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            1
        );

    saveCalendarState();

    renderWeek();

    renderMini();

    if (needsOccurrenceReload()) {
        refreshCalendarEvenements().then(renderEvents);
    }
}

function changeWeek(delta) {
    showWeekOf(
        addDays(
            weekStart,
            delta * 7
        )
    );
}

async function init() {
    renderHours();

    weekBody.scrollTop =
        Math.max(
            7,
            today.getHours()
            -
            2
        )
        *
        HOUR_HEIGHT;

    setInterval(
        () => {
            const line =
                document.getElementById(
                    'now-line'
                );

            if (line) {
                placeNowLine(
                    line
                );
            }
        },
        60 * 1000
    );

    try {
        currentUser =
            await api.getMe();

        userLabel.textContent =
            currentUser.username;

        [
            agendas,
            evenements
        ] =
            await Promise.all([
                api.getAgendas(),
                api.getEvenements()
            ]);

        restoreCalendarState();
        renderWeek();
        renderMini();

        await refreshCalendarEvenements();

        syncSearchAgendaOptions();

        renderAgendaList();

        renderEvents();

    } catch (err) {
        if (
            err.status === 401
        ) {
            goToLogin();

        } else {
            showError(
                'Chargement impossible. Rechargez la page.'
            );
        }
    }
}

logoutBtn.addEventListener(
    'click',
    async () => {
        try {
            await api.logout();

            goToLogin();

        } catch (err) {
            showError(
                'Déconnexion impossible. Réessayez.'
            );
        }
    }
);

document
    .getElementById(
        'prev-week'
    )
    .addEventListener(
        'click',
        () =>
            changeWeek(-1)
    );

document
    .getElementById(
        'next-week'
    )
    .addEventListener(
        'click',
        () =>
            changeWeek(1)
    );

document
    .getElementById(
        'today-btn'
    )
    .addEventListener(
        'click',
        () =>
            showWeekOf(
                today
            )
    );

document
    .getElementById(
        'mini-prev'
    )
    .addEventListener(
        'click',
        () => {
            miniMonth =
                new Date(
                    miniMonth.getFullYear(),
                    miniMonth.getMonth() - 1,
                    1
                );

            saveCalendarState();
            renderMini();
        }
    );

document
    .getElementById(
        'mini-next'
    )
    .addEventListener(
        'click',
        () => {
            miniMonth =
                new Date(
                    miniMonth.getFullYear(),
                    miniMonth.getMonth() + 1,
                    1
                );

            saveCalendarState();
            renderMini();
        }
    );

document
    .getElementById(
        'event-close'
    )
    .addEventListener(
        'click',
        closeEvent
    );

eventDeleteBtn.addEventListener(
    'click',
    () => deleteShownEvent()
);

document
    .getElementById('event-scope-one')
    .addEventListener('click', () => runScopeAction('occurrence'));

document
    .getElementById('event-scope-all')
    .addEventListener('click', () => runScopeAction('series'));

document
    .getElementById('event-scope-cancel')
    .addEventListener('click', hideScope);

document
    .getElementById(
        'event-edit'
    )
    .addEventListener(
        'click',
        () => {
            if (shownEvent && shownEvent.recurringEventId) {
                askScope('edit');
            } else {
                editShownEvent();
            }
        }
    );

eventDialog.addEventListener(
    'click',
    (event) => {
        if (
            event.target
            ===
            eventDialog
        ) {
            closeEvent();
        }
    }
);

eventDialog.addEventListener(
    'cancel',
    clearActiveCard
);

eventDialog.addEventListener(
    'close',
    clearActiveCard
);

weekColumns.addEventListener(
    'click',
    (event) => {
        if (
            event.target.closest(
                '.event'
            )
        ) {
            return;
        }

        const column =
            event.target.closest(
                '.day-column'
            );

        if (!column) {
            return;
        }

        if (
            draft
            &&
            draft.title.value.trim()
        ) {
            draft.title.focus();

            return;
        }

        const y =
            event.clientY
            -
            column
                .getBoundingClientRect()
                .top;

        const halfHours =
            Math.min(
                47,
                Math.floor(
                    (
                        y
                        /
                        HOUR_HEIGHT
                    )
                    *
                    2
                )
            );

        const start =
            addDays(
                weekStart,
                Number(
                    column.dataset.day
                )
            );

        start.setMinutes(
            halfHours * 30
        );

        if (
            selectedAgendaIds.size
            ===
            1
        ) {
            openDraft(
                start
            );

        } else {
            openCreate({
                kind: 'tache',
                start
            });
        }
    }
);

function openDraft(start) {
    cancelDraft();

    if (
        start < weekStart
        ||
        start >= addDays(
            weekStart,
            7
        )
    ) {
        showWeekOf(
            start
        );
    }

    const dayStart =
        new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        );

    const end =
        new Date(
            Math.min(
                start.getTime()
                +
                60
                *
                60
                *
                1000,

                addDays(
                    dayStart,
                    1
                ).getTime()
            )
        );

    const top =
        (
            start
            -
            dayStart
        )
        /
        60000;

    const minutes =
        (
            end
            -
            start
        )
        /
        60000;

    const agenda =
        findAgenda(
            [
                ...selectedAgendaIds
            ][0]
        );

    const block =
        document.createElement(
            'form'
        );

    block.className =
        'event draft';

    block.style.setProperty(
        '--agenda-color',
        agenda.color
    );

    block.style.top =
        (
            top
            /
            60
        )
        *
        HOUR_HEIGHT
        +
        'px';

    block.style.height =
        Math.max(
            (
                minutes
                /
                60
            )
            *
            HOUR_HEIGHT,
            44
        )
        +
        'px';

    block.style.left =
        '3px';

    block.style.width =
        'calc(100% - 6px)';

    const title =
        document.createElement(
            'input'
        );

    title.type =
        'text';

    title.className =
        'draft-title';

    title.placeholder =
        'Titre, puis Entrée';

    title.setAttribute(
        'aria-label',
        'Titre de la nouvelle tâche ('
        +
        agenda.name
        +
        ')'
    );

    title.autocomplete =
        'off';

    const when =
        document.createElement(
            'span'
        );

    when.className =
        'event-time';

    when.textContent =
        formatTime(start)
        +
        ' – '
        +
        formatTime(end)
        +
        ' · '
        +
        agenda.name;

    const more =
        document.createElement(
            'button'
        );

    more.type =
        'button';

    more.className =
        'draft-more';

    more.textContent =
        "Plus d'options";

    more.addEventListener(
        'click',
        () => {
            const typed =
                title.value;

            cancelDraft();

            openCreate({
                kind: 'tache',
                start
            });

            tacheTitle.value =
                typed;
        }
    );

    block.append(
        title,
        when,
        more
    );

    block.addEventListener(
        'submit',
        (event) => {
            event.preventDefault();

            saveDraft();
        }
    );

    title.addEventListener(
        'keydown',
        (event) => {
            if (
                event.key
                ===
                'Escape'
            ) {
                cancelDraft();
            }
        }
    );

    block.addEventListener(
        'focusout',
        (event) => {
            if (
                !block.contains(
                    event.relatedTarget
                )
                &&
                !title.value.trim()
            ) {
                cancelDraft();
            }
        }
    );

    weekColumns
        .children[
            Math.round(
                (
                    dayStart
                    -
                    weekStart
                )
                /
                86400000
            )
        ]
        .append(
            block
        );

    draft = {
        start,
        end,
        block,
        title,
        agendaId:
            agenda.id
    };

    block.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
    });

    title.focus({
        preventScroll: true
    });
}

function cancelDraft() {
    if (!draft) {
        return;
    }

    const {
        block
    } =
        draft;

    draft =
        null;

    block.remove();
}

async function saveDraft() {
    const current =
        draft;

    const name =
        current.title.value.trim();

    if (!name) {
        current.title.focus();

        return;
    }

    current.title.disabled =
        true;

    try {
        const created =
            await api.createEvenement(
                current.agendaId,
                {
                    title:
                        name,

                    start:
                        current.start.toISOString(),

                    end:
                        current.end.toISOString(),

                    location:
                        '',

                    description:
                        '',

                    recurrenceFrequency:
                        null,

                    recurrenceEndDate:
                        null
                }
            );

        evenements.push(
            created
        );

        await refreshCalendarEvenements();

        if (
            draft
            ===
            current
        ) {
            cancelDraft();
        }

        renderAgendaList();

        renderEvents();

    } catch (err) {
        if (
            err.status === 401
        ) {
            goToLogin();

        } else {
            showError(
                err.message
                ||
                'Création impossible. Réessayez.'
            );
        }

        current.title.disabled =
            false;

        current.title.focus();
    }
}

function nextFullHour() {
    const date =
        new Date();

    date.setHours(
        date.getHours() + 1,
        0,
        0,
        0
    );

    return date;
}

function openCreate({
    kind,
    start
} = {}) {
    editing =
        null;

    createForm.reset();

    dialogError.hidden =
        true;

    const begin =
        start
        ||
        nextFullHour();

    const end =
        new Date(
            begin.getTime()
            +
            60
            *
            60
            *
            1000
        );

    tacheDate.value =
        toDateInput(
            begin
        );

    tacheStart.value =
        toTimeInput(
            begin
        );

    tacheEnd.value =
        isSameDay(
            begin,
            end
        )
            ? toTimeInput(
                end
            )
            : '23:59';

    tacheRecurrence.value =
        'none';

    tacheRecurrenceEnd.value =
        '';

    updateRecurrenceEndVisibility();

    let preset = agendas.filter(a => selectedAgendaIds.has(a.id)).map(a => a.id);
    if (preset.length === 0 && agendas.length > 0) {
        preset = [agendas[0].id];
    }

    pickedAgendaIds =
        new Set(
            preset
        );

    renderPicker();

    togglePicker(
        false
    );

    colorCustomRadio.value =
        colorCustom.value;

    updateAgendaPreview();

    setKind(
        agendas.length
            ? (
                kind
                ||
                'tache'
            )
            : 'agenda'
    );

    dialog.showModal();

    createBtn.setAttribute(
        'aria-expanded',
        'true'
    );

    focusFirstField();
}
// Une occurrence seule n'a pas sa propre récurrence ni son propre agenda.
function setOccurrenceMode(on) {
    tacheRecurrence.closest('.field').hidden = on;

    if (on) {
        recurrenceEndField.hidden = true;
    }

    pickerBtn.disabled = on;
}

// `occurrence` : occurrence affichée d'une série, quand on ne modifie
// qu'elle. Le formulaire est alors prérempli avec ses valeurs et la
// récurrence ne peut pas être changée.
function openEditTache(ev, occurrence = null) {
    editing = {
        kind:
            'tache',
        item:
            ev,
        occurrence
    };

    const shown = occurrence || ev;

    createForm.reset();

    dialogError.hidden =
        true;

    const start =
        new Date(
            shown.start
        );

    const end =
        new Date(
            shown.end
        );

    tacheTitle.value =
        shown.title;

    tacheDate.value =
        toDateInput(
            start
        );

    tacheStart.value =
        toTimeInput(
            start
        );

    tacheEnd.value =
        isSameDay(
            start,
            end
        )
            ? toTimeInput(
                end
            )
            : '23:59';

    tacheRecurrence.value =
        occurrence
            ? 'none'
            : (ev.recurrenceFrequency || 'none');

    tacheRecurrenceEnd.value =
        occurrence
            ? ''
            : (ev.recurrenceEndDate || '');

    updateRecurrenceEndVisibility();

    setOccurrenceMode(Boolean(occurrence));

    tacheLocation.value =
        shown.location || '';

    tacheDescription.value =
        shown.description || '';

    pickedAgendaIds =
        new Set([
            ev.agendaId
        ]);

    renderPicker();

    togglePicker(
        false
    );

    setKind(
        'tache'
    );

    dialog.showModal();

    tacheTitle.focus();
}

function openEditAgenda(
    agenda
) {
    editing = {
        kind:
            'agenda',
        item:
            agenda
    };

    createForm.reset();

    dialogError.hidden =
        true;

    agendaName.value =
        agenda.name;

    const swatch =
        [
            ...createForm.elements.color
        ]
            .find(
                (radio) =>
                    radio
                    !==
                    colorCustomRadio
                    &&
                    radio.value
                    ===
                    agenda.color
            );

    if (swatch) {
        swatch.checked =
            true;

    } else {
        colorCustom.value =
            agenda.color;

        colorCustomRadio.value =
            agenda.color;

        colorCustomRadio.checked =
            true;

        colorCustomRadio
            .closest(
                '.swatch'
            )
            .style
            .setProperty(
                '--swatch',
                agenda.color
            );
    }

    updateAgendaPreview();

    setKind(
        'agenda'
    );

    dialog.showModal();

    agendaName.focus();
}

function closeCreate() {
    dialog.close();
}

function currentKind() {
    return createForm.elements.kind.value;
}

function setKind(kind) {
    createForm.elements.kind.value =
        kind;

    const isTache =
        kind === 'tache';

    tacheFields.hidden =
        !isTache;

    agendaFields.hidden =
        isTache;

    importBtn.hidden =
        isTache || editing !== null;

    dialogError.hidden =
        true;

    kindSwitch.hidden =
        editing !== null;

    sheetTitle.classList.toggle(
        'visually-hidden',
        editing === null
    );

    deleteBtn.hidden =
        editing === null || (editing.kind === 'agenda' && !isOwnAgenda(editing.item));

    disarmDelete(
        deleteBtn
    );

    if (editing) {
        sheetTitle.textContent =
            isTache
                ? 'Modifier la tâche'
                : "Modifier l'agenda";

        saveBtn.textContent =
            'Enregistrer';

    } else {
        sheetTitle.textContent =
            'Créer';

        saveBtn.textContent =
            isTache
                ? 'Créer la tâche'
                : "Créer l'agenda";
    }
}

function focusFirstField() {
    if (
        currentKind()
        ===
        'agenda'
    ) {
        agendaName.focus();

    } else {
        tacheTitle.focus();
    }
}

function showDialogError(
    message
) {
    dialogError.textContent =
        message;

    dialogError.hidden =
        false;
}

function renderPicker() {
    renderPickerChips();

    renderPickerOptions();
}

function renderPickerChips() {
    pickerChips.replaceChildren();

    const picked =
        agendas.filter(
            (a) =>
                pickedAgendaIds.has(
                    a.id
                )
        );

    if (
        picked.length === 0
    ) {
        const placeholder =
            document.createElement(
                'span'
            );

        placeholder.className =
            'picker-placeholder';

        placeholder.textContent =
            'Choisir un ou plusieurs agendas';

        pickerChips.append(
            placeholder
        );
    }

    picked.forEach(
        (agenda) => {
            const chip =
                document.createElement(
                    'span'
                );

            chip.className =
                'chip';

            chip.style.setProperty(
                '--agenda-color',
                agenda.color
            );

            chip.textContent =
                agenda.name;

            pickerChips.append(
                chip
            );
        }
    );
}

function renderPickerOptions() {
    pickerOptions.replaceChildren(
        ...agendas.map(
            (agenda) => {
                const item =
                    document.createElement(
                        'li'
                    );

                const label =
                    document.createElement(
                        'label'
                    );

                label.className =
                    'picker-option';

                label.style.setProperty(
                    '--agenda-color',
                    agenda.color
                );

                const checkbox =
                    document.createElement(
                        'input'
                    );

                checkbox.type =
                    'checkbox';

                checkbox.value =
                    agenda.id;

                checkbox.checked =
                    pickedAgendaIds.has(
                        agenda.id
                    );

                checkbox.addEventListener(
                    'change',
                    () => {
                        if (
                            editing
                            &&
                            checkbox.checked
                        ) {
                            pickedAgendaIds =
                                new Set([
                                    agenda.id
                                ]);

                            pickerOptions
                                .querySelectorAll(
                                    'input'
                                )
                                .forEach(
                                    (box) => {
                                        box.checked =
                                            box === checkbox;
                                    }
                                );

                        } else if (
                            checkbox.checked
                        ) {
                            pickedAgendaIds.add(
                                agenda.id
                            );

                        } else {
                            pickedAgendaIds.delete(
                                agenda.id
                            );
                        }

                        renderPickerChips();

                        dialogError.hidden =
                            true;
                    }
                );

                const name =
                    document.createElement(
                        'span'
                    );

                name.className =
                    'agenda-name';

                name.textContent =
                    agenda.name;

                label.append(
                    checkbox,
                    name
                );

                item.append(
                    label
                );

                return item;
            }
        )
    );
}

function isPickerOpen() {
    return (
        pickerBtn.getAttribute(
            'aria-expanded'
        )
        ===
        'true'
    );
}

function togglePicker(open) {
    pickerBtn.setAttribute(
        'aria-expanded',
        String(open)
    );

    pickerPanel.classList.toggle(
        'open',
        open
    );

    pickerPanel.inert =
        !open;
}

function updateAgendaPreview() {
    agendaPreview.style.setProperty(
        '--agenda-color',
        createForm.elements.color.value
    );

    agendaPreviewName.textContent =
        agendaName.value.trim()
        ||
        "Nom de l'agenda";
}

async function submitAgenda() {
    const name =
        agendaName.value.trim();

    if (!name) {
        showDialogError(
            "Saisissez un nom pour l'agenda."
        );

        agendaName.focus();

        return false;
    }

    const color =
        createForm.elements.color.value;

    if (editing) {
        const updated =
            await api.updateAgenda(
                editing.item.id,
                {
                    name,
                    color
                }
            );

        agendas =
            agendas.map(
                (a) =>
                    a.id
                    ===
                    updated.id
                        ? { ...a, ...updated }
                        : a
            );

        syncSearchAgendaOptions();

        renderAgendaList();

        renderEvents();

        return true;
    }

    const agenda =
        await api.createAgenda(
            name,
            color
        );

    agendas.push(
        agenda
    );

    syncSearchAgendaOptions();

    renderAgendaList();

    return true;
}

async function submitTache() {
    const title =
        tacheTitle.value.trim();

    const start =
        new Date(
            tacheDate.value
            +
            'T'
            +
            tacheStart.value
        );

    const end =
        new Date(
            tacheDate.value
            +
            'T'
            +
            tacheEnd.value
        );

    if (!title) {
        showDialogError(
            'Saisissez un titre pour la tâche.'
        );

        tacheTitle.focus();

        return false;
    }

    if (
        isNaN(start)
        ||
        isNaN(end)
    ) {
        showDialogError(
            'Choisissez une date, une heure de début et une heure de fin.'
        );

        return false;
    }

    if (
        end <= start
    ) {
        showDialogError(
            "L'heure de fin doit être après l'heure de début."
        );

        tacheEnd.focus();

        return false;
    }

    if (
        pickedAgendaIds.size
        ===
        0
    ) {
        showDialogError(
            agendas.length
                ? 'Choisissez au moins un agenda.'
                : "Créez d'abord un agenda."
        );

        togglePicker(
            agendas.length > 0
        );

        return false;
    }

    const recurrenceFrequency =
        tacheRecurrence.value
        ===
        'none'
            ? null
            : tacheRecurrence.value;

    const recurrenceEndDate =
        recurrenceFrequency
            ? (
                tacheRecurrenceEnd.value
                ||
                null
            )
            : null;

    // La date de fin de récurrence est facultative : sans elle,
    // la série se répète indéfiniment.

    if (
        recurrenceEndDate
        &&
        recurrenceEndDate
        <
        tacheDate.value
    ) {
        showDialogError(
            'La fin de la récurrence doit être le même jour ou après la date de la tâche.'
        );

        tacheRecurrenceEnd.focus();

        return false;
    }

    const data = {
        title,

        start:
            start.toISOString(),

        end:
            end.toISOString(),

        location:
            tacheLocation.value.trim(),

        description:
            tacheDescription.value.trim(),

        recurrenceFrequency,

        recurrenceEndDate
    };

    if (editing && editing.occurrence) {
        // Seule cette occurrence change : la série reste intacte.
        await api.updateOccurrence(
            editing.item.id,
            editing.occurrence.occurrenceStart,
            {
                title: data.title,
                start: data.start,
                end: data.end,
                location: data.location,
                description: data.description
            }
        );

    } else if (editing) {
        const updated =
            await api.updateEvenement(
                editing.item.id,
                {
                    ...data,

                    agendaId:
                        [
                            ...pickedAgendaIds
                        ][0]
                }
            );

        evenements =
            evenements.map(
                (e) =>
                    e.id
                    ===
                    updated.id
                        ? updated
                        : e
            );

    } else {
        const created =
            await Promise.all(
                [
                    ...pickedAgendaIds
                ]
                    .map(
                        (id) =>
                            api.createEvenement(
                                id,
                                data
                            )
                    )
            );

        evenements.push(
            ...created
        );
    }

    await refreshCalendarEvenements();

    pickedAgendaIds.forEach(
        (id) =>
            selectedAgendaIds.add(
                id
            )
    );

    renderAgendaList();

    showWeekOf(
        start
    );

    weekBody.scrollTo({
        top:
            Math.max(
                0,
                start.getHours() - 2
            )
            *
            HOUR_HEIGHT,

        behavior:
            'smooth'
    });

    return true;
}
async function deleteEditing() {
    const {
        kind,
        item
    } =
        editing;

    if (
        !isArmed(
            deleteBtn
        )
    ) {
        const count =
            kind === 'agenda'
                ? evenements.filter(
                    (e) =>
                        e.agendaId
                        ===
                        item.id
                ).length
                : 0;

        armDelete(
            deleteBtn,
            count
                ? 'Supprimer avec '
                    +
                    count
                    +
                    (
                        count > 1
                            ? ' tâches ?'
                            : ' tâche ?'
                    )
                : 'Confirmer la suppression'
        );

        return;
    }

    deleteBtn.disabled =
        true;

    try {
        if (
            kind === 'agenda'
        ) {
            await api.deleteAgenda(
                item.id
            );

        } else if (editing.occurrence) {
            await api.deleteOccurrence(
                item.id,
                editing.occurrence.occurrenceStart
            );

        } else {
            await api.deleteEvenement(
                item.id
            );
        }

        if (
            kind === 'agenda'
        ) {
            agendas =
                agendas.filter(
                    (a) =>
                        a.id
                        !==
                        item.id
                );

            evenements =
                evenements.filter(
                    (e) =>
                        e.agendaId
                        !==
                        item.id
                );

            selectedAgendaIds.delete(
                item.id
            );
            saveCalendarState();

        } else if (!editing.occurrence) {
            evenements =
                evenements.filter(
                    (e) =>
                        e.id
                        !==
                        item.id
                );
        }

        await refreshCalendarEvenements();

        syncSearchAgendaOptions();

        renderAgendaList();

        renderEvents();

        closeCreate();

    } catch (err) {
        if (
            err.status === 401
        ) {
            goToLogin();

        } else {
            showDialogError(
                err.message
                ||
                'Suppression impossible. Réessayez.'
            );
        }

        disarmDelete(
            deleteBtn
        );

    } finally {
        deleteBtn.disabled =
            false;
    }
}

createBtn.addEventListener(
    'click',
    () =>
        openCreate()
);

deleteBtn.addEventListener(
    'click',
    deleteEditing
);

document
    .getElementById(
        'close-dialog'
    )
    .addEventListener(
        'click',
        closeCreate
    );

document
    .getElementById(
        'cancel-btn'
    )
    .addEventListener(
        'click',
        closeCreate
    );

createForm.elements.kind.forEach(
    (radio) => {
        radio.addEventListener(
            'change',
            () => {
                setKind(
                    radio.value
                );

                togglePicker(
                    false
                );
            }
        );
    }
);

pickerBtn.addEventListener(
    'click',
    () =>
        togglePicker(
            !isPickerOpen()
        )
);

tacheRecurrence.addEventListener(
    'change',
    () => {
        updateRecurrenceEndVisibility();

        dialogError.hidden =
            true;
    }
);

agendaName.addEventListener(
    'input',
    updateAgendaPreview
);

agendaFields.addEventListener(
    'change',
    updateAgendaPreview
);

colorCustom.addEventListener(
    'input',
    () => {
        colorCustomRadio.value =
            colorCustom.value;

        colorCustomRadio.checked =
            true;

        colorCustomRadio
            .closest(
                '.swatch'
            )
            .style
            .setProperty(
                '--swatch',
                colorCustom.value
            );

        updateAgendaPreview();
    }
);

createForm.addEventListener(
    'input',
    () => {
        dialogError.hidden =
            true;

        if (editing) {
            disarmDelete(
                deleteBtn
            );
        }
    }
);

dialog.addEventListener(
    'cancel',
    (event) => {
        if (
            isPickerOpen()
        ) {
            event.preventDefault();

            togglePicker(
                false
            );

            pickerBtn.focus();
        }
    }
);

dialog.addEventListener(
    'click',
    (event) => {
        if (
            event.target
            ===
            dialog
        ) {
            closeCreate();
        }
    }
);

dialog.addEventListener(
    'close',
    () => {
        setOccurrenceMode(false);

        createBtn.setAttribute(
            'aria-expanded',
            'false'
        );
    }
);

createForm.addEventListener(
    'submit',
    async (event) => {
        event.preventDefault();

        saveBtn.disabled =
            true;

        try {
            const done =
                currentKind()
                ===
                'agenda'
                    ? await submitAgenda()
                    : await submitTache();

            if (done) {
                closeCreate();
            }

        } catch (err) {
            if (
                err.status === 401
            ) {
                goToLogin();

            } else if (
                err.status === 400
            ) {
                showDialogError(
                    err.message
                    ||
                    'Vérifiez les champs puis réessayez.'
                );

            } else if (
                err.status === 404
            ) {
                showDialogError(
                    err.message
                    ||
                    "Cet élément n'existe plus. Rechargez la page."
                );

            } else {
                showDialogError(
                    editing
                        ? 'Enregistrement impossible. Réessayez.'
                        : 'Création impossible. Réessayez.'
                );
            }

        } finally {
            saveBtn.disabled =
                false;
        }
    }
);

function openShare(
    agenda,
    anchor
) {
    sharingAgenda =
        agenda;

    partages =
        [];

    shareDialog.style.setProperty(
        '--agenda-color',
        agenda.color
    );

    shareTitle.textContent =
        'Partager « '
        +
        agenda.name
        +
        ' »';

    shareForm.reset();

    shareError.hidden =
        true;

    shareStatus.hidden =
        true;

    renderPartages(
        'Chargement…'
    );

    shareDialog.showModal();

    placePopover(
        shareDialog,
        anchor
    );

    shareUsername.focus();

    loadPartages(
        agenda
    );
}

async function loadPartages(
    agenda
) {
    try {
        const loaded =
            await api.getPartages(
                agenda.id
            );

        if (
            sharingAgenda
            !==
            agenda
        ) {
            return;
        }

        partages =
            loaded || [];

        syncSharedWith();

        renderPartages();

    } catch (err) {
        if (
            err.status === 401
        ) {
            goToLogin();

        } else if (
            sharingAgenda
            ===
            agenda
        ) {
            renderPartages(
                ''
            );

            showShareError(
                err.message
                ||
                'Chargement des partages impossible.'
            );
        }
    }
}

function closeShare() {
    shareDialog.close();
}

function showShareError(
    message
) {
    shareStatus.hidden =
        true;

    shareError.textContent =
        message;

    shareError.hidden =
        false;
}

function showShareStatus(
    message
) {
    shareError.hidden =
        true;

    shareStatus.textContent =
        message;

    shareStatus.hidden =
        false;
}

function syncSharedWith() {
    sharingAgenda.sharedWith =
        partages.map(
            (p) =>
                p.username
        );

    renderAgendaList();
}

function renderPartages(
    emptyText
) {
    shareList.replaceChildren(
        ...partages.map(
            (partage) => {
                const item =
                    document.createElement(
                        'li'
                    );

                const label =
                    document.createElement(
                        'label'
                    );

                label.className =
                    'share-person';

                const checkbox =
                    document.createElement(
                        'input'
                    );

                checkbox.type =
                    'checkbox';

                checkbox.className =
                    'share-check visually-hidden';

                checkbox.value =
                    partage.username;

                checkbox.addEventListener(
                    'change',
                    updateRemoveBtn
                );

                const box =
                    document.createElement(
                        'span'
                    );

                box.className =
                    'agenda-box';

                box.setAttribute(
                    'aria-hidden',
                    'true'
                );

                box.innerHTML =
                    '<svg viewBox="0 0 24 24">'
                    + '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
                    + '</svg>';

                const avatar =
                    document.createElement(
                        'span'
                    );

                avatar.className =
                    'share-avatar';

                avatar.setAttribute(
                    'aria-hidden',
                    'true'
                );

                avatar.textContent =
                    partage.username
                        .charAt(0)
                        .toUpperCase();

                const name =
                    document.createElement(
                        'span'
                    );

                name.className =
                    'share-name';

                name.textContent =
                    partage.username;

                label.append(
                    checkbox,
                    box,
                    avatar,
                    name
                );

                item.append(
                    label
                );

                return item;
            }
        )
    );

    shareEmpty.textContent =
        emptyText
        ??
        "Cet agenda n'est partagé avec personne.";

    shareEmpty.hidden =
        partages.length > 0
        ||
        !shareEmpty.textContent;

    updateRemoveBtn();
}

function selectedPartages() {
    return [
        ...shareList.querySelectorAll(
            '.share-check:checked'
        )
    ]
        .map(
            (box) =>
                box.value
        );
}

function updateRemoveBtn() {
    const count =
        selectedPartages().length;

    shareRemoveBtn.dataset.label =
        count
            ? 'Retirer ('
                +
                count
                +
                ')'
            : 'Retirer';

    shareRemoveBtn.disabled =
        count === 0;

    disarmDelete(
        shareRemoveBtn
    );
}

async function addPartage() {
    const agenda =
        sharingAgenda;

    const username =
        shareUsername.value.trim();

    if (!username) {
        showShareError(
            "Saisissez le nom d'un utilisateur."
        );

        shareUsername.focus();

        return;
    }

    if (
        currentUser
        &&
        username
        ===
        currentUser.username
    ) {
        showShareError(
            'Vous êtes le propriétaire de cet agenda.'
        );

        return;
    }

    if (
        partages.some(
            (p) =>
                p.username
                ===
                username
        )
    ) {
        showShareError(
            username
            +
            ' a déjà accès à cet agenda.'
        );

        return;
    }

    shareAddBtn.disabled =
        true;

    try {
        const created =
            await api.addPartage(
                agenda.id,
                username
            );

        if (
            sharingAgenda
            !==
            agenda
        ) {
            return;
        }

        partages.push(
            created
            ||
            {
                username
            }
        );

        syncSharedWith();

        renderPartages();

        shareUsername.value =
            '';

        showShareStatus(
            username
            +
            ' a maintenant accès à cet agenda.'
        );

    } catch (err) {
        if (
            err.status === 401
        ) {
            goToLogin();

        } else if (
            err.status === 404
        ) {
            showShareError(
                'Aucun utilisateur nommé « '
                +
                username
                +
                ' ».'
            );

        } else if (
            err.status === 409
        ) {
            showShareError(
                username
                +
                ' a déjà accès à cet agenda.'
            );

        } else {
            showShareError(
                err.message
                ||
                'Partage impossible. Réessayez.'
            );
        }

    } finally {
        shareAddBtn.disabled =
            false;

        shareUsername.focus();
    }
}
async function removePartages() {
    const usernames =
        selectedPartages();

    if (
        !isArmed(
            shareRemoveBtn
        )
    ) {
        armDelete(
            shareRemoveBtn,
            'Retirer l\'accès à '
            +
            pluralize(
                usernames.length,
                'personne'
            )
            +
            ' ?'
        );

        return;
    }

    const agenda =
        sharingAgenda;

    shareRemoveBtn.disabled =
        true;

    const results =
        await Promise.allSettled(
            usernames.map(
                (username) =>
                    api.removePartage(
                        agenda.id,
                        username
                    )
            )
        );

    if (
        sharingAgenda
        !==
        agenda
    ) {
        return;
    }

    const removed =
        usernames.filter(
            (_, i) =>
                results[i].status
                ===
                'fulfilled'
        );

    const failed =
        results.find(
            (r) =>
                r.status
                ===
                'rejected'
        );

    partages =
        partages.filter(
            (p) =>
                !removed.includes(
                    p.username
                )
        );

    syncSharedWith();

    renderPartages();

    if (
        failed
        &&
        failed.reason.status
        ===
        401
    ) {
        goToLogin();

    } else if (failed) {
        showShareError(
            failed.reason.message
            ||
            'Retrait impossible. Réessayez.'
        );

    } else {
        showShareStatus(
            'Accès retiré pour '
            +
            removed.join(', ')
            +
            '.'
        );
    }
}

shareForm.addEventListener(
    'submit',
    (event) => {
        event.preventDefault();

        addPartage();
    }
);

shareUsername.addEventListener(
    'input',
    () => {
        shareError.hidden =
            true;
    }
);

shareRemoveBtn.addEventListener(
    'click',
    removePartages
);

document
    .getElementById(
        'share-close'
    )
    .addEventListener(
        'click',
        closeShare
    );

shareDialog.addEventListener(
    'click',
    (event) => {
        if (
            event.target
            ===
            shareDialog
        ) {
            closeShare();
        }
    }
);

shareDialog.addEventListener(
    'close',
    () => {
        sharingAgenda =
            null;
    }
);


/* =========================================================
   ÉVÉNEMENTS DE LA RECHERCHE
   ========================================================= */

if (searchFilterBtn) {
    searchFilterBtn.addEventListener(
        'click',
        () => toggleSearchFilters()
    );
}

if (searchSubmitBtn) {
    searchSubmitBtn.addEventListener(
        'click',
        performSearch
    );
}

if (searchResetBtn) {
    searchResetBtn.addEventListener(
        'click',
        resetSearchFilters
    );
}

if (searchInput) {
    searchInput.addEventListener(
        'input',
        performSearch
    );

    searchInput.addEventListener(
        'keydown',
        (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();

                performSearch();
            }

            if (event.key === 'Escape') {
                resetSearch();
            }
        }
    );
}

[
    searchTitle,
    searchStartDate,
    searchEndDate,
    searchAgenda,
    searchLocation
]
    .filter(Boolean)
    .forEach(
        (field) => {

            // Le badge du bouton « Filtres » suit les critères saisis.
            field.addEventListener('input', updateSearchFilterCount);
            field.addEventListener('change', () => {
                updateSearchFilterCount();
                isSearchPeriodValid(getSearchCriteria());
            });

            field.addEventListener(
                'keydown',
                (event) => {

                    if (
                        event.key
                        ===
                        'Enter'
                    ) {
                        event.preventDefault();

                        performSearch();
                    }
                }
            );
        }
    );

// Clic en dehors de la zone de recherche : le panneau des
// filtres se ferme (les calendriers / listes des filtres
// font partie de la zone, même affichés en popover).
document.addEventListener(
    'click',
    (event) => {
        if (
            searchFilters
            && !searchFilters.hidden
            && event.target.isConnected
            && !event.target.closest('.search-area')
        ) {
            toggleSearchFilters(false);
        }
    }
);

document.addEventListener(
    'keydown',
    (event) => {
        if (
            event.key === 'Escape'
            && searchFilters
            && !searchFilters.hidden
            && !document.querySelector(':popover-open')
            && !document.querySelector('dialog[open]')
        ) {
            toggleSearchFilters(false);
            searchFilterBtn?.focus();
        }
    }
);

document.addEventListener(
    'click',
    (event) => {

        if (
            searchResults
            &&
            !searchResults.hidden
            &&
            !event.target.closest(
                '.search-area'
            )
        ) {
            searchResults.hidden =
                true;
        }
    }
);


const importBtn = document.getElementById('import-btn');
const importDialog = document.getElementById('import-dialog');
const importForm = document.getElementById('import-form');
const importDrop = document.getElementById('import-drop');
const importDropLabel = document.getElementById('import-drop-label');
const importFile = document.getElementById('import-file');
const importPreview = document.getElementById('import-preview');
const importName = document.getElementById('import-name');
const importColor = document.getElementById('import-color');
const importCount = document.getElementById('import-count');
const importList = document.getElementById('import-list');
const importWarnings = document.getElementById('import-warnings');
const importError = document.getElementById('import-error');
const importSubmit = document.getElementById('import-submit');
const importNewFields = document.getElementById('import-new-fields');
const importExistingField = document.getElementById('import-existing-field');
const importAgenda = document.getElementById('import-agenda');
const importTargetExisting = document.getElementById('import-target-existing');
const importSelectAll = document.getElementById('import-select-all');

const IMPORT_MAX_SIZE = 1024 * 1024;

let importData = null;
let importing = false;
let importFileVersion = 0;
// Agenda présélectionné quand l'import est ouvert depuis le menu d'un agenda.
let importPresetAgendaId = null;

function showImportError(message) {
    importError.textContent = message;
    importError.hidden = false;
}

function setImportColor(color) {
    importColor.value = color;
    importDialog.style.setProperty('--agenda-color', color);
}

function resetImport() {
    importFileVersion++;
    importData = null;
    importForm.reset();
    importDropLabel.textContent = 'Fichier iCalendar';
    importPreview.hidden = true;
    importWarnings.hidden = true;
    importError.hidden = true;
    importSubmit.disabled = true;
    setImportColor('#3b82f6');
    syncImportAgendaOptions();

    if (importPresetAgendaId && findAgenda(importPresetAgendaId)) {
        importTargetExisting.checked = true;
        importAgenda.value = String(importPresetAgendaId);
    }

    updateImportTarget();
}

function openImport(agendaId = null) {
    closeCreate();
    importPresetAgendaId = agendaId;
    resetImport();
    importDialog.showModal();
}

function isImportIntoExisting() {
    return importTargetExisting.checked;
}

function syncImportAgendaOptions() {
    importAgenda.replaceChildren(
        ...agendas.map((agenda) => {
            const option = document.createElement('option');

            option.value = String(agenda.id);
            option.textContent = agenda.name;

            return option;
        })
    );

    importTargetExisting.disabled = agendas.length === 0;
}

function updateImportTarget() {
    const existing = isImportIntoExisting();

    importNewFields.hidden = existing;
    importExistingField.hidden = !existing;
    importSubmit.textContent = existing
        ? 'Importer dans l’agenda'
        : 'Importer l’agenda';

    if (existing) {
        const agenda = findAgenda(importAgenda.value);

        if (agenda) {
            importDialog.style.setProperty('--agenda-color', agenda.color);
        }
    } else {
        setImportColor(importColor.value);
    }

    updateImportSelection();
}

function updateImportSelection() {
    if (!importData) {
        importSubmit.disabled = true;
        return;
    }

    const total = importData.evenements.length;
    const count = importData.selected.size;

    importCount.textContent =
        count + ' sur ' + pluralize(total, 'événement')
        + ' à importer';

    importSelectAll.checked = total > 0 && count === total;
    importSelectAll.indeterminate = count > 0 && count < total;
    importSelectAll.disabled = total === 0;

    importSubmit.disabled =
        importing
        || count === 0
        || (isImportIntoExisting() && !importAgenda.value);
}

function closeImport() {
    if (!importing) {
        importDialog.close();
    }
}

function formatImportWhen(ev) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);

    const day = start.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(ev.allDay ? { timeZone: 'UTC' } : {})
    });

    const allDay = ev.allDay;

    let when = allDay
        ? day + ' · journée entière'
        : day + ' · ' + formatTime(start) + ' – ' + formatTime(end);

    const frequencies = {
        daily: 'tous les jours',
        weekly: 'toutes les semaines',
        monthly: 'tous les mois',
        yearly: 'tous les ans'
    };

    if (ev.recurrenceFrequency) {
        when += ' · ' + frequencies[ev.recurrenceFrequency];
    }

    return when;
}

function renderImportPreview(fileName) {
    const { evenements, warnings } = importData;

    importList.replaceChildren(
        ...evenements.map((ev, index) => {
            const li = document.createElement('li');
            const label = document.createElement('label');
            const box = document.createElement('input');
            const text = document.createElement('span');
            const title = document.createElement('strong');
            const when = document.createElement('span');

            box.type = 'checkbox';
            box.checked = importData.selected.has(index);
            box.dataset.index = String(index);

            text.className = 'import-ev-text';
            title.className = 'import-ev-title';
            title.textContent = ev.title;
            when.className = 'import-ev-when';
            when.textContent = formatImportWhen(ev);

            text.append(title, when);
            label.append(box, text);
            li.append(label);

            return li;
        })
    );

    importWarnings.replaceChildren(
        ...warnings.map((w) => {
            const li = document.createElement('li');

            li.textContent = capitalize(w) + '.';

            return li;
        })
    );
    importWarnings.hidden = warnings.length === 0;

    importPreview.hidden = false;
    updateImportSelection();

    if (!isImportIntoExisting()) {
        importName.focus();
        importName.select();
    }
}

async function loadImportFile(file) {
    const version = ++importFileVersion;
    importData = null;
    importPreview.hidden = true;
    importError.hidden = true;
    importSubmit.disabled = true;

    if (!file) {
        return;
    }


    if (!/\.ics$/i.test(file.name) && file.type !== 'text/calendar') {
        showImportError('Seuls les fichiers .ics sont acceptés.');
        return;
    }

    if (file.size > IMPORT_MAX_SIZE) {
        showImportError('Ce fichier est trop volumineux (1 Mo maximum).');
        return;
    }

    try {
        const contenu = await file.text();
        const parsed = await api.previewImport(contenu);
        if (version !== importFileVersion) return;
        importData = {
            ...parsed,
            contenu,
            warnings: [],
            // Par défaut, tous les événements de l'aperçu sont cochés.
            selected: new Set(parsed.evenements.map((_, i) => i))
        };

        importName.value =
            parsed.name
            || file.name.replace(/\.ics$/i, '').trim()
            || 'Agenda importé';

        setImportColor(parsed.color || '#3b82f6');

        renderImportPreview(file.name);

    } catch (err) {
        if (version !== importFileVersion) return;
        if (err.status === 401) goToLogin();
        else showImportError(err.message || 'Lecture du fichier impossible.');
    }
}

async function submitImport() {
    const name = importName.value.trim();
    const intoExisting = isImportIntoExisting();
    const targetAgendaId = importAgenda.value;

    if (!importData) {
        return;
    }

    const selection = [...importData.selected].sort((a, b) => a - b);

    if (selection.length === 0) {
        showImportError('Sélectionnez au moins un événement à importer.');
        return;
    }

    if (intoExisting && !findAgenda(targetAgendaId)) {
        showImportError('Choisissez l\'agenda dans lequel importer.');
        return;
    }

    if (!intoExisting && !name) {
        importName.focus();
        showImportError('Donnez un nom à l\'agenda.');
        return;
    }

    importing = true;
    importSubmit.disabled = true;
    importSubmit.textContent = 'Import…';
    importError.hidden = true;

    try {
        const knownIds = new Set(agendas.map((a) => a.id));

        const result = intoExisting
            ? await api.importEvenements(
                targetAgendaId,
                importData.contenu,
                selection
            )
            : await api.importAgenda(
                name,
                importColor.value,
                importData.contenu,
                selection
            );

        [agendas, evenements] = await Promise.all([
            api.getAgendas(),
            api.getEvenements()
        ]);

        const imported = intoExisting
            ? findAgenda(targetAgendaId)
            : agendas.find((a) => a.id === result?.agenda?.id)
                || agendas.find((a) => !knownIds.has(a.id));

        if (imported) {
            selectedAgendaIds.add(imported.id);
        }

        await refreshCalendarEvenements();
        syncSearchAgendaOptions();
        renderAgendaList();

        const first = importData.evenements[selection[0]];

        importing = false;
        importDialog.close();

        if (first) {
            showWeekOf(new Date(first.start));
        } else {
            saveCalendarState();
            renderEvents();
        }

    } catch (err) {
        if (err.status === 401) {
            goToLogin();
            return;
        }

        showImportError(err.message || 'Import impossible. Réessayez.');

    } finally {
        importing = false;
        updateImportTarget();
    }
}

importBtn.addEventListener('click', () => openImport());

importDialog
    .querySelectorAll('input[name="import-target"]')
    .forEach((radio) =>
        radio.addEventListener('change', updateImportTarget)
    );

importAgenda.addEventListener('change', updateImportTarget);

importList.addEventListener('change', (event) => {
    const box = event.target;

    if (!importData || box.dataset.index === undefined) {
        return;
    }

    const index = Number(box.dataset.index);

    if (box.checked) importData.selected.add(index);
    else importData.selected.delete(index);

    importError.hidden = true;
    updateImportSelection();
});

importSelectAll.addEventListener('change', () => {
    if (!importData) {
        return;
    }

    importData.selected = importSelectAll.checked
        ? new Set(importData.evenements.map((_, i) => i))
        : new Set();

    importList
        .querySelectorAll('input[type="checkbox"]')
        .forEach((box) => {
            box.checked = importSelectAll.checked;
        });

    updateImportSelection();
});

document
    .getElementById('import-close')
    .addEventListener('click', closeImport);

importDialog.addEventListener('click', (event) => {
    if (event.target === importDialog) {
        closeImport();
    }
});

importDialog.addEventListener('cancel', (event) => {
    if (importing) {
        event.preventDefault();
    }
});

importFile.addEventListener('change', () => {
    loadImportFile(importFile.files[0]);
});

importColor.addEventListener('input', () => {
    setImportColor(importColor.value);
});

importForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitImport();
});

['dragenter', 'dragover'].forEach((type) =>
    importDrop.addEventListener(type, (event) => {
        event.preventDefault();
        importDrop.classList.add('dragging');
    })
);

['dragleave', 'drop'].forEach((type) =>
    importDrop.addEventListener(type, () => {
        importDrop.classList.remove('dragging');
    })
);

importDrop.addEventListener('drop', (event) => {
    event.preventDefault();
    importFile.files = event.dataTransfer.files;
    loadImportFile(event.dataTransfer.files[0]);
});


/* =========================================================
   LISTE DÉROULANTE PERSONNALISÉE
   ---------------------------------------------------------
   Le menu natif d'un <select> ne peut pas être stylé : il
   est remplacé à l'écran par un bouton + un menu « verre »
   affiché dans la couche supérieure (popover), pour ne pas
   être rogné par la fenêtre « Créer ».
   Le <select> reste la source de vérité (masqué) : le code
   existant continue de lire / écrire select.value.
   ========================================================= */

// Place un popover (position fixe) sous son bouton, ou
// au-dessus s'il n'y a pas assez de place en dessous.
function placeFieldPopover(panel, anchor, { matchWidth = false } = {}) {
    const margin = 8;
    const rect = anchor.getBoundingClientRect();

    if (matchWidth) {
        panel.style.width = rect.width + 'px';
    }

    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const up = below < height && above > below;

    const left = Math.min(
        Math.max(margin, rect.left),
        window.innerWidth - margin - width
    );

    panel.style.left = left + 'px';
    panel.style.top =
        (up ? rect.top - height - 6 : rect.bottom + 6) + 'px';
    panel.dataset.side = up ? 'top' : 'bottom';
}

function enhanceSelect(select) {
    const nativeValue =
        Object.getOwnPropertyDescriptor(
            HTMLSelectElement.prototype,
            'value'
        );

    const wrapper = document.createElement('div');
    const trigger = document.createElement('button');
    const triggerLabel = document.createElement('span');
    const menu = document.createElement('div');

    const menuId = select.id + '-menu';

    wrapper.className = 'select-custom';

    trigger.type = 'button';
    trigger.id = select.id + '-button';
    trigger.className = 'select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', menuId);
    triggerLabel.className = 'select-trigger-label';
    trigger.append(triggerLabel);

    menu.id = menuId;
    menu.className = 'select-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('popover', 'auto');
    menu.tabIndex = -1;

    let items = [];

    // Les options peuvent changer (ex. liste des agendas) :
    // le menu est reconstruit à chaque ouverture.
    function buildItems() {
        items = [...select.options].map((option) => {
            const item = document.createElement('div');
            const check = document.createElement('span');
            const text = document.createElement('span');

            item.className = 'select-option';
            item.setAttribute('role', 'option');
            item.dataset.value = option.value;

            check.className = 'select-option-check';
            check.setAttribute('aria-hidden', 'true');
            text.textContent = option.textContent.trim();

            item.append(check, text);

            item.addEventListener('click', () => choose(option.value));
            item.addEventListener('pointermove', () => setActive(item, false));

            return item;
        });

        menu.replaceChildren(...items);
        sync();
    }

    // Le libellé <label for> pointe désormais vers le bouton.
    const label = document.querySelector(
        'label[for="' + select.id + '"]'
    );

    if (label) {
        label.htmlFor = trigger.id;
        label.id ||= select.id + '-label';
        menu.setAttribute('aria-labelledby', label.id);
    }

    select.classList.add('visually-hidden');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.after(wrapper);
    wrapper.append(trigger, menu);

    let active = null;
    let wasOpen = false;

    function isOpen() {
        return menu.matches(':popover-open');
    }

    function sync() {
        const value = nativeValue.get.call(select);
        const option = [...select.options].find((o) => o.value === value);

        triggerLabel.textContent =
            option ? option.textContent.trim() : '';

        for (const item of items) {
            item.setAttribute(
                'aria-selected',
                String(item.dataset.value === value)
            );
        }
    }

    function setActive(item, scroll = true) {
        active?.classList.remove('active');
        active = item;
        active?.classList.add('active');

        if (scroll) {
            active?.scrollIntoView({ block: 'nearest' });
        }
    }

    function place() {
        placeFieldPopover(menu, trigger, { matchWidth: true });
    }

    function open() {
        if (isOpen()) {
            return;
        }

        buildItems();
        menu.showPopover();
        place();
        setActive(
            items.find((i) => i.getAttribute('aria-selected') === 'true')
            || items[0]
        );
        menu.focus({ preventScroll: true });
    }

    function close(focusTrigger = true) {
        if (isOpen()) {
            menu.hidePopover();
        }

        if (focusTrigger) {
            trigger.focus({ preventScroll: true });
        }
    }

    function choose(value) {
        const changed = nativeValue.get.call(select) !== value;

        select.value = value;
        close();

        if (changed) {
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Toute écriture de select.value (code existant) met
    // à jour le bouton.
    Object.defineProperty(select, 'value', {
        configurable: true,
        get() {
            return nativeValue.get.call(select);
        },
        set(value) {
            nativeValue.set.call(select, value);
            sync();
        }
    });

    select.form?.addEventListener('reset', () => setTimeout(sync));
    new MutationObserver(sync).observe(select, { childList: true });
    select.addEventListener('change', sync);

    // Un clic sur le bouton alors que le menu est ouvert le
    // ferme (le « light dismiss » l'a déjà fermé au pointerdown).
    trigger.addEventListener('pointerdown', () => {
        wasOpen = isOpen();
    });

    trigger.addEventListener('click', () => {
        if (wasOpen) {
            wasOpen = false;
            return;
        }

        open();
    });

    trigger.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            open();
        }
    });

    // Échap est géré par le navigateur (popover) : il ne
    // ferme que le menu, pas la fenêtre « Créer ».
    menu.addEventListener('toggle', (event) => {
        const opened = event.newState === 'open';

        trigger.setAttribute('aria-expanded', String(opened));
        wrapper.classList.toggle('open', opened);

        if (!opened && menu.contains(document.activeElement)) {
            trigger.focus({ preventScroll: true });
        }
    });

    menu.addEventListener('keydown', (event) => {
        const index = items.indexOf(active);

        switch (event.key) {
            case 'ArrowDown':
                setActive(items[Math.min(index + 1, items.length - 1)]);
                break;
            case 'ArrowUp':
                setActive(items[Math.max(index - 1, 0)]);
                break;
            case 'Home':
                setActive(items[0]);
                break;
            case 'End':
                setActive(items[items.length - 1]);
                break;
            case 'Enter':
            case ' ':
                if (active) {
                    choose(active.dataset.value);
                }
                break;
            case 'Tab':
                close();
                return;
            default:
                return;
        }

        event.preventDefault();
        event.stopPropagation();
    });

    window.addEventListener('resize', () => close(false));

    // La fenêtre « Créer » défile : le menu suit son bouton.
    document.addEventListener(
        'scroll',
        (event) => {
            if (isOpen() && event.target !== menu) {
                place();
            }
        },
        true
    );

    // Fermeture de la fenêtre parente : le menu aussi.
    select.closest('dialog')?.addEventListener('close', () => close(false));

    sync();
}

/* =========================================================
   SÉLECTEUR DE DATE PERSONNALISÉ
   ---------------------------------------------------------
   Même principe que enhanceSelect : l'<input type="date">
   reste la source de vérité (masqué), un bouton affiche la
   date et ouvre un calendrier « verre » dans un popover.
   Options :
     min() → 'YYYY-MM-DD' : jours antérieurs désactivés ;
     clearable : bouton « Effacer » (champ facultatif).
   ========================================================= */

const DATE_PICKER_WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function isoDate(date) {
    return date.getFullYear()
        + '-' + String(date.getMonth() + 1).padStart(2, '0')
        + '-' + String(date.getDate()).padStart(2, '0');
}

function parseIsoDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');

    return match
        ? new Date(+match[1], +match[2] - 1, +match[3])
        : null;
}

function enhanceDateInput(input, { min = () => '', clearable = false, placeholder = '' } = {}) {
    const nativeValue =
        Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value'
        );

    const wrapper = document.createElement('div');
    const trigger = document.createElement('button');
    const triggerLabel = document.createElement('span');
    const panel = document.createElement('div');

    wrapper.className = 'select-custom date-custom';

    trigger.type = 'button';
    trigger.id = input.id + '-button';
    trigger.className = 'select-trigger date-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', input.id + '-calendar');
    triggerLabel.className = 'select-trigger-label';
    trigger.append(triggerLabel);

    panel.id = input.id + '-calendar';
    panel.className = 'date-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('popover', 'auto');

    panel.innerHTML = `
        <div class="date-head">
            <button type="button" class="date-nav" data-step="-1" aria-label="Mois précédent">‹</button>
            <span class="date-month" aria-live="polite"></span>
            <button type="button" class="date-nav" data-step="1" aria-label="Mois suivant">›</button>
        </div>
        <div class="date-weekdays" aria-hidden="true">
            ${DATE_PICKER_WEEKDAYS.map((d) => `<span>${d}</span>`).join('')}
        </div>
        <div class="date-grid" role="grid"></div>
        <div class="date-foot">
            ${clearable ? '<button type="button" class="date-clear">Effacer</button>' : ''}
            <button type="button" class="date-today">Aujourd'hui</button>
        </div>`;

    const monthLabel = panel.querySelector('.date-month');
    const grid = panel.querySelector('.date-grid');
    const todayBtn = panel.querySelector('.date-today');

    const label = document.querySelector(
        'label[for="' + input.id + '"]'
    );

    if (label) {
        label.htmlFor = trigger.id;
        label.id ||= input.id + '-label';
        panel.setAttribute('aria-labelledby', label.id);
    }

    input.classList.add('visually-hidden');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    input.after(wrapper);
    wrapper.append(trigger, panel);

    // Mois affiché et jour qui a le focus clavier.
    let view = new Date();
    let focused = new Date();
    let wasOpen = false;

    function isOpen() {
        return panel.matches(':popover-open');
    }

    function sync() {
        const date = parseIsoDate(nativeValue.get.call(input));

        triggerLabel.textContent = date
            ? capitalize(date.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }))
            : (placeholder || (clearable ? 'Toutes les dates' : 'Choisir une date'));

        trigger.classList.toggle('placeholder', !date);
    }

    function render(focusDay = false) {
        const selected = nativeValue.get.call(input);
        const today = isoDate(new Date());
        const minimum = min() || '';

        monthLabel.textContent = capitalize(
            view.toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric'
            })
        );

        // Premier lundi affiché.
        const first = new Date(view.getFullYear(), view.getMonth(), 1);
        const start = new Date(first);
        start.setDate(1 - ((first.getDay() + 6) % 7));

        const focusedIso = isoDate(focused);

        grid.replaceChildren();

        for (let i = 0; i < 42; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);

            const iso = isoDate(day);
            const btn = document.createElement('button');

            btn.type = 'button';
            btn.className = 'date-day';
            btn.textContent = day.getDate();
            btn.dataset.date = iso;
            btn.tabIndex = iso === focusedIso ? 0 : -1;
            btn.setAttribute(
                'aria-label',
                day.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })
            );

            if (day.getMonth() !== view.getMonth()) {
                btn.classList.add('other-month');
            }

            if (iso === today) {
                btn.classList.add('today');
                btn.setAttribute('aria-current', 'date');
            }

            if (iso === selected) {
                btn.classList.add('selected');
                btn.setAttribute('aria-pressed', 'true');
            }

            if (minimum && iso < minimum) {
                btn.disabled = true;
            }

            grid.append(btn);
        }

        todayBtn.disabled = Boolean(minimum && today < minimum);

        if (focusDay) {
            grid.querySelector('[tabindex="0"]')
                ?.focus({ preventScroll: true });
        }
    }

    function moveFocus(date) {
        focused = date;

        if (
            date.getMonth() !== view.getMonth()
            || date.getFullYear() !== view.getFullYear()
        ) {
            view = new Date(date.getFullYear(), date.getMonth(), 1);
        }

        render(true);
    }

    function open() {
        if (isOpen() || trigger.disabled) {
            return;
        }

        const selected = parseIsoDate(nativeValue.get.call(input));
        const minimum = parseIsoDate(min());
        let initial = selected || new Date();

        if (!selected && minimum && minimum > initial) {
            initial = minimum;
        }

        focused = initial;
        view = new Date(initial.getFullYear(), initial.getMonth(), 1);

        panel.showPopover();
        render();
        placeFieldPopover(panel, trigger);
        grid.querySelector('[tabindex="0"]')
            ?.focus({ preventScroll: true });
    }

    function close(focusTrigger = true) {
        if (isOpen()) {
            panel.hidePopover();
        }

        if (focusTrigger) {
            trigger.focus({ preventScroll: true });
        }
    }

    function choose(iso) {
        const changed = nativeValue.get.call(input) !== iso;

        input.value = iso;
        close();

        if (changed) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    Object.defineProperty(input, 'value', {
        configurable: true,
        get() {
            return nativeValue.get.call(input);
        },
        set(value) {
            nativeValue.set.call(input, value);
            sync();
        }
    });

    // Le code existant appelle input.focus() en cas d'erreur.
    input.focus = (options) => trigger.focus(options);

    // input.disabled (récurrence « Aucune ») → bouton désactivé.
    new MutationObserver(() => {
        trigger.disabled = input.disabled;

        if (input.disabled) {
            close(false);
        }
    }).observe(input, { attributes: true, attributeFilter: ['disabled'] });

    trigger.disabled = input.disabled;

    input.form?.addEventListener('reset', () => setTimeout(sync));
    input.addEventListener('change', sync);

    trigger.addEventListener('pointerdown', () => {
        wasOpen = isOpen();
    });

    trigger.addEventListener('click', () => {
        if (wasOpen) {
            wasOpen = false;
            return;
        }

        open();
    });

    trigger.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            open();
        }
    });

    // Échap est géré par le navigateur (popover) : il ne
    // ferme que le menu, pas la fenêtre « Créer ».
    panel.addEventListener('toggle', (event) => {
        const opened = event.newState === 'open';

        trigger.setAttribute('aria-expanded', String(opened));
        wrapper.classList.toggle('open', opened);

        if (!opened && panel.contains(document.activeElement)) {
            trigger.focus({ preventScroll: true });
        }
    });

    panel.querySelectorAll('.date-nav').forEach((btn) =>
        btn.addEventListener('click', () => {
            const step = Number(btn.dataset.step);

            view = new Date(view.getFullYear(), view.getMonth() + step, 1);
            focused = new Date(
                view.getFullYear(),
                view.getMonth(),
                Math.min(
                    focused.getDate(),
                    new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
                )
            );
            render();
            placeFieldPopover(panel, trigger);
        })
    );

    grid.addEventListener('click', (event) => {
        const btn = event.target.closest('.date-day');

        if (btn && !btn.disabled) {
            choose(btn.dataset.date);
        }
    });

    todayBtn.addEventListener('click', () => choose(isoDate(new Date())));

    panel.querySelector('.date-clear')
        ?.addEventListener('click', () => choose(''));

    panel.addEventListener('keydown', (event) => {
        const day = event.target.closest?.('.date-day');
        const offsets = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7
        };

        if (!day) {
            return;
        }

        const next = new Date(focused);

        if (event.key in offsets) {
            next.setDate(next.getDate() + offsets[event.key]);
        } else if (event.key === 'PageUp' || event.key === 'PageDown') {
            next.setMonth(next.getMonth() + (event.key === 'PageUp' ? -1 : 1));
        } else if (event.key === 'Home') {
            next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
        } else if (event.key === 'End') {
            next.setDate(next.getDate() + (6 - ((next.getDay() + 6) % 7)));
        } else {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        moveFocus(next);
    });

    window.addEventListener('resize', () => close(false));

    document.addEventListener(
        'scroll',
        () => {
            if (isOpen()) {
                placeFieldPopover(panel, trigger);
            }
        },
        true
    );

    input.closest('dialog')?.addEventListener('close', () => close(false));

    sync();
}

/* =========================================================
   SÉLECTEUR D'HEURE : HORLOGE RONDE
   ---------------------------------------------------------
   L'<input type="time"> reste la source de vérité (masqué) ;
   un bouton ouvre une horloge :
     1. choix de l'heure (24 h : 1–12 à l'extérieur,
        13–00 à l'intérieur), puis passage aux minutes ;
     2. choix des minutes (pas de 5) : relâcher valide.
   Clavier : flèches pour ajuster, Entrée pour avancer /
   valider. Options :
     after() → 'HH:MM' : affiche la durée (champ « Fin »).
   ========================================================= */

const CLOCK_SIZE = 184;
const CLOCK_OUTER = 74;
const CLOCK_INNER = 47;

function minutesOf(time) {
    const match = /^(\d{2}):(\d{2})/.exec(time || '');

    return match ? +match[1] * 60 + +match[2] : null;
}

function timeOf(minutes) {
    return String(Math.floor(minutes / 60)).padStart(2, '0')
        + ':' + String(minutes % 60).padStart(2, '0');
}

function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h === 0) return m + ' min';
    if (m === 0) return h + ' h';
    return h + ' h ' + String(m).padStart(2, '0');
}

// Position (x, y) d'une graduation sur le cadran.
function clockPoint(index, radius) {
    const angle = (index / 12) * 2 * Math.PI;
    const c = CLOCK_SIZE / 2;

    return [
        c + radius * Math.sin(angle),
        c - radius * Math.cos(angle)
    ];
}

function enhanceTimeInput(input, { after = () => '' } = {}) {
    const nativeValue =
        Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value'
        );

    const svgNs = 'http://www.w3.org/2000/svg';

    const wrapper = document.createElement('div');
    const trigger = document.createElement('button');
    const triggerLabel = document.createElement('span');
    const panel = document.createElement('div');

    wrapper.className = 'select-custom time-custom';

    trigger.type = 'button';
    trigger.id = input.id + '-button';
    trigger.className = 'select-trigger time-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', input.id + '-clock');
    triggerLabel.className = 'select-trigger-label';
    trigger.append(triggerLabel);

    panel.id = input.id + '-clock';
    panel.className = 'clock-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('popover', 'auto');

    panel.innerHTML = `
        <div class="clock-head">
            <div class="clock-readout">
                <button type="button" class="clock-seg" data-mode="hours" aria-label="Heures"></button>
                <span class="clock-colon">:</span>
                <button type="button" class="clock-seg" data-mode="minutes" aria-label="Minutes"></button>
            </div>
            <span class="clock-duration"></span>
        </div>
        <div class="clock-dial" tabindex="0" role="slider" aria-valuemin="0" style="width: ${CLOCK_SIZE}px; height: ${CLOCK_SIZE}px">
            <svg class="clock-hand" width="${CLOCK_SIZE}" height="${CLOCK_SIZE}" aria-hidden="true">
                <line></line>
                <circle class="clock-knob"></circle>
                <circle class="clock-pivot" r="3" cx="${CLOCK_SIZE / 2}" cy="${CLOCK_SIZE / 2}"></circle>
            </svg>
            <div class="clock-numbers" aria-hidden="true"></div>
        </div>
        <div class="clock-foot">
            <button type="button" class="clock-cancel">Annuler</button>
            <button type="button" class="clock-ok">OK</button>
        </div>`;

    const hourSeg = panel.querySelector('[data-mode="hours"]');
    const minuteSeg = panel.querySelector('[data-mode="minutes"]');
    const durationLabel = panel.querySelector('.clock-duration');
    const dial = panel.querySelector('.clock-dial');
    const handLine = panel.querySelector('.clock-hand line');
    const knob = panel.querySelector('.clock-knob');
    const numbers = panel.querySelector('.clock-numbers');

    const label = document.querySelector(
        'label[for="' + input.id + '"]'
    );

    if (label) {
        label.htmlFor = trigger.id;
        label.id ||= input.id + '-label';
        panel.setAttribute('aria-labelledby', label.id);
        dial.setAttribute('aria-labelledby', label.id);
    }

    input.classList.add('visually-hidden');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    input.after(wrapper);
    wrapper.append(trigger, panel);

    // Brouillon affiché sur l'horloge (validé par OK / minutes).
    let hour = 9;
    let minute = 0;
    let mode = 'hours';
    let dragging = false;
    let wasOpen = false;

    function isOpen() {
        return panel.matches(':popover-open');
    }

    function sync() {
        const value = nativeValue.get.call(input);

        triggerLabel.textContent = value ? value.slice(0, 5) : '--:--';
        trigger.classList.toggle('placeholder', !value);
    }

    function renderNumbers() {
        numbers.replaceChildren();

        const add = (text, index, radius, value, inner) => {
            const [x, y] = clockPoint(index, radius);
            const span = document.createElement('span');

            span.className = 'clock-num' + (inner ? ' inner' : '');
            span.textContent = text;
            span.dataset.value = value;
            span.style.left = x + 'px';
            span.style.top = y + 'px';
            numbers.append(span);
        };

        if (mode === 'hours') {
            for (let i = 0; i < 12; i++) {
                add(String(i === 0 ? 12 : i), i, CLOCK_OUTER, i === 0 ? 12 : i, false);
                add(i === 0 ? '00' : String(i + 12), i, CLOCK_INNER, i === 0 ? 0 : i + 12, true);
            }
        } else {
            for (let i = 0; i < 12; i++) {
                add(String(i * 5).padStart(2, '0'), i, CLOCK_OUTER, i * 5, false);
            }
        }
    }

    function render() {
        const c = CLOCK_SIZE / 2;

        hourSeg.textContent = String(hour).padStart(2, '0');
        minuteSeg.textContent = String(minute).padStart(2, '0');
        hourSeg.classList.toggle('active', mode === 'hours');
        minuteSeg.classList.toggle('active', mode === 'minutes');
        hourSeg.setAttribute('aria-pressed', String(mode === 'hours'));
        minuteSeg.setAttribute('aria-pressed', String(mode === 'minutes'));

        panel.classList.toggle('minutes', mode === 'minutes');

        // Aiguille.
        let index;
        let radius;

        if (mode === 'hours') {
            index = hour % 12;
            radius = hour === 0 || hour > 12 ? CLOCK_INNER : CLOCK_OUTER;
        } else {
            index = minute / 5;
            radius = CLOCK_OUTER;
        }

        const [x, y] = clockPoint(index, radius);

        handLine.setAttribute('x1', c);
        handLine.setAttribute('y1', c);
        handLine.setAttribute('x2', x);
        handLine.setAttribute('y2', y);
        knob.setAttribute('cx', x);
        knob.setAttribute('cy', y);
        knob.setAttribute('r', radius === CLOCK_INNER ? 12 : 14);

        const current = mode === 'hours' ? hour : minute;

        for (const num of numbers.children) {
            num.classList.toggle('selected', Number(num.dataset.value) === current);
        }

        // Minutes hors graduation (ex. 17) : aiguille seule.
        knob.classList.toggle('between', mode === 'minutes' && minute % 5 !== 0);

        dial.setAttribute('aria-valuemax', mode === 'hours' ? '23' : '59');
        dial.setAttribute('aria-valuenow', String(current));
        dial.setAttribute(
            'aria-valuetext',
            mode === 'hours' ? hour + ' heures' : minute + ' minutes'
        );

        // Durée (champ « Fin »).
        const from = minutesOf(after());
        const total = hour * 60 + minute;

        if (from === null) {
            durationLabel.textContent = '';
        } else if (total > from) {
            durationLabel.textContent = 'Durée : ' + formatDuration(total - from);
            durationLabel.classList.remove('warn');
        } else {
            durationLabel.textContent = 'Avant le début';
            durationLabel.classList.add('warn');
        }
    }

    function setMode(next) {
        mode = next;
        renderNumbers();
        render();
    }

    // Valeur pointée sur le cadran (angle + distance au centre).
    function valueAt(event) {
        const rect = dial.getBoundingClientRect();
        const dx = event.clientX - rect.left - rect.width / 2;
        const dy = event.clientY - rect.top - rect.height / 2;
        const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        const distance = Math.hypot(dx, dy);

        if (mode === 'hours') {
            const index = Math.round(angle / 30) % 12;
            const inner = distance < (CLOCK_OUTER + CLOCK_INNER) / 2;

            return inner
                ? (index === 0 ? 0 : index + 12)
                : (index === 0 ? 12 : index);
        }

        return (Math.round(angle / 30) * 5) % 60;
    }

    function pick(event) {
        const value = valueAt(event);

        if (mode === 'hours') {
            hour = value;
        } else {
            minute = value;
        }

        render();
    }

    function open() {
        if (isOpen() || trigger.disabled) {
            return;
        }

        const value = minutesOf(nativeValue.get.call(input));
        const from = minutesOf(after());
        const initial =
            value ?? (from !== null ? Math.min(from + 60, 23 * 60 + 55) : 9 * 60);

        hour = Math.floor(initial / 60);
        minute = initial % 60;

        panel.showPopover();
        setMode('hours');
        placeFieldPopover(panel, trigger);
        dial.focus({ preventScroll: true });
    }

    function close(focusTrigger = true) {
        if (isOpen()) {
            panel.hidePopover();
        }

        if (focusTrigger) {
            trigger.focus({ preventScroll: true });
        }
    }

    function commit() {
        const time = timeOf(hour * 60 + minute);
        const changed = nativeValue.get.call(input) !== time;

        input.value = time;
        close();

        if (changed) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    dial.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        dragging = true;
        dial.setPointerCapture(event.pointerId);
        dial.focus({ preventScroll: true });
        pick(event);
    });

    dial.addEventListener('pointermove', (event) => {
        if (dragging) {
            pick(event);
        }
    });

    dial.addEventListener('pointerup', (event) => {
        if (!dragging) {
            return;
        }

        dragging = false;
        pick(event);

        if (mode === 'hours') {
            setMode('minutes');
        } else {
            commit();
        }
    });

    dial.addEventListener('pointercancel', () => {
        dragging = false;
    });

    dial.addEventListener('keydown', (event) => {
        const delta = {
            ArrowUp: 1,
            ArrowRight: 1,
            ArrowDown: -1,
            ArrowLeft: -1,
            PageUp: 3,
            PageDown: -3
        }[event.key];

        if (delta) {
            if (mode === 'hours') {
                hour = (hour + delta + 24) % 24;
            } else {
                minute = (Math.round(minute / 5) * 5 + delta * 5 + 60) % 60;
            }

            render();
        } else if (event.key === 'Enter' || event.key === ' ') {
            if (mode === 'hours') {
                setMode('minutes');
            } else {
                commit();
            }
        } else {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
    });

    hourSeg.addEventListener('click', () => {
        setMode('hours');
        dial.focus({ preventScroll: true });
    });

    minuteSeg.addEventListener('click', () => {
        setMode('minutes');
        dial.focus({ preventScroll: true });
    });

    panel.querySelector('.clock-ok').addEventListener('click', commit);
    panel.querySelector('.clock-cancel').addEventListener('click', () => close());

    Object.defineProperty(input, 'value', {
        configurable: true,
        get() {
            return nativeValue.get.call(input);
        },
        set(value) {
            nativeValue.set.call(input, value);
            sync();
        }
    });

    input.focus = (options) => trigger.focus(options);

    input.form?.addEventListener('reset', () => setTimeout(sync));
    input.addEventListener('change', sync);

    trigger.addEventListener('pointerdown', () => {
        wasOpen = isOpen();
    });

    trigger.addEventListener('click', () => {
        if (wasOpen) {
            wasOpen = false;
            return;
        }

        open();
    });

    trigger.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            open();
        }
    });

    // Échap est géré par le navigateur (popover) : il ne
    // ferme que l'horloge, pas la fenêtre « Créer ».
    panel.addEventListener('toggle', (event) => {
        const opened = event.newState === 'open';

        trigger.setAttribute('aria-expanded', String(opened));
        wrapper.classList.toggle('open', opened);

        if (!opened) {
            dragging = false;

            if (panel.contains(document.activeElement)) {
                trigger.focus({ preventScroll: true });
            }
        }
    });

    window.addEventListener('resize', () => close(false));

    document.addEventListener(
        'scroll',
        () => {
            if (isOpen()) {
                placeFieldPopover(panel, trigger);
            }
        },
        true
    );

    input.closest('dialog')?.addEventListener('close', () => close(false));

    sync();
}

enhanceSelect(tacheRecurrence);
enhanceDateInput(tacheDate);
enhanceTimeInput(tacheStart);
enhanceTimeInput(tacheEnd, { after: () => tacheStart.value });
enhanceDateInput(tacheRecurrenceEnd, { min: () => tacheDate.value });

if (searchStartDate) {
    enhanceDateInput(searchStartDate, {
        clearable: true,
        placeholder: 'Pas de limite'
    });
}

if (searchEndDate) {
    // Le calendrier « Au » grise les jours avant la date « Du ».
    enhanceDateInput(searchEndDate, {
        min: () => searchStartDate?.value || '',
        clearable: true,
        placeholder: 'Pas de limite'
    });
}

if (searchAgenda) {
    enhanceSelect(searchAgenda);
}

enhanceSelect(importAgenda);
enhanceSelect(selectionAgenda);


updateRecurrenceEndVisibility();

init();
