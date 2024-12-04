import { BackupOptions, BackupResult } from './types/backup';
import { defaultConfig } from './config';
import { VersionComparison, DetailedComparison } from './versioning';
type MoguConfig = typeof defaultConfig;
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
export declare class Mogu {
    private config;
    private fileBackup;
    /**
     * Creates a new instance of Mogu
     * @param {MoguConfig} config - Configuration object
     * @throws {Error} If the configuration is invalid
     */
    constructor(config: MoguConfig);
    /**
     * Compare a local directory with an existing backup
     * @param {string} hash - Hash of the backup to compare
     * @param {string} sourcePath - Path of the local directory
     * @returns {Promise<VersionComparison>} Comparison result
     * @throws {Error} If comparison fails
     */
    compare(hash: string, sourcePath: string): Promise<VersionComparison>;
    /**
     * Compare a local directory with an existing backup in detail
     * @param {string} hash - Hash of the backup to compare
     * @param {string} sourcePath - Path of the local directory
     * @returns {Promise<DetailedComparison>} Detailed comparison result
     * @throws {Error} If comparison fails
     */
    compareDetailed(hash: string, sourcePath: string): Promise<DetailedComparison>;
    /**
     * Delete an existing backup
     * @param {string} hash - Hash of the backup to delete
     * @returns {Promise<boolean>} true if deletion was successful
     * @throws {Error} If deletion fails
     */
    delete(hash: string): Promise<boolean>;
    /**
     * Create a backup of a directory
     * @param {string} sourcePath - Path of the directory to backup
     * @param {BackupOptions} [options] - Backup options
     * @returns {Promise<BackupResult>} Backup result
     * @throws {Error} If backup fails
     */
    backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult>;
    /**
     * Restore a backup
     * @param {string} hash - Hash of the backup to restore
     * @param {string} targetPath - Path where to restore
     * @param {BackupOptions} [options] - Restore options
     * @returns {Promise<boolean>} true if restore was successful
     * @throws {Error} If restore fails
     */
    restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;
    backupFiles: (sourcePath: string, options?: BackupOptions) => Promise<BackupResult>;
    restoreFiles: (hash: string, targetPath: string, options?: BackupOptions) => Promise<boolean>;
}
export {};
