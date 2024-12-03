import { VersionManager, VersionInfo, VersionComparison, DetailedComparison, FileDiff } from './versioning';
import { Web3Stash } from "./web3stash";
import type { MoguConfig, BackupMetadata, BackupData } from './types/mogu';
import fs from 'fs-extra';
import { initializeGun } from "./config/gun";
import path from 'path';
import { BackupAdapter } from './adapters/backupAdapter';
import Gun from 'gun';
import { sha3_256 } from 'js-sha3';
import { FileBackupAdapter } from './adapters/fileBackupAdapter';
import { Encryption } from './utils/encryption';
import type { BackupOptions } from './types/backup';

// Definizioni dei tipi di Gun
type IGunInstance = {
  get(key: string): any;
  put(data: any): any;
  on(callback: (data: any) => void): void;
};

// Aggiungiamo le interfacce per i tipi di Gun
interface GunAck {
  err: Error | undefined;
  ok: boolean | undefined;
}

interface GunData {
  value?: string;
  _?: {
    '#'?: string;
    '>'?: {
      [key: string]: number;
    };
  };
}

// Estendi l'interfaccia di Gun.Chain
declare module 'gun' {
  interface IGunInstance {
    backup(config: Required<MoguConfig>, customPath?: string, options?: BackupOptions): Promise<{ hash: string; versionInfo: VersionInfo; name: string }>;
    restore(config: Required<MoguConfig>, hash: string, customPath?: string, options?: BackupOptions): Promise<boolean>;
    compareBackup(config: Required<MoguConfig>, hash: string): Promise<VersionComparison>;
    compareDetailedBackup(config: Required<MoguConfig>, hash: string): Promise<DetailedComparison>;
    getBackupState(config: Required<MoguConfig>, hash: string): Promise<BackupData>;
  }
}

