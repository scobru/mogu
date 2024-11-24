import { StorageService } from "./base-storage";
import type { UploadOutput } from "../types";
import type { PinataClient } from "@pinata/sdk";
import pinataSDK from "@pinata/sdk";
import axios from "axios";

interface PinataMetadata {
  name?: string;
  keyvalues?: Record<string, string | number | boolean | null>;
}

interface PinataOptions {
  pinataMetadata?: Record<string, any>;
  pinataOptions?: Record<string, any>;
}

export class PinataService extends StorageService {
  public serviceBaseUrl = "ipfs://";
  public readonly serviceInstance: PinataClient;

  constructor(pinataApiKey: string, pinataApiSecret: string) {
    super();
    this.serviceInstance = pinataSDK(pinataApiKey, pinataApiSecret);
  }

  public async get(hash: string) {
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${hash}`);
    return response.data;
  }

  public getEndpoint() {
    return "https://gateway.pinata.cloud/ipfs/";
  }

  public async unpin(hash: string) {
    await this.serviceInstance.unpin(hash);
  }

  public async uploadJson(jsonData: Record<string, unknown>, options?: any): Promise<UploadOutput> {
    try {
      // Se è una richiesta GET, usa il gateway
      if (options?.method === "GET") {
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${options.hash}`;
        const response = await axios.get(gatewayUrl);
        return response.data;
      }

      // Per l'upload, usa pinJSONToIPFS
      const pinataOptions: PinataOptions = {
        pinataMetadata: {
          name: "mogu-backup",
          keyvalues: {
            timestamp: new Date().toISOString(),
            type: "backup",
          },
        },
      };

      const response = await this.serviceInstance.pinJSONToIPFS(jsonData, pinataOptions);

      // Verifica che i dati siano stati caricati correttamente
      const verifyUrl = `https://gateway.pinata.cloud/ipfs/${response.IpfsHash}`;
      await axios.get(verifyUrl);

      return {
        id: response.IpfsHash,
        metadata: {
          ...response,
          data: jsonData, // Includi i dati originali nella risposta
        },
      };
    } catch (error) {
      console.error("Error with Pinata:", error);
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
}
