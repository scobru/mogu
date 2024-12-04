import { IBackupAdapter, BackupOptions, BackupResult } from '../types/backup';
import { VersionComparison, DetailedComparison } from '../versioning';
import type { BackupData } from '../types/mogu';
import { Web3StashServices } from '../web3stash/types';
export declare class FileBackupAdapter implements IBackupAdapter {
    private storage;
    constructor(storageService: Web3StashServices, storageConfig: any);
    private isBinaryFile;
    private getMimeType;
    backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult>;
    restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;
    get(hash: string): Promise<BackupData>;
    compare(hash: string, sourcePath: string): Promise<VersionComparison>;
    compareDetailed(hash: string, sourcePath: string): Promise<DetailedComparison>;
}
