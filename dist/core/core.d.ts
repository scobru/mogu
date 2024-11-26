/**
 * @fileoverview Main Mogu module that manages integration between GunDB and IPFS
 */
import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
/**
 * Configuration options for Mogu instance
 * @interface MoguOptions
 * @property {string} [key] - Optional encryption key
 * @property {Web3StashServices} [storageService] - Web3 storage service to use
 * @property {Web3StashConfig} [storageConfig] - Configuration for storage service
 * @property {any} [server] - GunDB server configuration
 * @property {boolean} [useIPFS] - Flag to enable IPFS usage
 */
interface MoguOptions {
    key?: string;
    storageService?: Web3StashServices;
    storageConfig?: Web3StashConfig;
    server?: any;
    useIPFS?: boolean;
}
/**
 * Main Mogu class that manages integration between GunDB and IPFS
 * @class Mogu
 */
export declare class Mogu {
    private gun;
    private storageService?;
    private lastBackupHash?;
    private radataPath;
    private ipfsAdapter?;
    private useIPFS;
    /**
     * Creates a Mogu instance
     * @constructor
     * @param {MoguOptions} options - Configuration options
     */
    constructor(options?: MoguOptions);
    /**
     * Gets the GunDB instance
     * @returns {any} GunDB instance
     */
    getGunInstance(): any;
    /**
     * Retrieves data from specified key
     * @param {string} key - Key to retrieve data from
     * @returns {Promise<any>} Retrieved data
     */
    get(key: string): any;
    /**
     * Puts data at specified key
     * @param {string} key - Key to put data at
     * @param {any} data - Data to put
     * @returns {Promise<any>} Operation result
     */
    put(key: string, data: any): any;
    /**
     * Subscribes to updates on a key
     * @param {string} key - Key to monitor
     * @param {Function} callback - Function to call for updates
     */
    on(key: string, callback: (data: any) => void): void;
    /**
     * Performs data backup
     * @returns {Promise<string>} Hash of created backup
     * @throws {Error} If storage service is not initialized
     */
    backup(): Promise<any>;
    /**
     * Restores data from a backup
     * @param {string} hash - Hash of backup to restore
     * @returns {Promise<boolean>} True if restore was successful
     * @throws {Error} If storage service is not initialized
     */
    restore(hash: string): Promise<boolean>;
    /**
     * Removes a specific backup
     * @param {string} hash - Hash of backup to remove
     * @throws {Error} If storage service is not initialized
     */
    removeBackup(hash: string): Promise<void>;
    /**
     * Compares a backup with local data
     * @param {string} hash - Hash of backup to compare
     * @returns {Promise<Object>} Object containing comparison results
     * @throws {Error} If storage service is not initialized
     */
    compareBackup(hash: string): Promise<{
        isEqual: boolean;
        differences?: {
            missingLocally: string[];
            missingRemotely: string[];
            contentMismatch: string[];
        };
    }>;
}
export {};
