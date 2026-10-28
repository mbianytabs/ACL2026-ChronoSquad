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
const searchDate = document.getElementById('search-date');
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
let pickedAgendaIds = new Set();
let activeCard = null;
let shownEvent = null;
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
        date: searchDate?.value || '',
        agendaId: searchAgenda?.value || '',
        location: normalizeSearchText(searchLocation?.value),
    };
}

function hasSearchCriteria(criteria) {
    return Boolean(
        criteria.query
        || criteria.title
        || criteria.date
        || criteria.agendaId
        || criteria.location
    );
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

    if (
        criteria.date
        && toDateInput(new Date(ev.start)) !== criteria.date
    ) {
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

function resetSearch() {
    if (searchInput) searchInput.value = '';
    if (searchTitle) searchTitle.value = '';
    if (searchDate) searchDate.value = '';
    if (searchAgenda) searchAgenda.value = '';
    if (searchLocation) searchLocation.value = '';

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

    if (!isOwnAgenda(agenda)) {
        return item;
    }

    const edit =
        document.createElement('button');

    edit.type =
        'button';

    edit.className =
        'agenda-edit';

    edit.setAttribute(
        'aria-label',
        'Modifier l\'agenda '
        + agenda.name
    );

    edit.title =
        'Modifier';

    edit.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">'
        + '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'
        + '<path d="M13.5 6.5l4 4"/>'
        + '</svg>';

    edit.addEventListener(
        'click',
        () =>
            openEditAgenda(
                agenda
            )
    );

    const share =
        document.createElement('button');

    share.type =
        'button';

    share.className =
        'agenda-edit agenda-share';

    share.setAttribute(
        'aria-label',
        'Partager l\'agenda '
        + agenda.name
    );

    share.setAttribute(
        'aria-haspopup',
        'dialog'
    );

    share.title =
        'Partager';

    share.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">'
        + '<circle cx="10" cy="8" r="3.5"/>'
        + '<path d="M3.5 20c0-3.6 2.9-6 6.5-6 1.5 0 2.9.4 4 1.2"/>'
        + '<path d="M18 14v6M15 17h6"/>'
        + '</svg>';

    share.addEventListener(
        'click',
        () =>
            openShare(
                agenda,
                share
            )
    );

    item.append(
        edit,
        share
    );

    return item;
}

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

async function refreshCalendarEvenements() {
    const expanded = [];

    for (const ev of evenements) {
        if (!ev.recurrenceFrequency) {
            expanded.push(ev);
            continue;
        }

        try {
            const result =
                await api.getOccurrences(
                    ev.id
                );

            const occurrences =
                Array.isArray(result)
                    ? result
                    : (
                        result
                        &&
                        Array.isArray(
                            result.occurrences
                        )
                            ? result.occurrences
                            : []
                    );

            if (
                occurrences.length === 0
            ) {
                expanded.push(ev);
                continue;
            }

            occurrences.forEach(
                (
                    occurrence,
                    index
                ) => {
                    expanded.push({
                        ...ev,

                        start:
                            occurrence.start,

                        end:
                            occurrence.end,

                        occurrenceIndex:
                            index,

                        recurringEventId:
                            ev.id
                    });
                }
            );

        } catch (err) {
            if (
                err.status === 401
            ) {
                goToLogin();
                return;
            }

            expanded.push(ev);
        }
    }

    calendarEvenements =
        expanded;
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
        () =>
            openEvent(
                ev,
                block
            )
    );

    return block;
}

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

async function deleteShownEvent() {
    if (
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
        await api.deleteEvenement(
            eventId
        );

        await removeEvenement(
            eventId
        );

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

    renderWeek();

    renderMini();
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

    showWeekOf(
        today
    );

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
    deleteShownEvent
);

document
    .getElementById(
        'event-edit'
    )
    .addEventListener(
        'click',
        () => {
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
                    originalEvent
                );
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

    const preset =
        selectedAgendaIds.size
            ? [
                ...selectedAgendaIds
            ]
            : agendas
                .slice(
                    0,
                    1
                )
                .map(
                    (a) =>
                        a.id
                );

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
function openEditTache(ev) {
    editing = {
        kind:
            'tache',
        item:
            ev
    };

    createForm.reset();

    dialogError.hidden =
        true;

    const start =
        new Date(
            ev.start
        );

    const end =
        new Date(
            ev.end
        );

    tacheTitle.value =
        ev.title;

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
        ev.recurrenceFrequency
        ||
        'none';

    tacheRecurrenceEnd.value =
        ev.recurrenceEndDate
        ||
        '';

    updateRecurrenceEndVisibility();

    tacheLocation.value =
        ev.location || '';

    tacheDescription.value =
        ev.description || '';

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

    dialogError.hidden =
        true;

    kindSwitch.hidden =
        editing !== null;

    sheetTitle.classList.toggle(
        'visually-hidden',
        editing === null
    );

    deleteBtn.hidden =
        editing === null;

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
                        ? updated
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

    if (
        recurrenceFrequency
        &&
        !recurrenceEndDate
    ) {
        showDialogError(
            'Choisissez une date de fin pour la récurrence.'
        );

        tacheRecurrenceEnd.focus();

        return false;
    }

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

    if (editing) {
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

        } else {
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
        resetSearch
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
    searchDate,
    searchAgenda,
    searchLocation
]
    .filter(Boolean)
    .forEach(
        (field) => {

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


updateRecurrenceEndVisibility();

init();