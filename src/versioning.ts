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
export class VersionManager {
  constructor(private basePath: string) {}

  /**
   * Creates version information for a data buffer
   */
  async createVersionInfo(data: Buffer): Promise<VersionInfo> {
    const now = Date.now();
    return {
      hash: this.calculateHash(data),
      timestamp: now,
      size: data.length,
      metadata: {
        createdAt: new Date(now).toISOString(),
        modifiedAt: new Date(now).toISOString(),
        checksum: this.calculateChecksum(data),
      },
    };
  }

  /**
   * Compares two versions of data
   */
  compareVersions(localData: Buffer, remoteVersion: VersionInfo): Promise<VersionComparison> {
    return this.createVersionInfo(localData).then(localVersion => ({
      isEqual: this.calculateChecksum(localData) === remoteVersion.metadata.checksum,
      isNewer: localVersion.timestamp > remoteVersion.timestamp,
      localVersion,
      remoteVersion,
      timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
      formattedDiff: this.formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp),
    }));
  }

  /**
   * Formats the time difference between two timestamps
   */
  formatTimeDifference(timestamp1: number, timestamp2: number): string {
    const diff = Math.abs(timestamp1 - timestamp2);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} days`;
    if (hours > 0) return `${hours} hours`;
    if (minutes > 0) return `${minutes} minutes`;
    return `${seconds} seconds`;
  }

  /**
   * Calculates a hash for a data buffer
   */
  private calculateHash(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculates a checksum for a data buffer
   */
  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(data).digest('hex');
  }
} 