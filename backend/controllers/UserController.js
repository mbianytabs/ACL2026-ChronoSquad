import argon2 from "argon2";
import createError from "http-errors";
import { User } from "../models/User.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { readCredentials } from "./Credentials.js";

export class UserController {
    static async register(req, res) {
        const { username, password } = readCredentials(req.body, true);
        const users = new UserRepository(req.app.locals.database);
        if (await users.findByUsername(username)) {
            throw createError(409, "Ce nom d'utilisateur est déjà pris.");
        }
        const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
        let user = new User(null, username, passwordHash);
        try {
            user = await users.create(user);
        } catch (error) {
            if (await users.findByUsername(username)) {
                throw createError(409, "Ce nom d'utilisateur est déjà pris.");
            }
            throw error;
        }
        res.set("Cache-Control", "no-store");
        res.status(201).json(user);
    }

    static getCurrentUser(req, res) {
        res.json(req.user);
    }
}
