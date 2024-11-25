"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSAdapter = void 0;
const index_1 = require("../web3stash/index");
class IPFSAdapter {
    constructor(config) {
        this.hashMap = new Map();
        this.storageService = (0, index_1.Web3Stash)('PINATA', config);
    }
    async put(key, data) {
        try {
            const result = await this.storageService.uploadJson(data);
            this.hashMap.set(key, result.id);
            console.log(`Data stored with key: ${key}, hash: ${result.id}`);
        }
        catch (error) {
            console.error(`Failed to store data for key: ${key}`, error);
            throw error;
        }
    }
    async get(key) {
        const hash = this.hashMap.get(key);
        if (!hash) {
            throw new Error(`No hash found for key: ${key}`);
        }
        try {
            const data = await this.storageService.get(hash);
            console.log(`Data retrieved for key: ${key}, hash: ${hash}`);
            return data;
        }
        catch (error) {
            console.error(`Failed to retrieve data for key: ${key}`, error);
            throw error;
        }
    }
    async remove(key) {
        const hash = this.hashMap.get(key);
        if (hash) {
            try {
                await this.storageService.unpin(hash);
                this.hashMap.delete(key);
                console.log(`Data removed for key: ${key}, hash: ${hash}`);
            }
            catch (error) {
                console.error(`Failed to remove data for key: ${key}`, error);
                throw error;
            }
        }
        else {
            console.warn(`No data found to remove for key: ${key}`);
        }
    }
    attachToGun(gun) {
        gun.on('put', async (request) => {
            this.to.next(request);
            const delta = request.put;
            const dedupId = request['#'];
            try {
                const result = await this.storageService.uploadJson(delta);
                this.hashMap.set(dedupId, result.id);
                gun.on('in', {
                    '@': dedupId,
                    ok: true
                });
            }
            catch (error) {
                console.error(`Failed to store data for request: ${dedupId}`, error);
                gun.on('in', {
                    '@': dedupId,
                    err: error
                });
            }
        });
        gun.on('get', async (request) => {
            this.to.next(request);
            const dedupId = request['#'];
            const hash = this.hashMap.get(dedupId);
            if (!hash) {
                gun.on('in', {
                    '@': dedupId,
                    err: `No hash found for request: ${dedupId}`
                });
                return;
            }
            try {
                const data = await this.storageService.get(hash);
                gun.on('in', {
                    '@': dedupId,
                    put: data
                });
            }
            catch (error) {
                console.error(`Failed to retrieve data for request: ${dedupId}`, error);
                gun.on('in', {
                    '@': dedupId,
                    err: error
                });
            }
        });
    }
}
exports.IPFSAdapter = IPFSAdapter;