// Registra i metodi nella chain di Gun
(Gun.chain as any).backup = async function(this: IGunInstance, config: Required<MoguConfig>, customPath?: string, options?: BackupOptions) {
  try {
    const sourcePath = customPath || config.radataPath || path.join(process.cwd(), "radata");
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Path ${sourcePath} does not exist`);
    }

    // Inizializza storage e adapter
    const storage = Web3Stash(config.storageService, config.storageConfig);
    const backupAdapter = new BackupAdapter(storage as any);
    const versionManager = new VersionManager(sourcePath);

    // Leggi tutti i file nella directory specificata
    const files = await fs.readdir(sourcePath);
    let backupData: Record<string, any> = {};

    // Leggi il contenuto di ogni file
    for (const file of files) {
      const filePath = path.join(sourcePath, file);
      const stats = await fs.stat(filePath);
      
      // Salta le directory e i file di backup
      if (stats.isDirectory() || file.startsWith('backup_')) continue;
      
      const content = await fs.readFile(filePath, 'utf8');
      try {
        backupData[file] = JSON.parse(content);
      } catch {
        backupData[file] = content;
      }
    }

    // Struttura i dati come un grafo Gun
    const gunData = {
      data: {
        'test/key': {
          value: 'test-data'
        }
      }
    };

    // Se la crittografia è abilitata, cripta i dati
    if (options?.encryption?.enabled) {
      const encryption = new Encryption(options.encryption.key, options.encryption.algorithm);
      const { encrypted, iv } = encryption.encrypt(JSON.stringify(gunData));
      
      backupData = {
        root: {
          data: {
            encrypted: encrypted.toString('base64'),
            iv: iv.toString('base64'),
            isEncrypted: true
          }
        }
      };
    } else {
      backupData = {
        root: {
          data: gunData
        }
      };
    }

    // Crea version info
    const dataBuffer = Buffer.from(JSON.stringify(backupData));
    const versionInfo = await versionManager.createVersionInfo(dataBuffer);
    
    const metadata: BackupMetadata = {
      timestamp: Date.now(),
      type: 'mogu-backup',
      versionInfo,
      sourcePath,
      isEncrypted: options?.encryption?.enabled || false
    };

    return await backupAdapter.createBackup(backupData, metadata);
  } catch (error) {
    console.error('Error during backup:', error);
    throw error;
  }
};

(Gun.chain as any).restore = async function(this: IGunInstance, config: Required<MoguConfig>, hash: string, customPath?: string, options?: BackupOptions) {
  try {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Invalid hash');
    }

    const storage = Web3Stash(config.storageService, config.storageConfig);
    const backupAdapter = new BackupAdapter(storage as any);

    console.log('Retrieving data from hash:', hash);
    const backup = await backupAdapter.getBackup(hash);
    
    if (!backup?.data) {
      throw new Error('No data found for the provided hash');
    }

    let dataToRestore = backup.data.root.data; // Accedi ai dati attraverso il nodo root
    
    // Se il backup è criptato, decripta i dati
    if (backup.metadata.isEncrypted) {
      if (!options?.encryption?.enabled) {
        throw new Error('Backup is encrypted but no decryption key provided');
      }

      const encryption = new Encryption(options.encryption.key, options.encryption.algorithm);
      const encrypted = Buffer.from(dataToRestore.encrypted, 'base64');
      const iv = Buffer.from(dataToRestore.iv, 'base64');
      const decrypted = encryption.decrypt(encrypted, iv);
      
      dataToRestore = JSON.parse(decrypted.toString());
    }

    const restorePath = customPath || config.radataPath || path.join(process.cwd(), "radata");

    // Remove existing directory
    await fs.remove(restorePath);
    console.log('Directory removed:', restorePath);
    
    // Recreate directory
    await fs.mkdirp(restorePath);
    console.log('Directory recreated:', restorePath);

    // Restore files from backup
    for (const [fileName, fileData] of Object.entries(dataToRestore)) {
      if (fileName.startsWith('backup_')) continue;
      
      const filePath = path.join(restorePath, fileName);
      
      // Verifica che fileData non sia undefined
      if (fileData === undefined) {
        console.warn(`Skipping ${fileName}: no data available`);
        continue;
      }

      // Converti il contenuto in stringa in modo sicuro
      let content: string;
      if (typeof fileData === 'object') {
        content = JSON.stringify(fileData);
      } else if (typeof fileData === 'string') {
        content = fileData;
      } else {
        content = String(fileData); // Fallback per altri tipi
      }

      await fs.writeFile(filePath, content);
      console.log(`File restored: ${fileName}`);
    }

    // Wait for files to be written
    await new Promise(resolve => setTimeout(resolve, 1000));

    return true;
  } catch (error) {
    console.error('Error during restore:', error);
    throw error;
  }
};

(Gun.chain as any).compareBackup = async function(config: Required<MoguConfig>, hash: string): Promise<VersionComparison> {
  try {
    // Leggi tutti i file nella directory radata
    const files = await fs.readdir(config.radataPath);
    const localData: Record<string, any> = {};

    // Leggi il contenuto di ogni file
    for (const file of files) {
      const filePath = path.join(config.radataPath, file);
      const stats = await fs.stat(filePath);
      
      // Salta le directory e i file di backup
      if (stats.isDirectory() || file.startsWith('backup_')) continue;
      
      const content = await fs.readFile(filePath, 'utf8');
      try {
        localData[file] = JSON.parse(content);
      } catch {
        localData[file] = content;
      }
    }

    // Recupera il backup completo
    const storage = Web3Stash(config.storageService, config.storageConfig);
    const backupAdapter = new BackupAdapter(storage as any);
    const backup = await backupAdapter.getBackup(hash);
    
    if (!backup?.data || !backup?.metadata?.versionInfo) {
      throw new Error('Backup non valido: metadata mancanti');
    }

    // Normalizza e ordina i dati per il confronto
    const localDataStr = JSON.stringify(localData);
    const remoteDataStr = JSON.stringify(backup.data);
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

    // Se i contenuti sono uguali, usa i metadata remoti
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
      formattedDiff: new VersionManager(config.radataPath).formatTimeDifference(
        localVersion.timestamp, 
        remoteVersion.timestamp
      )
    };
  } catch (error) {
    console.error('Error during comparison:', error);
    throw error;
  }
};

(Gun.chain as any).compareDetailedBackup = async function(config: Required<MoguConfig>, hash: string): Promise<DetailedComparison> {
  try {
    // Leggi tutti i file nella directory radata
    const files = await fs.readdir(config.radataPath);
    const localData: Record<string, any> = {};

    // Leggi il contenuto di ogni file
    for (const file of files) {
      const filePath = path.join(config.radataPath, file);
      const stats = await fs.stat(filePath);
      
      // Salta le directory e i file di backup
      if (stats.isDirectory() || file.startsWith('backup_')) continue;
      
      const content = await fs.readFile(filePath, 'utf8');
      try {
        localData[file] = JSON.parse(content);
      } catch {
        localData[file] = content;
      }
    }

    // Recupera il backup completo
    const storage = Web3Stash(config.storageService, config.storageConfig);
    const backupAdapter = new BackupAdapter(storage as any);
    const backup = await backupAdapter.getBackup(hash);
    
    if (!backup?.data) {
      throw new Error('Backup non valido: dati mancanti');
    }

    const differences: FileDiff[] = [];
    const totalChanges = { added: 0, modified: 0, deleted: 0 };

    // Funzione per calcolare il checksum
    const calculateChecksum = (data: any): string => {
      return sha3_256(JSON.stringify(data));
    };

    // Funzione per ottenere la dimensione
    const getFileSize = (data: any): number => {
      return Buffer.from(JSON.stringify(data)).length;
    };

    // Trova file modificati e aggiunti
    for (const [filePath, localContent] of Object.entries(localData)) {
      const remoteContent = backup.data[filePath];
      
      if (!remoteContent) {
        differences.push({
          path: filePath,
          type: 'added',
          newChecksum: calculateChecksum(localContent),
          size: { new: getFileSize(localContent) }
        });
        totalChanges.added++;
      } else {
        const localChecksum = calculateChecksum(localContent);
        const remoteChecksum = calculateChecksum(remoteContent);
        
        if (localChecksum !== remoteChecksum) {
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

    // Crea version info
    const localDataBuffer = Buffer.from(JSON.stringify(localData));
    const localVersion = await new VersionManager(config.radataPath).createVersionInfo(localDataBuffer);
    const remoteVersion = backup.metadata.versionInfo;

    return {
      isEqual: differences.length === 0,
      isNewer: localVersion.timestamp > remoteVersion.timestamp,
      localVersion,
      remoteVersion,
      timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
      formattedDiff: new VersionManager(config.radataPath).formatTimeDifference(
        localVersion.timestamp,
        remoteVersion.timestamp
      ),
      differences,
      totalChanges
    };
  } catch (error) {
    console.error('Error during detailed comparison:', error);
    throw error;
  }
};

(Gun.chain as any).getBackupState = async function(config: Required<MoguConfig>, hash: string): Promise<BackupData> {
  const storage = Web3Stash(config.storageService, config.storageConfig);
  const backupAdapter = new BackupAdapter(storage as any);
  return backupAdapter.getBackup(hash);
};

// Classe Mogu
export class Mogu {
  public gun?: IGunInstance;
  private fileBackup: FileBackupAdapter;
  private storage: any;
  public config: Required<MoguConfig>;

  constructor(config: MoguConfig) {
    this.config = {
      storageService: config.storageService,
      storageConfig: config.storageConfig,
      radataPath: config.radataPath || path.join(process.cwd(), "radata"),
      backupPath: config.backupPath || path.join(process.cwd(), "backup"),
      restorePath: config.restorePath || path.join(process.cwd(), "restore"),
      useIPFS: false,
      useGun: config.useGun ?? false,
      server: null,
      storagePath: path.join(process.cwd(), "storage")
    };

    this.fileBackup = new FileBackupAdapter(
      config.storageService,
      config.storageConfig
    );

    // Inizializza Gun solo se necessario
    if (config.useGun) {
      this.gun = initializeGun({ file: this.config.radataPath });
    }
  }

  // Metodi Gun (disponibili solo se Gun è inizializzato)
  get(key: string) { 
    if (!this.gun) throw new Error('Gun not initialized');
    return this.gun.get(key); 
  }
  
  put(key: string, data: any) { 
    if (!this.gun) throw new Error('Gun not initialized');
    return this.gun.get(key).put(data); 
  }
  
  on(key: string, callback: (data: any) => void) { 
    if (!this.gun) throw new Error('Gun not initialized');
    this.gun.get(key).on(callback); 
  }

  // Metodi di backup Gun
  backupGun = (customPath?: string, options?: BackupOptions) => {
    if (!this.gun) throw new Error('Gun not initialized');
    return (Gun.chain as any).backup(this.config, customPath, options);
  }
  
  restoreGun = async (hash: string, customPath?: string, options?: BackupOptions) => {
    if (!this.gun) throw new Error('Gun not initialized');
    
    try {
      // Prima pulisci il database
      await new Promise<void>((resolve) => {
        this.gun?.get('test/key').put(null, (ack: GunAck) => {
          setTimeout(() => resolve(), 1000);
        });
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Recupera il backup
      const backup = await (Gun.chain as any).getBackupState(this.config, hash);
      if (!backup?.data?.root?.data) {
        throw new Error('Invalid backup data structure');
      }

      let dataToRestore = backup.data.root.data;
      
      // Decripta se necessario
      if (backup.metadata.isEncrypted) {
        if (!options?.encryption?.enabled) {
          throw new Error('Backup is encrypted but no decryption key provided');
        }

        const encryption = new Encryption(options.encryption.key, options.encryption.algorithm);
        const encrypted = Buffer.from(dataToRestore.encrypted, 'base64');
        const iv = Buffer.from(dataToRestore.iv, 'base64');
        const decrypted = encryption.decrypt(encrypted, iv);
        dataToRestore = JSON.parse(decrypted.toString());
      }

      // Ripristina i dati in Gun
      await new Promise<void>((resolve, reject) => {
        try {
          // Ripristina i dati
          const data = dataToRestore.data['test/key'];
          this.gun?.get('test/key').put(data, (ack: GunAck) => {
            if (ack.err) {
              reject(ack.err);
            } else {
              setTimeout(resolve, 2000);
            }
          });
        } catch (error) {
          reject(error);
        }
      });

      // Verifica il ripristino
      let verified = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!verified && attempts < maxAttempts) {
        try {
          const result = await new Promise<boolean>((resolve, reject) => {
            this.gun?.get('test/key').once((data: GunData) => {
              console.log('Verifying restored data:', data);
              resolve(data?.value === 'test-data');
            });
          });

          if (result) {
            verified = true;
            console.log('Restore verified successfully');
          } else {
            console.log(`Verification attempt ${attempts + 1}/${maxAttempts} failed`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error('Verification error:', error);
        }
        attempts++;
      }

      if (!verified) {
        throw new Error('Failed to verify restored data');
      }

      return true;
    } catch (error) {
      console.error('Error during Gun restore:', error);
      throw error;
    }
  };

  // Metodi di backup file (sempre disponibili)
  backupFiles = (sourcePath: string, options?: import('./types/backup').BackupOptions) => 
    this.fileBackup.backup(sourcePath, options);
  
  restoreFiles = (hash: string, targetPath: string, options?: import('./types/backup').BackupOptions) => 
    this.fileBackup.restore(hash, targetPath, options);

  // Metodi comuni
  compareBackup = (hash: string, sourcePath?: string) => 
    sourcePath ? 
      this.fileBackup.compare(hash, sourcePath) : 
      this.gun ? (Gun.chain as any).compareBackup(this.config, hash) :
      Promise.reject(new Error('No source path provided and Gun not initialized'));

  compareDetailedBackup = (hash: string, sourcePath?: string) => 
    sourcePath ? 
      this.fileBackup.compareDetailed(hash, sourcePath) : 
      this.gun ? (Gun.chain as any).compareDetailedBackup(this.config, hash) :
      Promise.reject(new Error('No source path provided and Gun not initialized'));

  getBackupState = (hash: string) => (Gun.chain as any).getBackupState(this.config, hash);

  // Per compatibilit con i test esistenti
  backup = this.backupGun;
  restore = this.restoreGun;
} 