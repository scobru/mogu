"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("../../sdk/sdk");
const nostr_tools_1 = require("nostr-tools");
const fs_extra_1 = __importDefault(require("fs-extra"));
class NostrKeySDK {
    constructor(appKey, pinataApiKey, pinataApiSecret, dbName, cidFilePath) {
        this.mogu = new sdk_1.Mogu(appKey, pinataApiKey, pinataApiSecret, dbName);
        this.cidFile = cidFilePath;
    }
    generateNostrKeys() {
        const privateKey = (0, nostr_tools_1.generatePrivateKey)();
        const publicKey = (0, nostr_tools_1.getPublicKey)(privateKey);
        return { npub: publicKey, nsec: privateKey };
    }
    async encryptAndSaveData(nodeData) {
        const node = {
            id: '0',
            type: 'FILE',
            name: 'NostrKeys',
            parent: '',
            children: [],
            content: JSON.stringify(nodeData),
            encrypted: true // Set to true if data is encrypted
        };
        let cid;
        if (fs_extra_1.default.existsSync(this.cidFile)) {
            const cidData = fs_extra_1.default.readFileSync(this.cidFile, 'utf8');
            if (cidData) {
                try {
                    cid = JSON.parse(cidData);
                    await this.mogu.load(cid.hash);
                }
                catch (error) {
                    console.error('Error parsing CID file:', error);
                    // Gestisci il caso di errore nel parse qui
                }
            }
        }
        console.log('Adding node:', node);
        this.mogu.addNode(node);
        cid = await this.mogu.store();
        const jsonData = {
            "hash": cid,
        };
        fs_extra_1.default.writeFileSync(this.cidFile, JSON.stringify(jsonData));
        return cid;
    }
    async retrieveAndDecryptData() {
        let cid;
        if (fs_extra_1.default.existsSync(this.cidFile)) {
            const cidData = fs_extra_1.default.readFileSync(this.cidFile, 'utf8');
            if (cidData) {
                try {
                    cid = JSON.parse(cidData);
                    await this.mogu.load(cid.hash);
                    const nodes = await this.mogu.queryByType('FILE');
                    const nostrKeyNode = await nodes.find(node => node.name === 'NostrKeys');
                    console.log("Nostr Key Node:", nostrKeyNode);
                    if (nostrKeyNode) {
                        return JSON.parse(nostrKeyNode.content);
                    }
                    else {
                        throw new Error('Nostr key node not found');
                    }
                }
                catch (error) {
                    console.error('Error parsing CID file:', error);
                    throw new Error('Invalid CID file content');
                }
            }
            else {
                throw new Error('CID file is empty');
            }
        }
        else {
            throw new Error('CID file not found');
        }
    }
}
exports.default = NostrKeySDK;
