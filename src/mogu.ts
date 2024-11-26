import { VersionManager, VersionInfo, VersionComparison, DetailedComparison } from './versioning';
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
  private gun: any;
  private storage: any;
  private ipfsAdapter?: IPFSAdapter;
  private backupAdapter: BackupAdapter;
  private config: Required<MoguConfig>;

  constructor(config: MoguConfig, backupOptions?: BackupOptions) {
    const radataPath = config.radataPath || path.join(process.cwd(), "radata");
    
    this.config = {
      ...config,
      radataPath,
      useIPFS: config.useIPFS ?? false,
      server: config.server
    } as Required<MoguConfig>;

    this.versionManager = new VersionManager(this.config.radataPath);
    
    // Inizializza Gun
    this.gun = config.server ? 
      initGun(config.server, { file: this.config.radataPath }) : 
      initializeGun({ file: this.config.radataPath });

    // Inizializza storage
    this.storage = Web3Stash(config.storageService, config.storageConfig);

    // Inizializza IPFS se richiesto
    if (this.config.useIPFS) {
      this.ipfsAdapter = new IPFSAdapter(config.storageConfig);
    }

    // Inizializza il BackupAdapter
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

  async backup(): Promise<{ hash: string; versionInfo: VersionInfo; name: string }> {
    try {
      // Leggi tutti i file nella directory radata
      const files = await fs.readdir(this.config.radataPath);
      const backupData: Record<string, any> = {};

      // Leggi il contenuto di ogni file
      for (const file of files) {
        const filePath = path.join(this.config.radataPath, file);
        const stats = await fs.stat(filePath);
        
        // Salta le directory
        if (stats.isDirectory()) continue;
        
        const content = await fs.readFile(filePath, 'utf8');
        try {
          backupData[file] = JSON.parse(content);
        } catch {
          backupData[file] = content;
        }
      }

      // Converti i dati in Buffer
      const dataBuffer = Buffer.from(JSON.stringify(backupData));
      
      // Crea version info
      const versionInfo = await this.versionManager.createVersionInfo(dataBuffer);
      
      const metadata: BackupMetadata = {
        timestamp: Date.now(),
        type: 'mogu-backup',
        versionInfo
      };

      return this.backupAdapter.createBackup(backupData, metadata);
    } catch (error) {
      console.error('Errore durante il backup:', error);
      throw error;
    }
  }

  async restore(hash: string): Promise<boolean> {
    try {
      // Assicurati che l'hash sia una stringa valida
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }

      console.log('Recupero dati da hash:', hash);
      const backup = await this.backupAdapter.getBackup(hash);
      
      if (!backup?.data) {
        throw new Error('Nessun dato trovato per l\'hash fornito');
      }

      // Rimuovi la directory esistente
      await fs.remove(this.config.radataPath);
      console.log('Directory radata rimossa');
      
      // Ricrea la directory
      await fs.mkdirp(this.config.radataPath);
      console.log('Directory radata ricreata');

      // Ripristina i file dal backup
      for (const [fileName, fileData] of Object.entries(backup.data)) {
        const filePath = path.join(this.config.radataPath, fileName);
        await fs.writeFile(filePath, JSON.stringify(fileData));
        console.log(`File ripristinato: ${fileName}`);
      }

      // Reinizializza Gun con il nuovo path
      this.gun = this.config.server ? 
        initGun(this.config.server, { file: this.config.radataPath }) : 
        initializeGun({ file: this.config.radataPath });

      // Attendi che Gun si stabilizzi
      await new Promise(resolve => setTimeout(resolve, 2000));

      return true;
    } catch (error) {
      console.error('Errore durante il ripristino:', error);
      return false;
    }
  }

  async compareBackup(backupHash: string): Promise<VersionComparison> {
    try {
      // Leggi tutti i file nella directory radata
      const files = await fs.readdir(this.config.radataPath);
      const localData: Record<string, any> = {};

      // Leggi il contenuto di ogni file
      for (const file of files) {
        const filePath = path.join(this.config.radataPath, file);
        const stats = await fs.stat(filePath);
        
        // Salta le directory
        if (stats.isDirectory()) continue;
        
        const content = await fs.readFile(filePath, 'utf8');
        try {
          localData[file] = JSON.parse(content);
        } catch {
          localData[file] = content;
        }
      }

      // Recupera il backup completo
      const backup = await this.backupAdapter.getBackup(backupHash);
      
      if (!backup?.data || !backup?.metadata?.versionInfo) {
        throw new Error('Backup non valido: metadata mancanti');
      }

      // Ordina le chiavi degli oggetti per un confronto consistente
      const sortObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(sortObject);
        return Object.keys(obj).sort().reduce((result: any, key) => {
          result[key] = sortObject(obj[key]);
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
          isNewer: false, // Non importa in questo caso
          localVersion: remoteVersion, // Usa la versione remota per coerenza
          remoteVersion,
          timeDiff: 0,
          formattedDiff: "meno di un minuto"
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
      console.error('Errore durante il confronto:', error);
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
        
        // Salta le directory
        if (stats.isDirectory()) continue;
        
        const content = await fs.readFile(filePath, 'utf8');
        try {
          localData[file] = JSON.parse(content);
        } catch {
          localData[file] = content;
        }
      }

      // Converti i dati locali in Buffer
      const localDataBuffer = Buffer.from(JSON.stringify(localData));

      // Recupera il backup completo
      const backup = await this.backupAdapter.getBackup(backupHash);
      const remoteDataBuffer = Buffer.from(JSON.stringify(backup.data));
      
      return this.versionManager.compareDetailedVersions(localDataBuffer, remoteDataBuffer);
    } catch (error) {
      console.error('Errore durante il confronto dettagliato:', error);
      throw error;
    }
  }

  async getBackupState(hash: string): Promise<BackupData> {
    return this.backupAdapter.getBackup(hash);
  }
} 