import createError from "http-errors";
import { UserRepository } from "../repositories/UserRepository.js";
import { readCredentials } from "./Credentials.js";
import { sessionCookieName, sessionCookieOptions } from "../middleware/Session.js";

export class AuthController {
    static async login(req, res) {
        const { username, password } = readCredentials(req.body);
        const users = new UserRepository(req.app.locals.database);
        const user = await users.findByUsername(username);
        if (!user || !await user.verifyPassword(password)) {
            throw createError(401, "Identifiants invalides.");
        }
        // Renouveler l'identifiant empêche la réutilisation d'une ancienne session.
        await new Promise((resolve, reject) => {
            req.session.regenerate(error => error ? reject(error) : resolve());
        });
        req.session.userId = user.id;
        // express-session sauvegarde la session à la fin de la réponse HTTP.
        res.set("Cache-Control", "no-store");
        res.json(user);
    }

    static async logout(req, res) {
        await new Promise((resolve, reject) => {
            req.session.destroy(error => error ? reject(error) : resolve());
        });
        res.clearCookie(sessionCookieName, sessionCookieOptions);
        res.set("Cache-Control", "no-store");
        res.status(204).end();
    }
}
