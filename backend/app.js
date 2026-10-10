import express from "express";
import morgan from "morgan";
import createError from "http-errors";
import { fileURLToPath } from "node:url";
import { apiRouter } from "./routes/Routes.js";
import { pageRouter } from "./routes/PageRoutes.js";
import { errorHandler } from "./middleware/ErrorHandler.js";

export const app = express();
const publicPath = fileURLToPath(new URL("../public/", import.meta.url));
const viewsPath = fileURLToPath(new URL("./views/", import.meta.url));

app.disable("x-powered-by");
app.set("views", viewsPath);
app.set("view engine", "ejs");

app.use(morgan("dev"));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// L'API passe avant les fichiers publics : /api répond toujours en JSON.
app.use("/api", apiRouter);
app.use("/", pageRouter);

// Seul public/ est accessible ; backend/ et data/ restent privés.
// La route GET / est déclarée explicitement dans PageRoutes.js.
app.use(express.static(publicPath, { index: false }));

app.use((req, res, next) => next(createError(404)));
app.use(errorHandler);
