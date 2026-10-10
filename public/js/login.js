// login.js: logic of index.html

const form = document.getElementById('login-form');
const errorBox = document.getElementById('error');
const submitBtn = form.querySelector('button[type="submit"]');

/**
 * Shows an error message above the login form (empty fields, wrong identifiers, server down)
 * @param {string} message the message to show
 */
function showError(message){
    errorBox.textContent = message;
    errorBox.hidden = false;
}

// Already logged in? Go straight to the home page.
api.getMe()
    .then(() => { window.location.href = 'templates/agendas.html'; })
    .catch(() => { /* not logged in: stay here */ });

form.addEventListener('input', () => { errorBox.hidden = true; });

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value;


    if (!username || !password) {
        showError("Saisissez votre nom d'utilisateur et votre mot de passe.");
        return;
    }

    submitBtn.disabled = true;
    try {
        await api.login(username, password);
        window.location.href = 'templates/agendas.html';
    } catch (err) {
        if (err.status === 401) showError('Identifiants invalides.');
        else if (err.status === 0) showError('Serveur injoignable. Réessayez.');
        else showError('Connexion impossible. Réessayez.');
    } finally {
        submitBtn.disabled = false;
    }
});