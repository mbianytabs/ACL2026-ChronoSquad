# ChronoSquad 📅

Collaborative web calendar app built with Node.js by team **ChronoSquad**.
Master's project (M1 Computer Science), Université de Lorraine.

## Features

- Sign up, log in and log out
- Create calendars and view several at once
- Add, edit and delete appointments
- *Coming next:* recurring events, search, sharing, import/export

## Requirements

- [Node.js](https://nodejs.org) (LTS version)

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
├── server.js      # entry point (Express, port 3000)
├── src/           # back-end: routes, services, models, storage
├── public/        # front-end: HTML, CSS, JavaScript
├── data/          # saved data (JSON files, created automatically)
└── sprintN/       # Scrum documents for each sprint
```

## Tech stack

Node.js · HTML/CSS/JavaScript · JSON file storage

## Team

Manuel · Giovana · Navec · Farid · Kaoutar · Youssef
