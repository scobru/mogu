"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpfsService = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const base_storage_1 = require("./base-storage");
const ipfs_http_client_1 = require("ipfs-http-client");
const fs_1 = require("fs");
class IpfsService extends base_storage_1.StorageService {
    constructor(url, config) {
        super();
        this.serviceBaseUrl = 'ipfs://';
        this.serviceInstance = (0, ipfs_http_client_1.create)(url);
    }
    async uploadJson(jsonData, options) {
        const data = Buffer.from(JSON.stringify(jsonData));
        const response = await this.serviceInstance.add(data, options);
        return { id: response.cid.toString(), metadata: { ...response } };
    }
    async uploadImage(path, options) {
        const imageData = await fs_1.promises.readFile(path);
        const response = await this.serviceInstance.add(imageData, options);
        return { id: response.cid.toString(), metadata: { ...response } };
    }
    async uploadVideo(path, options) {
        const videoData = await fs_1.promises.readFile(path);
        const response = await this.serviceInstance.add(videoData, options);
        return { id: response.cid.toString(), metadata: { ...response } };
    }
    async uploadFile(path, options) {
        const fileData = await fs_1.promises.readFile(path);
        const response = await this.serviceInstance.add(fileData, options);
        return { id: response.cid.toString(), metadata: { ...response } };
    }
    async unpin(hash) {
        await this.serviceInstance.pin.rm(hash);
    }
}
exports.IpfsService = IpfsService;
