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
    async get(hash) {
        const response = await axios_1.default.get(`https://gateway.pinata.cloud/ipfs/${hash}`);
        return response.data;
    }
    getEndpoint() {
        return "https://gateway.pinata.cloud/ipfs/";
    }
    async unpin(hash) {
        await this.serviceInstance.unpin(hash);
    }
    async uploadJson(jsonData, options) {
        try {
            // Se è una richiesta GET, usa il gateway
            if (options?.method === "GET") {
                const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${options.hash}`;
                const response = await axios_1.default.get(gatewayUrl);
                return response.data;
            }
            // Per l'upload, usa pinJSONToIPFS
            const pinataOptions = {
                pinataMetadata: {
                    name: "mogu-backup",
                    keyvalues: {
                        timestamp: new Date().toISOString(),
                        type: "backup",
                    },
                },
            };
            const response = await this.serviceInstance.pinJSONToIPFS(jsonData, pinataOptions);
            // Verifica che i dati siano stati caricati correttamente
            const verifyUrl = `https://gateway.pinata.cloud/ipfs/${response.IpfsHash}`;
            await axios_1.default.get(verifyUrl);
            return {
                id: response.IpfsHash,
                metadata: {
                    ...response,
                    data: jsonData, // Includi i dati originali nella risposta
                },
            };
        }
        catch (error) {
            console.error("Error with Pinata:", error);
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
