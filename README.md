# ChronoSquad 📅

Collaborative web calendar app built with Node.js by team **ChronoSquad**.
Master's project (M1 Computer Science), Université de Lorraine.

## Features

- Sign up, log in and log out
- Create calendars and view several at once
- Add, edit and delete appointments
- *Coming next:* recurring events, search, sharing, import/export

## Requirements

- [Node.js](https://nodejs.org) >= 22.13.0 (Node.js 24 LTS recommended)

## Installation and launch

```bash
git clone <repository-link> #you can get the link here in github
cd chronosquad-agenda
npm install && npm start
```

Then open **http://localhost:3000**.
Other computers on the same network can connect with `http://<server-ip>:3000`.

## Project structure

```
├── backend/       # server.js, Express app, routes, models, repositories, storage
├── views/         # EJS pages and partials
├── public/        # CSS and browser JavaScript
├── data/          # chronosquad.sqlite (generated), legacy JSON samples
└── docs/sprint0/  # conception.md and classes-sqlite.puml
```

## Tech stack

Node.js · Express · EJS · Argon2 · SQLite (node:sqlite) · HTML/CSS/JavaScript

## SQLite storage

The server automatically creates `data/chronosquad.sqlite`, with the tables
`user`, `agenda` and `rendezvous`, before listening on port 3000.
No separate database server or XAMPP installation is required.

On the first startup, existing `users.json`, `agendas.json` and `evenements.json`
are imported in one transaction. IDs and relations are preserved; sample passwords
are hashed with Argon2. Original JSON files remain unchanged, but SQLite becomes
the source of truth. Subsequent startups do not import them again.
An invalid import stops startup without saving partial data; fix the JSON and retry.

The database is local and excluded from Git. Keep it across restarts.
To back it up, stop the server and copy `data/chronosquad.sqlite`.
Repositories reconstruct the existing domain models; `Evenement` uses the SQL table `rendezvous`.

Run `npm test` for HTTP and SQLite checks, or `npm run test:storage` for storage only.
Tests use isolated databases and do not modify the application database.

The storage layer is ready. Business API controllers and authentication are still
to be implemented; this migration does not connect the front-end forms to the database.
See [sprint 0 conception](docs/sprint0/conception.md) for details and the class diagram.

### SQLite test URL

Table creation statements are in `backend/storage/schema.sql`. Demonstration
inserts are in `backend/storage/test-data.sql`, executed automatically at startup
after the legacy JSON import, without duplicating rows on subsequent startups.

Open **http://localhost:3000/api/test/user-agenda** to read the demonstration
user (`test-user`, username `sqlite_demo`) and their agenda (`test-agenda`) as JSON.
The response excludes the password hash. This test route does not log anyone in.

## Team

Manuel · Giovana · Navec · Farid · Kaoutar · Youssef
