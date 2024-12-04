"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mogu = void 0;
const fileBackupAdapter_1 = require("./adapters/fileBackupAdapter");
const logger_1 = require("./utils/logger");
const cache_1 = require("./utils/cache");
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
class Mogu {
    /**
     * Crea una nuova istanza di Mogu
     * @param {MoguConfig} config - Configurazione
     * @throws {Error} Se la configurazione non è valida
     */
    constructor(config) {
        // Alias per compatibilità
        this.backupFiles = this.backup;
        this.restoreFiles = this.restore;
        this.config = config;
        this.fileBackup = new fileBackupAdapter_1.FileBackupAdapter(config.storage.service, {
            apiKey: config.storage.config.apiKey,
            apiSecret: config.storage.config.apiSecret,
            endpoint: config.storage.config.endpoint
        });
        logger_1.logger.info('Mogu initialized', { config: this.config });
    }
    /**
     * Esegue il backup di una directory
     * @param {string} sourcePath - Percorso della directory da backuppare
     * @param {BackupOptions} [options] - Opzioni di backup
     * @returns {Promise<BackupResult>} Risultato del backup
     * @throws {Error} Se il backup fallisce
     */
    async backup(sourcePath, options) {
        const operationId = logger_1.logger.startOperation('backup');
        try {
            // Verifica cache
            const cacheKey = `${sourcePath}:${JSON.stringify(options)}`;
            const cached = await cache_1.backupCache.get(cacheKey);
            if (cached) {
                logger_1.logger.info('Using cached backup', { operationId });
                return cached;
            }
            const result = await this.fileBackup.backup(sourcePath, options);
            await cache_1.backupCache.set(cacheKey, result);
            logger_1.logger.endOperation(operationId, 'backup');
            return result;
        }
        catch (error) {
            logger_1.logger.error('Backup failed', error, { operationId });
            throw error;
        }
    }
    /**
     * Ripristina un backup
     * @param {string} hash - Hash del backup da ripristinare
     * @param {string} targetPath - Percorso dove ripristinare
     * @param {BackupOptions} [options] - Opzioni di ripristino
     * @returns {Promise<boolean>} true se il ripristino è riuscito
     * @throws {Error} Se il ripristino fallisce
     */
    async restore(hash, targetPath, options) {
        const operationId = logger_1.logger.startOperation('restore');
        try {
            const result = await this.fileBackup.restore(hash, targetPath, options);
            logger_1.logger.endOperation(operationId, 'restore');
            return result;
        }
        catch (error) {
            logger_1.logger.error('Restore failed', error, { operationId });
            throw error;
        }
    }
}
exports.Mogu = Mogu;
