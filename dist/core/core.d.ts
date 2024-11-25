/**
 * @fileoverview Enhanced Mogu core with Proxy pattern
 */
import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
declare global {
    interface Window {
        Gun: any;
    }
}
/**
 * Configuration options for Mogu instance
 * @interface MoguOptions
 * @property {string} [key] - Optional encryption key
 * @property {Web3StashServices} [storageService] - Web3 storage service to use
 * @property {Web3StashConfig} [storageConfig] - Configuration for storage service
 * @property {any} [server] - GunDB server configuration
 * @property {boolean} [useIPFS] - Flag to enable IPFS usage
 * @property {boolean} [immutable] - Flag to enable immutable mode
 */
interface MoguOptions {
    key?: string;
    storageService?: Web3StashServices;
    storageConfig?: Web3StashConfig;
    server?: any;
    useIPFS?: boolean;
    immutable?: boolean;
}
/**
 * Interface for plugin instances
 * @interface PluginInstance
 * @property {string} name - Name of the plugin
 * @property {any} [key: string] - Key-value pairs for plugin-specific data
 */
interface PluginInstance {
    name: string;
    [key: string]: any;
}
interface MoguInternal {
    getGun(): any;
    isImmutable(): boolean;
    setCtxProp(value: any): void;
    setCtxVal(value: any): void;
    setReady(value: boolean): void;
    getReady(): boolean;
}
/**
 * Main Mogu class that manages integration between GunDB and IPFS
 * @class Mogu
 */
export declare class Mogu implements MoguInternal {
    [key: string]: any;
    private gun;
    private Gun;
    private storageService?;
    private ipfsAdapter?;
    private lastBackupHash?;
    private radataPath;
    private useIPFS;
    private immutable;
    private _ctx;
    private _ctxVal;
    private _ctxProp;
    private _ready;
    private _proxyEnable;
    private _isProxy;
    /**
     * Creates a Mogu instance
     * @constructor
     * @param {MoguOptions} options - Configuration options
     */
    constructor(options?: MoguOptions);
    get value(): Promise<any>;
    mutate(val?: any): void;
    extend(extensions: Array<new (mogu: Mogu, opts: any) => PluginInstance>, opts?: any): void;
    get(key: string): any;
    put(key: string, data: any): any;
    on(key: string, callback: (data: any) => void): any;
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
    getGun(): any;
    isImmutable(): boolean;
    setCtxProp(value: any): void;
    setCtxVal(value: any): void;
    setReady(value: boolean): void;
    getReady(): boolean;
}
export {};
