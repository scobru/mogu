"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mogu = void 0;
const fileBackupAdapter_1 = require("./adapters/fileBackupAdapter");
const logger_1 = require("./utils/logger");
const cache_1 = require("./utils/cache");
const pinata_1 = require("./web3stash/services/pinata");
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
    createStorageService(config) {
        switch (config.storage.service) {
            case 'PINATA':
                return new pinata_1.PinataService(config.storage.config.apiKey, config.storage.config.apiSecret);
            // Altri servizi verranno aggiunti qui
            default:
                throw new Error(`Servizio di storage non supportato: ${config.storage.service}`);
        }
    }
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
        this.storage = this.createStorageService(config);
        this.fileBackup = new fileBackupAdapter_1.FileBackupAdapter(this.storage, {
            encryption: {
                enabled: config.features.encryption.enabled,
                algorithm: config.features.encryption.algorithm,
                key: ''
            }
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
    /**
     * Get the storage service instance
     * @returns {StorageService} The storage service instance
     */
    getStorage() {
        return this.storage;
    }
    /**
     * Upload JSON data directly to storage
     * @param {Record<string, unknown>} jsonData - The JSON data to upload
     * @param {any} options - Upload options
     * @returns {Promise<{ id: string; metadata: Record<string, unknown> }>} Upload result
     */
    async uploadJson(jsonData, options) {
        return this.storage.uploadJson(jsonData, options);
    }
    /**
     * Upload a file directly to storage
     * @param {string} path - Path to the file
     * @param {any} options - Upload options
     * @returns {Promise<{ id: string; metadata: Record<string, unknown> }>} Upload result
     */
    async uploadFile(path, options) {
        return this.storage.uploadFile(path, options);
    }
    /**
     * Get data from storage by hash
     * @param {string} hash - The hash to retrieve
     * @returns {Promise<any>} The retrieved data
     */
    async getData(hash) {
        return this.storage.get(hash);
    }
    /**
     * Get metadata from storage by hash
     * @param {string} hash - The hash to get metadata for
     * @returns {Promise<any>} The metadata
     */
    async getMetadata(hash) {
        return this.storage.getMetadata(hash);
    }
    /**
     * Check if a hash is pinned in storage
     * @param {string} hash - The hash to check
     * @returns {Promise<boolean>} True if pinned, false otherwise
     */
    async isPinned(hash) {
        return this.storage.isPinned(hash);
    }
    /**
     * Unpin a hash from storage
     * @param {string} hash - The hash to unpin
     * @returns {Promise<void>}
     */
    async unpin(hash) {
        return this.storage.unpin(hash);
    }
}
exports.Mogu = Mogu;
