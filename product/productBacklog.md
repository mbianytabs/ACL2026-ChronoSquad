# Product Backlog: ChronoSquad

Liste de toutes les fonctionnalités de l'application, classées par priorité.
Ce document évolue tout au long du projet : il est mis à jour à chaque planification de sprint.

**Estimation :** points de complexité (1, 2, 3, 5, 8)
**Statut :** À faire · En cours · Terminé

## Épic 1: Comptes utilisateurs

| ID | User story | Priorité | Points | Sprint | Statut |
|----|-----------|----------|--------|--------|--------|
| T00 | En tant que développeur, je veux un serveur Express avec persistance JSON lancé par `npm install && npm start` sur le port 3000 | Haute | 5 | S0 | En cours |
| US01 | En tant que visiteur, je veux créer un compte pour pouvoir utiliser l'application | Haute | 3 | S0 | En cours |
| US02 | En tant qu'utilisateur, je veux me connecter pour accéder à mes agendas | Haute | 3 | S0 | En cours |
| US03 | En tant qu'utilisateur, je veux me déconnecter pour sécuriser ma session | Haute | 1 | S0 | En cours |

## Épic 2: Agendas

| ID | User story | Priorité | Points | Sprint | Statut |
|----|-----------|----------|--------|--------|--------|
| US04 | En tant qu'utilisateur, je veux créer un agenda | Haute | 3 | S0 | En cours |
| US05 | En tant qu'utilisateur, je veux voir la liste de mes agendas | Haute | 2 | S0 | En cours |
| US09 | En tant qu'utilisateur, je veux afficher plusieurs agendas simultanément | Haute | 5 | S1 | À faire |
| US15 | En tant qu'utilisateur, je veux renommer ou supprimer un agenda | Basse | 2 | S1 | À faire |

## Épic 3: Rendez-vous

| ID | User story | Priorité | Points | Sprint | Statut |
|----|-----------|----------|--------|--------|--------|
| US06 | En tant qu'utilisateur, je veux ajouter un rendez-vous dans un agenda (titre, date, heures, lieu, description) | Haute | 5 | S1 | À faire |
| US07 | En tant qu'utilisateur, je veux modifier un rendez-vous | Haute | 3 | S1 | À faire |
| US08 | En tant qu'utilisateur, je veux supprimer un rendez-vous | Haute | 2 | S1 | À faire |
| US10 | En tant qu'utilisateur, je veux créer des rendez-vous récurrents (quotidien, hebdomadaire, mensuel) | Moyenne | 8 | S2 | À faire |
| US11 | En tant qu'utilisateur, je veux rechercher un rendez-vous par critères (titre, date, lieu, agenda) | Moyenne | 5 | S2 | À faire |

## Épic 4: Partage et échange

| ID | User story | Priorité | Points | Sprint | Statut |
|----|-----------|----------|--------|--------|--------|
| US12 | En tant qu'utilisateur, je veux partager un agenda avec un autre utilisateur | Moyenne | 5 | S3 | À faire |
| US13 | En tant qu'utilisateur, je veux annuler un partage | Moyenne | 2 | S3 | À faire |
| US14 | En tant qu'utilisateur, je veux importer / exporter un agenda (JSON / .ics) | Moyenne | 5 | S3 | À faire |

## Épic 5: Idées en plus (bonus)

| ID | User story | Priorité | Points | Sprint | Statut |
|----|-----------|----------|--------|--------|--------|
| US16 | En tant qu'utilisateur, je veux basculer entre une vue jour / semaine / mois | Basse | 5 | S3 | À faire |
| US17 | En tant qu'utilisateur, je veux être averti quand deux rendez-vous se chevauchent | Basse | 3 | S3 | À faire |
| US18 | En tant qu'utilisateur, je veux déplacer un rendez-vous par glisser-déposer | Basse | 5 | — | À faire |
| US19 | En tant qu'utilisateur, je veux un mode sombre | Basse | 2 | — | À faire |

## Répartition prévue par sprint

| Sprint | Période | User stories | Points |
|--------|---------|--------------|--------|
| S0 | 30/09 → 14/10 | T00, US01 à US05 | 17 |
| S1 | 14/10 → 04/11 | US06 à US09, US15 | 17 |
| S2 | 04/11 → 18/11 | US10, US11 | 13 |
| S3 | 18/11 → 09/12 | US12 à US14, bonus selon le temps restant | 12 + bonus |
