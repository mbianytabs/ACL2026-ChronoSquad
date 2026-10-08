// login.js: logic of index.html

const form = document.getElementById('login-form');
const errorBox = document.getElementById('error');
const submitBtn = form.querySelector('button[type="submit"]');

/**
 * Function that shows an error message if wrong identifiers
 * @param message the message to be shown
 */
function showError(message){
    errorBox.textContent = message;
    errorBox.hidden = false;
}

//Already logged in? Go straight to the home page
api.getMe().

