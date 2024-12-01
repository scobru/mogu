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
exports.ArweaveService = void 0;
const base_storage_1 = require("./base-storage");
const arweave_1 = __importDefault(require("arweave"));
const fs_1 = require("fs");
const mime = __importStar(require("mime-types"));
class ArweaveService extends base_storage_1.StorageService {
    constructor(arweavePrivateKey, config) {
        super();
        this.serviceBaseUrl = 'ar://';
        this.serviceInstance = arweave_1.default.init({
            ...config,
            host: config?.host ?? 'arweave.net',
            port: config?.port ?? 443,
            protocol: config?.protocol ?? 'https',
        });
        this.arweaveKey = arweavePrivateKey;
    }
    async uploadJson(jsonData, options) {
        const data = JSON.stringify(jsonData);
        const transaction = await this.serviceInstance.createTransaction({ data }, this.arweaveKey);
        transaction.addTag('Content-Type', 'text/json');
        await this.serviceInstance.transactions.sign(transaction, this.arweaveKey);
        const response = await this.serviceInstance.transactions.post(transaction);
        await this.getTxStatus(transaction.id, 0);
        return { id: transaction.id, metadata: { ...transaction } };
    }
    async uploadImage(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        const transaction = await this.serviceInstance.createTransaction({ data: fileData }, this.arweaveKey);
        transaction.addTag('Content-Type', fileType);
        await this.serviceInstance.transactions.sign(transaction, this.arweaveKey);
        const uploader = await this.serviceInstance.transactions.getUploader(transaction);
        while (!uploader.isComplete) {
            uploader.uploadChunk().then(() => {
                this.emit('upload', uploader.pctComplete, uploader.uploadedChunks, uploader.totalChunks);
            }).catch(err => {
                this.emit('error', 'Uploader Failed to upload');
            });
        }
        await this.getTxStatus(transaction.id, 0);
        return { id: transaction.id, metadata: { ...transaction } };
    }
    async uploadVideo(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        const transaction = await this.serviceInstance.createTransaction({ data: fileData }, this.arweaveKey);
        transaction.addTag('Content-Type', fileType);
        await this.serviceInstance.transactions.sign(transaction, this.arweaveKey);
        const uploader = await this.serviceInstance.transactions.getUploader(transaction);
        while (!uploader.isComplete) {
            uploader.uploadChunk().then(() => {
                this.emit('upload', uploader.pctComplete, uploader.uploadedChunks, uploader.totalChunks);
            }).catch(err => {
                this.emit('error', 'Uploader Failed to upload');
            });
        }
        await this.getTxStatus(transaction.id, 0);
        return { id: transaction.id, metadata: { ...transaction } };
    }
    async uploadFile(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        const transaction = await this.serviceInstance.createTransaction({ data: fileData }, this.arweaveKey);
        transaction.addTag('Content-Type', fileType);
        await this.serviceInstance.transactions.sign(transaction, this.arweaveKey);
        const uploader = await this.serviceInstance.transactions.getUploader(transaction);
        while (!uploader.isComplete) {
            uploader.uploadChunk().then(() => {
                this.emit('upload', uploader.pctComplete, uploader.uploadedChunks, uploader.totalChunks);
            }).catch(err => {
                this.emit('error', 'Uploader Failed to upload');
            });
        }
        await this.getTxStatus(transaction.id, 0);
        return { id: transaction.id, metadata: { ...transaction } };
    }
    async get(hash) {
        throw new Error('Get not supported on Arweave');
    }
    // Public async uploadImageFromStream(path: string, dataSize: number, imageType: string, options?: any): Promise<UploadOutput> {
    // 	const transaction = await pipeline(createReadStream(path), createTransactionAsync({}, this.serviceInstance, this.arweaveKey));
    // 	transaction.addTag('Content-Type', 'image/' + imageType);
    // 	await this.serviceInstance.transactions.sign(transaction, this.arweaveKey);
    // 	await pipeline(createReadStream(path), uploadTransactionAsync(transaction, this.arweaveKey));
    // 	await this.getTxStatus(transaction.id, 0);
    // 	return {id: transaction.id, metadata: {...transaction}};
    // }
    // Public async uploadVideoFromStream(readableStream: internal.Readable, dataSize: number, videoType: string, options?: any): Promise<UploadOutput> {
    // 	const transaction = await pipeline(readableStream, createTransactionAsync({}, this.serviceInstance, this.arweaveKey));
    // 	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
    // 	transaction.addTag('Content-Type', 'video/' + videoType);
    // 	await this.serviceInstance.transactions.sign(transaction, this.arweaveKey);
    // 	await pipeline(readableStream, uploadTransactionAsync(transaction, this.arweaveKey));
    // 	await this.getTxStatus(transaction.id, 0);
    // 	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    // 	return {id: transaction.id, metadata: {...transaction}};
    // }
    // Public async uploadFileFromStream(readableStream: any, dataSize: number, options?: any): Promise<UploadOutput> {
    // 	const transaction = await pipeline(readableStream, createTransactionAsync({}, this.serviceInstance, this.arweaveKey));
    // 	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
    // 	transaction.addTag('Content-Type', 'file');
    // 	await this.serviceInstance.transactions.sign(transaction, this.arweaveKey);
    // 	await pipeline(readableStream, uploadTransactionAsync(transaction, this.arweaveKey));
    // 	await this.getTxStatus(transaction.id, 0);
    // 	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    // 	return {id: transaction.id, metadata: {...transaction}};
    // }
    async getTxStatus(txId, retries) {
        try {
            const tx = await this.serviceInstance.transactions.getStatus(txId);
            if (tx.status === 200 && tx.confirmed) {
                if (tx.confirmed.number_of_confirmations > 10) {
                    this.emit('success', tx);
                }
                else {
                    this.emit('confirmation', tx.confirmed.number_of_confirmations, txId);
                    setTimeout(() => {
                        this.getTxStatus(txId, 0).then().catch(e => {
                            console.log(e);
                        });
                    }, 10000); // 30secs
                }
            }
            else if (retries <= 10) {
                if (tx.status === 202 || tx.status === 429 || tx.status === 404) { // 429 Rate Limit, 404 Transaction Not Found
                    setTimeout(() => {
                        this.getTxStatus(txId, ++retries).then().catch(e => {
                            console.log(e);
                        });
                    }, 20000); // 120secs
                }
                else {
                    this.emit('error', `Arweave Upload Failed, Status code: ${tx.status}`, txId);
                }
            }
            else {
                this.emit('error', 'Max Retries Exceeded: Transaction Status Update Failed/Not Found', txId);
            }
        }
        catch (error) {
            this.emit('error', error, txId);
        }
        return true;
    }
    async unpin(hash) {
        // Arweave non supporta l'unpin poiché è una blockchain permanente
        throw new Error('Unpin not supported on Arweave - data is permanent');
    }
}
exports.ArweaveService = ArweaveService;
