/**
 * Classe qui gère un agenda
 */
import { Evenement } from "./Evenement.js";

export class Aganda{
    #id;
    #name;
    #color;
    #ownerId;
    #createdAt;
    #events = [];

    constructor(){
    }
}