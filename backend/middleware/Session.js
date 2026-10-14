import session from "express-session";
import { randomBytes } from "node:crypto";

export const sessionCookieName = "chronosquad.sid";
export const sessionMiddleware = session({
    name: sessionCookieName,
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 8 * 60 * 60 * 1000
    }
});

export function requireSameOrigin(req, res, next) {
    const origin = req.get("origin");
    const serverOrigin = req.protocol + "://" + req.get("host");
    if (origin && origin !== serverOrigin) {
        return res.status(403).json({ error: "Origine de la requête non autorisée." });
    }
    next();
}
