import { StorageService } from "./base-storage";
import type { UploadOutput } from "../types";
import type { PinataClient, PinataPinOptions } from "@pinata/sdk";
import pinataSDK from "@pinata/sdk";
import axios from "axios";
import { BackupData } from '../../types/mogu';

// Definiamo i tipi esatti come richiesto da Pinata
type PinataMetadataValue = string | number | null;

interface PinataMetadata {
  name?: string;
  keyvalues?: Record<string, PinataMetadataValue>;
}

// Non estendiamo PinataPinOptions, ma creiamo un tipo separato
interface PinataUploadOptions {
  pinataMetadata?: Record<string, PinataMetadataValue>;
  pinataOptions?: {
    cidVersion?: 0 | 1;
    wrapWithDirectory?: boolean;
    customPinPolicy?: {
      regions: Array<{
        id: string;
        desiredReplicationCount: number;
      }>;
    };
  };
}

export class PinataService extends StorageService {
  public serviceBaseUrl = "ipfs://";
  public readonly serviceInstance: PinataClient;

  constructor(pinataApiKey: string, pinataApiSecret: string) {
    super();
    this.serviceInstance = pinataSDK(pinataApiKey, pinataApiSecret);
  }

  private formatPinataMetadata(metadata?: PinataMetadata): Record<string, PinataMetadataValue> {
    if (!metadata) return {};

    const result: Record<string, PinataMetadataValue> = {};
    
    if (metadata.name) {
      result.name = metadata.name;
    }

    if (metadata.keyvalues) {
      Object.entries(metadata.keyvalues).forEach(([key, value]) => {
        if (value !== undefined) {
          result[key] = value;
        }
      });
    }

    return result;
  }

  public async get(hash: string) {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }

      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${hash}`);
      return response.data;
    } catch (error) {
      console.error('Errore nel recupero da Pinata:', error);
      throw error;
    }
  }

  public getEndpoint() {
    return "https://gateway.pinata.cloud/ipfs/";
  }

  public async unpin(hash: string): Promise<void> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }
      console.log(`Tentativo di unpin per l'hash: ${hash}`);
      await this.serviceInstance.unpin(hash);
      
      // Verifica che l'unpin sia stato effettivo
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        const isPinned = await this.isPinned(hash);
        if (!isPinned) {
          console.log(`Unpin confermato per l'hash: ${hash}`);
          return;
        }
        console.log(`Attesa conferma unpin, tentativo ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendi 1 secondo
        attempts++;
      }
      throw new Error(`Impossibile confermare l'unpin dopo ${maxAttempts} tentativi`);
    } catch (error) {
      console.error('Errore durante unpin da Pinata:', error);
      throw new Error(`Failed to unpin hash ${hash}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async uploadJson(jsonData: Record<string, unknown>, options?: PinataUploadOptions): Promise<UploadOutput> {
    try {
      const pinataOptions: PinataPinOptions = {
        pinataMetadata: this.formatPinataMetadata(options?.pinataMetadata as PinataMetadata),
        pinataOptions: options?.pinataOptions
      };

      const response = await this.serviceInstance.pinJSONToIPFS(jsonData, pinataOptions);
      
      return {
        id: response.IpfsHash,
        metadata: {
          timestamp: Date.now(),
          size: JSON.stringify(jsonData).length,
          type: 'json',
          ...response,
          data: jsonData
        },
      };
    } catch (error) {
      console.error("Errore con Pinata:", error);
      throw error;
    }
  }

  public async getMetadata(hash: string): Promise<any> {
    try {
      const pinList = await this.serviceInstance.pinList({
        hashContains: hash
      });

      if (pinList.rows && pinList.rows.length > 0) {
        return pinList.rows[0].metadata;
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel recupero dei metadata:', error);
      throw error;
    }
  }

  public async uploadImage(path: string, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFromFS(path, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadVideo(path: string, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFromFS(path, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadFile(path: string, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFromFS(path, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadImageFromStream(readableStream: any, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadVideoFromStream(readableStream: any, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async uploadFileFromStream(readableStream: any, options?: any): Promise<UploadOutput> {
    const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
    return { id: response.IpfsHash, metadata: { ...response } };
  }

  public async isPinned(hash: string): Promise<boolean> {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Hash non valido');
      }
      console.log(`Verifica pin per l'hash: ${hash}`);
      const pinList = await this.serviceInstance.pinList({
        hashContains: hash
      });
      
      const isPinned = pinList.rows && pinList.rows.length > 0 && 
                      pinList.rows.some(row => row.ipfs_pin_hash === hash);
      console.log(`Stato pin per l'hash ${hash}: ${isPinned ? 'pinnato' : 'non pinnato'}`);
      return isPinned;
    } catch (error) {
      console.error('Errore durante la verifica del pin:', error);
      return false;
    }
  }
}
