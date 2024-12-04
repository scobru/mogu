import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';
import { Web3StashServices } from '../web3stash/types';

dotenv.config();

// Schema di validazione
const ConfigSchema = z.object({
  storage: z.object({
    service: z.enum(['PINATA', 'BUNDLR', 'NFT.STORAGE', 'WEB3.STORAGE', 'ARWEAVE', 'IPFS-CLIENT', 'LIGHTHOUSE'] as const),
    config: z.object({
      apiKey: z.string().min(1),
      apiSecret: z.string().min(1),
      endpoint: z.string().url().optional()
    })
  }),
  paths: z.object({
    radata: z.string(),
    backup: z.string(),
    restore: z.string(),
    storage: z.string(),
    logs: z.string()
  }),
  features: z.object({
    useIPFS: z.boolean(),
    useGun: z.boolean(),
    encryption: z.object({
      enabled: z.boolean(),
      algorithm: z.enum(['aes-256-gcm']).default('aes-256-gcm')
    }).default({ enabled: false, algorithm: 'aes-256-gcm' })
  }),
  performance: z.object({
    maxConcurrent: z.number().min(1).max(10).default(3),
    chunkSize: z.number().min(1024).max(1024 * 1024 * 10).default(1024 * 1024), // 1MB default
    cacheEnabled: z.boolean().default(true),
    cacheSize: z.number().min(1).max(1000).default(100) // numero di elementi in cache
  }).default({
    maxConcurrent: 3,
    chunkSize: 1024 * 1024,
    cacheEnabled: true,
    cacheSize: 100
  })
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigurationError extends Error {
  constructor(public errors: z.ZodError) {
    super('Configurazione non valida');
    this.name = 'ConfigurationError';
  }
}

function loadConfig(): Config {
  const baseConfig = {
    storage: {
      service: (process.env.STORAGE_SERVICE as Web3StashServices) || 'PINATA',
      config: {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || '',
        endpoint: process.env.STORAGE_ENDPOINT
      }
    },
    paths: {
      radata: process.env.RADATA_PATH || path.join(process.cwd(), 'radata'),
      backup: process.env.BACKUP_PATH || path.join(process.cwd(), 'backup'),
      restore: process.env.RESTORE_PATH || path.join(process.cwd(), 'restore'),
      storage: process.env.STORAGE_PATH || path.join(process.cwd(), 'storage'),
      logs: process.env.LOG_PATH || path.join(process.cwd(), 'logs')
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
  } as const;

  try {
    return ConfigSchema.parse(baseConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Errori di validazione:', JSON.stringify(error.errors, null, 2));
      throw new ConfigurationError(error);
    }
    throw error;
  }
}

export const config = loadConfig(); 