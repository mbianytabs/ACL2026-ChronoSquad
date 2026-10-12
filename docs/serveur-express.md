# Serveur Express de ChronoSquad

## Résumé des changements

Le serveur HTTP qui lisait lui-même les fichiers a été remplacé par une application Express 5. Un seul processus Node.js fournit les pages et les fichiers publics ainsi que l'emplacement de l'API, sur le port 3000 demandé par le sujet.

La modification concerne le socle serveur : démarrage HTTP, routage, analyse des requêtes, gestion des erreurs et configuration d'EJS. Aucun fichier de `public/`, modèle, repository, fichier de stockage ou fichier de données n'a été modifié. La simulation présente dans `public/js/api.js` reste un outil de l'équipe front.

### Fichiers et responsabilités

| Fichier | Rôle |
| --- | --- |
| `backend/server.js` | Crée le serveur avec `createServer(app)` et écoute sur `0.0.0.0:3000`. Signale notamment un port déjà occupé. |
| `backend/app.js` | Configure Express, les parsers, les routes, les ressources publiques et EJS. Son import ne démarre pas l'écoute réseau. |
| `backend/routes/PageRoutes.js` | Déclare `GET /`, qui envoie le fichier `public/index.html` actuel. Accueillera les futures routes de pages. |
| `backend/routes/Routes.js` | Déclare l'API montée sur `/api`, avec une route de diagnostic et une 404 JSON pour les routes inconnues. |
| `backend/middleware/ErrorHandler.js` | Traite les erreurs avec leur statut HTTP : JSON pour l'API, HTML rendu par EJS pour les autres requêtes. |
| `backend/views/error.ejs` | Modèle d'erreur réellement rendu par le serveur avec `res.render`. |
| `backend/tests/ServerTest.js` | Vérifie le fonctionnement HTTP et les limites du socle serveur. |
| `package.json` | Déclare les dépendances et les commandes de lancement, développement et test. |
| `package-lock.json` | Fixe les versions résolues des dépendances ; à versionner avec `package.json`. |
| `.gitignore` | Exclut les dépendances locales, les secrets `.env` éventuels et les journaux npm. |
| `README.md` | Décrit le lancement et l'état réellement disponible dans le dépôt. |

Les dépendances ajoutées sont `express`, `ejs`, `morgan` et `http-errors`. `morgan` affiche les requêtes dans le terminal ; `http-errors` permet de transmettre des erreurs HTTP au gestionnaire central. Les imports ES déjà choisis dans le projet sont conservés.

## Comment lancer et utiliser le serveur

Installer Node.js avec npm. Le projet déclare Node 22 ou supérieur ; une LTS maintenue, comme Node 24, est conseillée. Exécuter depuis le dossier contenant `package.json` :

```powershell
npm install
npm start
```

Ces deux commandes suffisent. Dans un terminal acceptant `&&`, elles peuvent être réunies en `npm install && npm start`, comme demandé par le sujet. L'installation crée `node_modules/` ; le lancement exécute `node backend/server.js`.

Ouvrir `http://localhost:3000`. Le terminal reste ouvert tant que le serveur fonctionne. `Ctrl+C` l'arrête. Il n'est pas nécessaire de lancer Live Server, un second serveur front ou un outil de compilation.

En développement :

```powershell
npm run dev
```

Node surveille les fichiers serveur importés et redémarre lors de leurs modifications. Les fichiers publics sont relus lorsqu'ils sont demandés ; recharger la page après une modification front. En mode normal, relancer `npm start` après une modification du code serveur.

### Adresses disponibles

| Adresse et méthode | Réponse |
| --- | --- |
| `GET /` | Page principale actuelle, inchangée. |
| `GET /index.html` | Même fichier HTML, pour conserver les liens existants. |
| `GET /templates/register.html` | Page d'inscription du prototype front. |
| `GET /templates/agendas.html` | Page d'agendas du prototype front. |
| `GET /css/style.css` et `GET /js/...` | Ressources existantes du front. |
| `GET /api/health` | `200` avec `{"status":"ok"}`. |
| Route inconnue sous `/api` | `404` avec `{"error":"Route API introuvable."}`. |
| Autre page ou fichier inconnu | `404`, page HTML d'erreur générée par EJS. |

La route de diagnostic indique que le serveur répond. Elle ne prétend pas vérifier un compte, une session ou le stockage métier. Les URL `/api/users`, `/api/agendas`, etc. ne sont pas encore implémentées.

### Réseau local

Le serveur écoute sur toutes les interfaces IPv4 (`0.0.0.0`). Sur la machine qui l'exécute, utiliser `ipconfig` pour trouver l'IPv4 du réseau local. Sur un autre ordinateur du même réseau, ouvrir `http://<cette-ip>:3000`.

`localhost` désigne l'ordinateur sur lequel le navigateur tourne. Les autres ordinateurs doivent donc utiliser l'IP du serveur. Si l'accès est bloqué, vérifier que le serveur tourne, que les machines sont sur le même réseau et que le pare-feu autorise le port 3000 sur le réseau privé.

Si le terminal indique que le port 3000 est déjà utilisé, arrêter l'autre instance de l'application avant de relancer. Le port reste fixé à 3000 pour respecter le sujet.

## Comprendre le rôle de Node Express et EJS

