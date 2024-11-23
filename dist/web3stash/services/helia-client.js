"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeliaStorageService = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const base_storage_1 = require("./base-storage");
const json_1 = require("@helia/json");
const unixfs_1 = require("@helia/unixfs");
const fs_1 = require("fs");
const helia_1 = require("helia"); // invece di import helia from 'helia'
class HeliaStorageService extends base_storage_1.StorageService {
    constructor(config) {
        super();
        this.serviceBaseUrl = 'ipfs://';
        this.serviceInstance = (0, helia_1.createHelia)(config);
    }
    async unpin(hash) {
        await this.serviceInstance.unpin(hash);
    }
    async uploadJson(jsonData, options) {
        const j = (0, json_1.json)(this.serviceInstance);
        const hash = await j.add(jsonData);
        return { id: hash.toString(), metadata: {} };
    }
    async uploadImage(path, options) {
        const fsh = (0, unixfs_1.unixfs)(this.serviceInstance);
        const imageData = await fs_1.promises.readFile(path);
        const cid = await fsh.addBytes(imageData);
        return { id: cid.toString(), metadata: {} };
    }
    async uploadVideo(path, options) {
        const fsh = (0, unixfs_1.unixfs)(this.serviceInstance);
        const videoData = await fs_1.promises.readFile(path);
        const cid = await fsh.addBytes(videoData);
        return { id: cid.toString(), metadata: {} };
    }
    async uploadFile(path, options) {
        const fsh = (0, unixfs_1.unixfs)(this.serviceInstance);
        const fileData = await fs_1.promises.readFile(path);
        const cid = await fsh.addBytes(fileData);
        return { id: cid.toString(), metadata: {} };
    }
}
exports.HeliaStorageService = HeliaStorageService;
