# Sprint 0: Conception

## 1. Architecture générale

Un serveur unique Node.js / Express qui :
- sert les pages Web statiques (`public/`) ;
- expose une API REST JSON sous le préfixe `/api` ;
- persiste les données dans des fichiers JSON (`data/`).

```mermaid
flowchart LR
    subgraph Clients["Navigateurs (réseau local)"]
        C1[Client 1]
        C2[Client 2]
    end
    subgraph Serveur["Serveur Node.js — port 3000"]
        S[Fichiers statiques<br/>public/]
        A[API REST<br/>/api/*]
        MW[Middleware<br/>session + requireAuth]
        SV[Services<br/>UserService / AgendaService]
        ST[JsonStore]
    end
    D[(data/*.json)]

    C1 -- HTTP --> S
    C2 -- HTTP --> S
    C1 -- fetch JSON --> A
    C2 -- fetch JSON --> A
    A --> MW --> SV --> ST --> D
```


## 2. Choix techniques

| Besoin | Choix | Justification |
|--------|-------|---------------|
| Serveur HTTP | Express | Simple, standard, routes statiques + API dans un même serveur |
| Sessions | `express-session` (cookie de session) | Gestion simple de l'identification multi-utilisateurs |
| Mots de passe | `bcryptjs` | Stockage haché, jamais en clair |
| Identifiants | `crypto.randomUUID()` | Natif Node.js, pas de dépendance |
| Persistance | Fichiers JSON | Autorisé par le sujet, pas de base de données à déployer |
| Écriture fichiers | Écriture dans un fichier temporaire puis `rename` | Évite de corrompre les données si le serveur s'arrête pendant une écriture |
| Client | HTML / CSS / JavaScript (`fetch`) | Pas de build nécessaire, lancement direct |

# Diagramme de classes

```mermaid
classDiagram
direction LR

class User {
    +String id
    +String username
    -String passwordHash
    +Date createdAt
}

class Agenda {
    +String id
    +String name
    +String color
    +String ownerId
    +Date createdAt
}

class RendezVous {
    +String id
    +String agendaId
    +String title
    +Date start
    +Date end
    +String location
    +String description
}

class UserController {
    +register(req, res)
    +getCurrentUser(req, res)
}

class AuthController {
    +login(req, res)
    +logout(req, res)
}

class AgendaController {
    +getAgendas(req, res)
    +createAgenda(req, res)
    +getAgenda(req, res)
}

class RendezVousController {
    +getRendezVous(req, res)
    +createRendezVous(req, res)
    +updateRendezVous(req, res)
    +deleteRendezVous(req, res)
}

class Routes {
    +POST /api/users
    +GET /api/users/me
    +POST /api/auth/login
    +POST /api/auth/logout
    +GET /api/agendas
    +GET /api/agendas/:id
    +POST /api/agendas
    +GET /api/agendas/:agendaId/rendezvous
    +POST /api/rendezvous
    +PUT /api/rendezvous/:id
    +DELETE /api/rendezvous/:id
}

class JsonStore {
    -String filePath
    +getAll()
    +findById(id)
    +insert(data)
    +update(id, data)
    +delete(id)
    -load()
    -save()
}

class UserRepository {
    -JsonStore store
    +findById(id)
    +findByUsername(username)
    +create(user)
}

class AgendaRepository {
    -JsonStore store
    +findById(id)
    +findByOwner(ownerId)
    +create(agenda)
}

class RendezVousRepository {
    -JsonStore store
    +findById(id)
    +findByAgenda(agendaId)
    +create(rendezVous)
    +update(id, rendezVous)
    +delete(id)
}

class RequireAuth {
    +handle(req, res, next)
}

User "1" --> "0..*" Agenda : possède
Agenda "1" --> "0..*" RendezVous : contient

Routes --> UserController
Routes --> AuthController
Routes --> AgendaController
Routes --> RendezVousController
Routes --> RequireAuth

UserController --> UserRepository
AuthController --> UserRepository
AgendaController --> AgendaRepository
RendezVousController --> RendezVousRepository
RendezVousController --> AgendaRepository

UserRepository --> JsonStore : users.json
AgendaRepository --> JsonStore : agendas.json
RendezVousRepository --> JsonStore : rendezvous.json

UserRepository --> User
AgendaRepository --> Agenda
RendezVousRepository --> RendezVous
```

## 4. API REST: Sprint 0

| Méthode | Route | Auth | Corps (JSON) | Réponse |
|---------|-------|------|--------------|---------|
| GET | `/` | Non | — | `index.html` |
| POST | `/api/auth/register` | Non | `{ username, password }` | `201` utilisateur créé / `400` champ vide / `409` nom déjà pris |
| POST | `/api/auth/login` | Non | `{ username, password }` | `200` utilisateur / `401` identifiants invalides |
| POST | `/api/auth/logout` | Oui | — | `204` |
| GET | `/api/auth/me` | Oui | — | `200` utilisateur connecté / `401` |
| GET | `/api/agendas` | Oui | — | `200` liste des agendas de l'utilisateur |
| POST | `/api/agendas` | Oui | `{ name, color? }` | `201` agenda créé / `400` nom vide |

L'API ne renvoie jamais `passwordHash` (méthode `User.toPublic()`).

## 5. Format des fichiers de données

`data/users.json`
```json
[
  {
    "id": "b3f1c2e4-...",
    "username": "manuel",
    "passwordHash": "$2b$10$...",
    "createdAt": "2026-10-01T10:00:00.000Z"
  }
]
```

`data/agendas.json`
```json
[
  {
    "id": "a91d7f20-...",
    "name": "Cours",
    "color": "#3b82f6",
    "ownerId": "b3f1c2e4-...",
    "createdAt": "2026-10-01T10:05:00.000Z"
  }
]
```
