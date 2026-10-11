import { Router } from "express";



export const pageRouter = Router();

// Page temporaire de vérification du back, indépendante du front de l'équipe.
pageRouter.get("/test/auth", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.render("test-auth");
});

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
