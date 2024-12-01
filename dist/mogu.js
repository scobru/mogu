"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mogu = void 0;
const versioning_1 = require("./versioning");
const web3stash_1 = require("./web3stash");
const fs_extra_1 = __importDefault(require("fs-extra"));
const gun_1 = require("./config/gun");
const path_1 = __importDefault(require("path"));
const backupAdapter_1 = require("./adapters/backupAdapter");
const gun_2 = __importDefault(require("gun"));
const js_sha3_1 = require("js-sha3");
const fileBackupAdapter_1 = require("./adapters/fileBackupAdapter");
const encryption_1 = require("./utils/encryption");
// Registra i metodi nella chain di Gun
gun_2.default.chain.backup = async function (config, customPath, options) {
    try {
        const sourcePath = customPath || config.radataPath || path_1.default.join(process.cwd(), "radata");
        if (!fs_extra_1.default.existsSync(sourcePath)) {
            throw new Error(`Path ${sourcePath} does not exist`);
        }
        // Inizializza storage e adapter
        const storage = (0, web3stash_1.Web3Stash)(config.storageService, config.storageConfig);
        const backupAdapter = new backupAdapter_1.BackupAdapter(storage);
        const versionManager = new versioning_1.VersionManager(sourcePath);
        // Leggi tutti i file nella directory specificata
        const files = await fs_extra_1.default.readdir(sourcePath);
        let backupData = {};
        // Leggi il contenuto di ogni file
        for (const file of files) {
            const filePath = path_1.default.join(sourcePath, file);
            const stats = await fs_extra_1.default.stat(filePath);
            // Salta le directory e i file di backup
            if (stats.isDirectory() || file.startsWith('backup_'))
                continue;
            const content = await fs_extra_1.default.readFile(filePath, 'utf8');
            try {
                backupData[file] = JSON.parse(content);
            }
            catch {
                backupData[file] = content;
            }
        }
        // Se la crittografia è abilitata, cripta i dati
        if (options?.encryption?.enabled) {
            const encryption = new encryption_1.Encryption(options.encryption.key, options.encryption.algorithm);
            const { encrypted, iv } = encryption.encrypt(JSON.stringify(backupData));
            backupData = {
                root: {
                    data: {
                        encrypted: encrypted.toString('base64'),
                        iv: iv.toString('base64'),
                        isEncrypted: true
                    }
                }
            };
        }
        else {
            // Wrappa i dati in un oggetto con un nodo root
            backupData = {
                root: {
                    data: backupData
                }
            };
        }
        // Crea version info
        const dataBuffer = Buffer.from(JSON.stringify(backupData));
        const versionInfo = await versionManager.createVersionInfo(dataBuffer);
        const metadata = {
            timestamp: Date.now(),
            type: 'mogu-backup',
            versionInfo,
            sourcePath,
            isEncrypted: options?.encryption?.enabled || false
        };
        return await backupAdapter.createBackup(backupData, metadata);
    }
    catch (error) {
        console.error('Error during backup:', error);
        throw error;
    }
};
gun_2.default.chain.restore = async function (config, hash, customPath, options) {
    try {
        if (!hash || typeof hash !== 'string') {
            throw new Error('Invalid hash');
        }
        const storage = (0, web3stash_1.Web3Stash)(config.storageService, config.storageConfig);
        const backupAdapter = new backupAdapter_1.BackupAdapter(storage);
        console.log('Retrieving data from hash:', hash);
        const backup = await backupAdapter.getBackup(hash);
        if (!backup?.data) {
            throw new Error('No data found for the provided hash');
        }
        let dataToRestore = backup.data.root.data; // Accedi ai dati attraverso il nodo root
        // Se il backup è criptato, decripta i dati
        if (backup.metadata.isEncrypted) {
            if (!options?.encryption?.enabled) {
                throw new Error('Backup is encrypted but no decryption key provided');
            }
            const encryption = new encryption_1.Encryption(options.encryption.key, options.encryption.algorithm);
            const encrypted = Buffer.from(dataToRestore.encrypted, 'base64');
            const iv = Buffer.from(dataToRestore.iv, 'base64');
            const decrypted = encryption.decrypt(encrypted, iv);
            dataToRestore = JSON.parse(decrypted.toString());
        }
        const restorePath = customPath || config.radataPath || path_1.default.join(process.cwd(), "radata");
        // Remove existing directory
        await fs_extra_1.default.remove(restorePath);
        console.log('Directory removed:', restorePath);
        // Recreate directory
        await fs_extra_1.default.mkdirp(restorePath);
        console.log('Directory recreated:', restorePath);
        // Restore files from backup
        for (const [fileName, fileData] of Object.entries(dataToRestore)) {
            if (fileName.startsWith('backup_'))
                continue;
            const filePath = path_1.default.join(restorePath, fileName);
            // Verifica che fileData non sia undefined
            if (fileData === undefined) {
                console.warn(`Skipping ${fileName}: no data available`);
                continue;
            }
            // Converti il contenuto in stringa in modo sicuro
            let content;
            if (typeof fileData === 'object') {
                content = JSON.stringify(fileData);
            }
            else if (typeof fileData === 'string') {
                content = fileData;
            }
            else {
                content = String(fileData); // Fallback per altri tipi
            }
            await fs_extra_1.default.writeFile(filePath, content);
            console.log(`File restored: ${fileName}`);
        }
        // Wait for files to be written
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    }
    catch (error) {
        console.error('Error during restore:', error);
        throw error;
    }
};
gun_2.default.chain.compareBackup = async function (config, hash) {
    try {
        // Leggi tutti i file nella directory radata
        const files = await fs_extra_1.default.readdir(config.radataPath);
        const localData = {};
        // Leggi il contenuto di ogni file
        for (const file of files) {
            const filePath = path_1.default.join(config.radataPath, file);
            const stats = await fs_extra_1.default.stat(filePath);
            // Salta le directory e i file di backup
            if (stats.isDirectory() || file.startsWith('backup_'))
                continue;
            const content = await fs_extra_1.default.readFile(filePath, 'utf8');
            try {
                localData[file] = JSON.parse(content);
            }
            catch {
                localData[file] = content;
            }
        }
        // Recupera il backup completo
        const storage = (0, web3stash_1.Web3Stash)(config.storageService, config.storageConfig);
        const backupAdapter = new backupAdapter_1.BackupAdapter(storage);
        const backup = await backupAdapter.getBackup(hash);
        if (!backup?.data || !backup?.metadata?.versionInfo) {
            throw new Error('Backup non valido: metadata mancanti');
        }
        // Normalizza e ordina i dati per il confronto
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
        // Se i contenuti sono uguali, usa i metadata remoti
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
            formattedDiff: new versioning_1.VersionManager(config.radataPath).formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp)
        };
    }
    catch (error) {
        console.error('Error during comparison:', error);
        throw error;
    }
};
gun_2.default.chain.compareDetailedBackup = async function (config, hash) {
    try {
        // Leggi tutti i file nella directory radata
        const files = await fs_extra_1.default.readdir(config.radataPath);
        const localData = {};
        // Leggi il contenuto di ogni file
        for (const file of files) {
            const filePath = path_1.default.join(config.radataPath, file);
            const stats = await fs_extra_1.default.stat(filePath);
            // Salta le directory e i file di backup
            if (stats.isDirectory() || file.startsWith('backup_'))
                continue;
            const content = await fs_extra_1.default.readFile(filePath, 'utf8');
            try {
                localData[file] = JSON.parse(content);
            }
            catch {
                localData[file] = content;
            }
        }
        // Recupera il backup completo
        const storage = (0, web3stash_1.Web3Stash)(config.storageService, config.storageConfig);
        const backupAdapter = new backupAdapter_1.BackupAdapter(storage);
        const backup = await backupAdapter.getBackup(hash);
        if (!backup?.data) {
            throw new Error('Backup non valido: dati mancanti');
        }
        const differences = [];
        const totalChanges = { added: 0, modified: 0, deleted: 0 };
        // Funzione per calcolare il checksum
        const calculateChecksum = (data) => {
            return (0, js_sha3_1.sha3_256)(JSON.stringify(data));
        };
        // Funzione per ottenere la dimensione
        const getFileSize = (data) => {
            return Buffer.from(JSON.stringify(data)).length;
        };
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
        const localVersion = await new versioning_1.VersionManager(config.radataPath).createVersionInfo(localDataBuffer);
        const remoteVersion = backup.metadata.versionInfo;
        return {
            isEqual: differences.length === 0,
            isNewer: localVersion.timestamp > remoteVersion.timestamp,
            localVersion,
            remoteVersion,
            timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
            formattedDiff: new versioning_1.VersionManager(config.radataPath).formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp),
            differences,
            totalChanges
        };
    }
    catch (error) {
        console.error('Error during detailed comparison:', error);
        throw error;
    }
};
gun_2.default.chain.getBackupState = async function (config, hash) {
    const storage = (0, web3stash_1.Web3Stash)(config.storageService, config.storageConfig);
    const backupAdapter = new backupAdapter_1.BackupAdapter(storage);
    return backupAdapter.getBackup(hash);
};
// Classe Mogu
class Mogu {
    constructor(config) {
        // Metodi di backup Gun
        this.backupGun = (customPath, options) => {
            if (!this.gun)
                throw new Error('Gun not initialized');
            return gun_2.default.chain.backup(this.config, customPath, options);
        };
        this.restoreGun = async (hash, customPath, options) => {
            if (!this.gun)
                throw new Error('Gun not initialized');
            await new Promise((resolve) => {
                this.gun?.get('test/key').put(null, () => resolve());
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = await gun_2.default.chain.restore(this.config, hash, customPath, options);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return result;
        };
        // Metodi di backup file (sempre disponibili)
        this.backupFiles = (sourcePath, options) => this.fileBackup.backup(sourcePath, options);
        this.restoreFiles = (hash, targetPath, options) => this.fileBackup.restore(hash, targetPath, options);
        // Metodi comuni
        this.compareBackup = (hash, sourcePath) => sourcePath ?
            this.fileBackup.compare(hash, sourcePath) :
            this.gun ? gun_2.default.chain.compareBackup(this.config, hash) :
                Promise.reject(new Error('No source path provided and Gun not initialized'));
        this.compareDetailedBackup = (hash, sourcePath) => sourcePath ?
            this.fileBackup.compareDetailed(hash, sourcePath) :
            this.gun ? gun_2.default.chain.compareDetailedBackup(this.config, hash) :
                Promise.reject(new Error('No source path provided and Gun not initialized'));
        this.getBackupState = (hash) => gun_2.default.chain.getBackupState(this.config, hash);
        // Per compatibilità con i test esistenti
        this.backup = this.backupGun;
        this.restore = this.restoreGun;
        this.config = {
            storageService: config.storageService,
            storageConfig: config.storageConfig,
            radataPath: config.radataPath || path_1.default.join(process.cwd(), "radata"),
            backupPath: config.backupPath || path_1.default.join(process.cwd(), "backup"),
            restorePath: config.restorePath || path_1.default.join(process.cwd(), "restore"),
            useIPFS: false,
            useGun: config.useGun ?? false,
            server: null,
            storagePath: path_1.default.join(process.cwd(), "storage")
        };
        this.fileBackup = new fileBackupAdapter_1.FileBackupAdapter(config.storageService, config.storageConfig);
        // Inizializza Gun solo se necessario
        if (config.useGun) {
            this.gun = (0, gun_1.initializeGun)({ file: this.config.radataPath });
        }
    }
    // Metodi Gun (disponibili solo se Gun è inizializzato)
    get(key) {
        if (!this.gun)
            throw new Error('Gun not initialized');
        return this.gun.get(key);
    }
    put(key, data) {
        if (!this.gun)
            throw new Error('Gun not initialized');
        return this.gun.get(key).put(data);
    }
    on(key, callback) {
        if (!this.gun)
            throw new Error('Gun not initialized');
        this.gun.get(key).on(callback);
    }
}
exports.Mogu = Mogu;
