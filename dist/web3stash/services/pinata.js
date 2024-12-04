"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinataService = void 0;
const base_storage_1 = require("./base-storage");
const pinata_web3_1 = require("pinata-web3");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
class PinataService extends base_storage_1.StorageService {
    constructor(apiKey, apiSecret) {
        super();
        this.serviceBaseUrl = "ipfs://";
        this.serviceInstance = new pinata_web3_1.PinataSDK({
            pinataJwt: apiKey,
            pinataGateway: "gateway.pinata.cloud"
        });
    }
    async get(hash) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Hash non valido');
            }
            const response = await axios_1.default.get(`https://gateway.pinata.cloud/ipfs/${hash}`);
            return response.data;
        }
        catch (error) {
            console.error('Errore nel recupero da Pinata:', error);
            throw error;
        }
    }
    getEndpoint() {
        return "https://gateway.pinata.cloud/ipfs/";
    }
    async unpin(hash) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Hash non valido');
            }
            console.log(`Tentativo di unpin per l'hash: ${hash}`);
            // Prima verifica se è già unpinnato
            const isPinnedBefore = await this.isPinned(hash);
            if (!isPinnedBefore) {
                console.log(`L'hash ${hash} è già unpinnato`);
                return;
            }
            // Esegui l'unpin
            await this.serviceInstance.unpin([hash]);
            console.log(`Comando unpin eseguito per l'hash: ${hash}`);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('is not pinned')) {
                console.log(`L'hash ${hash} non è pinnato nel servizio`);
                return;
            }
            console.error('Errore durante unpin da Pinata:', error);
            throw error;
        }
    }
    async uploadJson(jsonData, options) {
        try {
            const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
            const file = new File([blob], 'data.json', { type: 'application/json' });
            const response = await this.serviceInstance.upload.file(file, {
                metadata: options?.pinataMetadata
            });
            return {
                id: response.IpfsHash,
                metadata: {
                    timestamp: Date.now(),
                    size: JSON.stringify(jsonData).length,
                    type: 'json',
                    ...response
                }
            };
        }
        catch (error) {
            console.error("Errore con Pinata:", error);
            throw error;
        }
    }
    async uploadFile(path, options) {
        try {
            const fileContent = await fs_1.default.promises.readFile(path);
            const file = new File([fileContent], path.split('/').pop() || 'file', {
                type: 'application/octet-stream'
            });
            const response = await this.serviceInstance.upload.file(file, {
                metadata: options?.pinataMetadata
            });
            return {
                id: response.IpfsHash,
                metadata: {
                    timestamp: Date.now(),
                    type: 'file',
                    ...response
                }
            };
        }
        catch (error) {
            console.error("Errore con Pinata:", error);
            throw error;
        }
    }
    async getMetadata(hash) {
        try {
            const response = await this.serviceInstance.query.files({
                hashContains: hash,
                limit: 1
            });
            if (response.items.length > 0) {
                return response.items[0];
            }
            return null;
        }
        catch (error) {
            console.error('Errore nel recupero dei metadata:', error);
            throw error;
        }
    }
    async isPinned(hash) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Hash non valido');
            }
            console.log(`Verifica pin per l'hash: ${hash}`);
            const response = await this.serviceInstance.query.files({
                hashContains: hash,
                limit: 1
            });
            const isPinned = response.items.length > 0;
            console.log(`Stato pin per l'hash ${hash}: ${isPinned ? 'pinnato' : 'non pinnato'}`);
            return isPinned;
        }
        catch (error) {
            console.error('Errore durante la verifica del pin:', error);
            return false;
        }
    }
    // Metodi non utilizzati ma richiesti dall'interfaccia
    async uploadImage(path, options) {
        return this.uploadFile(path, options);
    }
    async uploadVideo(path, options) {
        return this.uploadFile(path, options);
    }
}
exports.PinataService = PinataService;
