// api.js: the only file that talks to the server.
// Every page script calls api.xxx() and never uses fetch directly.

// Error thrown by every api call, carrying the HTTP status (0 = network failure)
class ApiError extends Error{
    constructor(status, message){
        super(message);
        this.status = status;
    }
}

// Sends a JSON request to the server and returns the parsed response body.
// Throws an ApiError when the server is unreachable or answers with an error status.
async function request(method, url, body){
    const options = {method, headers:{}, credentials: 'same-origin'};
    if (body !== undefined){
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    let response;
    try{
        response = await fetch(url, options);
    } catch (e) {
        throw new ApiError(0,'Server injoignable.');
    }

    // 204 has no body, so read text first and parse only if there is something
    const text = await response.text();
    let data = null;
    if (text){
        try {
            data = JSON.parse(text)
        } catch (e) {
            data = null;
        }
    }

    if(!response.ok) {
        const  message = data && (data.error || data.message);
        throw new ApiError(response.status,message || '');
    }
    return data;
}

/**
 * API Routes
 */

const api = {
    // create a new account
    register: (username, password) => request('POST','/api/users',{username,password}),

    // Return a logged-in user
    getMe: () => request('GET','/api/users/me'),

    // Open a session for the given credentials
    login: (username, password) => request('POST','/api/auth/login',{username,password}),

    // Close the current session
    logout: () => request('POST','/api/auth/logout'),

    // Lists the agendas of the logged-in user
    getAgendas:() => request('GET','/api/agendas'),

    // Returns one agenda by its id
    getAgenda: (id) => request('GET', '/api/agendas/' + encodeURIComponent(id)),

    // Creates an agenda for the logged-in user
    createAgenda: (name, color) => request('POST', '/api/agendas', { name, color }),

    // Lists the taches (evenements) of every agenda of the logged-in user
    getEvenements: () => request('GET', '/api/evenements'),

    // Creates a tache in one agenda: { title, start, end, location, description }
    createEvenement: (agendaId, data) =>
        request('POST', '/api/agendas/' + encodeURIComponent(agendaId) + '/evenements', data),
};
