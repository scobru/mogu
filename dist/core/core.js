"use strict";
/**
 * @fileoverview Main Mogu module that manages integration between GunDB and IPFS
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mogu = void 0;
const index_1 = require("../web3stash/index");
const gun_1 = require("../config/gun");
const fsPromises = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const ipfsAdapter_1 = require("../adapters/ipfsAdapter");
/**
 * Main Mogu class that manages integration between GunDB and IPFS
 * @class Mogu
 */
class Mogu {
    /**
     * Creates a Mogu instance
     * @constructor
     * @param {MoguOptions} options - Configuration options
     */
    constructor(options = {}) {
        const { key, storageService, storageConfig, server, useIPFS = false } = options;
        this.radataPath = path_1.default.join(process.cwd(), "radata");
        console.log("Using radata path:", this.radataPath);
        fsPromises.mkdir(this.radataPath, { recursive: true }).catch(console.error);
        const gunInstance = server ? (0, gun_1.initGun)(server, { file: this.radataPath }) : (0, gun_1.initializeGun)({ file: this.radataPath });
        this.gun = gunInstance;
        this.useIPFS = useIPFS;
        if (this.useIPFS) {
            if (!storageConfig) {
                throw new Error("Storage configuration is required when using IPFS");
            }
            this.ipfsAdapter = new ipfsAdapter_1.IPFSAdapter(storageConfig);
        }
        if (storageService && storageConfig) {
            this.storageService = (0, index_1.Web3Stash)(storageService, storageConfig);
        }
    }
    /**
     * Gets the GunDB instance
     * @returns {any} GunDB instance
     */
    getGunInstance() {
        return this.gun;
    }
    /**
     * Retrieves data from specified key
     * @param {string} key - Key to retrieve data from
     * @returns {Promise<any>} Retrieved data
     */
    get(key) {
        if (this.useIPFS && this.ipfsAdapter) {
            return this.ipfsAdapter.get(key);
        }
        return this.gun.get(key);
    }
    /**
     * Puts data at specified key
     * @param {string} key - Key to put data at
     * @param {any} data - Data to put
     * @returns {Promise<any>} Operation result
     */
    put(key, data) {
        if (this.useIPFS && this.ipfsAdapter) {
            return this.ipfsAdapter.put(key, data);
        }
        return this.gun.get(key).put(data);
    }
    /**
     * Subscribes to updates on a key
     * @param {string} key - Key to monitor
     * @param {Function} callback - Function to call for updates
     */
    on(key, callback) {
        this.gun.get(key).on(callback);
    }
    /**
     * Performs data backup
     * @returns {Promise<string>} Hash of created backup
     * @throws {Error} If storage service is not initialized
     */
    async backup() {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            const files = await fsPromises.readdir(this.radataPath);
            console.log("Files to backup:", files);
            const backupData = {};
            for (const file of files) {
                const filePath = path_1.default.join(this.radataPath, file);
                const content = await fsPromises.readFile(filePath, "utf8");
                try {
                    backupData[file] = {
                        fileName: file,
                        content: JSON.parse(content),
                    };
                }
                catch {
                    backupData[file] = {
                        fileName: file,
                        content: content,
                    };
                }
            }
            console.log("Backup data prepared:", backupData);
            const result = await this.storageService.uploadJson(backupData);
            if (this.lastBackupHash) {
                try {
                    await this.storageService.unpin(this.lastBackupHash);
                    console.log("Previous backup unpinned:", this.lastBackupHash);
                }
                catch (err) {
                    console.warn("Failed to unpin previous backup:", err);
                }
            }
            this.lastBackupHash = result.id;
            console.log("New backup created with hash:", result.id);
            return result.id;
        }
        catch (err) {
            console.error("Backup failed:", err);
            throw err;
        }
    }
    /**
     * Restores data from a backup
     * @param {string} hash - Hash of backup to restore
     * @returns {Promise<boolean>} True if restore was successful
     * @throws {Error} If storage service is not initialized
     */
    async restore(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            const backupData = await this.storageService.get(hash);
            console.log("Backup data received:", JSON.stringify(backupData, null, 2));
            if (!backupData || typeof backupData !== "object") {
                throw new Error("Invalid backup data format");
            }
            await fsPromises.rm(this.radataPath, { recursive: true, force: true });
            console.log("Existing radata directory removed");
            await fsPromises.mkdir(this.radataPath, { recursive: true });
            console.log("New radata directory created");
            for (const [fileName, fileData] of Object.entries(backupData)) {
                if (!fileData || typeof fileData !== "object") {
                    console.warn(`Invalid file data for ${fileName}`);
                    continue;
                }
                const { content } = fileData;
                if (!content) {
                    console.warn(`Missing content for ${fileName}`);
                    continue;
                }
                const filePath = path_1.default.join(this.radataPath, fileName);
                console.log(`Restoring file: ${fileName}`);
                try {
                    const fileContent = JSON.stringify(content);
                    await fsPromises.writeFile(filePath, fileContent, "utf8");
                    console.log(`File ${fileName} restored successfully`);
                }
                catch (err) {
                    console.error(`Error writing file ${fileName}:`, err);
                    throw err;
                }
            }
            this.lastBackupHash = hash;
            console.log("All files restored successfully");
            const gunInstance = this.gun;
            gunInstance.opt({ file: this.radataPath });
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        }
        catch (err) {
            console.error("Restore failed:", err);
            throw err;
        }
    }
    /**
     * Removes a specific backup
     * @param {string} hash - Hash of backup to remove
     * @throws {Error} If storage service is not initialized
     */
    async removeBackup(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            await this.storageService.unpin(hash);
            if (this.lastBackupHash === hash) {
                this.lastBackupHash = undefined;
            }
            console.log("Backup removed:", hash);
        }
        catch (err) {
            console.error("Failed to remove backup:", err);
            throw err;
        }
    }
    /**
     * Compares a backup with local data
     * @param {string} hash - Hash of backup to compare
     * @returns {Promise<Object>} Object containing comparison results
     * @throws {Error} If storage service is not initialized
     */
    async compareBackup(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            const remoteData = await this.storageService.get(hash);
            console.log("Remote data:", JSON.stringify(remoteData, null, 2));
            const localFiles = await fsPromises.readdir(this.radataPath);
            const localData = {};
            for (const file of localFiles) {
                const filePath = path_1.default.join(this.radataPath, file);
                const content = await fsPromises.readFile(filePath, "utf8");
                try {
                    localData[file] = {
                        fileName: file,
                        content: JSON.parse(content),
                    };
                }
                catch {
                    localData[file] = {
                        fileName: file,
                        content: content,
                    };
                }
            }
            const differences = {
                missingLocally: [],
                missingRemotely: [],
                contentMismatch: [],
            };
            for (const [fileName, fileData] of Object.entries(remoteData)) {
                if (!localData[fileName]) {
                    differences.missingLocally.push(fileName);
                }
                else {
                    const remoteContent = JSON.stringify(fileData.content);
                    const localContent = JSON.stringify(localData[fileName].content);
                    if (remoteContent !== localContent) {
                        differences.contentMismatch.push(fileName);
                    }
                }
            }
            for (const fileName of Object.keys(localData)) {
                if (!remoteData[fileName]) {
                    differences.missingRemotely.push(fileName);
                }
            }
            const isEqual = differences.missingLocally.length === 0 &&
                differences.missingRemotely.length === 0 &&
                differences.contentMismatch.length === 0;
            console.log("Compare details:", {
                localFiles: Object.keys(localData),
                remoteFiles: Object.keys(remoteData),
                differences,
            });
            return {
                isEqual,
                differences: isEqual ? undefined : differences,
            };
        }
        catch (err) {
            console.error("Backup comparison failed:", err);
            throw err;
        }
    }
}
exports.Mogu = Mogu;
