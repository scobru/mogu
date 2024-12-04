import { IBackupAdapter, BackupResult, FileData, BackupOptions, StorageServiceWithMetadata } from "../types/backup";
import { VersionManager, VersionComparison, DetailedComparison, VersionInfo, FileDiff } from "../versioning";
import type { BackupMetadata, BackupData } from "../types/mogu";
import fs from "fs-extra";
import path from "path";
import { sha3_256 } from "js-sha3";
import { UploadOutput } from "../web3stash/types";
import { StorageService } from "../web3stash/services/base-storage";
import { Encryption } from "../utils/encryption";

export class FileBackupAdapter implements IBackupAdapter {
  private storage: StorageServiceWithMetadata;
  private originalStorage: StorageService;

  constructor(
    storage: StorageService,
    protected options: BackupOptions = {},
  ) {
    if (!storage.uploadJson) {
      throw new Error('Storage service must support uploadJson operation');
    }
    
    this.originalStorage = storage;
    this.storage = {
      ...storage,
      uploadJson: async (jsonData: Record<string, unknown>, options?: any) => {
        const result = await storage.uploadJson(jsonData, options);
        return {
          id: result.id,
          metadata: result.metadata || {}
        };
      },
      get: async (hash: string) => {
        if (!storage.get) {
          throw new Error('Storage service does not support get operation');
        }
        const result = await storage.get(hash);
        if (!result?.data || !result?.metadata) {
          throw new Error('Invalid backup format');
        }
        return result;
      },
      unpin: async (hash: string) => {
        if (!storage.unpin) {
          throw new Error('Storage service does not support unpin operation');
        }
        await storage.unpin(hash);
      }
    };
  }

  public getStorage(): StorageService {
    return this.originalStorage;
  }

  private isBinaryFile(filename: string): boolean {
    const binaryExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz",
    ];
    const ext = path.extname(filename).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".pdf": "application/pdf",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  protected generateBackupName(metadata: BackupMetadata): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");

    const type = metadata?.type || "backup";
    const size = metadata?.versionInfo?.size || 0;

    // Formatta la dimensione
    const sizeFormatted = this.formatSize(size);

    // Aggiungi tag personalizzati se presenti
    const tags = this.options.tags ? `-${this.options.tags.join("-")}` : "";

    return `mogu-${type}-${sizeFormatted}${tags}-${timestamp}`;
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  protected serializeMetadata(metadata: any): Record<string, string | number | boolean> {
    const serialized: Record<string, string | number | boolean> = {};

    const serialize = (obj: any): string | number | boolean => {
      if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
        return obj;
      }
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      return JSON.stringify(obj);
    };

    if (metadata && typeof metadata === "object") {
      for (const [key, value] of Object.entries(metadata)) {
        serialized[key] = serialize(value);
      }
    }

