import createError from "http-errors";

export function readCredentials(body, { registration = false } = {}) {
    if (typeof body?.username !== "string" || typeof body?.password !== "string") {
        throw createError(400, "Le nom d'utilisateur et le mot de passe doivent être des chaînes de caractères.");
    }
    const username = body.username.trim();
    const password = body.password; // Ne jamais supprimer les espaces du mot de passe.
    if (!username || username.length > 50 || !password || password.length > 128) {
        throw createError(400, "Nom d'utilisateur requis (50 caractères maximum), mot de passe requis (128 caractères maximum).");
    }
    if (registration && (password.length < 8 || !password.trim())) {
        throw createError(400, "Le mot de passe doit contenir au moins 8 caractères et ne pas être composé uniquement d'espaces.");
    }
    return { username, password };
}
