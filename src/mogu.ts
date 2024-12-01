import { VersionManager, VersionInfo, VersionComparison, DetailedComparison, FileDiff } from './versioning';
import { Web3Stash } from "./web3stash";
import type { MoguConfig, BackupMetadata, BackupData } from './types/mogu';
import fs from 'fs-extra';
import { IPFSAdapter } from "./adapters/ipfsAdapter";
import { initializeGun, initGun } from "./config/gun";
import path from 'path';
import { BackupAdapter, BackupOptions } from './adapters/backupAdapter';
import { sha3_256 } from 'js-sha3';

export class Mogu {
  private versionManager: VersionManager;
  public gun: any;
  private storage: any;
  private ipfsAdapter?: IPFSAdapter;
  private backupAdapter: BackupAdapter;
  private backupPath: string;
  public config: Required<MoguConfig>;

  constructor(config: MoguConfig, backupOptions?: BackupOptions) {
    const radataPath = config.radataPath || path.join(process.cwd(), "radata");
    this.backupPath = config.backupPath || path.join(process.cwd(), "backup");
    
    this.config = {
      ...config,
      radataPath,
      backupPath: this.backupPath,
      useIPFS: config.useIPFS ?? false,
      server: config.server
    } as Required<MoguConfig>;

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirpSync(this.backupPath);
    }

    this.versionManager = new VersionManager(this.config.radataPath);
    
    // Initialize Gun
    this.gun = config.server ? 
      initGun(config.server, { file: this.config.radataPath }) : 
      initializeGun({ file: this.config.radataPath });

    // Initialize storage
    this.storage = Web3Stash(config.storageService, config.storageConfig);

    // Initialize IPFS if requested
    if (this.config.useIPFS) {
      this.ipfsAdapter = new IPFSAdapter(config.storageConfig);
    }

