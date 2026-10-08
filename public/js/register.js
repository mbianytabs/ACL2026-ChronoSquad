// Page "Créer un compte".
const form = document.getElementById("register-form");
const errorBox = document.getElementById("error");
const submitBtn = form.querySelector("button[type='submit']");
 
function showError(text) {
    errorBox.textContent = text; 
    errorBox.hidden = false;
}
 
function hideError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
}
 
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError();
 
    const username = form.username.value.trim();
    const password = form.password.value;
    const confirm = form.confirm.value;
 
    if (!username || !password) {
        return showError("Le nom d'utilisateur et le mot de passe sont obligatoires.");
    }
    if (password !== confirm) {
        return showError("Les deux mots de passe sont différents.");
    }
 
    submitBtn.disabled = true;
    try {
        await api.register(username, password); 
        window.location.href = "../index.html"; 
    } catch (err) {
        
        if (err.status === 409) {
            showError("Ce nom d'utilisateur est déjà pris.");
        } else if (err.status === 400) {
            showError("Un champ est vide ou invalide.");
        } else {
            showError("Impossible de créer le compte. Réessayez dans un instant.");
        }
    } finally {
        submitBtn.disabled = false;
    }
});