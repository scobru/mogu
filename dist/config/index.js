"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Schema di validazione
const ConfigSchema = zod_1.z.object({
    storage: zod_1.z.object({
        service: zod_1.z.enum(['PINATA', 'BUNDLR', 'NFT.STORAGE', 'WEB3.STORAGE', 'ARWEAVE', 'IPFS-CLIENT', 'LIGHTHOUSE']),
        config: zod_1.z.object({
            apiKey: zod_1.z.string().min(1),
            apiSecret: zod_1.z.string().min(1),
            endpoint: zod_1.z.string().url().optional()
        })
    }),
    paths: zod_1.z.object({
        radata: zod_1.z.string(),
        backup: zod_1.z.string(),
        restore: zod_1.z.string(),
        storage: zod_1.z.string(),
        logs: zod_1.z.string()
    }),
    features: zod_1.z.object({
        useIPFS: zod_1.z.boolean(),
        useGun: zod_1.z.boolean(),
        encryption: zod_1.z.object({
            enabled: zod_1.z.boolean(),
            algorithm: zod_1.z.enum(['aes-256-gcm']).default('aes-256-gcm')
        }).default({ enabled: false, algorithm: 'aes-256-gcm' })
    }),
    performance: zod_1.z.object({
        maxConcurrent: zod_1.z.number().min(1).max(10).default(3),
        chunkSize: zod_1.z.number().min(1024).max(1024 * 1024 * 10).default(1024 * 1024), // 1MB default
        cacheEnabled: zod_1.z.boolean().default(true),
        cacheSize: zod_1.z.number().min(1).max(1000).default(100) // numero di elementi in cache
    }).default({
        maxConcurrent: 3,
        chunkSize: 1024 * 1024,
        cacheEnabled: true,
        cacheSize: 100
    })
});
class ConfigurationError extends Error {
    constructor(errors) {
        super('Configurazione non valida');
        this.errors = errors;
        this.name = 'ConfigurationError';
    }
}
function loadConfig() {
    const baseConfig = {
        storage: {
            service: process.env.STORAGE_SERVICE || 'PINATA',
            config: {
                apiKey: process.env.PINATA_API_KEY || '',
                apiSecret: process.env.PINATA_API_SECRET || '',
                endpoint: process.env.STORAGE_ENDPOINT
            }
        },
        paths: {
            radata: process.env.RADATA_PATH || path_1.default.join(process.cwd(), 'radata'),
            backup: process.env.BACKUP_PATH || path_1.default.join(process.cwd(), 'backup'),
            restore: process.env.RESTORE_PATH || path_1.default.join(process.cwd(), 'restore'),
            storage: process.env.STORAGE_PATH || path_1.default.join(process.cwd(), 'storage'),
            logs: process.env.LOG_PATH || path_1.default.join(process.cwd(), 'logs')
        },
        features: {
            useIPFS: process.env.USE_IPFS === 'true',
            useGun: process.env.USE_GUN === 'true',
            encryption: {
                enabled: process.env.ENCRYPTION_ENABLED === 'true',
                algorithm: 'aes-256-gcm'
            }
        },
        performance: {
            maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '3'),
            chunkSize: parseInt(process.env.CHUNK_SIZE || String(1024 * 1024)),
            cacheEnabled: process.env.CACHE_ENABLED !== 'false',
            cacheSize: parseInt(process.env.CACHE_SIZE || '100')
        }
    };
    try {
        return ConfigSchema.parse(baseConfig);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('Errori di validazione:', JSON.stringify(error.errors, null, 2));
            throw new ConfigurationError(error);
        }
        throw error;
    }
}
exports.config = loadConfig();
