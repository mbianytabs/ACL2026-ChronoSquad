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

### Arborescence du projet

```
├── README.md              # installation et lancement (npm install && npm start)
├── package.json
├── server.js              # point d'entrée (Express, port 3000)
├── src/
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── agendaRoutes.js
│   ├── middleware/
│   │   └── requireAuth.js
│   ├── services/
│   │   ├── UserService.js
│   │   └── AgendaService.js
│   ├── models/
│   │   ├── User.js
│   │   └── Agenda.js
│   └── storage/
│       └── JsonStore.js
├── public/                # client Web (HTML / CSS / JS)
│   ├── index.html
│   ├── css/
│   └── js/
├── data/                  # fichiers de persistance (créés au 1er lancement)
│   ├── users.json
│   └── agendas.json
└── sprint0/               # documents Scrum du sprint 0
    ├── backlog.md
    ├── conception.md
    ├── review.md          # ajouté en fin de sprint
    └── retrospective.md   # ajouté en fin de sprint
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

## 3. Diagramme de classes

La classe `RendezVous` (stéréotype `<<Sprint 1>>`) est prévue pour le Sprint 1 et n'est pas implémentée dans ce sprint.

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String passwordHash
        +Date createdAt
        +toPublic() Object
    }

    class Agenda {
        +String id
        +String name
        +String color
        +String ownerId
        +Date createdAt
    }

    class RendezVous {
        <<Sprint 1>>
        +String id
        +String agendaId
        +String title
        +Date start
        +Date end
        +String location
        +String description
    }

    class JsonStore {
        -String filePath
        -Array cache
        +load() Array
        +getAll() Array
        +find(predicate) Object
        +filter(predicate) Array
        +insert(item) Object
        +save() void
    }

    class UserService {
        -JsonStore store
        +register(username, password) User
        +authenticate(username, password) User
        +findById(id) User
    }

    class AgendaService {
        -JsonStore store
        +create(ownerId, name, color) Agenda
        +listByOwner(ownerId) Agenda[]
    }

    class AuthRoutes {
        +POST register
        +POST login
        +POST logout
        +GET me
    }

    class AgendaRoutes {
        +GET agendas
        +POST agendas
    }

    class RequireAuth {
        +handle(req, res, next) void
    }

    User "1" --> "0..*" Agenda : possède
    Agenda "1" --> "0..*" RendezVous : contient
    UserService --> JsonStore : users.json
    AgendaService --> JsonStore : agendas.json
    UserService ..> User : crée
    AgendaService ..> Agenda : crée
    AuthRoutes --> UserService
    AgendaRoutes --> AgendaService
    AgendaRoutes ..> RequireAuth : protégée par
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

## 6. Diagrammes de séquence

### 6.1 Inscription (US01)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant C as Client Web
    participant R as AuthRoutes
    participant S as UserService
    participant J as JsonStore (users.json)

    U->>C: saisit username + mot de passe
    C->>R: POST /api/auth/register {username, password}
    R->>S: register(username, password)
    S->>J: find(username)
    alt nom déjà utilisé
        J-->>S: utilisateur existant
        S-->>R: erreur
        R-->>C: 409 Conflict
        C-->>U: « Nom d'utilisateur déjà pris »
    else nom disponible
        J-->>S: null
        S->>S: bcryptjs.hash(password)
        S->>J: insert(user)
        J->>J: save() → users.json
        S-->>R: user
        R-->>C: 201 Created
        C-->>U: compte créé, redirection vers connexion
    end
```

### 6.2 Connexion (US02)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant C as Client Web
    participant R as AuthRoutes
    participant S as UserService
    participant J as JsonStore (users.json)

    U->>C: saisit identifiants
    C->>R: POST /api/auth/login {username, password}
    R->>S: authenticate(username, password)
    S->>J: find(username)
    J-->>S: user ou null
    alt identifiants valides
        S->>S: bcryptjs.compare(password, hash)
        S-->>R: user
        R->>R: req.session.userId = user.id
        R-->>C: 200 {id, username} + cookie de session
        C-->>U: affiche la page des agendas
    else identifiants invalides
        S-->>R: null
        R-->>C: 401 Unauthorized
        C-->>U: « Identifiants incorrects »
    end
```

### 6.3 Déconnexion (US03)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant C as Client Web
    participant R as AuthRoutes

    U->>C: clique « Se déconnecter »
    C->>R: POST /api/auth/logout (cookie)
    R->>R: req.session.destroy()
    R-->>C: 204 No Content
    C-->>U: retour à la page de connexion
```

### 6.4 Création d'un agenda (US04)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant C as Client Web
    participant M as requireAuth
    participant R as AgendaRoutes
    participant S as AgendaService
    participant J as JsonStore (agendas.json)

    U->>C: saisit le nom de l'agenda
    C->>M: POST /api/agendas {name, color} (cookie)
    alt non connecté
        M-->>C: 401 Unauthorized
    else connecté
        M->>R: next()
        R->>S: create(session.userId, name, color)
        alt nom vide
            S-->>R: erreur
            R-->>C: 400 Bad Request
        else nom valide
            S->>J: insert(agenda)
            J->>J: save() → agendas.json
            S-->>R: agenda
            R-->>C: 201 Created {agenda}
            C-->>U: agenda ajouté à la liste
        end
    end
```

### 6.5 Liste des agendas (US05)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant C as Client Web
    participant M as requireAuth
    participant R as AgendaRoutes
    participant S as AgendaService
    participant J as JsonStore (agendas.json)

    U->>C: ouvre la page des agendas
    C->>M: GET /api/agendas (cookie)
    M->>R: next()
    R->>S: listByOwner(session.userId)
    S->>J: filter(ownerId == userId)
    J-->>S: agendas[]
    S-->>R: agendas[]
    R-->>C: 200 [agendas]
    C-->>U: affiche la liste
```

## 7. Maquette de l'interface (Sprint 0)

```
┌─────────────────────────────────────────────┐
│  ChronoSquad Agenda          [manuel] [⏻]   │
├──────────────┬──────────────────────────────┤
│ Mes agendas  │                              │
│ ☑ Cours      │   (zone calendrier —         │
│ ☑ Perso      │    rendez-vous au Sprint 1)  │
│              │                              │
│ [+ Nouvel    │                              │
│    agenda]   │                              │
└──────────────┴──────────────────────────────┘
```
