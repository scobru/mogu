import { IBackupAdapter, BackupResult, BackupOptions } from "../types/backup";
import { VersionComparison, DetailedComparison } from "../versioning";
import type { BackupMetadata, BackupData } from "../types/mogu";
import { UploadOutput } from "../web3stash/types/index";
import { StorageService } from "../web3stash/services/base-storage";
export declare class FileBackupAdapter implements IBackupAdapter {
    protected options: BackupOptions;
    private storage;
    private originalStorage;
    constructor(storage: StorageService, options?: BackupOptions);
    getStorage(): StorageService;
    private isBinaryFile;
    private getMimeType;
    protected generateBackupName(metadata: BackupMetadata): string;
    protected formatSize(bytes: number): string;
    protected serializeMetadata(metadata: any): Record<string, string | number | boolean>;
    protected createBackupMetadata(data: any, options?: BackupOptions, name?: string): Promise<BackupMetadata>;
    delete(hash: string): Promise<boolean>;
    backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult>;
    restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean>;
    get(hash: string): Promise<BackupData>;
    compare(hash: string, sourcePath: string): Promise<VersionComparison>;
    compareDetailed(hash: string, sourcePath: string): Promise<DetailedComparison>;
    upload(data: any, options?: BackupOptions): Promise<UploadOutput>;
}
