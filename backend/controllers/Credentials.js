import createError from "http-errors";

export function readCredentials(body, registration = false) {
    if (typeof body?.username !== "string" || typeof body?.password !== "string") {
        throw createError(400, "Le nom d'utilisateur et le mot de passe doivent être des chaînes de caractères.");
    }
    const username = body.username.trim();
    const password = body.password;
    if (!username || username.length > 50) {
        throw createError(400, "Le nom d'utilisateur doit contenir entre 1 et 50 caractères.");
    }
    if (!password || password.length > 128) {
        throw createError(400, "Le mot de passe doit contenir entre 1 et 128 caractères.");
    }
    if (registration && (password.length < 8 || !password.trim())) {
        throw createError(400, "Le mot de passe doit contenir au moins 8 caractères et ne pas être composé uniquement d'espaces.");
    }
    return { username, password };
}
