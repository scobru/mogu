import { StorageService } from "./base-storage";
import type { UploadOutput, PinataServiceConfig } from "../types";
import { PinataSDK } from "pinata-web3";
import { BackupData } from '../../types/mogu';
interface PinataOptions {
    pinataMetadata?: {
        name?: string;
        keyvalues?: Record<string, string | number | null>;
    };
}
export declare class PinataService extends StorageService {
    serviceBaseUrl: string;
    readonly serviceInstance: PinataSDK;
    private readonly gateway;
    constructor(config: PinataServiceConfig);
    private createVersionInfo;
    get(hash: string): Promise<BackupData>;
    getEndpoint(): string;
    unpin(hash: string): Promise<boolean>;
    uploadJson(jsonData: Record<string, unknown>, options?: PinataOptions): Promise<UploadOutput>;
    uploadFile(path: string, options?: PinataOptions): Promise<UploadOutput>;
    getMetadata(hash: string): Promise<any>;
    isPinned(hash: string): Promise<boolean>;
    uploadImage(path: string, options?: any): Promise<UploadOutput>;
    uploadVideo(path: string, options?: any): Promise<UploadOutput>;
}
export {};
