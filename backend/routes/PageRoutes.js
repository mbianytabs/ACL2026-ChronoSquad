import { Router } from "express";



export const pageRouter = Router();

// Express génère le HTML depuis les modèles du dossier views/.
pageRouter.get("/", (req, res) => {
    res.render("login");
});

pageRouter.get("/register", (req, res) => {
    res.render("register");
});

pageRouter.get("/agendas", (req, res) => {
    res.render("agendas");
});
