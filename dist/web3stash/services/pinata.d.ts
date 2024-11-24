import { StorageService } from "./base-storage";
import type { UploadOutput } from "../types";
import type { PinataClient } from "@pinata/sdk";
export declare class PinataService extends StorageService {
    serviceBaseUrl: string;
    readonly serviceInstance: PinataClient;
    constructor(pinataApiKey: string, pinataApiSecret: string);
    get(hash: string): Promise<any>;
    getEndpoint(): string;
    unpin(hash: string): Promise<void>;
    uploadJson(jsonData: Record<string, unknown>, options?: any): Promise<UploadOutput>;
    uploadImage(path: string, options?: any): Promise<UploadOutput>;
    uploadVideo(path: string, options?: any): Promise<UploadOutput>;
    uploadFile(path: string, options?: any): Promise<UploadOutput>;
    uploadImageFromStream(readableStream: any, options?: any): Promise<UploadOutput>;
    uploadVideoFromStream(readableStream: any, options?: any): Promise<UploadOutput>;
    uploadFileFromStream(readableStream: any, options?: any): Promise<UploadOutput>;
}
