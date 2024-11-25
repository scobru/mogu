/**
 * @fileoverview Main Mogu module that manages integration between GunDB and IPFS
 */

import { Web3Stash } from "../web3stash/index";
import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import { initializeGun, initGun } from "../config/gun";
import * as fsPromises from "fs/promises";
import path from "path";
import { IPFSAdapter } from "../adapters/ipfsAdapter";

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
 * Interface for backup file data
 * @interface BackupFileData
 * @property {string} fileName - Name of the file
 * @property {string|object} content - Content of the file
 */
interface BackupFileData {
  fileName: string;
  content: string | object;
}

/**
 * Main Mogu class that manages integration between GunDB and IPFS
 * @class Mogu
 */
export class Mogu {
  private gun: any;
  private storageService?: any;
  private lastBackupHash?: string;
  private radataPath: string;
  private ipfsAdapter?: IPFSAdapter;
  private useIPFS: boolean;

  /**
   * Creates a Mogu instance
   * @constructor
   * @param {MoguOptions} options - Configuration options
   */
  constructor(options: MoguOptions = {}) {
    const { key, storageService, storageConfig, server, useIPFS = false } = options;

    this.radataPath = path.join(process.cwd(), "radata");
    console.log("Using radata path:", this.radataPath);

    fsPromises.mkdir(this.radataPath, { recursive: true }).catch(console.error);

    const gunInstance = server ? initGun(server, { file: this.radataPath }) : initializeGun({ file: this.radataPath });
    this.gun = gunInstance;

    this.useIPFS = useIPFS;

    if (this.useIPFS) {
      if (!storageConfig) {
        throw new Error("Storage configuration is required when using IPFS");
      }
      this.ipfsAdapter = new IPFSAdapter(storageConfig);
    }

    if (storageService && storageConfig) {
      this.storageService = Web3Stash(storageService, storageConfig);
    }
  }

  /**
   * Gets the GunDB instance
   * @returns {any} GunDB instance
   */
  public getGunInstance() {
    return this.gun;
  }

  /**
   * Retrieves data from specified key
   * @param {string} key - Key to retrieve data from
   * @returns {Promise<any>} Retrieved data
   */
  get(key: string) {
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
  put(key: string, data: any) {
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
  on(key: string, callback: (data: any) => void) {
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

      const backupData: Record<string, BackupFileData> = {};

      for (const file of files) {
        const filePath = path.join(this.radataPath, file);
        const content = await fsPromises.readFile(filePath, "utf8");

        try {
          backupData[file] = {
            fileName: file,
            content: JSON.parse(content),
          };
        } catch {
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
        } catch (err) {
          console.warn("Failed to unpin previous backup:", err);
        }
      }

      this.lastBackupHash = result.id;
      console.log("New backup created with hash:", result.id);
      return result.id;
    } catch (err) {
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
  async restore(hash: string) {
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

        const { content } = fileData as BackupFileData;
        if (!content) {
          console.warn(`Missing content for ${fileName}`);
          continue;
        }

        const filePath = path.join(this.radataPath, fileName);
        console.log(`Restoring file: ${fileName}`);

        try {
          const fileContent = JSON.stringify(content);
          await fsPromises.writeFile(filePath, fileContent, "utf8");
          console.log(`File ${fileName} restored successfully`);
        } catch (err) {
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
    } catch (err) {
      console.error("Restore failed:", err);
      throw err;
    }
  }

  /**
   * Removes a specific backup
   * @param {string} hash - Hash of backup to remove
   * @throws {Error} If storage service is not initialized
   */
  async removeBackup(hash: string) {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }

    try {
      await this.storageService.unpin(hash);
      if (this.lastBackupHash === hash) {
        this.lastBackupHash = undefined;
      }
      console.log("Backup removed:", hash);
    } catch (err) {
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
  async compareBackup(hash: string): Promise<{
    isEqual: boolean;
    differences?: {
      missingLocally: string[];
      missingRemotely: string[];
      contentMismatch: string[];
    };
  }> {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }

    try {
      const remoteData = await this.storageService.get(hash);
      console.log("Remote data:", JSON.stringify(remoteData, null, 2));

      const localFiles = await fsPromises.readdir(this.radataPath);
      const localData: Record<string, any> = {};

      for (const file of localFiles) {
        const filePath = path.join(this.radataPath, file);
        const content = await fsPromises.readFile(filePath, "utf8");
        try {
          localData[file] = {
            fileName: file,
            content: JSON.parse(content),
          };
        } catch {
          localData[file] = {
            fileName: file,
            content: content,
          };
        }
      }

      const differences = {
        missingLocally: [] as string[],
        missingRemotely: [] as string[],
        contentMismatch: [] as string[],
      };

      for (const [fileName, fileData] of Object.entries(remoteData)) {
        if (!localData[fileName]) {
          differences.missingLocally.push(fileName);
        } else {
          const remoteContent = JSON.stringify((fileData as BackupFileData).content);
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

      const isEqual =
        differences.missingLocally.length === 0 &&
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
    } catch (err) {
      console.error("Backup comparison failed:", err);
      throw err;
    }
  }
}
