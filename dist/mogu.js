"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mogu = void 0;
const fileBackupAdapter_1 = require("./adapters/fileBackupAdapter");
const logger_1 = require("./utils/logger");
const cache_1 = require("./utils/cache");
/**
 * Mogu - Modern Decentralized Backup System
 * @class
 * @description
 * Mogu is a decentralized backup system.
 * It provides encrypted backup, versioning, and restore capabilities.
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
 * // Create a backup
 * const backup = await mogu.backup('./data');
 *
 * // Restore from backup
 * await mogu.restore(backup.hash, './restore');
 *
 * // Compare versions
 * const changes = await mogu.compare(backup.hash, './data');
 *
 * // Delete a backup when no longer needed
 * const deleted = await mogu.delete(backup.hash);
 * ```
 */
class Mogu {
    /**
     * Creates a new instance of Mogu
     * @param {MoguConfig} config - Configuration object
     * @throws {Error} If the configuration is invalid
     */
    constructor(config) {
        // Compatibility aliases
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
     * Compare a local directory with an existing backup
     * @param {string} hash - Hash of the backup to compare
     * @param {string} sourcePath - Path of the local directory
     * @returns {Promise<VersionComparison>} Comparison result
     * @throws {Error} If comparison fails
     */
    async compare(hash, sourcePath) {
        const operationId = logger_1.logger.startOperation('compare');
        try {
            const result = await this.fileBackup.compare(hash, sourcePath);
            logger_1.logger.endOperation(operationId, 'compare');
            return result;
        }
        catch (error) {
            logger_1.logger.error('Compare failed', error, { operationId });
            throw error;
        }
    }
    /**
     * Compare a local directory with an existing backup in detail
     * @param {string} hash - Hash of the backup to compare
     * @param {string} sourcePath - Path of the local directory
     * @returns {Promise<DetailedComparison>} Detailed comparison result
     * @throws {Error} If comparison fails
     */
    async compareDetailed(hash, sourcePath) {
        const operationId = logger_1.logger.startOperation('compareDetailed');
        try {
            const result = await this.fileBackup.compareDetailed(hash, sourcePath);
            logger_1.logger.endOperation(operationId, 'compareDetailed');
            return result;
        }
        catch (error) {
            logger_1.logger.error('Detailed compare failed', error, { operationId });
            throw error;
        }
    }
    /**
     * Delete an existing backup
     * @param {string} hash - Hash of the backup to delete
     * @returns {Promise<boolean>} true if deletion was successful
     * @throws {Error} If deletion fails
     */
    async delete(hash) {
        const operationId = logger_1.logger.startOperation('delete');
        try {
            const result = await this.fileBackup.delete(hash);
            logger_1.logger.endOperation(operationId, 'delete');
            return result;
        }
        catch (error) {
            logger_1.logger.error('Delete failed', error, { operationId });
            throw error;
        }
    }
    /**
     * Create a backup of a directory
     * @param {string} sourcePath - Path of the directory to backup
     * @param {BackupOptions} [options] - Backup options
     * @returns {Promise<BackupResult>} Backup result
     * @throws {Error} If backup fails
     */
    async backup(sourcePath, options) {
        const operationId = logger_1.logger.startOperation('backup');
        try {
            // Check cache
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
     * Restore a backup
     * @param {string} hash - Hash of the backup to restore
     * @param {string} targetPath - Path where to restore
     * @param {BackupOptions} [options] - Restore options
     * @returns {Promise<boolean>} true if restore was successful
     * @throws {Error} If restore fails
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
