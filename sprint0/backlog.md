# Sprint 0: Backlog

**Équipe :** ChronoSquad
**Période :** semaine 40 → semaine 42 (du 30/09 au 14/10)
**Objectif du sprint :** mettre en place le socle technique (serveur, persistance) et permettre à un utilisateur de s'inscrire, se connecter, se déconnecter et créer ses agendas.

---

## 1. Product backlog (vue d'ensemble)

| ID | User story | Priorité | Sprint prévu |
|----|-----------|----------|--------------|
| US01 | En tant que visiteur, je veux créer un compte pour pouvoir utiliser l'application | Haute | S0 |
| US02 | En tant qu'utilisateur, je veux me connecter pour accéder à mes agendas | Haute | S0 |
| US03 | En tant qu'utilisateur, je veux me déconnecter pour sécuriser ma session | Haute | S0 |
| US04 | En tant qu'utilisateur, je veux créer un agenda | Haute | S0 |
| US05 | En tant qu'utilisateur, je veux voir la liste de mes agendas | Haute | S0 |
| US06 | En tant qu'utilisateur, je veux ajouter un rendez-vous dans un agenda | Haute | S1 |
| US07 | En tant qu'utilisateur, je veux modifier un rendez-vous | Haute | S1 |
| US08 | En tant qu'utilisateur, je veux supprimer un rendez-vous | Haute | S1 |
| US09 | En tant qu'utilisateur, je veux afficher plusieurs agendas simultanément | Haute | S1 |
| US10 | En tant qu'utilisateur, je veux créer des rendez-vous récurrents | Moyenne | S2 |
| US11 | En tant qu'utilisateur, je veux rechercher un rendez-vous par critères (titre, date, lieu, agenda) | Moyenne | S2 |
| US12 | En tant qu'utilisateur, je veux partager un agenda avec un autre utilisateur | Moyenne | S3 |
| US13 | En tant qu'utilisateur, je veux annuler un partage | Moyenne | S3 |
| US14 | En tant qu'utilisateur, je veux importer / exporter un agenda (JSON / .ics) | Moyenne | S3 |
| US15 | En tant qu'utilisateur, je veux renommer / supprimer un agenda | Basse | S1 |

---

## 2. Sprint backlog: Sprint 0

Estimation en points de complexité (1, 2, 3, 5, 8).

### T00: Socle technique (tâche technique) — 5 pts
**Critères d'acceptation**
- `npm install && npm start` lance le serveur sans erreur
- Le serveur écoute sur le port 3000
- `http://localhost:3000` affiche la page d'accueil
- Accessible depuis une autre machine du réseau local (écoute sur `0.0.0.0`)
- Routes API séparées sous le préfixe `/api`
- Les données sont sauvegardées dans des fichiers JSON (`data/`) et survivent à un redémarrage
- README à la racine expliquant l'installation et le lancement

**Tâches**
- [ ] Initialiser le projet Node.js + Express
- [ ] Servir les fichiers statiques (`public/`)
- [ ] Implémenter le module de persistance `JsonStore` (lecture/écriture atomique)
- [ ] Rédiger le README

### US01: Inscription — 3 pts
**Critères d'acceptation**
- Formulaire avec nom d'utilisateur + mot de passe
- Refus si le nom d'utilisateur existe déjà (message d'erreur)
- Refus si un champ est vide
- Le mot de passe est stocké haché (bcryptjs), jamais en clair

**Tâches**
- [ ] Route `POST /api/auth/register`
- [ ] `UserService.register()`
- [ ] Page / formulaire d'inscription côté client

### US02: Connexion — 3 pts
**Critères d'acceptation**
- Connexion avec identifiants valides → redirection vers la page des agendas
- Identifiants invalides → message d'erreur, pas de session créée
- La session persiste au rechargement de la page
- Deux utilisateurs différents peuvent être connectés en même temps depuis deux machines

**Tâches**
- [ ] Route `POST /api/auth/login` + `GET /api/auth/me`
- [ ] Gestion de session (`express-session`)
- [ ] Middleware `requireAuth` (renvoie 401 si non connecté)
- [ ] Formulaire de connexion côté client

### US03: Déconnexion — 1 pt
**Critères d'acceptation**
- Bouton « Se déconnecter » visible une fois connecté
- Après déconnexion, les routes protégées renvoient 401 et l'utilisateur revient à la page de connexion

**Tâches**
- [ ] Route `POST /api/auth/logout`
- [ ] Bouton côté client

### US04: Créer un agenda — 3 pts
**Critères d'acceptation**
- Un utilisateur connecté peut créer un agenda en donnant un nom (et une couleur optionnelle)
- Nom vide refusé
- L'agenda appartient à l'utilisateur qui l'a créé
- L'agenda est toujours présent après redémarrage du serveur

**Tâches**
- [ ] Route `POST /api/agendas`
- [ ] `AgendaService.create()`
- [ ] Formulaire de création côté client

### US05: Lister mes agendas — 2 pts
**Critères d'acceptation**
- Après connexion, l'utilisateur voit la liste de ses agendas (et uniquement les siens)
- La liste se met à jour après création d'un agenda

**Tâches**
- [ ] Route `GET /api/agendas`
- [ ] Affichage de la liste côté client

---

**Total Sprint 0 : 17 points**

## 3. Répartition

| Membre | Rôle / éléments |
|--------|-----------------|
| Manuel | Scrum Master — T00 (serveur Express + `JsonStore`), README, intégration des branches, tag `v1` |
| Giovana | US01 / US02 / US03: back-end authentification (routes, sessions, `requireAuth`) |
| Farid | US01 / US02 / US03: front-end authentification (pages inscription / connexion, bouton déconnexion) |
| Navec | US04 / US05: back-end agendas (`AgendaService`, routes `/api/agendas`) |
| Membre 5 | US04 / US05: front-end agendas (liste + formulaire de création), tests manuels multi-machines |
| Toute l'équipe | Revue et rétrospective en fin de sprint |

## 4. Définition de « terminé » (Definition of Done)
- Le code est sur la branche principale et fonctionne avec `npm install && npm start`
- Les critères d'acceptation ont été testés manuellement par un autre membre que le développeur
- Aucune erreur dans la console serveur ni navigateur
- La documentation (README, diagrammes) est à jour
