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

    searchEvenements: ({ q, agendaIds, startDate, endDate } = {}) => {
        const params = new URLSearchParams();

        if (q) params.set('q', q);
        if (agendaIds && agendaIds.length > 0) {
            params.set('agendaIds', agendaIds.join(','));
        }
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const query = params.toString();

        return request(
            'GET',
            '/api/evenements/search'
            + (query ? '?' + query : '')
        );
    },

    getOccurrences: (id) =>
        request(
            'GET',
            '/api/evenements/'
            + encodeURIComponent(id)
            + '/occurrences'
        ),

    deleteEvenement: (id) =>
        request(
            'DELETE',
            '/api/evenements/'
            + encodeURIComponent(id)
        )
};