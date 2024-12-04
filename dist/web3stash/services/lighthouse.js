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
exports.LighthouseStorageService = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const base_storage_1 = require("./base-storage");
const fsHelper = __importStar(require("./helpers/fsHelper"));
const sdk_1 = __importDefault(require("@lighthouse-web3/sdk"));
class LighthouseStorageService extends base_storage_1.StorageService {
    constructor(apiKey, config) {
        super();
        this.serviceBaseUrl = 'ipfs://';
        this.serviceInstance = sdk_1.default;
        this.apiKey = apiKey;
    }
    async uploadJson(jsonData, options) {
        await fsHelper.writeFile('./webstash-tmp/lighthouse.json', JSON.stringify(jsonData));
        const response = await sdk_1.default.upload('./webstash-tmp/lighthouse.json', this.apiKey);
        await fsHelper.deleteFile('./webstash-tmp');
        return { id: response.data.Hash, metadata: { ...response } };
    }
    async uploadImage(path, options) {
        const response = await sdk_1.default.upload(path, this.apiKey);
        return { id: response.data.Hash, metadata: { ...response } };
    }
    async uploadVideo(path, options) {
        const response = await sdk_1.default.upload(path, this.apiKey);
        return { id: response.data.Hash, metadata: { ...response } };
    }
    async uploadFile(path, options) {
        const response = await sdk_1.default.upload(path, this.apiKey);
        return { id: response.data.Hash, metadata: { ...response } };
    }
    async unpin(hash) {
        throw new Error('Unpin not directly supported on Lighthouse');
    }
    async get(hash) {
        throw new Error('Get not supported on Lighthouse');
    }
}
exports.LighthouseStorageService = LighthouseStorageService;
