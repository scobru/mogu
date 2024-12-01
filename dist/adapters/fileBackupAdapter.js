"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileBackupAdapter = void 0;
const versioning_1 = require("../versioning");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_sha3_1 = require("js-sha3");
const web3stash_1 = require("../web3stash");
const encryption_1 = require("../utils/encryption");
class FileBackupAdapter {
    constructor(storageService, storageConfig) {
        this.storage = (0, web3stash_1.Web3Stash)(storageService, storageConfig);
    }
    isBinaryFile(filename) {
        const binaryExtensions = [
            '.png', '.jpg', '.jpeg', '.gif', '.bmp',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx',
            '.zip', '.rar', '.7z', '.tar', '.gz'
        ];
        const ext = path_1.default.extname(filename).toLowerCase();
        return binaryExtensions.includes(ext);
    }
    getMimeType(filename) {
        const ext = path_1.default.extname(filename).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.pdf': 'application/pdf'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    async backup(sourcePath, options) {
        const files = await fs_extra_1.default.readdir(sourcePath);
        const backupData = {};
        // Inizializza la crittografia se richiesta
        const encryption = options?.encryption?.enabled ?
            new encryption_1.Encryption(options.encryption.key, options.encryption.algorithm) :
            null;
        for (const file of files) {
            if (options?.excludePatterns?.some(pattern => file.match(pattern)))
                continue;
            const filePath = path_1.default.join(sourcePath, file);
            const stats = await fs_extra_1.default.stat(filePath);
            if (stats.isDirectory())
                continue;
            if (options?.maxFileSize && stats.size > options.maxFileSize)
                continue;
            const isBinary = this.isBinaryFile(file);
            const content = await fs_extra_1.default.readFile(filePath);
            let fileContent;
            if (encryption) {
                // Cripta il contenuto
                const { encrypted, iv } = encryption.encrypt(content);
                fileContent = {
                    encrypted: encrypted.toString('base64'),
                    iv: iv.toString('base64'),
                    isEncrypted: true
                };
            }
            else {
                fileContent = {
                    type: isBinary ? 'binary' : 'text',
                    content: isBinary ? content.toString('base64') : content.toString('utf8'),
                    mimeType: this.getMimeType(file)
                };
            }
            backupData[file] = fileContent;
        }
        const versionManager = new versioning_1.VersionManager(sourcePath);
        const versionInfo = await versionManager.createVersionInfo(Buffer.from(JSON.stringify(backupData)));
        const metadata = {
            timestamp: Date.now(),
            type: 'file-backup',
            versionInfo
        };
        // Prepara i dati per Pinata
        const uploadData = {
            data: backupData,
            metadata: metadata
        };
        // Usa il metodo uploadJson del servizio di storage
        const result = await this.storage.uploadJson(uploadData, {
            pinataMetadata: {
                name: path_1.default.basename(sourcePath)
            }
        });
        if (!result || !result.id) {
            throw new Error('Storage service did not return a valid hash');
        }
        return {
            hash: result.id,
            versionInfo,
            name: path_1.default.basename(sourcePath)
        };
    }
    async restore(hash, targetPath, options) {
        const backup = await this.get(hash);
        if (!backup?.data)
            throw new Error('Invalid backup data');
        const encryption = options?.encryption?.enabled ?
            new encryption_1.Encryption(options.encryption.key, options.encryption.algorithm) :
            null;
        await fs_extra_1.default.ensureDir(targetPath);
        for (const [fileName, fileData] of Object.entries(backup.data)) {
            const filePath = path_1.default.join(targetPath, fileName);
            if (fileData.isEncrypted && encryption && fileData.encrypted && fileData.iv) {
                // Decripta il contenuto
                const encrypted = Buffer.from(fileData.encrypted, 'base64');
                const iv = Buffer.from(fileData.iv, 'base64');
                const decrypted = encryption.decrypt(encrypted, iv);
                await fs_extra_1.default.writeFile(filePath, decrypted);
            }
            else if (fileData.type === 'binary' && fileData.content) {
                // File binario non criptato
                await fs_extra_1.default.writeFile(filePath, Buffer.from(fileData.content, 'base64'));
            }
            else if (fileData.content) {
                // File di testo non criptato
                await fs_extra_1.default.writeFile(filePath, fileData.content);
            }
            else {
                throw new Error(`Invalid file data for ${fileName}`);
            }
        }
        return true;
    }
    async get(hash) {
        return this.storage.get?.(hash) ?? Promise.reject(new Error('Get not supported by storage service'));
    }
    async compare(hash, sourcePath) {
        try {
            // Leggi i file locali
            const files = await fs_extra_1.default.readdir(sourcePath);
            const localData = {};
            for (const file of files) {
                const filePath = path_1.default.join(sourcePath, file);
                const stats = await fs_extra_1.default.stat(filePath);
                if (stats.isDirectory())
                    continue;
                const content = await fs_extra_1.default.readFile(filePath);
                localData[file] = {
                    type: this.isBinaryFile(file) ? 'binary' : 'text',
                    content: content.toString('base64')
                };
            }
            // Recupera il backup
            const backup = await this.get(hash);
            if (!backup?.data || !backup?.metadata?.versionInfo) {
                throw new Error('Invalid backup: missing metadata');
            }
            // Calcola checksum
            const localDataStr = JSON.stringify(localData);
            const remoteDataStr = JSON.stringify(backup.data);
            const localChecksum = (0, js_sha3_1.sha3_256)(Buffer.from(localDataStr));
            const remoteChecksum = (0, js_sha3_1.sha3_256)(Buffer.from(remoteDataStr));
            const localVersion = {
                hash: localChecksum,
                timestamp: Date.now(),
                size: Buffer.from(localDataStr).length,
                metadata: {
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString(),
                    checksum: localChecksum
                }
            };
            const remoteVersion = backup.metadata.versionInfo;
            if (localChecksum === remoteChecksum) {
                return {
                    isEqual: true,
                    isNewer: false,
                    localVersion: remoteVersion,
                    remoteVersion,
                    timeDiff: 0,
                    formattedDiff: "less than a minute"
                };
            }
            return {
                isEqual: false,
                isNewer: localVersion.timestamp > remoteVersion.timestamp,
                localVersion,
                remoteVersion,
                timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
                formattedDiff: new versioning_1.VersionManager(sourcePath).formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp)
            };
        }
        catch (error) {
            console.error('Error during comparison:', error);
            throw error;
        }
    }
    async compareDetailed(hash, sourcePath) {
        try {
            // Leggi i file locali
            const files = await fs_extra_1.default.readdir(sourcePath);
            const localData = {};
            for (const file of files) {
                const filePath = path_1.default.join(sourcePath, file);
                const stats = await fs_extra_1.default.stat(filePath);
                if (stats.isDirectory())
                    continue;
                const content = await fs_extra_1.default.readFile(filePath);
                localData[file] = {
                    type: this.isBinaryFile(file) ? 'binary' : 'text',
                    content: content.toString('base64')
                };
            }
            // Recupera il backup
            const backup = await this.get(hash);
            if (!backup?.data) {
                throw new Error('Invalid backup: missing data');
            }
            const differences = [];
            const totalChanges = { added: 0, modified: 0, deleted: 0 };
            // Calcola checksum e dimensioni
            const calculateChecksum = (data) => (0, js_sha3_1.sha3_256)(JSON.stringify(data));
            const getFileSize = (data) => Buffer.from(JSON.stringify(data)).length;
            // Trova file modificati e aggiunti
            for (const [filePath, localContent] of Object.entries(localData)) {
                const remoteContent = backup.data[filePath];
                if (!remoteContent) {
                    differences.push({
                        path: filePath,
                        type: 'added',
                        newChecksum: calculateChecksum(localContent),
                        size: { new: getFileSize(localContent) }
                    });
                    totalChanges.added++;
                }
                else {
                    const localChecksum = calculateChecksum(localContent);
                    const remoteChecksum = calculateChecksum(remoteContent);
                    if (localChecksum !== remoteChecksum) {
                        differences.push({
                            path: filePath,
                            type: 'modified',
                            oldChecksum: remoteChecksum,
                            newChecksum: localChecksum,
                            size: {
                                old: getFileSize(remoteContent),
                                new: getFileSize(localContent)
                            }
                        });
                        totalChanges.modified++;
                    }
                }
            }
            // Trova file eliminati
            for (const filePath of Object.keys(backup.data)) {
                if (!localData[filePath]) {
                    differences.push({
                        path: filePath,
                        type: 'deleted',
                        oldChecksum: calculateChecksum(backup.data[filePath]),
                        size: { old: getFileSize(backup.data[filePath]) }
                    });
                    totalChanges.deleted++;
                }
            }
            // Crea version info
            const localDataBuffer = Buffer.from(JSON.stringify(localData));
            const localVersion = await new versioning_1.VersionManager(sourcePath).createVersionInfo(localDataBuffer);
            const remoteVersion = backup.metadata.versionInfo;
            return {
                isEqual: differences.length === 0,
                isNewer: localVersion.timestamp > remoteVersion.timestamp,
                localVersion,
                remoteVersion,
                timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
                formattedDiff: new versioning_1.VersionManager(sourcePath).formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp),
                differences,
                totalChanges
            };
        }
        catch (error) {
            console.error('Error during detailed comparison:', error);
            throw error;
        }
    }
}
exports.FileBackupAdapter = FileBackupAdapter;
