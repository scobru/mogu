"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileCache = exports.metadataCache = exports.backupCache = exports.Cache = void 0;
const lru_cache_1 = require("lru-cache");
const config_1 = require("../config");
const logger_1 = require("./logger");
/**
 * Classe generica per la gestione della cache LRU
 * @class Cache
 * @template K - Tipo della chiave (deve essere string o number)
 * @template V - Tipo del valore (deve essere un oggetto o Buffer)
 */
class Cache {
    /**
     * Crea una nuova istanza della cache
     * @param {string} name - Nome identificativo della cache
     * @param {CacheOptions} [options] - Opzioni di configurazione
     */
    constructor(name, options) {
        if (!name) {
            throw new Error('Il nome della cache è obbligatorio');
        }
        this.name = name;
        this.cache = new lru_cache_1.LRUCache({
            max: options?.max || config_1.defaultConfig.performance.cacheSize,
            ttl: options?.ttl || 1000 * 60 * 60, // 1 ora di default
            updateAgeOnGet: true,
            allowStale: false
        });
        logger_1.logger.debug(`Cache ${name} inizializzata`, { options });
    }
    /**
     * Recupera un valore dalla cache
     * @param {K} key - Chiave da cercare
     * @returns {V | undefined} Il valore associato alla chiave o undefined se non trovato
     */
    get(key) {
        try {
            const value = this.cache.get(key);
            if (value) {
                logger_1.logger.debug(`Cache hit for ${this.name}`, { key });
            }
            else {
                logger_1.logger.debug(`Cache miss for ${this.name}`, { key });
            }
            return value;
        }
        catch (error) {
            logger_1.logger.error(`Errore nel recupero dalla cache ${this.name}`, error, { key });
            return undefined;
        }
    }
    /**
     * Inserisce un valore nella cache
     * @param {K} key - Chiave da utilizzare
     * @param {V} value - Valore da memorizzare
     * @param {number} [ttl] - Tempo di vita opzionale in millisecondi
     * @throws {Error} Se la chiave o il valore sono invalidi
     */
    set(key, value, ttl) {
        if (!key) {
            throw new Error('La chiave è obbligatoria');
        }
        if (value === undefined || value === null) {
            throw new Error('Il valore non può essere undefined o null');
        }
        try {
            const options = ttl ? { ttl } : undefined;
            this.cache.set(key, value, options);
            logger_1.logger.debug(`Cache set for ${this.name}`, { key });
        }
        catch (error) {
            logger_1.logger.error(`Errore nell'inserimento in cache ${this.name}`, error, { key });
            throw error;
        }
    }
    /**
     * Rimuove un valore dalla cache
     * @param {K} key - Chiave da rimuovere
     * @returns {boolean} true se l'elemento è stato rimosso, false altrimenti
     */
    delete(key) {
        try {
            const result = this.cache.delete(key);
            logger_1.logger.debug(`Cache delete for ${this.name}`, { key, success: result });
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Errore nella rimozione dalla cache ${this.name}`, error, { key });
            return false;
        }
    }
    /**
     * Svuota completamente la cache
     */
    clear() {
        try {
            this.cache.clear();
            logger_1.logger.debug(`Cache cleared for ${this.name}`);
        }
        catch (error) {
            logger_1.logger.error(`Errore nello svuotamento della cache ${this.name}`, error);
            throw error;
        }
    }
    /**
     * Verifica se una chiave è presente in cache
     * @param {K} key - Chiave da verificare
     * @returns {boolean} true se la chiave è presente, false altrimenti
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * Ottiene il numero di elementi in cache
     * @returns {number} Numero di elementi
     */
    get size() {
        return this.cache.size;
    }
    /**
     * Esporta il contenuto della cache
     * @returns {Array<{key: K; value: V}>} Array di coppie chiave-valore
     */
    dump() {
        try {
            return Array.from(this.cache.entries()).map(([key, value]) => ({
                key,
                value
            }));
        }
        catch (error) {
            logger_1.logger.error(`Errore nel dump della cache ${this.name}`, error);
            return [];
        }
    }
    /**
     * Ottiene il tempo rimanente prima della scadenza di una chiave
     * @param {K} key - Chiave da verificare
     * @returns {number} Millisecondi rimanenti, 0 se la chiave non esiste o è scaduta
     */
    getRemainingTTL(key) {
        try {
            return this.cache.getRemainingTTL(key);
        }
        catch (error) {
            logger_1.logger.error(`Errore nel recupero TTL dalla cache ${this.name}`, error, { key });
            return 0;
        }
    }
}
exports.Cache = Cache;
// Cache per i backup
exports.backupCache = new Cache('backup');
// Cache per i metadati
exports.metadataCache = new Cache('metadata', {
    max: 1000,
    ttl: 1000 * 60 * 5 // 5 minuti
});
// Cache per i file
exports.fileCache = new Cache('file', {
    max: 50, // Meno elementi per i file che occupano più memoria
    ttl: 1000 * 60 * 30 // 30 minuti
});
