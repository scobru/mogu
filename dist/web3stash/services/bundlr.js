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
exports.BundlrService = void 0;
const base_storage_1 = require("./base-storage");
// Import Bundlr from './bundlrHelper.js';
const client_1 = __importDefault(require("@bundlr-network/client"));
const fs_1 = require("fs");
const mime = __importStar(require("mime-types"));
class BundlrService extends base_storage_1.StorageService {
    constructor(currency, privateKey, testing = false, config) {
        super();
        this.serviceBaseUrl = 'ar://';
        this.bundlrMainNetworkUrl = 'http://node2.bundlr.network';
        this.bundlrTestNetworkUrl = 'https://devnet.bundlr.network';
        this.testing = testing;
        this.bundlrKey = privateKey;
        const url = testing ? this.bundlrTestNetworkUrl : this.bundlrMainNetworkUrl;
        this.serviceInstance = new client_1.default(url, currency, privateKey, config);
    }
    async uploadJson(jsonData, options) {
        const data = JSON.stringify(jsonData);
        await this.checkAndFundNode(data.length);
        const tags = [{ name: 'Content-Type', value: 'text/json' }];
        const transaction = this.serviceInstance.createTransaction(data, { ...options, tags });
        await transaction.sign();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = await transaction.upload();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { id: response.data.id, metadata: { ...response.data } };
    }
    async uploadImage(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        await this.checkAndFundNode(fileData.length);
        const tags = [{ name: 'Content-Type', value: fileType }];
        const transaction = this.serviceInstance.createTransaction(fileData, { ...options, tags });
        await transaction.sign();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = await transaction.upload();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { id: response.data.id, metadata: { ...response.data } };
    }
    async uploadVideo(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        await this.checkAndFundNode(fileData.length);
        const tags = [{ name: 'Content-Type', value: fileType }];
        const transaction = this.serviceInstance.createTransaction(fileData, { ...options, tags });
        await transaction.sign();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = await transaction.upload();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { id: response.data.id, metadata: { ...response.data } };
    }
    async uploadFile(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        await this.checkAndFundNode(fileData.length);
        const tags = [{ name: 'Content-Type', value: fileType }];
        const transaction = this.serviceInstance.createTransaction(fileData, { ...options, tags });
        await transaction.sign();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = await transaction.upload();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { id: response.data.id, metadata: { ...response.data } };
    }
    async uploadImageFromStream(readableStream, dataSize, imageType, options) {
        await this.checkAndFundNode(dataSize);
        const tags = [{ name: 'Content-Type', value: `image/${imageType}` }];
        const uploader = this.serviceInstance.uploader.chunkedUploader;
        this.setChunkerLogger(uploader);
        const response = await uploader.uploadData(readableStream, { ...options, tags });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { id: response.data.id, metadata: { ...response.data } };
    }
    async uploadVideoFromStream(readableStream, dataSize, videoType, options) {
        await this.checkAndFundNode(dataSize);
        const tags = [{ name: 'Content-Type', value: `video/${videoType}` }];
        const uploader = this.serviceInstance.uploader.chunkedUploader;
        this.setChunkerLogger(uploader);
        const response = await uploader.uploadData(readableStream, { ...options, tags });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { id: response.data.id, metadata: { ...response.data } };
    }
    async uploadFileFromStream(readableStream, dataSize, options) {
        await this.checkAndFundNode(dataSize);
        const tags = [{ name: 'Content-Type', value: 'file' }];
        const uploader = this.serviceInstance.uploader.chunkedUploader;
        this.setChunkerLogger(uploader);
        const response = await uploader.uploadData(readableStream, { ...options, tags });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { id: response.data.id, metadata: { ...response.data } };
    }
    async checkAndFundNode(dataSize) {
        const currentBalance = await this.serviceInstance.getLoadedBalance();
        const fundsRequired = await this.serviceInstance.getPrice(dataSize);
        if (fundsRequired.isGreaterThan(currentBalance)) {
            const fundingResponse = await this.serviceInstance.fund(fundsRequired);
            return fundingResponse;
        }
        return true;
    }
    setChunkerLogger(uploader) {
        uploader.on('chunkUpload', chunkInfo => {
            console.log(`Uploaded Chunk number ${chunkInfo.id}, offset of ${chunkInfo.offset}, size ${chunkInfo.size} Bytes, with a total of ${chunkInfo.totalUploaded} bytes uploaded.`);
        });
        uploader.on('chunkError', e => {
            console.log(`Error uploading chunk number ${e.id} - ${e.res.statusText}`);
        });
        uploader.on('done', finishRes => {
            console.log('Upload completed with ID ', finishRes.data.id);
        });
    }
    async unpin(hash) {
        // Bundlr non supporta l'unpin poiché è basato su Arweave
        throw new Error('Unpin not supported on Bundlr - data is permanent');
    }
    async get(hash) {
        throw new Error('Get not supported on Bundlr');
    }
}
exports.BundlrService = BundlrService;