    // Initialize BackupAdapter
    this.backupAdapter = new BackupAdapter(this.storage, backupOptions);
  }

  get(key: string) {
    return this.gun.get(key);
  }

  put(key: string, data: any) {
    return this.gun.get(key).put(data);
  }

  on(key: string, callback: (data: any) => void) {
    this.gun.get(key).on(callback);
  }

  async backup(customBackupPath?: string): Promise<{ hash: string; versionInfo: VersionInfo; name: string }> {
    try {
      const sourcePath = customBackupPath || this.config.radataPath;
      
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Path ${sourcePath} does not exist`);
      }

      // Read all files in the specified directory
      const files = await fs.readdir(sourcePath);
      const backupData: Record<string, any> = {};

      // Read the content of each file
      for (const file of files) {
        const filePath = path.join(sourcePath, file);
        const stats = await fs.stat(filePath);
        
        // Skip directories and backup files
        if (stats.isDirectory() || file.startsWith('backup_')) continue;
        
        // Determine if the file is binary or text
        const isBinary = this.isBinaryFile(file);
        
        if (isBinary) {
          // For binary files, read as Buffer and convert to base64
          const content = await fs.readFile(filePath);
          backupData[file] = {
            type: 'binary',
            content: content.toString('base64'),
            mimeType: this.getMimeType(file)
          };
        } else {
          // For text files, read as UTF-8
          const content = await fs.readFile(filePath, 'utf8');
          try {
            backupData[file] = {
              type: 'text',
              content: JSON.parse(content)
            };
          } catch {
            backupData[file] = {
              type: 'text',
              content
            };
          }
        }
      }

      // Create version info
      const dataBuffer = Buffer.from(JSON.stringify(backupData));
      const versionInfo = await this.versionManager.createVersionInfo(dataBuffer);
      
      const metadata: BackupMetadata = {
        timestamp: Date.now(),
        type: 'mogu-backup',
        versionInfo,
        sourcePath
      };

      const backupResult = await this.backupAdapter.createBackup(backupData, metadata);

      // Save a local copy
      const backupFileName = `backup_${Date.now()}.json`;
      const backupFilePath = path.join(this.backupPath, backupFileName);
      await fs.writeFile(backupFilePath, JSON.stringify({
        data: backupData,
        metadata
      }, null, 2));

      return backupResult;
    } catch (error) {
      console.error('Error during backup:', error);
      throw error;
    }
  }

  async restore(hash: string, customRestorePath?: string): Promise<boolean> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Invalid hash');
      }

      console.log('Retrieving data from hash:', hash);
      const backup = await this.backupAdapter.getBackup(hash);
      
      if (!backup?.data) {
        throw new Error('No data found for the provided hash');
      }

      const restorePath = customRestorePath || this.config.radataPath;

      // Remove existing directory
      await fs.remove(restorePath);
      console.log('Directory removed:', restorePath);
      
      // Recreate directory
      await fs.mkdirp(restorePath);
      console.log('Directory recreated:', restorePath);

      // Restore files from backup
      for (const [fileName, fileData] of Object.entries(backup.data)) {
        // Skip backup files
        if (fileName.startsWith('backup_')) continue;
        
        const filePath = path.join(restorePath, fileName);
        
        if (typeof fileData === 'object' && fileData.type) {
          if (fileData.type === 'binary') {
            // Restore binary file from base64
            const buffer = Buffer.from(fileData.content, 'base64');
            await fs.writeFile(filePath, buffer);
          } else {
            // Restore text file
            const content = typeof fileData.content === 'string' 
              ? fileData.content 
              : JSON.stringify(fileData.content);
            await fs.writeFile(filePath, content);
          }
        } else {
          // Legacy handling for compatibility
          const content = typeof fileData === 'string' ? fileData : JSON.stringify(fileData);
          await fs.writeFile(filePath, content);
        }
        console.log(`File restored: ${fileName}`);
      }

      // Wait for files to be written
      await new Promise(resolve => setTimeout(resolve, 1000));

      // If we're restoring to the radata directory, reinitialize Gun
      if (restorePath === this.config.radataPath) {
        this.gun = this.config.server ? 
          initGun(this.config.server, { file: restorePath }) : 
          initializeGun({ file: restorePath });

        // Wait for Gun to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return true;
    } catch (error) {
      console.error('Error during restore:', error);
      throw error;
    }
  }

  async compareBackup(backupHash: string): Promise<VersionComparison> {
    try {
      // Read all files in the radata directory
      const files = await fs.readdir(this.config.radataPath);
      const localData: Record<string, any> = {};

      // Leggi il contenuto di ogni file
      for (const file of files) {
        const filePath = path.join(this.config.radataPath, file);
        const stats = await fs.stat(filePath);
        
        // Salta le directory e i file di backup
        if (stats.isDirectory() || file.startsWith('backup_')) continue;
        
        // Determina se il file è binario o di testo
        const isBinary = this.isBinaryFile(file);
        
        if (isBinary) {
          // Per i file binari, leggi come Buffer e converti in base64
          const content = await fs.readFile(filePath);
          localData[file] = {
            type: 'binary',
            content: content.toString('base64'),
            mimeType: this.getMimeType(file)
          };
        } else {
          // Per i file di testo, leggi come UTF-8
          const content = await fs.readFile(filePath, 'utf8');
          try {
            localData[file] = {
              type: 'text',
              content: JSON.parse(content)
            };
          } catch {
            localData[file] = {
              type: 'text',
              content
            };
          }
        }
      }

      // Recupera il backup completo
      const backup = await this.backupAdapter.getBackup(backupHash);
      
      if (!backup?.data || !backup?.metadata?.versionInfo) {
        throw new Error('Invalid backup: missing metadata');
      }

      // Funzione per normalizzare i dati per il confronto
      const normalizeData = (data: any): any => {
        if (typeof data !== 'object' || data === null) return data;
        if (data.type === 'binary') {
          // Per i file binari, confronta solo il contenuto base64
          return data.content;
        }
        if (data.type === 'text') {
          // Per i file di testo, confronta il contenuto
          return typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
        }
        // Gestione legacy
        return JSON.stringify(data);
      };

      // Ordina le chiavi degli oggetti per un confronto consistente
      const sortObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(sortObject);
        return Object.keys(obj).sort().reduce((result: any, key) => {
          result[key] = normalizeData(obj[key]);
          return result;
        }, {});
      };

      // Normalizza e ordina i dati per il confronto
      const normalizedLocalData = sortObject(localData);
      const normalizedRemoteData = sortObject(backup.data);

      // Confronta i dati effettivi
      const localDataStr = JSON.stringify(normalizedLocalData);
      const remoteDataStr = JSON.stringify(normalizedRemoteData);
      const localChecksum = sha3_256(Buffer.from(localDataStr));
      const remoteChecksum = sha3_256(Buffer.from(remoteDataStr));

      const localVersion: VersionInfo = {
        hash: localChecksum,
        timestamp: Date.now(),
        size: Buffer.from(localDataStr).length,
        metadata: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          checksum: localChecksum
        }
      };

      const remoteVersion = backup.metadata.versionInfo;

      // Se i contenuti sono uguali, usa i metadata remoti per mantenere la coerenza
      if (localChecksum === remoteChecksum) {
        return {
          isEqual: true,
          isNewer: false,
          localVersion: remoteVersion,
          remoteVersion,
          timeDiff: 0,
          formattedDiff: "less than a minute"
        };
      }

      return {
        isEqual: false,
        isNewer: localVersion.timestamp > remoteVersion.timestamp,
        localVersion,
        remoteVersion,
        timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
        formattedDiff: this.versionManager.formatTimeDifference(
          localVersion.timestamp, 
          remoteVersion.timestamp
        )
      };
    } catch (error) {
      console.error('Error during comparison:', error);
      throw error;
    }
  }

  async compareDetailedBackup(backupHash: string): Promise<DetailedComparison> {
    try {
      // Leggi tutti i file nella directory radata
      const files = await fs.readdir(this.config.radataPath);
      const localData: Record<string, any> = {};

      // Leggi il contenuto di ogni file
      for (const file of files) {
        const filePath = path.join(this.config.radataPath, file);
        const stats = await fs.stat(filePath);
        
        // Salta le directory e i file di backup
        if (stats.isDirectory() || file.startsWith('backup_')) continue;
        
        // Determina se il file è binario o di testo
        const isBinary = this.isBinaryFile(file);
        
        if (isBinary) {
          // Per i file binari, leggi come Buffer e converti in base64
          const content = await fs.readFile(filePath);
          localData[file] = {
            type: 'binary',
            content: content.toString('base64'),
            mimeType: this.getMimeType(file)
          };
        } else {
          // Per i file di testo, leggi come UTF-8
          const content = await fs.readFile(filePath, 'utf8');
          try {
            localData[file] = {
              type: 'text',
              content: JSON.parse(content)
            };
          } catch {
            localData[file] = {
              type: 'text',
              content
            };
          }
        }
      }

      // Recupera il backup completo
      const backup = await this.backupAdapter.getBackup(backupHash);
      
      if (!backup?.data) {
        throw new Error('Backup not valid: missing metadata');
      }

      // Funzione per calcolare il checksum di un file
      const calculateChecksum = (data: any): string => {
        if (typeof data === 'object' && data.type) {
          if (data.type === 'binary') {
            return sha3_256(data.content);
          }
          return sha3_256(JSON.stringify(data.content));
        }
        return sha3_256(JSON.stringify(data));
      };

      // Funzione per ottenere la dimensione di un file
      const getFileSize = (data: any): number => {
        if (typeof data === 'object' && data.type) {
          if (data.type === 'binary') {
            return Buffer.from(data.content, 'base64').length;
          }
          return Buffer.from(JSON.stringify(data.content)).length;
        }
        return Buffer.from(JSON.stringify(data)).length;
      };

      const differences: FileDiff[] = [];
      const totalChanges = { added: 0, modified: 0, deleted: 0 };

      // Trova file modificati e aggiunti
      for (const [filePath, localContent] of Object.entries(localData)) {
        const remoteContent = backup.data[filePath];
        
        if (!remoteContent) {
          // File aggiunto
          differences.push({
            path: filePath,
            type: 'added',
            newChecksum: calculateChecksum(localContent),
            size: { new: getFileSize(localContent) }
          });
          totalChanges.added++;
        } else {
          // Confronta i contenuti
          const localChecksum = calculateChecksum(localContent);
          const remoteChecksum = calculateChecksum(remoteContent);
          
          if (localChecksum !== remoteChecksum) {
            // File modificato
            differences.push({
              path: filePath,
              type: 'modified',
              oldChecksum: remoteChecksum,
              newChecksum: localChecksum,
              size: {
                old: getFileSize(remoteContent),
                new: getFileSize(localContent)
              }
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
            type: 'deleted',
            oldChecksum: calculateChecksum(backup.data[filePath]),
            size: { old: getFileSize(backup.data[filePath]) }
          });
          totalChanges.deleted++;
        }
      }

      // Crea version info per entrambe le versioni
      const localDataBuffer = Buffer.from(JSON.stringify(localData));
      const remoteDataBuffer = Buffer.from(JSON.stringify(backup.data));
      
      const localVersion = await this.versionManager.createVersionInfo(localDataBuffer);
      const remoteVersion = backup.metadata.versionInfo;

      return {
        isEqual: differences.length === 0,
        isNewer: localVersion.timestamp > remoteVersion.timestamp,
        localVersion,
        remoteVersion,
        timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
        formattedDiff: this.versionManager.formatTimeDifference(
          localVersion.timestamp,
          remoteVersion.timestamp
        ),
        differences,
        totalChanges
      };
    } catch (error) {
      console.error('Errore durante il confronto dettagliato:', error);
      throw error;
    }
  }

  async getBackupState(hash: string): Promise<BackupData> {
    return this.backupAdapter.getBackup(hash);
  }

  // Utility per determinare se un file è binario basandosi sull'estensione
  private isBinaryFile(filename: string): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.zip', '.rar', '.7z', '.tar', '.gz'
    ];
    const ext = path.extname(filename).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  // Utility per ottenere il MIME type
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.pdf': 'application/pdf',
      // ... altri tipi MIME ...
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
} 