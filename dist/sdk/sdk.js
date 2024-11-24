"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mogu = exports.NodeType = void 0;
const index_1 = require("../web3stash/index");
const types_1 = require("../db/types");
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return types_1.NodeType; } });
const gunDb_1 = require("../db/gunDb");
const gun_1 = require("../config/gun");
const fsPromises = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const js_sha3_1 = require("js-sha3");
/**
 * Mogu - A decentralized database with IPFS backup capabilities
 * @class
 */
class Mogu {
    constructor(options = {}) {
        const { key, storageService, storageConfig, server } = options;
        // Imposta il percorso di Gun correttamente
        this.radataPath = path_1.default.join(process.cwd(), "radata");
        console.log("Using radata path:", this.radataPath);
        // Crea la directory radata se non esiste
        fsPromises.mkdir(this.radataPath, { recursive: true }).catch(console.error);
        // Inizializza Gun con il percorso corretto
        const gunInstance = server ? (0, gun_1.initGun)(server, { file: this.radataPath }) : (0, gun_1.initializeGun)({ file: this.radataPath });
        this.gun = new gunDb_1.GunMogu(gunInstance, key || "");
        if (storageService && storageConfig) {
            this.storageService = (0, index_1.Web3Stash)(storageService, storageConfig);
        }
    }
    // Aggiungiamo il metodo login
    async login(username, password) {
        return this.gun.authenticate(username, password);
    }
    // Metodi base - usa direttamente Gun
    async put(path, data) {
        const ref = this.gun.getGunInstance().get("nodes").get(path);
        return new Promise(resolve => {
            ref.put(data, (ack) => resolve(ack));
        });
    }
    async get(path) {
        const ref = this.gun.getGunInstance().get("nodes").get(path);
        return new Promise(resolve => {
            ref.once((data) => resolve(data));
        });
    }
    on(path, callback) {
        this.gun.getGunInstance().get("nodes").get(path).on(callback);
    }
    // Backup su IPFS - salva i dati raw di Gun
    async backup() {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            // Leggi tutti i file dalla directory gun-data
            const files = await fsPromises.readdir(this.radataPath);
            console.log("Files to backup:", files);
            const backupData = {};
            for (const file of files) {
                const filePath = path_1.default.join(this.radataPath, file);
                const content = await fsPromises.readFile(filePath, "utf8");
                try {
                    // Prova a parsare il contenuto come JSON
                    backupData[file] = {
                        fileName: file,
                        content: JSON.parse(content),
                    };
                }
                catch {
                    // Se non è JSON valido, salvalo come stringa
                    backupData[file] = {
                        fileName: file,
                        content: content,
                    };
                }
            }
            console.log("Backup data prepared:", backupData);
            // Carica i dati su IPFS
            const result = await this.storageService.uploadJson(backupData);
            // Fai l'unpin del backup precedente solo dopo aver verificato che il nuovo è ok
            if (this.lastBackupHash) {
                try {
                    await this.storageService.unpin(this.lastBackupHash);
                    console.log("Previous backup unpinned:", this.lastBackupHash);
                }
                catch (err) {
                    console.warn("Failed to unpin previous backup:", err);
                }
            }
            this.lastBackupHash = result.id;
            console.log("New backup created with hash:", result.id);
            return result.id;
        }
        catch (err) {
            console.error("Backup failed:", err);
            throw err;
        }
    }
    async restore(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            // Ottieni i dati direttamente da IPFS usando il gateway
            const backupData = await this.storageService.get(hash);
            console.log("Backup data received:", JSON.stringify(backupData, null, 2));
            if (!backupData || typeof backupData !== "object") {
                throw new Error("Invalid backup data format");
            }
            // Rimuovi la directory radata esistente
            await fsPromises.rm(this.radataPath, { recursive: true, force: true });
            console.log("Existing radata directory removed");
            // Crea la directory radata
            await fsPromises.mkdir(this.radataPath, { recursive: true });
            console.log("New radata directory created");
            // Ripristina ogni file esattamente come era
            for (const [fileName, fileData] of Object.entries(backupData)) {
                if (!fileData || typeof fileData !== "object") {
                    console.warn(`Invalid file data for ${fileName}`);
                    continue;
                }
                const { content } = fileData;
                if (!content) {
                    console.warn(`Missing content for ${fileName}`);
                    continue;
                }
                const filePath = path_1.default.join(this.radataPath, fileName);
                console.log(`Restoring file: ${fileName}`);
                try {
                    // Mantieni la struttura esatta del file di Gun
                    const fileContent = JSON.stringify(content);
                    await fsPromises.writeFile(filePath, fileContent, "utf8");
                    console.log(`File ${fileName} restored successfully`);
                }
                catch (err) {
                    console.error(`Error writing file ${fileName}:`, err);
                    throw err;
                }
            }
            this.lastBackupHash = hash;
            console.log("All files restored successfully");
            // Reinizializza Gun per caricare i nuovi dati
            const gunInstance = this.gun.getGunInstance();
            gunInstance.opt({ file: this.radataPath });
            // Attendi che Gun carichi i dati
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        }
        catch (err) {
            console.error("Restore failed:", err);
            throw err;
        }
    }
    // Metodo per rimuovere esplicitamente un backup
    async removeBackup(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            await this.storageService.unpin(hash);
            if (this.lastBackupHash === hash) {
                this.lastBackupHash = undefined;
            }
            console.log("Backup removed:", hash);
        }
        catch (err) {
            console.error("Failed to remove backup:", err);
            throw err;
        }
    }
    // Metodi di utilità
    getGun() {
        return this.gun.getGunInstance();
    }
    getState() {
        return this.gun.getState();
    }
    async getFileHash(content) {
        return (0, js_sha3_1.keccak256)(content);
    }
    async compareBackup(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            // Ottieni i dati del backup remoto
            const remoteData = await this.storageService.get(hash);
            console.log("Remote data:", JSON.stringify(remoteData, null, 2));
            // Leggi i file locali
            const localFiles = await fsPromises.readdir(this.radataPath);
            const localData = {};
            // Carica i contenuti dei file locali
            for (const file of localFiles) {
                const filePath = path_1.default.join(this.radataPath, file);
                const content = await fsPromises.readFile(filePath, 'utf8');
                try {
                    localData[file] = {
                        fileName: file,
                        content: JSON.parse(content)
                    };
                }
                catch {
                    localData[file] = {
                        fileName: file,
                        content: content
                    };
                }
            }
            // Confronta i backup
            const differences = {
                missingLocally: [],
                missingRemotely: [],
                contentMismatch: []
            };
            // Controlla i file remoti
            for (const [fileName, fileData] of Object.entries(remoteData)) {
                if (!localData[fileName]) {
                    differences.missingLocally.push(fileName);
                }
                else {
                    // Confronta i contenuti normalizzati
                    const remoteContent = JSON.stringify(fileData.content);
                    const localContent = JSON.stringify(localData[fileName].content);
                    if (remoteContent !== localContent) {
                        differences.contentMismatch.push(fileName);
                    }
                }
            }
            // Controlla i file locali
            for (const fileName of Object.keys(localData)) {
                if (!remoteData[fileName]) {
                    differences.missingRemotely.push(fileName);
                }
            }
            const isEqual = differences.missingLocally.length === 0 &&
                differences.missingRemotely.length === 0 &&
                differences.contentMismatch.length === 0;
            console.log("Compare details:", {
                localFiles: Object.keys(localData),
                remoteFiles: Object.keys(remoteData),
                differences
            });
            return {
                isEqual,
                differences: isEqual ? undefined : differences
            };
        }
        catch (err) {
            console.error("Backup comparison failed:", err);
            throw err;
        }
    }
}
exports.Mogu = Mogu;
