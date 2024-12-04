import { StorageService } from "./base-storage";
import type { UploadOutput, PinataServiceConfig } from "../types";
import { PinataSDK } from "pinata-web3";
import { BackupData } from '../../types/mogu';
import fs from 'fs';
import { VersionInfo } from "../../versioning";
import crypto from 'crypto';

interface PinataOptions {
  pinataMetadata?: {
    name?: string;
    keyvalues?: Record<string, string | number | null>;
  };
}

export class PinataService extends StorageService {
  public serviceBaseUrl = "ipfs://";
  public readonly serviceInstance: PinataSDK;
  private readonly gateway: string;

  constructor(config: PinataServiceConfig) {
    super();
    if (!config.pinataJwt) {
      throw new Error('JWT Pinata non valido o mancante');
    }
    
    this.serviceInstance = new PinataSDK({
      pinataJwt: config.pinataJwt,
      pinataGateway: config.pinataGateway || "gateway.pinata.cloud"
    });
    this.gateway = config.pinataGateway || "gateway.pinata.cloud";
  }

  private createVersionInfo(data: any): VersionInfo {
    const now = Date.now();
    const dataBuffer = Buffer.from(JSON.stringify(data));
    return {
      hash: crypto.createHash('sha256').update(dataBuffer).digest('hex'),
      timestamp: now,
      size: dataBuffer.length,
      metadata: {
        createdAt: new Date(now).toISOString(),
        modifiedAt: new Date(now).toISOString(),
        checksum: crypto.createHash('md5').update(dataBuffer).digest('hex')
      }
    };
  }

  public async get(hash: string): Promise<BackupData> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }

      console.log('Recupero dati da Pinata per hash:', hash);
      const response = await this.serviceInstance.gateways.get(hash);
      console.log('Risposta ricevuta da Pinata:', JSON.stringify(response, null, 2));

      if (!response || typeof response !== 'object') {
        throw new Error('Risposta non valida da Pinata');
      }

      // Se la risposta è una stringa JSON, proviamo a parsarla
      let parsedResponse = response;
      if (typeof response === 'string') {
        try {
          parsedResponse = JSON.parse(response);
          console.log('Risposta parsata:', JSON.stringify(parsedResponse, null, 2));
        } catch (e) {
          throw new Error('Dati non validi ricevuti da Pinata');
        }
      }

      // Verifichiamo che la risposta abbia la struttura corretta
      const responseData = parsedResponse as { data?: { data?: unknown; metadata?: unknown } };
      console.log('Dati di backup:', JSON.stringify(responseData, null, 2));

      if (!responseData.data?.data) {
        throw new Error('Struttura dati non valida nel backup');
      }

      // Estraiamo i dati dalla struttura nidificata
      const backupData = {
        data: responseData.data.data,
        metadata: responseData.data.metadata || {
          timestamp: Date.now(),
          type: 'json',
          versionInfo: this.createVersionInfo(responseData.data.data)
        }
      };

      // Verifichiamo che i dati dei file abbiano la struttura corretta
      const fileData = backupData.data as Record<string, any>;
      for (const [path, data] of Object.entries(fileData)) {
        if (!data.type || !data.content) {
          throw new Error(`Dati non validi per il file: ${path}`);
        }
      }

      //console.log('Dati di backup formattati:', JSON.stringify(backupData, null, 2));
      return backupData as BackupData;
    } catch (error) {
      console.error('Errore nel recupero da Pinata:', error);
      throw error;
    }
  }

  public getEndpoint(): string {
    return `https://${this.gateway}/ipfs/`;
  }

  public async unpin(hash: string): Promise<void> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }
      console.log(`Tentativo di unpin per l'hash: ${hash}`);
      
      // Prima verifica se è già unpinnato
      const isPinnedBefore = await this.isPinned(hash);
      if (!isPinnedBefore) {
        console.log(`L'hash ${hash} è già unpinnato`);
        return;
      }

      // Esegui l'unpin
      await this.serviceInstance.unpin([hash]);
      console.log(`Comando unpin eseguito per l'hash: ${hash}`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('is not pinned') || error.message.includes('NOT_FOUND')) {
          console.log(`L'hash ${hash} non è pinnato nel servizio`);
          return;
        }
        if (error.message.includes('INVALID_CREDENTIALS')) {
          throw new Error('Errore di autenticazione con Pinata: verifica il JWT');
        }
      }
      console.error('Errore durante unpin da Pinata:', error);
      throw error;
    }
  }

  public async uploadJson(jsonData: Record<string, unknown>, options?: PinataOptions): Promise<UploadOutput> {
    try {
      const content = JSON.stringify(jsonData);
      const response = await this.serviceInstance.upload.json(jsonData, {
        metadata: options?.pinataMetadata
      });
      
      return {
        id: response.IpfsHash,
        metadata: {
          timestamp: Date.now(),
          size: content.length,
          type: 'json',
          ...response
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('INVALID_CREDENTIALS')) {
        throw new Error('Errore di autenticazione con Pinata: verifica il JWT');
      }
      console.error("Errore con Pinata:", error);
      throw error;
    }
  }

  public async uploadFile(path: string, options?: PinataOptions): Promise<UploadOutput> {
    try {
      const fileContent = await fs.promises.readFile(path);
      const fileName = path.split('/').pop() || 'file';
      const file = new File([fileContent], fileName, { type: 'application/octet-stream' });
      
      const response = await this.serviceInstance.upload.file(file, {
        metadata: options?.pinataMetadata
      });
      
      return {
        id: response.IpfsHash,
        metadata: {
          timestamp: Date.now(),
          type: 'file',
          ...response
        }
      };
    } catch (error) {
      console.error("Errore con Pinata:", error);
      throw error;
    }
  }

  public async getMetadata(hash: string): Promise<any> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }
      const response = await this.serviceInstance.gateways.get(hash);
      return response;
    } catch (error) {
      console.error('Errore nel recupero dei metadata:', error);
      throw error;
    }
  }

  public async isPinned(hash: string): Promise<boolean> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }
      console.log(`Verifica pin per l'hash: ${hash}`);
      
      try {
        const response = await this.serviceInstance.gateways.get(hash);
        const isPinned = !!response;
        console.log(`Stato pin per l'hash ${hash}: ${isPinned ? 'pinnato' : 'non pinnato'}`);
        return isPinned;
      } catch (error) {
        if (error instanceof Error && error.message.includes('NOT_FOUND')) {
          return false;
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('INVALID_CREDENTIALS')) {
        throw new Error('Errore di autenticazione con Pinata: verifica il JWT');
      }
      console.error('Errore durante la verifica del pin:', error);
      return false;
    }
  }

  // Metodi non utilizzati ma richiesti dall'interfaccia
  public async uploadImage(path: string, options?: any): Promise<UploadOutput> {
    return this.uploadFile(path, options);
  }

  public async uploadVideo(path: string, options?: any): Promise<UploadOutput> {
    return this.uploadFile(path, options);
  }
}
