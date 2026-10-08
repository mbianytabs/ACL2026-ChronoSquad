import { JsonStore } from "../storage/JsonStore.js";

export class UserRepository {

    constructor() {
        this.store = new JsonStore("users.json");
    }

    async findById(id) {
        return await this.store.findById(id);
    }

    async findByUsername(username) {
        const users = await this.store.getAll();

        return users.find(user => user.username === username);
    }

    async create(user) {
        return await this.store.insert(user);
    }
}