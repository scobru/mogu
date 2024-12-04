import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import type { VersionInfo } from "../versioning";
export interface MoguConfig {
    storageService: Web3StashServices;
    storageConfig: Web3StashConfig;
    radataPath?: string;
    backupPath?: string;
    restorePath?: string;
    useIPFS?: boolean;
}
export interface BackupFileData {
    fileName: string;
    content: string | object;
}
export interface BackupMetadata {
    timestamp: number;
    type: string;
    versionInfo: VersionInfo;
    sourcePath?: string;
    isEncrypted?: boolean;
    [key: string]: any;
}
export interface FileChecksum {
    checksum: string;
    size: number;
}
export interface RemoteChecksums {
    checksums: Map<string, FileChecksum>;
}
export interface BackupData {
    data: Record<string, any>;
    metadata: BackupMetadata;
}
