import {randomInt} from "node:crypto"; //used over Math.random() for better randomness and security
 const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";


 export function generateCode(length = 8): string{
    let out = "";
    for (let i = 0; i < length; i++) {
        out += ALPHABET[randomInt(0, ALPHABET.length)];
    }
    return out;
 }