
import { Evenement } from "../models/Evenement.js";
import { RecurrenceService } from "../services/RecurrenceService.js";

// Création d'un événement récurrent
const evenement = new Evenement(
    null,
    "agenda1",
    "Réunion de projet",
    "2026-11-02T10:00:00.000Z",
    "2026-11-02T11:00:00.000Z",
    "Point hebdomadaire",
    "Salle 2",
    "weekly",
    "2026-12-31"
);

// Affichage de l'événement
console.log("=== ÉVÉNEMENT ===");
console.log(evenement.toJSON());

// Génération des occurrences à l'aide du service
console.log("\n=== OCCURRENCES ===");

const occurrences = RecurrenceService.genererOccurrences(evenement);

// Affichage des occurrences générées
occurrences.forEach((occurrence, index) => {
    console.log(`Occurrence ${index + 1}`);
    console.log("Début :", occurrence.debut.toISOString());
    console.log("Fin   :", occurrence.fin.toISOString());
    console.log("--------------------");
});

console.log(`Total : ${occurrences.length} occurrences`);
