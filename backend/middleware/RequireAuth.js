import createError from "http-errors";
import { UserRepository } from "../repositories/UserRepository.js";

export async function requireAuth(req, res, next) {
    res.set("Cache-Control", "no-store");
    if (!req.session?.userId) {
        throw createError(401, "Connexion requise.");
    }
    const users = new UserRepository(req.app.locals.database);
    const user = await users.findById(req.session.userId);
    if (!user) {
        throw createError(401, "Connexion requise.");
    }
    req.user = user;
    next();
}
