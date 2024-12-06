"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinataService = void 0;
const base_storage_1 = require("./base-storage");
const pinata_web3_1 = require("pinata-web3");
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
class PinataService extends base_storage_1.StorageService {
    constructor(config) {
        super();
        this.serviceBaseUrl = "ipfs://";
        if (!config.pinataJwt) {
            throw new Error('JWT Pinata non valido o mancante');
        }
        this.serviceInstance = new pinata_web3_1.PinataSDK({
            pinataJwt: config.pinataJwt,
            pinataGateway: config.pinataGateway || "gateway.pinata.cloud"
        });
        this.gateway = config.pinataGateway || "gateway.pinata.cloud";
    }
    createVersionInfo(data) {
        const now = Date.now();
        const dataBuffer = Buffer.from(JSON.stringify(data));
        return {
            hash: crypto_1.default.createHash('sha256').update(dataBuffer).digest('hex'),
            timestamp: now,
            size: dataBuffer.length,
            metadata: {
                createdAt: new Date(now).toISOString(),
                modifiedAt: new Date(now).toISOString(),
                checksum: crypto_1.default.createHash('md5').update(dataBuffer).digest('hex')
            }
        };
    }
    async get(hash) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Hash non valido');
            }
            const response = await this.serviceInstance.gateways.get(hash);
            if (!response || typeof response !== 'object') {
                throw new Error('Risposta non valida da Pinata');
            }
            // Se la risposta è una stringa JSON, proviamo a parsarla
            let parsedResponse = response;
            if (typeof response === 'string') {
                try {
                    parsedResponse = JSON.parse(response);
                }
                catch (e) {
                    throw new Error('Dati non validi ricevuti da Pinata');
                }
            }
            // Verifichiamo che la risposta abbia la struttura corretta
            const responseData = parsedResponse;
            if (!responseData.data?.data) {
                throw new Error('Struttura dati non valida nel backup');
            }
            // Estraiamo i dati dalla struttura nidificata
            const backupData = {
                data: responseData.data.data,
                metadata: responseData.data.metadata || {
                    timestamp: Date.now(),
                    type: 'json',
                    versionInfo: this.createVersionInfo(responseData.data.data)
                }
            };
            // Verifichiamo che i dati dei file abbiano la struttura corretta
            const fileData = backupData.data;
            for (const [path, data] of Object.entries(fileData)) {
                if (typeof data !== 'object' || data === null) {
                    throw new Error(`Dati non validi per il file ${path}: i dati devono essere un oggetto`);
                }
                // Se i dati sono crittografati, hanno una struttura diversa
                if (data.iv && data.mimeType) {
                    data.type = data.mimeType;
                    data.content = data;
                    continue;
                }
                if (!data.type) {
                    throw new Error(`Dati non validi per il file ${path}: manca il campo 'type'`);
                }
                if (!data.content) {
                    throw new Error(`Dati non validi per il file ${path}: manca il campo 'content'`);
                }
            }
            return backupData;
        }
        catch (error) {
            throw error;
        }
    }
    getEndpoint() {
        return `https://${this.gateway}/ipfs/`;
    }
    async unpin(hash) {
        try {
            if (!hash || typeof hash !== 'string' || !/^[a-zA-Z0-9]{46,59}$/.test(hash)) {
                return false;
            }
            const isPinnedBefore = await this.isPinned(hash);
            if (!isPinnedBefore) {
                return false;
            }
            await this.serviceInstance.unpin([hash]);
            return true;
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('is not pinned') ||
                    error.message.includes('NOT_FOUND') ||
                    error.message.includes('url does not contain CID')) {
                    return false;
                }
                if (error.message.includes('INVALID_CREDENTIALS')) {
                    throw new Error('Errore di autenticazione con Pinata: verifica il JWT');
                }
            }
            throw error;
        }
    }
    async uploadJson(jsonData, options) {
        try {
            const content = JSON.stringify(jsonData);
            const response = await this.serviceInstance.upload.json(jsonData, {
                metadata: options?.pinataMetadata
            });
            return {
                id: response.IpfsHash,
                metadata: {
                    timestamp: Date.now(),
                    size: content.length,
                    type: 'json',
                    ...response
                }
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('INVALID_CREDENTIALS')) {
                throw new Error('Errore di autenticazione con Pinata: verifica il JWT');
            }
            throw error;
        }
    }
    async uploadFile(path, options) {
        try {
            const fileContent = await fs_1.default.promises.readFile(path);
            const fileName = path.split('/').pop() || 'file';
            const file = new File([fileContent], fileName, { type: 'application/octet-stream' });
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
            throw error;
        }
    }
    async getMetadata(hash) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Hash non valido');
            }
            const response = await this.serviceInstance.gateways.get(hash);
            return response;
        }
        catch (error) {
            throw error;
        }
    }
    async isPinned(hash) {
        try {
            if (!hash || typeof hash !== 'string' || !/^[a-zA-Z0-9]{46,59}$/.test(hash)) {
                return false;
            }
            try {
                const response = await this.serviceInstance.gateways.get(hash);
                return !!response;
            }
            catch (error) {
                if (error instanceof Error &&
                    (error.message.includes('NOT_FOUND') ||
                        error.message.includes('url does not contain CID'))) {
                    return false;
                }
                throw error;
            }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('INVALID_CREDENTIALS')) {
                throw new Error('Errore di autenticazione con Pinata: verifica il JWT');
            }
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
