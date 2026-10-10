import { Router } from "express";
import { fileURLToPath } from "node:url";

export const pageRouter = Router();
const indexPath = fileURLToPath(new URL("../../public/index.html", import.meta.url));

// La page actuelle reste utilisable sans modifier le travail du front.
pageRouter.get("/", (req, res, next) => {
    res.sendFile(indexPath, (error) => {
        if (error) next(error);
    });
});

// Les futures pages EJS seront déclarées ici avec res.render(...).
