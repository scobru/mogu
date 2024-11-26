import type { Web3StashServices, Web3StashConfig } from "../web3stash/types";
import type { VersionInfo, VersionComparison, DetailedComparison } from "../versioning";

export interface MoguConfig {
  storageService: Web3StashServices;
  storageConfig: Web3StashConfig;
  radataPath?: string;
  useIPFS?: boolean;
  server?: any;
}

export interface BackupFileData {
  fileName: string;
  content: string | object;
}

export interface BackupMetadata {
  timestamp: number;
  type: string;
  versionInfo: VersionInfo;
}

export interface FileChecksum {
  checksum: string;
  size: number;
}

export interface RemoteChecksums {
  checksums: Map<string, FileChecksum>;
} 