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
exports.NftStorageService = void 0;
const base_storage_1 = require("./base-storage");
const nft_storage_1 = require("nft.storage");
const fs_1 = require("fs");
const mime = __importStar(require("mime-types"));
const path_1 = __importDefault(require("path"));
class NftStorageService extends base_storage_1.StorageService {
    constructor(token, config) {
        super();
        this.serviceBaseUrl = 'ipfs://';
        this.serviceInstance = new nft_storage_1.NFTStorage({ token, ...config });
    }
    async uploadJson(jsonData, options) {
        const data = JSON.stringify(jsonData);
        const blobData = new nft_storage_1.Blob([data], { type: 'application/json' });
        const cid = await this.serviceInstance.storeBlob(blobData);
        return { id: cid, metadata: {} };
    }
    async uploadImage(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        const fileName = options?.fileName || path_1.default.basename(path);
        const imageFile = new nft_storage_1.File([fileData], fileName, { type: fileType });
        const cid = await this.serviceInstance.storeBlob(imageFile);
        return { id: cid, metadata: {} };
    }
    async uploadVideo(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        const fileName = options?.fileName || path_1.default.basename(path);
        const videoFile = new nft_storage_1.File([fileData], fileName, { type: fileType });
        const cid = await this.serviceInstance.storeBlob(videoFile);
        return { id: cid, metadata: {} };
    }
    async uploadFile(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const fileType = mime.lookup(path);
        const fileName = options?.fileName || path_1.default.basename(path);
        const file = new nft_storage_1.File([fileData], fileName, { type: fileType });
        const cid = await this.serviceInstance.storeBlob(file);
        return { id: cid, metadata: {} };
    }
    async unpin(hash) {
        await this.serviceInstance.delete(hash);
    }
    async get(hash) {
        throw new Error('Get not supported on NFT.storage');
    }
}
exports.NftStorageService = NftStorageService;
