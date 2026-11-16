# ChronoSquad

Application web de gestion d'agendas et d'événements réalisée en M1 Informatique à l'Université de Lorraine.

## Prérequis

Installer **Node.js 22.13.0 minimum** et npm (fourni avec Node.js).

## Installation

Télécharger le projet ou cloner le dépôt :

```bash
git clone https://github.com/mbianytabs/ACL2026-ChronoSquad.git
cd ACL2026-ChronoSquad
```

Dans le dossier du projet, installer les dépendances :

```bash
npm install
```

## Lancement

Aucune compilation n'est nécessaire. Pour lancer l'application :

```bash
npm start
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans un navigateur.

Pour arrêter le serveur, appuyer sur **Ctrl+C** dans le terminal.

Pendant le développement, on peut utiliser `npm run dev` à la place de `npm start` pour redémarrer automatiquement le serveur après une modification.

## Utilisation

Créer un compte, puis se connecter pour créer, consulter, modifier et supprimer ses agendas et événements.

Les données sont enregistrées automatiquement dans `data/chronosquad.sqlite`. Aucun serveur de base de données supplémentaire n'est nécessaire. Conserver ce fichier pour garder les données.

Ce fichier n'est plus suivi par Git. Si `data/chronosquad.sqlite` est absent (nouveau clone, ou fichier supprimé par un `git pull`), `npm start` le recrée à partir de la copie partagée de l'équipe, `backend/storage/seed/chronosquad.sqlite` : les comptes existants fonctionnent à nouveau.

Si le serveur a déjà créé une base vide et que vos comptes n'apparaissent plus, arrêtez le serveur puis lancez :

```bash
npm run db:restore
```

L'ancienne base est conservée dans `data/` sous un nom daté (`chronosquad.backup-….sqlite`).

Depuis un autre ordinateur du même réseau, ouvrir `http://<adresse-ip-du-serveur>:3000` en remplaçant `<adresse-ip-du-serveur>` par l'adresse IP du PC qui lance l'application.

## Équipe

Manuel · Giovana · Navec · Farid · Kaoutar
