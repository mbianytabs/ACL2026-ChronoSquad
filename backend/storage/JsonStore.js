/*
 * JsonStore
 *
 * Cette classe permet de lire et de modifier les fichiers JSON
 * utilisés pour stocker les données de l'application.
 *
 * Elle peut notamment gérer :
 * - users.json
 * - agendas.json
 * - rendezvous.json
 * - evenements.json
 * - et tout autre fichier JSON de données.
 *
 * Les repositories utilisent JsonStore pour effectuer les opérations
 * de lecture, d'ajout, de modification et de suppression des données.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDirectory = path.join(__dirname, "..", "..", "data");

export class JsonStore {

    constructor(fileName) {
        this.filePath = path.join(dataDirectory, fileName);
    }

    async load() {
        const content = await fs.readFile(this.filePath, "utf-8");

        return JSON.parse(content);
    }

    async save(data) {
        const content = JSON.stringify(data, null, 4);

        await fs.writeFile(this.filePath, content, "utf-8");
    }

    async getAll() {
        return await this.load();
    }

    async findById(id) {
        const data = await this.load();

        return data.find(element => element.id === id);
    }

    async insert(data) {
        const elements = await this.load();

        elements.push(data);

        await this.save(elements);

        return data;
    }

    async update(id, data) {
        const elements = await this.load();

        const index = elements.findIndex(element => element.id === id);

        if (index === -1) {
            return null;
        }

        elements[index] = {
            ...elements[index],
            ...data,
            id
        };

        await this.save(elements);

        return elements[index];
    }

    async delete(id) {
        const elements = await this.load();

        const index = elements.findIndex(element => element.id === id);

        if (index === -1) {
            return false;
        }

        elements.splice(index, 1);

        await this.save(elements);

        return true;
    }
}