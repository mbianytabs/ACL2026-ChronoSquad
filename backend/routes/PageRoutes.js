import { Router } from "express";



export const pageRouter = Router();

pageRouter.get("/test/auth", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.render("test-auth");
});

pageRouter.get("/", (req, res) => {
    res.render("login");
});

pageRouter.get("/register", (req, res) => {
    res.render("register");
});

pageRouter.get("/agendas", (req, res) => {
    res.render("agendas");
});
