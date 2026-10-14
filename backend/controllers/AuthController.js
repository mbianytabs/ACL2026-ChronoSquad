import createError from "http-errors";
import { UserRepository } from "../repositories/UserRepository.js";
import { readCredentials } from "./Credentials.js";
import { sessionCookieName } from "../middleware/Session.js";

export class AuthController {
    static async login(req, res, next) {
        const { username, password } = readCredentials(req.body);
        const users = new UserRepository(req.app.locals.database);
        const user = await users.findByUsername(username);
        if (!user || !await user.verifyPassword(password)) {
            throw createError(401, "Identifiants invalides.");
        }
        req.session.regenerate(function (error) {
            if (error) {
                return next(error);
            }
            req.session.userId = user.id;
            res.set("Cache-Control", "no-store");
            res.json(user);
        });
    }

    static logout(req, res, next) {
        req.session.destroy(function (error) {
            if (error) {
                return next(error);
            }
            res.clearCookie(sessionCookieName, { path: "/" });
            res.set("Cache-Control", "no-store");
            res.status(204).end();
        });
    }
}
