"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const js_sha3_1 = require("js-sha3");
const path_1 = __importDefault(require("path"));
// Configura il plugin duration
dayjs_1.default.extend(duration_1.default);
class VersionManager {
    constructor(radataPath) {
        this.radataPath = radataPath;
    }
    async createVersionInfo(data) {
        let stats;
        try {
            stats = await fs_extra_1.default.stat(this.radataPath);
        }
        catch (error) {
            // Se il path non esiste, usa valori di default
            stats = {
                size: data.length,
                birthtime: new Date(),
                mtime: new Date()
            };
        }
        const checksum = (0, js_sha3_1.sha3_256)(data);
        return {
            hash: checksum,
            timestamp: Date.now(),
            size: data.length, // Usa la dimensione del buffer invece di stats.size
            metadata: {
                createdAt: stats.birthtime.toISOString(),
                modifiedAt: stats.mtime.toISOString(),
                checksum: checksum
            }
        };
    }
    formatTimeDifference(timestamp1, timestamp2) {
        const diff = (0, dayjs_1.default)(timestamp1).diff(timestamp2);
        const duration = dayjs_1.default.duration(diff);
        if (duration.asDays() >= 1)
            return `${Math.floor(duration.asDays())} giorni`;
        if (duration.asHours() >= 1)
            return `${Math.floor(duration.asHours())} ore`;
        if (duration.asMinutes() >= 1)
            return `${Math.floor(duration.asMinutes())} minuti`;
        return "meno di un minuto";
    }
    async compareVersions(localData, remoteVersion) {
        const localVersion = await this.createVersionInfo(localData);
        // Confronta solo i checksum dei dati effettivi
        const isEqual = localVersion.metadata.checksum === remoteVersion.metadata.checksum;
        return {
            isEqual,
            isNewer: localVersion.timestamp > remoteVersion.timestamp,
            localVersion,
            remoteVersion,
            timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
            formattedDiff: this.formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp)
        };
    }
    async getFileChecksums(directory) {
        const checksums = new Map();
        const files = await fs_extra_1.default.readdir(directory);
        for (const file of files) {
            const filePath = path_1.default.join(directory, file);
            const content = await fs_extra_1.default.readFile(filePath);
            checksums.set(file, {
                checksum: (0, js_sha3_1.sha3_256)(content),
                size: content.length
            });
        }
        return checksums;
    }
    async compareDetailedVersions(localData, remoteData) {
        const localVersion = await this.createVersionInfo(localData);
        const remoteVersion = await this.createVersionInfo(remoteData);
        const localChecksums = await this.getFileChecksums(this.radataPath);
        // Gestisci il caso in cui remoteData non sia nel formato atteso
        let remoteChecksums = new Map();
        try {
            const remoteObj = JSON.parse(remoteData.toString());
            // Verifica se l'oggetto ha la struttura attesa
            if (remoteObj && typeof remoteObj === 'object') {
                for (const [key, value] of Object.entries(remoteObj)) {
                    const content = Buffer.from(JSON.stringify(value));
                    remoteChecksums.set(key, {
                        checksum: (0, js_sha3_1.sha3_256)(content),
                        size: content.length
                    });
                }
            }
        }
        catch (error) {
            console.error('Errore nel parsing dei dati remoti:', error);
        }
        const differences = [];
        const totalChanges = { added: 0, modified: 0, deleted: 0 };
        // Trova file modificati e aggiunti
        for (const [filePath, localInfo] of localChecksums.entries()) {
            const remoteInfo = remoteChecksums.get(filePath);
            if (!remoteInfo) {
                differences.push({
                    path: filePath,
                    type: 'added',
                    newChecksum: localInfo.checksum,
                    size: { new: localInfo.size }
                });
                totalChanges.added++;
            }
            else if (localInfo.checksum !== remoteInfo.checksum) {
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
exports.VersionManager = VersionManager;
