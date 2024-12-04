import { BackupResult } from '../types/backup';
/**
 * Opzioni per la configurazione della cache
 * @interface CacheOptions
 * @property {number} [max] - Numero massimo di elementi in cache
 * @property {number} [ttl] - Tempo di vita degli elementi in millisecondi
 */
interface CacheOptions {
    max?: number;
    ttl?: number;
}
/**
 * Classe generica per la gestione della cache LRU
 * @class Cache
 * @template K - Tipo della chiave (deve essere string o number)
 * @template V - Tipo del valore (deve essere un oggetto o Buffer)
 */
export declare class Cache<K extends string | number, V extends Record<string, any> | Buffer> {
    private cache;
    private name;
    /**
     * Crea una nuova istanza della cache
     * @param {string} name - Nome identificativo della cache
     * @param {CacheOptions} [options] - Opzioni di configurazione
     */
    constructor(name: string, options?: CacheOptions);
    /**
     * Recupera un valore dalla cache
     * @param {K} key - Chiave da cercare
     * @returns {V | undefined} Il valore associato alla chiave o undefined se non trovato
     */
    get(key: K): V | undefined;
    /**
     * Inserisce un valore nella cache
     * @param {K} key - Chiave da utilizzare
     * @param {V} value - Valore da memorizzare
     * @param {number} [ttl] - Tempo di vita opzionale in millisecondi
     * @throws {Error} Se la chiave o il valore sono invalidi
     */
    set(key: K, value: V, ttl?: number): void;
    /**
     * Rimuove un valore dalla cache
     * @param {K} key - Chiave da rimuovere
     * @returns {boolean} true se l'elemento è stato rimosso, false altrimenti
     */
    delete(key: K): boolean;
    /**
     * Svuota completamente la cache
     */
    clear(): void;
    /**
     * Verifica se una chiave è presente in cache
     * @param {K} key - Chiave da verificare
     * @returns {boolean} true se la chiave è presente, false altrimenti
     */
    has(key: K): boolean;
    /**
     * Ottiene il numero di elementi in cache
     * @returns {number} Numero di elementi
     */
    get size(): number;
    /**
     * Esporta il contenuto della cache
     * @returns {Array<{key: K; value: V}>} Array di coppie chiave-valore
     */
    dump(): Array<{
        key: K;
        value: V;
    }>;
    /**
     * Ottiene il tempo rimanente prima della scadenza di una chiave
     * @param {K} key - Chiave da verificare
     * @returns {number} Millisecondi rimanenti, 0 se la chiave non esiste o è scaduta
     */
    getRemainingTTL(key: K): number;
}
export declare const backupCache: Cache<string, BackupResult>;
export declare const metadataCache: Cache<string, Record<string, any>>;
export declare const fileCache: Cache<string, Buffer<ArrayBufferLike>>;
export {};
