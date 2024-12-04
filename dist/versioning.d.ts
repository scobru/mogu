/**
 * Information about a specific version of a backup
 */
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
/**
 * Represents a difference in a file between versions
 */
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
/**
 * Basic version comparison result
 */
export interface VersionComparison {
    isEqual: boolean;
    isNewer: boolean;
    localVersion: VersionInfo;
    remoteVersion: VersionInfo;
    timeDiff: number;
    formattedDiff: string;
}
/**
 * Detailed version comparison result including file differences
 */
export interface DetailedComparison extends VersionComparison {
    differences: FileDiff[];
    totalChanges: {
        added: number;
        modified: number;
        deleted: number;
    };
}
/**
 * Manages version information and comparisons
 */
export declare class VersionManager {
    private basePath;
    constructor(basePath: string);
    /**
     * Creates version information for a data buffer
     */
    createVersionInfo(data: Buffer): Promise<VersionInfo>;
    /**
     * Compares two versions of data
     */
    compareVersions(localData: Buffer, remoteVersion: VersionInfo): Promise<VersionComparison>;
    /**
     * Formats the time difference between two timestamps
     */
    formatTimeDifference(timestamp1: number, timestamp2: number): string;
    /**
     * Calculates a hash for a data buffer
     */
    private calculateHash;
    /**
     * Calculates a checksum for a data buffer
     */
    private calculateChecksum;
}
