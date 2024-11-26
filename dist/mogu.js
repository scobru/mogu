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
class Mogu {
    constructor(config, backupOptions) {
        const radataPath = config.radataPath || path_1.default.join(process.cwd(), "radata");
        this.config = {
            ...config,
            radataPath,
            useIPFS: config.useIPFS ?? false,
            server: config.server
        };
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
    async backup() {
        try {
            // Leggi tutti i file nella directory radata
            const files = await fs_extra_1.default.readdir(this.config.radataPath);
            const backupData = {};
            // Leggi il contenuto di ogni file
            for (const file of files) {
                const filePath = path_1.default.join(this.config.radataPath, file);
                const stats = await fs_extra_1.default.stat(filePath);
                // Salta le directory
                if (stats.isDirectory())
                    continue;
                const content = await fs_extra_1.default.readFile(filePath, 'utf8');
                try {
                    backupData[file] = JSON.parse(content);
                }
                catch {
                    backupData[file] = content;
                }
            }
            // Converti i dati in Buffer
            const dataBuffer = Buffer.from(JSON.stringify(backupData));
            // Crea version info
            const versionInfo = await this.versionManager.createVersionInfo(dataBuffer);
            const metadata = {
                timestamp: Date.now(),
                type: 'mogu-backup',
                versionInfo
            };
            return this.backupAdapter.createBackup(backupData, metadata);
        }
        catch (error) {
            console.error('Errore durante il backup:', error);
            throw error;
        }
    }
    async restore(hash) {
        try {
            // Assicurati che l'hash sia una stringa valida
            if (!hash || typeof hash !== 'string') {
                throw new Error('Hash non valido');
            }
            console.log('Recupero dati da hash:', hash);
            const backup = await this.backupAdapter.getBackup(hash);
            if (!backup?.data) {
                throw new Error('Nessun dato trovato per l\'hash fornito');
            }
            // Rimuovi la directory esistente
            await fs_extra_1.default.remove(this.config.radataPath);
            console.log('Directory radata rimossa');
            // Ricrea la directory
            await fs_extra_1.default.mkdirp(this.config.radataPath);
            console.log('Directory radata ricreata');
            // Ripristina i file dal backup
            for (const [fileName, fileData] of Object.entries(backup.data)) {
                const filePath = path_1.default.join(this.config.radataPath, fileName);
                await fs_extra_1.default.writeFile(filePath, JSON.stringify(fileData));
                console.log(`File ripristinato: ${fileName}`);
            }
            // Reinizializza Gun con il nuovo path
            this.gun = this.config.server ?
                (0, gun_1.initGun)(this.config.server, { file: this.config.radataPath }) :
                (0, gun_1.initializeGun)({ file: this.config.radataPath });
            // Attendi che Gun si stabilizzi
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        }
        catch (error) {
            console.error('Errore durante il ripristino:', error);
            return false;
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
                // Salta le directory
                if (stats.isDirectory())
                    continue;
                const content = await fs_extra_1.default.readFile(filePath, 'utf8');
                try {
                    localData[file] = JSON.parse(content);
                }
                catch {
                    localData[file] = content;
                }
            }
            // Converti i dati locali in Buffer
            const localDataBuffer = Buffer.from(JSON.stringify(localData));
            // Recupera i metadata del backup
            const backup = await this.backupAdapter.getBackup(backupHash);
            if (!backup?.metadata?.versionInfo) {
                throw new Error('Backup non valido: metadata mancanti');
            }
            return this.versionManager.compareVersions(localDataBuffer, backup.metadata.versionInfo);
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
                // Salta le directory
                if (stats.isDirectory())
                    continue;
                const content = await fs_extra_1.default.readFile(filePath, 'utf8');
                try {
                    localData[file] = JSON.parse(content);
                }
                catch {
                    localData[file] = content;
                }
            }
            // Converti i dati locali in Buffer
            const localDataBuffer = Buffer.from(JSON.stringify(localData));
            // Recupera il backup completo
            const backup = await this.backupAdapter.getBackup(backupHash);
            const remoteDataBuffer = Buffer.from(JSON.stringify(backup.data));
            return this.versionManager.compareDetailedVersions(localDataBuffer, remoteDataBuffer);
        }
        catch (error) {
            console.error('Errore durante il confronto dettagliato:', error);
            throw error;
        }
    }
}
exports.Mogu = Mogu;
