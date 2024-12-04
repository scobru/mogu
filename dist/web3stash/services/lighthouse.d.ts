import { StorageService } from './base-storage';
import type { UploadOutput } from '../types';
import { BackupData } from '../../types/mogu';
export declare class LighthouseStorageService extends StorageService {
    serviceBaseUrl: string;
    readonly serviceInstance: any;
    readonly apiKey: string;
    constructor(apiKey: string, config: any);
    uploadJson(jsonData: Record<string, unknown>, options?: any): Promise<UploadOutput>;
    uploadImage(path: string, options?: any): Promise<UploadOutput>;
    uploadVideo(path: string, options?: any): Promise<UploadOutput>;
    uploadFile(path: string, options?: any): Promise<UploadOutput>;
    unpin(hash: string): Promise<void>;
    get?(hash: string): Promise<BackupData>;
}
