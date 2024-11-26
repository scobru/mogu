"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinataService = void 0;
const base_storage_1 = require("./base-storage");
const sdk_1 = __importDefault(require("@pinata/sdk"));
const axios_1 = __importDefault(require("axios"));
class PinataService extends base_storage_1.StorageService {
    constructor(pinataApiKey, pinataApiSecret) {
        super();
        this.serviceBaseUrl = "ipfs://";
        this.serviceInstance = (0, sdk_1.default)(pinataApiKey, pinataApiSecret);
    }
    formatPinataMetadata(metadata) {
        if (!metadata)
            return {};
        const result = {};
        if (metadata.name) {
            result.name = metadata.name;
        }
        if (metadata.keyvalues) {
            Object.entries(metadata.keyvalues).forEach(([key, value]) => {
                if (value !== undefined) {
                    result[key] = value;
                }
            });
        }
        return result;
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
        await this.serviceInstance.unpin(hash);
    }
    async uploadJson(jsonData, options) {
        try {
            const pinataOptions = {
                pinataMetadata: this.formatPinataMetadata(options?.pinataMetadata),
                pinataOptions: options?.pinataOptions
            };
            const response = await this.serviceInstance.pinJSONToIPFS(jsonData, pinataOptions);
            return {
                id: response.IpfsHash,
                metadata: {
                    ...response,
                    data: jsonData
                },
            };
        }
        catch (error) {
            console.error("Errore con Pinata:", error);
            throw error;
        }
    }
    async getMetadata(hash) {
        try {
            const pinList = await this.serviceInstance.pinList({
                hashContains: hash
            });
            if (pinList.rows && pinList.rows.length > 0) {
                return pinList.rows[0].metadata;
            }
            return null;
        }
        catch (error) {
            console.error('Errore nel recupero dei metadata:', error);
            throw error;
        }
    }
    async uploadImage(path, options) {
        const response = await this.serviceInstance.pinFromFS(path, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadVideo(path, options) {
        const response = await this.serviceInstance.pinFromFS(path, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadFile(path, options) {
        const response = await this.serviceInstance.pinFromFS(path, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadImageFromStream(readableStream, options) {
        const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadVideoFromStream(readableStream, options) {
        const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
    async uploadFileFromStream(readableStream, options) {
        const response = await this.serviceInstance.pinFileToIPFS(readableStream, options);
        return { id: response.IpfsHash, metadata: { ...response } };
    }
}
exports.PinataService = PinataService;
