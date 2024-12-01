"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mogu = void 0;
const versioning_1 = require("./versioning");
const web3stash_1 = require("./web3stash");
const fs_extra_1 = __importDefault(require("fs-extra"));
const ipfsAdapter_1 = require("./adapters/ipfsAdapter");
const gun_1 = require("./config/gun");
const path_1 = __importDefault(require("path"));
const backupAdapter_1 = require("./adapters/backupAdapter");
const js_sha3_1 = require("js-sha3");
class Mogu {
    constructor(config, backupOptions) {
        const radataPath = config.radataPath || path_1.default.join(process.cwd(), "radata");
        this.backupPath = config.backupPath || path_1.default.join(process.cwd(), "backup");
        this.config = {
            ...config,
            radataPath,
            backupPath: this.backupPath,
            useIPFS: config.useIPFS ?? false,
            server: config.server
        };
        // Crea la directory di backup se non esiste
        if (!fs_extra_1.default.existsSync(this.backupPath)) {
            fs_extra_1.default.mkdirpSync(this.backupPath);
        }
        this.versionManager = new versioning_1.VersionManager(this.config.radataPath);
        // Inizializza Gun
        this.gun = config.server ?
            (0, gun_1.initGun)(config.server, { file: this.config.radataPath }) :
            (0, gun_1.initializeGun)({ file: this.config.radataPath });
        // Inizializza storage
        this.storage = (0, web3stash_1.Web3Stash)(config.storageService, config.storageConfig);
        // Inizializza IPFS se richiesto
        if (this.config.useIPFS) {
            this.ipfsAdapter = new ipfsAdapter_1.IPFSAdapter(config.storageConfig);
        }
        // Inizializza il BackupAdapter
        this.backupAdapter = new backupAdapter_1.BackupAdapter(this.storage, backupOptions);
    }
    get(key) {
        return this.gun.get(key);
    }
    put(key, data) {
        return this.gun.get(key).put(data);
    }
    on(key, callback) {
        this.gun.get(key).on(callback);
    }
    async backup(customBackupPath) {
        try {
            const sourcePath = customBackupPath || this.config.radataPath;
            if (!fs_extra_1.default.existsSync(sourcePath)) {
                throw new Error(`Il percorso ${sourcePath} non esiste`);
            }
            // Leggi tutti i file nella directory specificata
            const files = await fs_extra_1.default.readdir(sourcePath);
            const backupData = {};
            // Leggi il contenuto di ogni file
            for (const file of files) {
                const filePath = path_1.default.join(sourcePath, file);
                const stats = await fs_extra_1.default.stat(filePath);
                // Salta le directory e i file di backup
                if (stats.isDirectory() || file.startsWith('backup_'))
                    continue;
                // Determina se il file è binario o di testo
                const isBinary = this.isBinaryFile(file);
                if (isBinary) {
                    // Per i file binari, leggi come Buffer e converti in base64
                    const content = await fs_extra_1.default.readFile(filePath);
                    backupData[file] = {
                        type: 'binary',
                        content: content.toString('base64'),
                        mimeType: this.getMimeType(file)
                    };
                }
                else {
                    // Per i file di testo, leggi come UTF-8
                    const content = await fs_extra_1.default.readFile(filePath, 'utf8');
                    try {
                        backupData[file] = {
                            type: 'text',
                            content: JSON.parse(content)
                        };
                    }
                    catch {
                        backupData[file] = {
                            type: 'text',
                            content
                        };
                    }
                }
            }
            // Crea version info
            const dataBuffer = Buffer.from(JSON.stringify(backupData));
            const versionInfo = await this.versionManager.createVersionInfo(dataBuffer);
            const metadata = {
                timestamp: Date.now(),
                type: 'mogu-backup',
                versionInfo,
                sourcePath
            };
            const backupResult = await this.backupAdapter.createBackup(backupData, metadata);
            // Salva una copia locale
            const backupFileName = `backup_${Date.now()}.json`;
            const backupFilePath = path_1.default.join(this.backupPath, backupFileName);
            await fs_extra_1.default.writeFile(backupFilePath, JSON.stringify({
                data: backupData,
                metadata
            }, null, 2));
            return backupResult;
        }
        catch (error) {
            console.error('Errore durante il backup:', error);
            throw error;
        }
    }
    async restore(hash, customRestorePath) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Hash non valido');
            }
            console.log('Recupero dati da hash:', hash);
            const backup = await this.backupAdapter.getBackup(hash);
            if (!backup?.data) {
                throw new Error('Nessun dato trovato per l\'hash fornito');
            }
            const restorePath = customRestorePath || this.config.radataPath;
            // Rimuovi la directory esistente
            await fs_extra_1.default.remove(restorePath);
            console.log('Directory rimossa:', restorePath);
            // Ricrea la directory
            await fs_extra_1.default.mkdirp(restorePath);
            console.log('Directory ricreata:', restorePath);
            // Ripristina i file dal backup
            for (const [fileName, fileData] of Object.entries(backup.data)) {
                // Salta i file di backup
                if (fileName.startsWith('backup_'))
                    continue;
                const filePath = path_1.default.join(restorePath, fileName);
                if (typeof fileData === 'object' && fileData.type) {
                    if (fileData.type === 'binary') {
                        // Ripristina file binario da base64
                        const buffer = Buffer.from(fileData.content, 'base64');
                        await fs_extra_1.default.writeFile(filePath, buffer);
                    }
                    else {
                        // Ripristina file di testo
                        const content = typeof fileData.content === 'string'
                            ? fileData.content
                            : JSON.stringify(fileData.content);
                        await fs_extra_1.default.writeFile(filePath, content);
                    }
                }
                else {
                    // Gestione legacy per compatibilità
                    const content = typeof fileData === 'string' ? fileData : JSON.stringify(fileData);
                    await fs_extra_1.default.writeFile(filePath, content);
                }
                console.log(`File ripristinato: ${fileName}`);
            }
            // Attendi che i file siano scritti
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Se stiamo ripristinando nella directory radata, reinizializza Gun
            if (restorePath === this.config.radataPath) {
                this.gun = this.config.server ?
                    (0, gun_1.initGun)(this.config.server, { file: restorePath }) :
                    (0, gun_1.initializeGun)({ file: restorePath });
                // Attendi che Gun si stabilizzi
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            return true;
        }
        catch (error) {
            console.error('Errore durante il ripristino:', error);
            throw error;
        }
    }
    async compareBackup(backupHash) {
        try {
            // Leggi tutti i file nella directory radata
            const files = await fs_extra_1.default.readdir(this.config.radataPath);
            const localData = {};
            // Leggi il contenuto di ogni file
            for (const file of files) {
                const filePath = path_1.default.join(this.config.radataPath, file);
                const stats = await fs_extra_1.default.stat(filePath);
                // Salta le directory e i file di backup
                if (stats.isDirectory() || file.startsWith('backup_'))
                    continue;
                // Determina se il file è binario o di testo
                const isBinary = this.isBinaryFile(file);
                if (isBinary) {
                    // Per i file binari, leggi come Buffer e converti in base64
                    const content = await fs_extra_1.default.readFile(filePath);
                    localData[file] = {
                        type: 'binary',
                        content: content.toString('base64'),
                        mimeType: this.getMimeType(file)
                    };
                }
                else {
                    // Per i file di testo, leggi come UTF-8
                    const content = await fs_extra_1.default.readFile(filePath, 'utf8');
                    try {
                        localData[file] = {
                            type: 'text',
                            content: JSON.parse(content)
                        };
                    }
                    catch {
                        localData[file] = {
                            type: 'text',
                            content
                        };
                    }
                }
            }
            // Recupera il backup completo
            const backup = await this.backupAdapter.getBackup(backupHash);
            if (!backup?.data || !backup?.metadata?.versionInfo) {
                throw new Error('Backup non valido: metadata mancanti');
            }
            // Funzione per normalizzare i dati per il confronto
            const normalizeData = (data) => {
                if (typeof data !== 'object' || data === null)
                    return data;
                if (data.type === 'binary') {
                    // Per i file binari, confronta solo il contenuto base64
                    return data.content;
                }
                if (data.type === 'text') {
                    // Per i file di testo, confronta il contenuto
                    return typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
                }
                // Gestione legacy
                return JSON.stringify(data);
            };
            // Ordina le chiavi degli oggetti per un confronto consistente
            const sortObject = (obj) => {
                if (typeof obj !== 'object' || obj === null)
                    return obj;
                if (Array.isArray(obj))
                    return obj.map(sortObject);
                return Object.keys(obj).sort().reduce((result, key) => {
                    result[key] = normalizeData(obj[key]);
                    return result;
                }, {});
            };
            // Normalizza e ordina i dati per il confronto
            const normalizedLocalData = sortObject(localData);
            const normalizedRemoteData = sortObject(backup.data);
            // Confronta i dati effettivi
            const localDataStr = JSON.stringify(normalizedLocalData);
            const remoteDataStr = JSON.stringify(normalizedRemoteData);
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
            // Se i contenuti sono uguali, usa i metadata remoti per mantenere la coerenza
            if (localChecksum === remoteChecksum) {
                return {
                    isEqual: true,
                    isNewer: false,
                    localVersion: remoteVersion,
                    remoteVersion,
                    timeDiff: 0,
                    formattedDiff: "meno di un minuto"
                };
            }
            return {
                isEqual: false,
                isNewer: localVersion.timestamp > remoteVersion.timestamp,
                localVersion,
                remoteVersion,
                timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
                formattedDiff: this.versionManager.formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp)
            };
        }
        catch (error) {
            console.error('Errore durante il confronto:', error);
            throw error;
        }
    }
    async compareDetailedBackup(backupHash) {
        try {
            // Leggi tutti i file nella directory radata
            const files = await fs_extra_1.default.readdir(this.config.radataPath);
            const localData = {};
            // Leggi il contenuto di ogni file
            for (const file of files) {
                const filePath = path_1.default.join(this.config.radataPath, file);
                const stats = await fs_extra_1.default.stat(filePath);
                // Salta le directory e i file di backup
                if (stats.isDirectory() || file.startsWith('backup_'))
                    continue;
                // Determina se il file è binario o di testo
                const isBinary = this.isBinaryFile(file);
                if (isBinary) {
                    // Per i file binari, leggi come Buffer e converti in base64
                    const content = await fs_extra_1.default.readFile(filePath);
                    localData[file] = {
                        type: 'binary',
                        content: content.toString('base64'),
                        mimeType: this.getMimeType(file)
                    };
                }
                else {
                    // Per i file di testo, leggi come UTF-8
                    const content = await fs_extra_1.default.readFile(filePath, 'utf8');
                    try {
                        localData[file] = {
                            type: 'text',
                            content: JSON.parse(content)
                        };
                    }
                    catch {
                        localData[file] = {
                            type: 'text',
                            content
                        };
                    }
                }
            }
            // Recupera il backup completo
            const backup = await this.backupAdapter.getBackup(backupHash);
            if (!backup?.data) {
                throw new Error('Backup non valido: dati mancanti');
            }
            // Funzione per calcolare il checksum di un file
            const calculateChecksum = (data) => {
                if (typeof data === 'object' && data.type) {
                    if (data.type === 'binary') {
                        return (0, js_sha3_1.sha3_256)(data.content);
                    }
                    return (0, js_sha3_1.sha3_256)(JSON.stringify(data.content));
                }
                return (0, js_sha3_1.sha3_256)(JSON.stringify(data));
            };
            // Funzione per ottenere la dimensione di un file
            const getFileSize = (data) => {
                if (typeof data === 'object' && data.type) {
                    if (data.type === 'binary') {
                        return Buffer.from(data.content, 'base64').length;
                    }
                    return Buffer.from(JSON.stringify(data.content)).length;
                }
                return Buffer.from(JSON.stringify(data)).length;
            };
            const differences = [];
            const totalChanges = { added: 0, modified: 0, deleted: 0 };
            // Trova file modificati e aggiunti
            for (const [filePath, localContent] of Object.entries(localData)) {
                const remoteContent = backup.data[filePath];
                if (!remoteContent) {
                    // File aggiunto
                    differences.push({
                        path: filePath,
                        type: 'added',
                        newChecksum: calculateChecksum(localContent),
                        size: { new: getFileSize(localContent) }
                    });
                    totalChanges.added++;
                }
                else {
                    // Confronta i contenuti
                    const localChecksum = calculateChecksum(localContent);
                    const remoteChecksum = calculateChecksum(remoteContent);
                    if (localChecksum !== remoteChecksum) {
                        // File modificato
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
            // Crea version info per entrambe le versioni
            const localDataBuffer = Buffer.from(JSON.stringify(localData));
            const remoteDataBuffer = Buffer.from(JSON.stringify(backup.data));
            const localVersion = await this.versionManager.createVersionInfo(localDataBuffer);
            const remoteVersion = backup.metadata.versionInfo;
            return {
                isEqual: differences.length === 0,
                isNewer: localVersion.timestamp > remoteVersion.timestamp,
                localVersion,
                remoteVersion,
                timeDiff: Math.abs(localVersion.timestamp - remoteVersion.timestamp),
                formattedDiff: this.versionManager.formatTimeDifference(localVersion.timestamp, remoteVersion.timestamp),
                differences,
                totalChanges
            };
        }
        catch (error) {
            console.error('Errore durante il confronto dettagliato:', error);
            throw error;
        }
    }
    async getBackupState(hash) {
        return this.backupAdapter.getBackup(hash);
    }
    // Utility per determinare se un file è binario basandosi sull'estensione
    isBinaryFile(filename) {
        const binaryExtensions = [
            '.png', '.jpg', '.jpeg', '.gif', '.bmp',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx',
            '.zip', '.rar', '.7z', '.tar', '.gz'
        ];
        const ext = path_1.default.extname(filename).toLowerCase();
        return binaryExtensions.includes(ext);
    }
    // Utility per ottenere il MIME type
    getMimeType(filename) {
        const ext = path_1.default.extname(filename).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.pdf': 'application/pdf',
            // ... altri tipi MIME ...
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}
exports.Mogu = Mogu;
