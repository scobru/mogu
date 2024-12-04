import { LRUCache } from 'lru-cache';
import { config } from '../config';
import { logger } from './logger';
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
export class Cache<K extends string | number, V extends Record<string, any> | Buffer> {
  private cache: LRUCache<K, V>;
  private name: string;

  /**
   * Crea una nuova istanza della cache
   * @param {string} name - Nome identificativo della cache
   * @param {CacheOptions} [options] - Opzioni di configurazione
   */
  constructor(name: string, options?: CacheOptions) {
    if (!name) {
      throw new Error('Il nome della cache è obbligatorio');
    }

    this.name = name;
    this.cache = new LRUCache<K, V>({
      max: options?.max || config.performance.cacheSize,
      ttl: options?.ttl || 1000 * 60 * 60, // 1 ora di default
      updateAgeOnGet: true,
      allowStale: false
    });

    logger.debug(`Cache ${name} inizializzata`, { options });
  }

  /**
   * Recupera un valore dalla cache
   * @param {K} key - Chiave da cercare
   * @returns {V | undefined} Il valore associato alla chiave o undefined se non trovato
   */
  public get(key: K): V | undefined {
    try {
      const value = this.cache.get(key);
      if (value) {
        logger.debug(`Cache hit for ${this.name}`, { key });
      } else {
        logger.debug(`Cache miss for ${this.name}`, { key });
      }
      return value;
    } catch (error) {
      logger.error(`Errore nel recupero dalla cache ${this.name}`, error as Error, { key });
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
  public set(key: K, value: V, ttl?: number): void {
    if (!key) {
      throw new Error('La chiave è obbligatoria');
    }
    if (value === undefined || value === null) {
      throw new Error('Il valore non può essere undefined o null');
    }

    try {
      const options = ttl ? { ttl } : undefined;
      this.cache.set(key, value, options);
      logger.debug(`Cache set for ${this.name}`, { key });
    } catch (error) {
      logger.error(`Errore nell'inserimento in cache ${this.name}`, error as Error, { key });
      throw error;
    }
  }

  /**
   * Rimuove un valore dalla cache
   * @param {K} key - Chiave da rimuovere
   * @returns {boolean} true se l'elemento è stato rimosso, false altrimenti
   */
  public delete(key: K): boolean {
    try {
      const result = this.cache.delete(key);
      logger.debug(`Cache delete for ${this.name}`, { key, success: result });
      return result;
    } catch (error) {
      logger.error(`Errore nella rimozione dalla cache ${this.name}`, error as Error, { key });
      return false;
    }
  }

  /**
   * Svuota completamente la cache
   */
  public clear(): void {
    try {
      this.cache.clear();
      logger.debug(`Cache cleared for ${this.name}`);
    } catch (error) {
      logger.error(`Errore nello svuotamento della cache ${this.name}`, error as Error);
      throw error;
    }
  }

  /**
   * Verifica se una chiave è presente in cache
   * @param {K} key - Chiave da verificare
   * @returns {boolean} true se la chiave è presente, false altrimenti
   */
  public has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Ottiene il numero di elementi in cache
   * @returns {number} Numero di elementi
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Esporta il contenuto della cache
   * @returns {Array<{key: K; value: V}>} Array di coppie chiave-valore
   */
  public dump(): Array<{ key: K; value: V }> {
    try {
      return Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        value
      }));
    } catch (error) {
      logger.error(`Errore nel dump della cache ${this.name}`, error as Error);
      return [];
    }
  }

  /**
   * Ottiene il tempo rimanente prima della scadenza di una chiave
   * @param {K} key - Chiave da verificare
   * @returns {number} Millisecondi rimanenti, 0 se la chiave non esiste o è scaduta
   */
  public getRemainingTTL(key: K): number {
    try {
      return this.cache.getRemainingTTL(key);
    } catch (error) {
      logger.error(`Errore nel recupero TTL dalla cache ${this.name}`, error as Error, { key });
      return 0;
    }
  }
}

// Cache per i backup
export const backupCache = new Cache<string, BackupResult>('backup');

// Cache per i metadati
export const metadataCache = new Cache<string, Record<string, any>>('metadata', {
  max: 1000,
  ttl: 1000 * 60 * 5 // 5 minuti
});

// Cache per i file
export const fileCache = new Cache<string, Buffer>('file', {
  max: 50, // Meno elementi per i file che occupano più memoria
  ttl: 1000 * 60 * 30 // 30 minuti
}); 