    return serialized;
  }

  protected async createBackupMetadata(data: any, options?: BackupOptions, name?: string): Promise<BackupMetadata> {
    const now = Date.now();
    return {
      timestamp: options?.timestamp || now,
      type: options?.type || "backup",
      name: name || this.generateBackupName({ type: options?.type } as BackupMetadata),
      description: options?.description,
      metadata: options?.metadata,
      versionInfo: {
        hash: "",
        timestamp: now,
        size: Buffer.from(JSON.stringify(data)).length,
        metadata: {
          createdAt: new Date(now).toISOString(),
          modifiedAt: new Date(now).toISOString(),
          checksum: "",
        },
      },
    };
  }

  async delete(hash: string): Promise<boolean> {
    if (!this.storage.unpin) {
      throw new Error('Storage service does not support delete operation');
    }
    
    try {
      await this.storage.unpin(hash);
      return true;
    } catch (error) {
      console.error('Delete operation failed:', error);
      return false;
    }
  }

  async backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult> {
    const backupData: Record<string, any> = {};

    // Funzione ricorsiva per processare le directory
    const processDirectory = async (dirPath: string, baseDir: string = "") => {
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        if (options?.excludePatterns?.some((pattern: string) => file.name.match(pattern))) continue;

        const fullPath = path.join(dirPath, file.name);
        const relativePath = path.join(baseDir, file.name).replace(/\\/g, "/");

        if (file.isDirectory()) {
          await processDirectory(fullPath, relativePath);
          continue;
        }

        const stats = await fs.stat(fullPath);
        if (options?.maxFileSize && stats.size > options.maxFileSize) continue;

        const content = await fs.readFile(fullPath);
        const isBinary = this.isBinaryFile(file.name);

        let fileData: FileData;

        if (options?.encryption?.enabled && options.encryption.key) {
          const encryption = new Encryption(options.encryption.key, options.encryption.algorithm);
          const { encrypted, iv } = encryption.encrypt(content);
          fileData = {
            isEncrypted: true,
            encrypted: encrypted.toString("base64"),
            iv: iv.toString("base64"),
            mimeType: this.getMimeType(file.name),
          };
        } else {
          fileData = {
            type: isBinary ? "binary" : "text",
            content: isBinary ? content.toString("base64") : content.toString("utf8"),
            mimeType: this.getMimeType(file.name),
          };
        }

        backupData[relativePath] = fileData;
      }
    };

    await processDirectory(sourcePath);

    const versionManager = new VersionManager(sourcePath);
    const versionInfo = await versionManager.createVersionInfo(Buffer.from(JSON.stringify(backupData)));

    const metadata: BackupMetadata = {
      timestamp: Date.now(),
      type: "file-backup",
      versionInfo,
    };

    const uploadData = {
      data: backupData,
      metadata,
    };

    const result = await this.storage.uploadJson(uploadData, {
      pinataMetadata: {
        name: path.basename(sourcePath),
      },
    });

    if (!result || !result.id) {
      throw new Error("Storage service did not return a valid hash");
    }

    return {
      hash: result.id,
      versionInfo,
      name: path.basename(sourcePath),
    };
  }

  async restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean> {
    const backup = await this.get(hash);
    if (!backup?.data) throw new Error("Invalid backup data");

    const encryption = options?.encryption?.enabled
      ? new Encryption(options.encryption.key, options.encryption.algorithm)
      : null;

    // Assicurati che la directory principale esista
    await fs.ensureDir(targetPath);

    for (const [fileName, fileData] of Object.entries<FileData>(backup.data)) {
      const filePath = path.join(targetPath, fileName);

      // Assicurati che la directory del file esista
      await fs.ensureDir(path.dirname(filePath));

      if (fileData.isEncrypted && encryption && fileData.encrypted && fileData.iv) {
        // Decripta il contenuto
        const encrypted = Buffer.from(fileData.encrypted, "base64");
        const iv = Buffer.from(fileData.iv, "base64");
        const decrypted = encryption.decrypt(encrypted, iv);
        await fs.writeFile(filePath, decrypted);
      } else if (fileData.type === "binary" && fileData.content) {
        // File binario non criptato
        await fs.writeFile(filePath, Buffer.from(fileData.content, "base64"));
      } else if (fileData.content) {
        // File di testo non criptato
        await fs.writeFile(filePath, fileData.content);
      } else {
        throw new Error(`Invalid file data for ${fileName}`);
      }
    }

    return true;
  }

  async get(hash: string): Promise<BackupData> {
    if (!this.storage.get) {
      throw new Error('Storage service does not support get operation');
    }
    const result = await this.storage.get(hash);
    if (!result?.data || !result?.metadata) {
      throw new Error('Invalid backup format');
    }
    return result as BackupData;
  }

  async compare(hash: string, sourcePath: string): Promise<VersionComparison> {
    try {
      // Recupera il backup
      const backup = await this.get(hash);
      if (!backup?.data || !backup?.metadata?.versionInfo) {
        throw new Error("Invalid backup: missing metadata");
      }

      // Prepara i dati locali nello stesso formato del backup
      const localData: Record<string, any> = {};
      const processDirectory = async (dirPath: string, baseDir: string = "") => {
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
          const fullPath = path.join(dirPath, file.name);
          const relativePath = path.join(baseDir, file.name).replace(/\\/g, "/");

          if (file.isDirectory()) {
            await processDirectory(fullPath, relativePath);
            continue;
          }

          const content = await fs.readFile(fullPath);
          const isBinary = this.isBinaryFile(file.name);

          localData[relativePath] = {
            type: isBinary ? "binary" : "text",
            content: isBinary ? content.toString("base64") : content.toString("utf8"),
            mimeType: this.getMimeType(file.name),
          };
        }
      };

      await processDirectory(sourcePath);

      // Crea buffer dei dati nello stesso formato
      const localBuffer = Buffer.from(JSON.stringify(localData));
      const remoteBuffer = Buffer.from(JSON.stringify(backup.data));

      // Usa VersionManager per confrontare
      const versionManager = new VersionManager(sourcePath);
      return versionManager.compareVersions(localBuffer, backup.metadata.versionInfo);
    } catch (error) {
      console.error("Error during comparison:", error);
      throw error;
    }
  }

  async compareDetailed(hash: string, sourcePath: string): Promise<DetailedComparison> {
    try {
      // Leggi i file locali
      const files = await fs.readdir(sourcePath);
      const localData: Record<string, any> = {};

      for (const file of files) {
        const filePath = path.join(sourcePath, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) continue;

        const content = await fs.readFile(filePath);
        localData[file] = {
          type: this.isBinaryFile(file) ? "binary" : "text",
          content: content.toString("base64"),
        };
      }

      // Recupera il backup
      const backup = await this.get(hash);
      if (!backup?.data) {
        throw new Error("Invalid backup: missing data");
      }

      const differences: FileDiff[] = [];
      const totalChanges = { added: 0, modified: 0, deleted: 0 };

      // Calcola checksum e dimensioni
      const calculateChecksum = (data: any): string => sha3_256(JSON.stringify(data));
      const getFileSize = (data: any): number => Buffer.from(JSON.stringify(data)).length;

      // Trova file modificati e aggiunti
      for (const [filePath, localContent] of Object.entries(localData)) {
        const remoteContent = backup.data[filePath];

        if (!remoteContent) {
          differences.push({
            path: filePath,
            type: "added",
            newChecksum: calculateChecksum(localContent),
            size: { new: getFileSize(localContent) },
          });
          totalChanges.added++;
        } else {
          const localChecksum = calculateChecksum(localContent);
          const remoteChecksum = calculateChecksum(remoteContent);

          if (localChecksum !== remoteChecksum) {
            differences.push({
              path: filePath,
              type: "modified",
              oldChecksum: remoteChecksum,
              newChecksum: localChecksum,
              size: {
                old: getFileSize(remoteContent),
                new: getFileSize(localContent),
              },
            });
            totalChanges.modified++;
          }
        }
      }

      // Trova file eliminati
      for (const filePath of Object.keys(backup.data)) {
        if (!localData[filePath]) {
          differences.push({
            path: filePath,
            type: "deleted",
            oldChecksum: calculateChecksum(backup.data[filePath]),
            size: { old: getFileSize(backup.data[filePath]) },
          });
          totalChanges.deleted++;
        }
      }

      // Crea version info
      const localDataBuffer = Buffer.from(JSON.stringify(localData));
      const localVersion = await new VersionManager(sourcePath).createVersionInfo(localDataBuffer);
      const remoteVersion = backup.metadata.versionInfo;

      return {
        isEqual: differences.length === 0,
        isNewer: localVersion.timestamp > remoteVersion.timestamp,
        localVersion,
        remoteVersion,
        timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
        formattedDiff: new VersionManager(sourcePath).formatTimeDifference(
          localVersion.timestamp,
          remoteVersion.timestamp,
        ),
        differences,
        totalChanges,
      };
    } catch (error) {
      console.error("Error during detailed comparison:", error);
      throw error;
    }
  }

  async upload(data: any, options?: BackupOptions): Promise<UploadOutput> {
    if (!this.storage.uploadJson) {
      throw new Error('Storage service does not support uploadJson operation');
    }
    return this.storage.uploadJson(data, options);
  }
}
