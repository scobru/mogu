import { Web3Stash } from "../web3stash/index";
import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import { NodeType, EncryptedNode } from "../db/types";
import { GunMogu } from "../db/gunDb";
import { initializeGun, initGun } from "../config/gun";
import * as fsPromises from "fs/promises";
import path from "path";
import { keccak256 } from "js-sha3";
import Gun, { IGunChain } from "gun";

export { EncryptedNode, NodeType };

interface MoguOptions {
  key?: string;
  storageService?: Web3StashServices;
  storageConfig?: Web3StashConfig;
  server?: any;
}

interface BackupFileData {
  fileName: string;
  content: string | object;
}

/**
 * Mogu - A decentralized database with IPFS backup capabilities
 * @class
 */
export class Mogu {
  private gun: GunMogu;
  private storageService?: any;
  private lastBackupHash?: string;
  private radataPath: string;

  constructor(options: MoguOptions = {}) {
    const { key, storageService, storageConfig, server } = options;

    // Imposta il percorso di Gun correttamente
    this.radataPath = path.join(process.cwd(), "radata");
    console.log("Using radata path:", this.radataPath);

    // Crea la directory radata se non esiste
    fsPromises.mkdir(this.radataPath, { recursive: true }).catch(console.error);

    // Inizializza Gun con il percorso corretto
    const gunInstance = server ? initGun(server, { file: this.radataPath }) : initializeGun({ file: this.radataPath });

    this.gun = new GunMogu(gunInstance, key || "");

    if (storageService && storageConfig) {
      this.storageService = Web3Stash(storageService, storageConfig);
    }

    // Estensione della catena di Gun per i metodi di backup
    (Gun.chain as any).backup = this.backup;
    (Gun.chain as any).restore = this.restore;
    (Gun.chain as any).removeBackup = this.removeBackup;
    (Gun.chain as any).compareBackup = this.compareBackup;
  }

  // Aggiungiamo il metodo login
  async login(username: string, password: string) {
    return this.gun.authenticate(username, password);
  }

  // Metodi base - usa direttamente Gun
  async put(path: string, data: any) {
    const ref = this.gun.getGunInstance().get("nodes").get(path);
    return new Promise(resolve => {
      ref.put(data, (ack: any) => resolve(ack));
    });
  }

  async get(path: string) {
    const ref = this.gun.getGunInstance().get("nodes").get(path);
    return new Promise<any>(resolve => {
      ref.once((data: any) => resolve(data));
    });
  }

  on(path: string, callback: (data: any) => void) {
    this.gun.getGunInstance().get("nodes").get(path).on(callback);
  }

  // Backup su IPFS - salva i dati raw di Gun
  async backup() {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }

    try {
      // Leggi tutti i file dalla directory gun-data
      const files = await fsPromises.readdir(this.radataPath);
      console.log("Files to backup:", files);

      const backupData: Record<string, BackupFileData> = {};

      for (const file of files) {
        const filePath = path.join(this.radataPath, file);
        const content = await fsPromises.readFile(filePath, "utf8");

        try {
          // Prova a parsare il contenuto come JSON
          backupData[file] = {
            fileName: file,
            content: JSON.parse(content),
          };
        } catch {
          // Se non è JSON valido, salvalo come stringa
          backupData[file] = {
            fileName: file,
            content: content,
          };
        }
      }

      console.log("Backup data prepared:", backupData);

      // Carica i dati su IPFS
      const result = await this.storageService.uploadJson(backupData);

      // Fai l'unpin del backup precedente solo dopo aver verificato che il nuovo è ok
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

  async restore(hash: string) {
    if (!this.storageService) {
      throw new Error("Storage service not initialized");
    }

    try {
      // Ottieni i dati direttamente da IPFS usando il gateway
      const backupData = await this.storageService.get(hash);
      console.log("Backup data received:", JSON.stringify(backupData, null, 2));

      if (!backupData || typeof backupData !== "object") {
        throw new Error("Invalid backup data format");
      }

      // Rimuovi la directory radata esistente
      await fsPromises.rm(this.radataPath, { recursive: true, force: true });
      console.log("Existing radata directory removed");

      // Crea la directory radata
      await fsPromises.mkdir(this.radataPath, { recursive: true });
      console.log("New radata directory created");

      // Ripristina ogni file esattamente come era
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
          // Mantieni la struttura esatta del file di Gun
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

      // Reinizializza Gun per caricare i nuovi dati
      const gunInstance = this.gun.getGunInstance();
      gunInstance.opt({ file: this.radataPath });

      // Attendi che Gun carichi i dati
      await new Promise(resolve => setTimeout(resolve, 2000));

      return true;
    } catch (err) {
      console.error("Restore failed:", err);
      throw err;
    }
  }

  // Metodo per rimuovere esplicitamente un backup
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

  // Metodi di utilità
  getGun() {
    return this.gun.getGunInstance();
  }

  getState() {
    return this.gun.getState();
  }

  private async getFileHash(content: string): Promise<string> {
    return keccak256(content);
  }

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
      // Ottieni i dati del backup remoto
      const remoteData = await this.storageService.get(hash);
      console.log("Remote data:", JSON.stringify(remoteData, null, 2));

      // Leggi i file locali
      const localFiles = await fsPromises.readdir(this.radataPath);
      const localData: Record<string, any> = {};

      // Carica i contenuti dei file locali
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

      // Confronta i backup
      const differences = {
        missingLocally: [] as string[],
        missingRemotely: [] as string[],
        contentMismatch: [] as string[],
      };

      // Controlla i file remoti
      for (const [fileName, fileData] of Object.entries(remoteData)) {
        if (!localData[fileName]) {
          differences.missingLocally.push(fileName);
        } else {
          // Confronta i contenuti normalizzati
          const remoteContent = JSON.stringify((fileData as BackupFileData).content);
          const localContent = JSON.stringify(localData[fileName].content);

          if (remoteContent !== localContent) {
            differences.contentMismatch.push(fileName);
          }
        }
      }

      // Controlla i file locali
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
