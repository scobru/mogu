"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = exports.configSchema = void 0;
const zod_1 = require("zod");
exports.configSchema = zod_1.z.object({
    storage: zod_1.z.object({
        service: zod_1.z.enum([
            'PINATA',
            'IPFS-CLIENT',
        ]),
        config: zod_1.z.object({
            pinataJwt: zod_1.z.string(),
            pinataGateway: zod_1.z.string().optional()
        })
    }),
    paths: zod_1.z.object({
        backup: zod_1.z.string().optional(),
        restore: zod_1.z.string().optional(),
        storage: zod_1.z.string().optional(),
        logs: zod_1.z.string().optional()
    }),
    features: zod_1.z.object({
        useIPFS: zod_1.z.boolean(),
        encryption: zod_1.z.object({
            enabled: zod_1.z.boolean(),
            algorithm: zod_1.z.string()
        })
    }),
    performance: zod_1.z.object({
        maxConcurrent: zod_1.z.number(),
        chunkSize: zod_1.z.number(),
        cacheEnabled: zod_1.z.boolean(),
        cacheSize: zod_1.z.number()
    })
});
exports.defaultConfig = {
    storage: {
        service: 'PINATA',
        config: {
            pinataJwt: process.env.PINATA_JWT || '',
            pinataGateway: process.env.PINATA_GATEWAY || ''
        }
    },
    paths: {
        backup: process.env.BACKUP_PATH || './backup',
        restore: process.env.RESTORE_PATH || './restore',
        storage: process.env.STORAGE_PATH || './storage',
        logs: process.env.LOGS_PATH || './logs'
    },
    features: {
        useIPFS: process.env.USE_IPFS === 'true',
        encryption: {
            enabled: process.env.ENCRYPTION_ENABLED === 'true',
            algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
        }
    },
    performance: {
        maxConcurrent: Number(process.env.MAX_CONCURRENT) || 3,
        chunkSize: Number(process.env.CHUNK_SIZE) || 1024 * 1024, // 1MB
        cacheEnabled: process.env.CACHE_ENABLED !== 'false',
        cacheSize: Number(process.env.CACHE_SIZE) || 100
    }
};
