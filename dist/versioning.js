"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionManager = void 0;
/**
 * Manages version information and comparisons
 */
class VersionManager {
    constructor(basePath) {
        this.basePath = basePath;
    }
    /**
     * Creates version information for a data buffer
     */
    async createVersionInfo(data) {
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
    compareVersions(localData, remoteVersion) {
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
    formatTimeDifference(timestamp1, timestamp2) {
        const diff = Math.abs(timestamp1 - timestamp2);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days} days`;
        if (hours > 0)
            return `${hours} hours`;
        if (minutes > 0)
            return `${minutes} minutes`;
        return `${seconds} seconds`;
    }
    /**
     * Calculates a hash for a data buffer
     */
    calculateHash(data) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    /**
     * Calculates a checksum for a data buffer
     */
    calculateChecksum(data) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(data).digest('hex');
    }
}
exports.VersionManager = VersionManager;
