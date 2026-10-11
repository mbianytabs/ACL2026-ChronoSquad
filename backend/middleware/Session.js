import session from "express-session";
import { randomBytes } from "node:crypto";

export const sessionCookieName = "chronosquad.sid";
export const sessionCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
};

// Pour le sprint local : sessions en mémoire, comptes persistés dans SQLite.
// Un redémarrage demande donc de se reconnecter, sans supprimer les comptes.
export const sessionMiddleware = session({
    name: sessionCookieName,
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: { ...sessionCookieOptions, maxAge: 8 * 60 * 60 * 1000 }
});

// Les formulaires de test et le front utilisent la même origine que l'API.
export function requireSameOrigin(req, res, next) {
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
        return res.status(403).json({ error: "Origine de la requête non autorisée." });
    }
    next();
}
