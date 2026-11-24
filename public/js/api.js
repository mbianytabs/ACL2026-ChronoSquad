class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

async function request(method, url, body) {
    const options = {
        method,
        headers: {},
        credentials: 'same-origin'
    };

    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    let response;

    try {
        response = await fetch(url, options);
    } catch (e) {
        throw new ApiError(0, 'Server injoignable.');
    }

    const text = await response.text();

    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = null;
        }
    }

    if (!response.ok) {
        const message =
            data && (data.error || data.message);

        throw new ApiError(
            response.status,
            message || ''
        );
    }

    return data;
}


const api = {

    register: (username, password) =>
        request(
            'POST',
            '/api/users',
            {
                username,
                password
            }
        ),

    getMe: () =>
        request(
            'GET',
            '/api/users/me'
        ),

    login: (username, password) =>
        request(
            'POST',
            '/api/auth/login',
            {
                username,
                password
            }
        ),

    logout: () =>
        request(
            'POST',
            '/api/auth/logout'
        ),

    getAgendas: () =>
        request(
            'GET',
            '/api/agendas'
        ),

    getAgenda: (id) =>
        request(
            'GET',
            '/api/agendas/'
            + encodeURIComponent(id)
        ),

    createAgenda: (name, color) =>
        request(
            'POST',
            '/api/agendas',
            {
                name,
                color
            }
        ),

    updateAgenda: (id, data) =>
        request(
            'PUT',
            '/api/agendas/'
            + encodeURIComponent(id),
            data
        ),

    deleteAgenda: (id) =>
        request(
            'DELETE',
            '/api/agendas/'
            + encodeURIComponent(id)
        ),

    getPartages: (agendaId) =>
        request(
            'GET',
            '/api/agendas/'
            + encodeURIComponent(agendaId)
            + '/partages'
        ),

    addPartage: (agendaId, username) =>
        request(
            'POST',
            '/api/agendas/'
            + encodeURIComponent(agendaId)
            + '/partages',
            {
                username
            }
        ),

    removePartage: (agendaId, username) =>
        request(
            'DELETE',
            '/api/agendas/'
            + encodeURIComponent(agendaId)
            + '/partages/'
            + encodeURIComponent(username)
        ),

    getEvenements: () =>
        request(
            'GET',
            '/api/evenements'
        ),

    createEvenement: (agendaId, data) =>
        request(
            'POST',
            '/api/agendas/'
            + encodeURIComponent(agendaId)
            + '/evenements',
            data
        ),

    updateEvenement: (id, data) =>
        request(
            'PUT',
            '/api/evenements/'
            + encodeURIComponent(id),
            data
        ),

    // Occurrences d'une série sur la période [start, end[ (dates ISO).
    getOccurrences: (id, start, end) =>
        request(
            'GET',
            '/api/evenements/'
            + encodeURIComponent(id)
            + '/occurrences'
            + (start && end
                ? '?' + new URLSearchParams({ start, end })
                : '')
        ),

    // Modifie une seule occurrence (identifiée par son début d'origine).
    updateOccurrence: (id, occurrenceStart, data) =>
        request(
            'PUT',
            '/api/evenements/'
            + encodeURIComponent(id)
            + '/occurrences/'
            + encodeURIComponent(occurrenceStart),
            data
        ),

    // Supprime une seule occurrence de la série.
    deleteOccurrence: (id, occurrenceStart) =>
        request(
            'DELETE',
            '/api/evenements/'
            + encodeURIComponent(id)
            + '/occurrences/'
            + encodeURIComponent(occurrenceStart)
        ),

    deleteEvenement: (id) =>
        request(
            'DELETE',
            '/api/evenements/'
            + encodeURIComponent(id)
        ),

    previewImport: (contenu) => request('POST', '/api/agendas/import/preview', { contenu }),

    exportAgenda: (id) => requestFile('/api/agendas/' + encodeURIComponent(id) + '/export'),

    exportAgendas: () => requestFile('/api/agendas/export'),

    // selection : indices (dans `evenements` de l'aperçu) des événements à importer.
    importAgenda: (name, color, contenu, selection) =>
        request(
            'POST',
            '/api/agendas/import',
            {
                name,
                color,
                contenu,
                selection
            }
        ),

    // Import d'un .ics dans un agenda déjà existant.
    importEvenements: (agendaId, contenu, selection) =>
        request(
            'POST',
            '/api/agendas/'
            + encodeURIComponent(agendaId)
            + '/import',
            {
                contenu,
                selection
            }
        ),

    // Déplace plusieurs événements (séries entières) vers un autre agenda.
    moveEvenements: (ids, agendaId) =>
        request(
            'POST',
            '/api/evenements/deplacer',
            {
                ids,
                agendaId
            }
        ),

    // Duplique plusieurs événements (séries entières) dans un autre agenda.
    copyEvenements: (ids, agendaId) =>
        request(
            'POST',
            '/api/evenements/dupliquer',
            {
                ids,
                agendaId
            }
        )
};

async function requestFile(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
        const data = await response.json();
        throw new ApiError(response.status, data.error || 'Export impossible.');
    }
    return response.blob();
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
