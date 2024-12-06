import type { MoguConfig } from './types/mogu';
import type { BackupOptions, BackupResult } from './types/backup';
import type { VersionComparison, DetailedComparison } from './versioning';
import { StorageService } from './web3stash/services/base-storage';
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
 *       pinataJwt: 'your-jwt-token',
 *       pinataGateway: 'your-gateway'
 *     }
 *   },
 *   features: {
 *     encryption: {
 *       enabled: true,
 *       algorithm: 'aes-256-gcm'
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
    private storage;
    private createStorageService;
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
    /**
     * Get the storage service instance
     * @returns {StorageService} The storage service instance
     */
    getStorage(): StorageService;
    /**
     * Upload JSON data directly to storage
     * @param {Record<string, unknown>} jsonData - The JSON data to upload
     * @param {any} options - Upload options
     * @returns {Promise<{ id: string; metadata: Record<string, unknown> }>} Upload result
     */
    uploadJson(jsonData: Record<string, unknown>, options?: any): Promise<import("./web3stash/types").UploadOutput>;
    /**
     * Upload a file directly to storage
     * @param {string} path - Path to the file
     * @param {any} options - Upload options
     * @returns {Promise<{ id: string; metadata: Record<string, unknown> }>} Upload result
     */
    uploadFile(path: string, options?: any): Promise<import("./web3stash/types").UploadOutput>;
    /**
     * Get data from storage by hash
     * @param {string} hash - The hash to retrieve
     * @returns {Promise<any>} The retrieved data
     */
    getData(hash: string): Promise<import("./types/mogu").BackupData>;
    /**
     * Get metadata from storage by hash
     * @param {string} hash - The hash to get metadata for
     * @returns {Promise<any>} The metadata
     */
    getMetadata(hash: string): Promise<any>;
    /**
     * Check if a hash is pinned in storage
     * @param {string} hash - The hash to check
     * @returns {Promise<boolean>} True if pinned, false otherwise
     */
    isPinned(hash: string): Promise<boolean>;
    /**
     * Unpin a hash from storage
     * @param {string} hash - The hash to unpin
     * @returns {Promise<boolean>} - Returns true if the hash was unpinned, false otherwise
     */
    unpin(hash: string): Promise<boolean>;
    backupFiles: (sourcePath: string, options?: BackupOptions) => Promise<BackupResult>;
    restoreFiles: (hash: string, targetPath: string, options?: BackupOptions) => Promise<boolean>;
}
