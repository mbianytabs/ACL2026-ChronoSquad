export function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    const status = error.status || 500;

    if (status >= 500) console.error(error);

    let message;
    if (status >= 500) {
        message = "Erreur interne du serveur.";
    } else if (error.type === "entity.parse.failed") {
        message = "Le corps JSON de la requête est invalide.";
    } else if (status === 413) {
        message = "Le corps de la requête est trop volumineux.";
    } else {
        message = error.expose ? error.message : "Requête invalide.";
    }

    const pathname = req.originalUrl.split("?")[0].toLowerCase();
    const isApi = pathname === "/api" || pathname.startsWith("/api/");

    if (isApi) {
        return res.status(status).json({ error: message });
    }

    res.status(status).render("error", { status, message });
}
