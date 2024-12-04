import { BackupOptions, BackupResult } from './types/backup';
import { defaultConfig } from './config';
import { VersionComparison, DetailedComparison } from './versioning';
type MoguConfig = typeof defaultConfig;
/**
 * Mogu - Sistema di backup decentralizzato
 * @class
 * @description
 * Mogu è un sistema di backup decentralizzato.
 * Fornisce funzionalità di backup criptato, versionamento e ripristino.
 *
 * @example
 * ```typescript
 * const mogu = new Mogu({
 *   storage: {
 *     service: 'PINATA',
 *     config: {
 *       apiKey: 'your-api-key',
 *       apiSecret: 'your-secret'
 *     }
 *   }
 * });
 *
 * // Backup di file
 * const backup = await mogu.backup('./data');
 *
 * // Ripristino
 * await mogu.restore(backup.hash, './restore');
 * ```
 */
export declare class Mogu {
    private config;
    private fileBackup;
    /**
     * Crea una nuova istanza di Mogu
     * @param {MoguConfig} config - Configurazione
     * @throws {Error} Se la configurazione non è valida
     */
    constructor(config: MoguConfig);
    /**
     * Esegue il backup di una directory
     * @param {string} sourcePath - Percorso della directory da backuppare
     * @param {BackupOptions} [options] - Opzioni di backup
     * @returns {Promise<BackupResult>} Risultato del backup
     * @throws {Error} Se il backup fallisce
     */
    backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult>;
    /**
     * Ripristina un backup
     * @param {string} hash - Hash del backup da ripristinare
     * @param {string} targetPath - Percorso dove ripristinare
     * @param {BackupOptions} [options] - Opzioni di ripristino
     * @returns {Promise<boolean>} true se il ripristino è riuscito
     * @throws {Error} Se il ripristino fallisce
     */
    restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;
    /**
     * Confronta una directory locale con un backup esistente
     * @param {string} hash - Hash del backup da confrontare
     * @param {string} sourcePath - Percorso della directory locale
     * @returns {Promise<VersionComparison>} Risultato del confronto
     * @throws {Error} Se il confronto fallisce
     */
    compare(hash: string, sourcePath: string): Promise<VersionComparison>;
    /**
     * Confronta in dettaglio una directory locale con un backup esistente
     * @param {string} hash - Hash del backup da confrontare
     * @param {string} sourcePath - Percorso della directory locale
     * @returns {Promise<DetailedComparison>} Risultato dettagliato del confronto
     * @throws {Error} Se il confronto fallisce
     */
    compareDetailed(hash: string, sourcePath: string): Promise<DetailedComparison>;
    remove(hash: string): Promise<boolean>;
    backupFiles: (sourcePath: string, options?: BackupOptions) => Promise<BackupResult>;
    restoreFiles: (hash: string, targetPath: string, options?: BackupOptions) => Promise<boolean>;
}
export {};
