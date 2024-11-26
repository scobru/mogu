import { VersionManager, VersionInfo, VersionComparison, DetailedComparison } from './versioning';
import { Web3Stash } from "./web3stash";
import type { MoguConfig, BackupMetadata } from './types/mogu';
import fs from 'fs-extra';
import { IPFSAdapter } from "./adapters/ipfsAdapter";
import { initializeGun, initGun } from "./config/gun";
import path from 'path';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';

export class Mogu {
  private versionManager: VersionManager;
  private gun: any;
  private storage: any;
  private ipfsAdapter?: IPFSAdapter;
  private config: Required<MoguConfig>;

  constructor(config: MoguConfig) {
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

  async backup(): Promise<{ hash: string; versionInfo: VersionInfo }> {
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

      // Carica i dati
      const result = await this.storage.uploadJson(backupData, { metadata });
      return { 
        hash: result.id, // Usa l'ID restituito da Pinata
        versionInfo 
      };
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
      const remoteData = await this.storage.get(hash);
      
      if (!remoteData) {
        throw new Error('Nessun dato trovato per l\'hash fornito');
      }

      // Assicurati che i dati siano in formato corretto
      const backupData = typeof remoteData === 'string' ? 
        JSON.parse(remoteData) : remoteData;

      // Rimuovi la directory esistente
      await fs.remove(this.config.radataPath);
      console.log('Directory radata rimossa');
      
      // Ricrea la directory
      await fs.mkdirp(this.config.radataPath);
      console.log('Directory radata ricreata');

      // Ripristina i file dal backup
      for (const [fileName, fileData] of Object.entries(backupData)) {
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

      // Converti i dati locali in Buffer
      const localDataBuffer = Buffer.from(JSON.stringify(localData));

      // Recupera i dati remoti e i metadata
      const remoteData = await this.storage.get(backupHash);
      const metadata = await this.storage.getMetadata(backupHash);
      
      if (!metadata?.versionInfo) {
        throw new Error('Backup non valido: metadata mancanti');
      }

      return this.versionManager.compareVersions(localDataBuffer, metadata.versionInfo);
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

      // Recupera i dati remoti
      const remoteData = await this.storage.get(backupHash);
      const remoteDataBuffer = Buffer.from(JSON.stringify(remoteData));
      
      return this.versionManager.compareDetailedVersions(localDataBuffer, remoteDataBuffer);
    } catch (error) {
      console.error('Errore durante il confronto dettagliato:', error);
      throw error;
    }
  }
} 