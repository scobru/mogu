"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpfsService = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const base_storage_1 = require("./base-storage");
const ipfs_http_client_1 = require("ipfs-http-client");
class IpfsService extends base_storage_1.StorageService {
    constructor(config) {
        super();
        this.serviceBaseUrl = 'ipfs://';
        if (!config.url) {
            throw new Error('URL IPFS richiesto');
        }
        this.serviceInstance = (0, ipfs_http_client_1.create)({
            url: config.url
        });
    }
    async get(hash) {
        const chunks = [];
        for await (const chunk of this.serviceInstance.cat(hash)) {
            chunks.push(chunk);
        }
        const content = Buffer.concat(chunks).toString();
        return JSON.parse(content);
    }
    async uploadJson(jsonData) {
        const content = JSON.stringify(jsonData);
        const result = await this.serviceInstance.add(content);
        return {
            id: result.path,
            metadata: {
                size: result.size,
                type: 'json'
            }
        };
    }
    async uploadFile(path) {
        const result = await this.serviceInstance.add(path);
        return {
            id: result.path,
            metadata: {
                size: result.size,
                type: 'file'
            }
        };
    }
    async uploadImage(path) {
        return this.uploadFile(path);
    }
    async uploadVideo(path) {
        return this.uploadFile(path);
    }
    async unpin(hash) {
        try {
            await this.serviceInstance.pin.rm(hash);
            return true;
        }
        catch {
            return false;
        }
    }
    async getMetadata(hash) {
        const stat = await this.serviceInstance.files.stat(`/ipfs/${hash}`);
        return stat;
    }
    async isPinned(hash) {
        try {
            const pins = await this.serviceInstance.pin.ls({ paths: [hash] });
            return pins.length > 0;
        }
        catch {
            return false;
        }
    }
}
exports.IpfsService = IpfsService;
