"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSAdapter = void 0;
const index_1 = require("../../web3stash/index");
class IPFSAdapter {
    constructor(gun, config = {
        apiKey: process.env.PINATA_API_KEY || '',
        apiSecret: process.env.PINATA_API_SECRET || ''
    }) {
        this.hashMap = new Map();
        this.storageService = (0, index_1.Web3Stash)('PINATA', config);
    }
    async put(key, data) {
        const result = await this.storageService.uploadJson(data);
        this.hashMap.set(key, result.id);
    }
    async get(key) {
        const hash = this.hashMap.get(key);
        if (!hash) {
            throw new Error(`No hash found for key: ${key}`);
        }
        // Per ora lanciamo un errore poiché il recupero non è implementato
        throw new Error("Get method not implemented yet");
    }
    async remove(key) {
        const hash = this.hashMap.get(key);
        if (hash) {
            await this.storageService.unpin(hash);
            this.hashMap.delete(key);
        }
    }
}
exports.IPFSAdapter = IPFSAdapter;