Node.js exécute le JavaScript du serveur. `server.js` utilise son module HTTP pour recevoir les connexions réseau. Express est la fonction de traitement fournie à ce serveur : il choisit les middlewares et les routes qui répondent à chaque requête.

L'organisation suit le CM06 : un `server.js` pour l'écoute, un `app.js` pour l'application Express, puis des routeurs et un gestionnaire d'erreurs. Le serveur n'a plus besoin d'une table de types MIME ou d'un `fs.readFile` manuel pour chaque ressource : `express.static` s'en charge.

Les middlewares sont exécutés dans l'ordre :

1. `morgan` journalise la requête.
2. `express.json` analyse les corps JSON et `express.urlencoded` analyse les formulaires classiques. Les corps sont limités à 100 ko.
3. Le routeur `/api` traite les demandes de données et termine par sa 404.
4. Le routeur de pages traite la page principale.
5. `express.static` fournit les fichiers présents dans `public/`.
6. Une requête sans correspondance devient une erreur 404, puis passe au gestionnaire central.

Cet ordre empêche les demandes API de retomber sur des fichiers HTML. Les chemins de `public/` et des vues sont calculés depuis les fichiers serveur avec `import.meta.url`, pour éviter de dépendre du répertoire courant du terminal.

Seul `public/` est exposé. Les sources de `backend/`, les JSON de `data/`, `package.json` et les fichiers Git ne sont pas des ressources publiques. Le serveur ne lit ni n'écrit les données métier à ce stade.

### EJS fonctionne déjà pour les erreurs

Dans `app.js`, `app.set("views", ...)` définit le dossier des modèles et `app.set("view engine", "ejs")` choisit EJS. Le gestionnaire appelle ensuite :

```js
res.status(status).render("error", { status, message });
```

EJS lit `backend/views/error.ejs`, remplace `<%= status %>` et `<%= message %>`, puis produit du HTML. Le navigateur reçoit le HTML terminé. La forme `<%=` échappe les valeurs pour qu'un message contenant du HTML soit affiché comme du texte.

Les pages du prototype restent en HTML statique pour respecter le travail de l'équipe front. Leur conversion en modèles EJS sera possible plus tard dans le routeur de pages ; la configuration serveur est déjà prête. Il faudra alors coordonner les modèles, leurs données et leurs liens avec l'équipe front.

### Ajouter une route ultérieurement

Pour une future route API, ajouter dans `Routes.js`, avant la 404, un traitement qui répond en JSON :

```js
// Exemple de forme, à relier ultérieurement au contrôleur métier.
apiRouter.get("/ressource", controller.getResource);
```

Le chemin complet sera `/api/ressource`, car `app.js` pose déjà le préfixe `/api`. Le contrôleur pourra lire `req.params`, `req.query` et `req.body`, valider les données et utiliser le modèle ou le repository approprié. Le parser prépare `req.body` mais ne valide pas les règles métier.

Pour une future page EJS, ajouter une route dans `PageRoutes.js` et un modèle dans `backend/views/`, puis utiliser `res.render("nomDeVue", donnees)`. Le modèle est un fichier interne, pas une URL à exposer en statique.

Un middleware qui ne répond pas doit appeler `next()`. Une erreur se transmet avec `next(error)`. Express 5 transmet également les exceptions des fonctions `async` et leurs promesses rejetées au gestionnaire. Celui-ci possède les quatre paramètres requis `(error, req, res, next)`.

## Vérifications réalisées

```powershell
npm run test:server
```

Les sept tests d'intégration du serveur vérifient :

- Les octets des pages et ressources servies correspondent aux fichiers du front, y compris avec une chaîne de requête dans l'URL.
- `/api/health` répond en JSON.
- Les URL API inconnues et les méthodes non déclarées donnent une 404 JSON.
- Une page inconnue donne une 404 HTML réellement rendue par EJS.
- Les corps JSON invalides donnent 400, les corps trop volumineux donnent 413, puis le serveur reste disponible.
- Les sources et données privées ne sont pas servies.
- Les erreurs asynchrones sont interceptées, les détails internes ne sont pas envoyés au client et les messages EJS sont échappés.

Les tests ouvrent des ports temporaires et ne modifient pas les JSON du projet. Une application isolée teste les erreurs : aucune route de panne n'est ajoutée au serveur utilisé par l'équipe. Un test d'erreur 500 produit volontairement un journal d'erreur dans le terminal.

## Périmètre par rapport au sujet et au cours

Le socle respecte l'organisation du serveur du CM06 et les contraintes techniques du sujet : serveur unique, port 3000, installation et lancement npm, pages et API distinguées, accès réseau local. EJS est installé, configuré et exercé par les erreurs du serveur.

Les exigences fonctionnelles du sujet, notamment identification, agendas, événement et persistance, restent à relier à cette base lors du développement métier. Aucune authentification factice, session, modification de modèle ou opération de données n'a été ajoutée ici. Les pages existantes restent celles du prototype, sans protection métier à ce stade.

Références : CM06, pages 19 à 26 pour les middlewares et parsers, pages 30 et 31 pour `server.js` et `app.js`, pages 40 à 44 pour le moteur EJS ; sujet du projet, page 1. Documentation officielle : [Express 5](https://expressjs.com/en/5x/api/) et [moteurs de modèles](https://expressjs.com/en/guide/using-template-engines/).

Le précédent guide PDF constitue une proposition de migration complète. Ce résumé décrit les changements effectivement appliqués, volontairement limités au serveur.
