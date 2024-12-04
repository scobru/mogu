export type Web3StashServices = "PINATA" | "BUNDLR" | "NFT.STORAGE" | "WEB3.STORAGE" | "ARWEAVE" | "IPFS-CLIENT" | "LIGHTHOUSE";
export interface Web3StashConfig {
    apiKey?: string;
    apiSecret?: string;
    token?: string;
    url?: string;
    arweavePrivateKey?: any;
    lighthouseApiKey?: string;
    currency?: string;
    privateKey?: string;
    testing?: boolean;
    endpoint?: string;
}
export interface UploadOutput {
    id: string;
    url?: string;
    metadata?: Record<string, any>;
}
export interface UploadOptions {
    name?: string;
    type?: string;
    metadata?: Record<string, any>;
}
export interface StorageConfig {
    apiKey: string;
    apiSecret: string;
    endpoint?: string;
}
export interface StorageService {
    get(hash: string): Promise<any>;
    upload(data: Buffer, options?: UploadOptions): Promise<UploadOutput>;
    pin(hash: string): Promise<boolean>;
    unpin(hash: string): Promise<void>;
    uploadJson?(jsonData: Record<string, unknown>, options?: any): Promise<UploadOutput>;
    uploadImage?(path: string, options?: any): Promise<UploadOutput>;
    uploadVideo?(path: string, options?: any): Promise<UploadOutput>;
    uploadFile?(path: string, options?: any): Promise<UploadOutput>;
}
export type { StorageService as BaseStorageService } from './services/base-storage';
