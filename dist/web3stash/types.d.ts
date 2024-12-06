export type Web3StashServices = "PINATA" | "IPFS-CLIENT";
export interface BaseConfig {
    pinataJwt?: string;
    pinataGateway?: string;
}
export interface PinataServiceConfig {
    pinataJwt: string;
    pinataGateway?: string;
}
export interface IpfsServiceConfig {
    url: string;
}
export interface StorageServiceWithMetadata extends StorageService {
    getMetadata(hash: string): Promise<any>;
    isPinned(hash: string): Promise<boolean>;
}
export type Web3StashConfig = {
    service: Web3StashServices;
    config: PinataServiceConfig | IpfsServiceConfig;
};
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
