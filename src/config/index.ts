import { z } from 'zod';

export const configSchema = z.object({
  storage: z.object({
    service: z.enum([
      'PINATA',
      'IPFS-CLIENT',
    ] as const),
    config: z.object({
      pinataJwt: z.string(),
      pinataGateway: z.string().optional()
    })
  }),
  paths: z.object({
    backup: z.string().optional(),
    restore: z.string().optional(),
    storage: z.string().optional(),
    logs: z.string().optional()
  }),
  features: z.object({
    useIPFS: z.boolean(),
    encryption: z.object({
      enabled: z.boolean(),
      algorithm: z.string()
    })
  }),
  performance: z.object({
    maxConcurrent: z.number(),
    chunkSize: z.number(),
    cacheEnabled: z.boolean(),
    cacheSize: z.number()
  })
});

export type Config = z.infer<typeof configSchema>;

export const defaultConfig: Config = {
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