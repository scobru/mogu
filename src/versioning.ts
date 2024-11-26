import { Stats } from 'fs';
import fs from 'fs-extra';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { sha3_256 } from 'js-sha3';
import path from 'path';
import type { FileChecksum, RemoteChecksums } from './types/mogu';

// Configura il plugin duration
dayjs.extend(duration);

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

export interface VersionComparison {
  isEqual: boolean;
  isNewer: boolean;
  localVersion: VersionInfo;
  remoteVersion: VersionInfo;
  timeDiff: number;
  formattedDiff: string;
  differences?: FileDiff[];
}

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

export interface DetailedComparison extends VersionComparison {
  differences: FileDiff[];
  totalChanges: {
    added: number;
    modified: number;
    deleted: number;
  };
}

export class VersionManager {
  constructor(private radataPath: string) {}

  async createVersionInfo(data: Buffer): Promise<VersionInfo> {
    const stats = await fs.stat(this.radataPath);
    
    return {
      hash: sha3_256(data),
      timestamp: Date.now(),
      size: stats.size,
      metadata: {
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        checksum: sha3_256(data)
      }
    };
  }

  formatTimeDifference(timestamp1: number, timestamp2: number): string {
    const diff = dayjs(timestamp1).diff(timestamp2);
    const duration = dayjs.duration(diff);

    if (duration.asDays() >= 1) return `${Math.floor(duration.asDays())} giorni`;
    if (duration.asHours() >= 1) return `${Math.floor(duration.asHours())} ore`;
    if (duration.asMinutes() >= 1) return `${Math.floor(duration.asMinutes())} minuti`;
    return "meno di un minuto";
  }

  async compareVersions(localData: Buffer, remoteVersion: VersionInfo): Promise<VersionComparison> {
    const localVersion = await this.createVersionInfo(localData);
    
    return {
      isEqual: localVersion.metadata.checksum === remoteVersion.metadata.checksum,
      isNewer: localVersion.timestamp > remoteVersion.timestamp,
      localVersion,
      remoteVersion,
      timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
      formattedDiff: this.formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp)
    };
  }

  async getFileChecksums(directory: string): Promise<Map<string, FileChecksum>> {
    const checksums = new Map<string, FileChecksum>();
    const files = await fs.readdir(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);
      const content = await fs.readFile(filePath);
      checksums.set(file, {
        checksum: sha3_256(content),
        size: content.length
      });
    }

    return checksums;
  }

  async compareDetailedVersions(localData: Buffer, remoteData: Buffer): Promise<DetailedComparison> {
    const localVersion = await this.createVersionInfo(localData);
    const remoteVersion = await this.createVersionInfo(remoteData);

    const localChecksums = await this.getFileChecksums(this.radataPath);
    
    // Gestisci il caso in cui remoteData non sia nel formato atteso
    let remoteChecksums = new Map<string, FileChecksum>();
    try {
      const remoteObj = JSON.parse(remoteData.toString());
      // Verifica se l'oggetto ha la struttura attesa
      if (remoteObj && typeof remoteObj === 'object') {
        for (const [key, value] of Object.entries(remoteObj)) {
          const content = Buffer.from(JSON.stringify(value));
          remoteChecksums.set(key, {
            checksum: sha3_256(content),
            size: content.length
          });
        }
      }
    } catch (error) {
      console.error('Errore nel parsing dei dati remoti:', error);
    }

    const differences: FileDiff[] = [];
    const totalChanges = { added: 0, modified: 0, deleted: 0 };

    // Trova file modificati e aggiunti
    for (const [filePath, localInfo] of localChecksums.entries()) {
      const remoteInfo = remoteChecksums.get(filePath) as FileChecksum | undefined;

      if (!remoteInfo) {
        differences.push({
          path: filePath,
          type: 'added',
          newChecksum: localInfo.checksum,
          size: { new: localInfo.size }
        });
        totalChanges.added++;
      } else if (localInfo.checksum !== remoteInfo.checksum) {
        differences.push({
          path: filePath,
          type: 'modified',
          oldChecksum: remoteInfo.checksum,
          newChecksum: localInfo.checksum,
          size: {
            old: remoteInfo.size,
            new: localInfo.size
          }
        });
        totalChanges.modified++;
      }
    }

    // Trova file eliminati
    for (const [filePath, remoteInfo] of remoteChecksums.entries()) {
      if (!localChecksums.has(filePath)) {
        differences.push({
          path: filePath,
          type: 'deleted',
          oldChecksum: remoteInfo.checksum,
          size: { old: remoteInfo.size }
        });
        totalChanges.deleted++;
      }
    }

    return {
      isEqual: differences.length === 0,
      isNewer: localVersion.timestamp > remoteVersion.timestamp,
      localVersion,
      remoteVersion,
      timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
      formattedDiff: this.formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp),
      differences,
      totalChanges
    };
  }
} 