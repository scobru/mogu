export type Web3StashServices = "PINATA" | "BUNDLR" | "NFT.STORAGE" | "WEB3.STORAGE" | "ARWEAVE" | "IPFS-CLIENT" | "LIGHTHOUSE";
export interface BaseConfig {
    apiKey?: string;
    apiSecret?: string;
    endpoint?: string;
}
export interface PinataConfig extends BaseConfig {
    apiKey: string;
}
export interface IpfsConfig extends BaseConfig {
    url: string;
    port?: number;
    protocol?: string;
    headers?: Record<string, string>;
}
export interface BundlrConfig extends BaseConfig {
    currency?: string;
    privateKey?: string;
}
export type Web3StashConfig = PinataConfig | IpfsConfig | BundlrConfig;
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
