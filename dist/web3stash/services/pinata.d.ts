import { StorageService } from "./base-storage";
import type { UploadOutput } from "../types";
import type { PinataClient } from "@pinata/sdk";
type PinataMetadataValue = string | number | null;
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
export declare class PinataService extends StorageService {
    serviceBaseUrl: string;
    readonly serviceInstance: PinataClient;
    constructor(pinataApiKey: string, pinataApiSecret: string);
    private formatPinataMetadata;
    get(hash: string): Promise<any>;
    getEndpoint(): string;
    unpin(hash: string): Promise<void>;
    uploadJson(jsonData: Record<string, unknown>, options?: PinataUploadOptions): Promise<UploadOutput>;
    getMetadata(hash: string): Promise<any>;
    uploadImage(path: string, options?: any): Promise<UploadOutput>;
    uploadVideo(path: string, options?: any): Promise<UploadOutput>;
    uploadFile(path: string, options?: any): Promise<UploadOutput>;
    uploadImageFromStream(readableStream: any, options?: any): Promise<UploadOutput>;
    uploadVideoFromStream(readableStream: any, options?: any): Promise<UploadOutput>;
    uploadFileFromStream(readableStream: any, options?: any): Promise<UploadOutput>;
}
export {};
