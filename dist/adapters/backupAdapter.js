"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupAdapter = void 0;
const web3stash_1 = require("../web3stash");
class BackupAdapter {
    constructor(storageService, storageConfig, options = {}) {
        this.options = options;
        const storage = (0, web3stash_1.Web3Stash)(storageService, storageConfig);
        this.storage = {
            ...storage,
            get: async (hash) => {
                if (!storage.get) {
                    throw new Error('Storage service does not support get operation');
                }
                const result = await storage.get(hash);
                if (!result?.data || !result?.metadata) {
                    throw new Error('Invalid backup format');
                }
                return result;
            }
        };
    }
    generateBackupName(metadata) {
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .replace('Z', '');
        const type = metadata?.type || 'backup';
        const size = metadata?.versionInfo?.size || 0;
        // Formatta la dimensione
        const sizeFormatted = this.formatSize(size);
        // Aggiungi tag personalizzati se presenti
        const tags = this.options.tags ? `-${this.options.tags.join('-')}` : '';
        return `mogu-${type}-${sizeFormatted}${tags}-${timestamp}`;
    }
    formatSize(bytes) {
        if (bytes < 1024)
            return `${bytes}B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)}KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    }
    serializeMetadata(metadata) {
        const serialized = {};
        const serialize = (obj) => {
            if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
                return obj;
            }
            if (obj instanceof Date) {
                return obj.toISOString();
            }
            return JSON.stringify(obj);
        };
        if (metadata && typeof metadata === 'object') {
            for (const [key, value] of Object.entries(metadata)) {
                serialized[key] = serialize(value);
            }
        }
        return serialized;
    }
    async createBackupMetadata(data, options, name) {
        const now = Date.now();
        return {
            timestamp: options?.timestamp || now,
            type: options?.type || 'backup',
            name: name || this.generateBackupName({ type: options?.type }),
            description: options?.description,
            metadata: options?.metadata,
            versionInfo: {
                hash: '',
                timestamp: now,
                size: Buffer.from(JSON.stringify(data)).length,
                metadata: {
                    createdAt: new Date(now).toISOString(),
                    modifiedAt: new Date(now).toISOString(),
                    checksum: ''
                }
            }
        };
    }
    // Metodi comuni che possono essere usati da tutte le implementazioni
    async get(hash) {
        if (!this.storage.get) {
            throw new Error('Storage service does not support get operation');
        }
        const result = await this.storage.get(hash);
        if (!result?.data || !result?.metadata) {
            throw new Error('Invalid backup format');
        }
        return result;
    }
    async getMetadata(hash) {
        const backup = await this.get(hash);
        return backup.metadata;
    }
}
exports.BackupAdapter = BackupAdapter;
