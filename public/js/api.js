// api.js: the only file that talks to the server.
// Every page script calls api.xxx() and never uses fetch directly.

// true  = fake data kept in the browser (no back-end needed)
// false = real calls to the Express server
const USE_MOCK = true;

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

const realApi ={
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
};


// ---------- Mock: same functions, same status codes, data in the browser ----------

// Reads a JSON array from localStorage (empty array if the key is missing)
function mockRead(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
}

// Saves a value to localStorage as JSON
function mockWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Returns the user of the current mock session, or throws 401 if nobody is logged in
function mockCurrentUser() {
    const id = sessionStorage.getItem('mock_session');
    const user = mockRead('mock_users').find((u) => u.id === id);
    if (!user) throw new ApiError(401, 'Non connecté.');
    return user;
}

// Strips the password so only public user fields are returned
function mockPublic(user) {
    return { id: user.id, username: user.username, createdAt: user.createdAt };
}

const mockApi = {
    // Creates a user; 400 if a field is empty, 409 if the username is taken
    async register(username, password) {
        if (!username || !password) throw new ApiError(400, 'Champ vide.');
        const users = mockRead('mock_users');
        if (users.some((u) => u.username === username)) throw new ApiError(409, 'Nom déjà pris.');
        const user = { id: crypto.randomUUID(), username, password, createdAt: new Date().toISOString() };
        users.push(user);
        mockWrite('mock_users', users);
        return mockPublic(user);
    },

    // Returns the logged-in user; 401 if no session
    async getMe() {
        return mockPublic(mockCurrentUser());
    },

    // Checks the credentials and stores the user id in the session; 401 if invalid
    async login(username, password) {
        const user = mockRead('mock_users').find((u) => u.username === username && u.password === password);
        if (!user) throw new ApiError(401, 'Identifiants invalides.');
        sessionStorage.setItem('mock_session', user.id);
        return mockPublic(user);
    },

    // Clears the mock session
    async logout() {
        sessionStorage.removeItem('mock_session');
        return null;
    },

    // Lists the agendas owned by the logged-in user
    async getAgendas() {
        const user = mockCurrentUser();
        return mockRead('mock_agendas').filter((a) => a.ownerId === user.id);
    },

    // Returns one agenda owned by the logged-in user; 404 if not found
    async getAgenda(id) {
        const user = mockCurrentUser();
        const agenda = mockRead('mock_agendas').find((a) => a.id === id && a.ownerId === user.id);
        if (!agenda) throw new ApiError(404, 'Agenda introuvable.');
        return agenda;
    },

    // Creates an agenda for the logged-in user (default color blue); 400 if the name is empty
    async createAgenda(name, color) {
        const user = mockCurrentUser();
        if (!name) throw new ApiError(400, 'Nom vide.');
        const agenda = {
            id: crypto.randomUUID(),
            name,
            color: color || '#3b82f6',
            ownerId: user.id,
            createdAt: new Date().toISOString(),
        };
        const agendas = mockRead('mock_agendas');
        agendas.push(agenda);
        mockWrite('mock_agendas', agendas);
        return agenda;
    },
};

const api = USE_MOCK ? mockApi : realApi;