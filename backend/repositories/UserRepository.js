import { User } from "../models/User.js";
import { getDatabase } from "../storage/SQLiteDatabase.js";

function toUser(row) {
    return row ? new User(row.id, row.username, row.password_hash, row.created_at) : null;
}

export class UserRepository {

    constructor(db = getDatabase()) { this.db = db; }

    async findById(id) {
        return toUser(this.db.get("SELECT * FROM user WHERE id = ?", [id]));
    }

    async findByUsername(username) {
        return toUser(this.db.get("SELECT * FROM user WHERE username = ?", [username]));
    }

    async create(user) {
        // toJSON() masque le hash ; toRecord() le conserve pour SQLite.
        const record = user.toRecord();
        this.db.run("INSERT INTO user (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
            [record.id, record.username, record.passwordHash, new Date(record.createdAt).toISOString()]);
        return user;
    }
}
