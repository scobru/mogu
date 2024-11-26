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
class Mogu {
    constructor(config) {
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
        const data = await fs_extra_1.default.readFile(this.config.radataPath);
        if (!Buffer.isBuffer(data)) {
            throw new Error('Dati non validi: il file deve essere letto come Buffer');
        }
        const versionInfo = await this.versionManager.createVersionInfo(data);
        const metadata = {
            timestamp: Date.now(),
            type: 'mogu-backup',
            versionInfo
        };
        const hash = await this.storage.uploadJson(data, { metadata });
        return { hash, versionInfo };
    }
    async restore(hash) {
        try {
            const remoteData = await this.storage.get(hash);
            // Rimuovi la directory esistente
            await fs_extra_1.default.remove(this.config.radataPath);
            // Ricrea la directory
            await fs_extra_1.default.mkdirp(this.config.radataPath);
            // Ripristina i file dal backup
            const backupData = JSON.parse(remoteData.toString());
            for (const [fileName, fileData] of Object.entries(backupData)) {
                const filePath = path_1.default.join(this.config.radataPath, fileName);
                await fs_extra_1.default.writeFile(filePath, JSON.stringify(fileData));
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
        const localData = await fs_extra_1.default.readFile(this.config.radataPath);
        if (!Buffer.isBuffer(localData)) {
            throw new Error('Dati locali non validi: il file deve essere letto come Buffer');
        }
        const remoteData = await this.storage.get(backupHash);
        const metadata = await this.storage.getMetadata(backupHash);
        if (!metadata?.versionInfo) {
            throw new Error('Backup non valido: metadata mancanti');
        }
        return this.versionManager.compareVersions(localData, metadata.versionInfo);
    }
    async compareDetailedBackup(backupHash) {
        const localData = await fs_extra_1.default.readFile(this.config.radataPath);
        if (!Buffer.isBuffer(localData)) {
            throw new Error('Dati locali non validi: il file deve essere letto come Buffer');
        }
        const remoteData = await this.storage.get(backupHash);
        if (!Buffer.isBuffer(remoteData)) {
            throw new Error('Dati remoti non validi: devono essere in formato Buffer');
        }
        return this.versionManager.compareDetailedVersions(localData, remoteData);
    }
}
exports.Mogu = Mogu;
