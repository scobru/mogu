import { StorageService } from './base-storage';
import type { UploadOutput } from '../types';
import type { Options as IpfsOptions } from 'ipfs-http-client';
import { BackupData } from '../../types/mogu';
export declare class IpfsService extends StorageService {
    serviceBaseUrl: string;
    readonly serviceInstance: any;
    constructor(options: IpfsOptions);
    get(hash: string): Promise<BackupData>;
    uploadJson(jsonData: Record<string, unknown>): Promise<UploadOutput>;
    uploadFile(path: string): Promise<UploadOutput>;
    uploadImage(path: string): Promise<UploadOutput>;
    uploadVideo(path: string): Promise<UploadOutput>;
    unpin(hash: string): Promise<void>;
    getMetadata(hash: string): Promise<any>;
    isPinned(hash: string): Promise<boolean>;
}
