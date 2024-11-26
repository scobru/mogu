import type { FileChecksum } from './types/mogu';
export interface VersionInfo {
    hash: string;
    timestamp: number;
    size: number;
    metadata: {
        createdAt: string;
        modifiedAt: string;
        checksum: string;
    };
}
export interface VersionComparison {
    isEqual: boolean;
    isNewer: boolean;
    localVersion: VersionInfo;
    remoteVersion: VersionInfo;
    timeDiff: number;
    formattedDiff: string;
    differences?: FileDiff[];
}
export interface FileDiff {
    path: string;
    type: 'added' | 'modified' | 'deleted';
    oldChecksum?: string;
    newChecksum?: string;
    size: {
        old?: number;
        new?: number;
    };
}
export interface DetailedComparison extends VersionComparison {
    differences: FileDiff[];
    totalChanges: {
        added: number;
        modified: number;
        deleted: number;
    };
}
export declare class VersionManager {
    private radataPath;
    constructor(radataPath: string);
    createVersionInfo(data: Buffer): Promise<VersionInfo>;
    formatTimeDifference(timestamp1: number, timestamp2: number): string;
    compareVersions(localData: Buffer, remoteVersion: VersionInfo): Promise<VersionComparison>;
    getFileChecksums(directory: string): Promise<Map<string, FileChecksum>>;
    compareDetailedVersions(localData: Buffer, remoteData: Buffer): Promise<DetailedComparison>;
}
