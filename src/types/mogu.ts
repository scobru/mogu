import type { Web3StashConfig } from "../ipfs/types";
import type { VersionInfo } from "../versioning";

export interface MoguConfig {
  storage: Web3StashConfig;
  paths?: {
    backup?: string;
    restore?: string;
    storage?: string;
    logs?: string;
  };
  features: {
    encryption: {
      enabled: boolean;
      algorithm: string;
    };
    useIPFS?: boolean;
  };
  performance?: {
    chunkSize?: number;
    maxConcurrent?: number;
    cacheEnabled?: boolean;
    cacheSize?: number;
  };
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
