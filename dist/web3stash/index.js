"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Stash = Web3Stash;
const pinata_1 = require("./services/pinata");
const bundlr_1 = require("./services/bundlr");
const nftstorage_1 = require("./services/nftstorage");
const web3storage_1 = require("./services/web3storage");
const arweave_1 = require("./services/arweave");
const ipfs_http_client_1 = require("./services/ipfs-http-client");
const lighthouse_1 = require("./services/lighthouse");
function Web3Stash(service, config) {
    const defaultConfig = {}; // Config di base per tutti i servizi
    switch (service) {
        case "PINATA": {
            const { apiKey, apiSecret } = config;
            if (!apiKey || !apiSecret) {
                throw new Error('Configurazione Pinata non valida: richiesti apiKey e apiSecret');
            }
            return new pinata_1.PinataService(apiKey, apiSecret);
        }
        case "BUNDLR": {
            const { currency, privateKey, testing = false } = config;
            if (!currency || !privateKey) {
                throw new Error('Configurazione Bundlr non valida: richiesti currency e privateKey');
            }
            return new bundlr_1.BundlrService(currency, privateKey, testing);
        }
        case "NFT.STORAGE": {
            const { token } = config;
            if (!token) {
                throw new Error('Configurazione NFT.Storage non valida: richiesto token');
            }
            return new nftstorage_1.NftStorageService(token, defaultConfig);
        }
        case "WEB3.STORAGE": {
            const { token } = config;
            if (!token) {
                throw new Error('Configurazione Web3.Storage non valida: richiesto token');
            }
            return new web3storage_1.Web3StorageService(token, defaultConfig);
        }
        case "ARWEAVE": {
            const { arweavePrivateKey } = config;
            if (!arweavePrivateKey || typeof arweavePrivateKey !== 'object') {
                throw new Error('Configurazione Arweave non valida: richiesto arweavePrivateKey come oggetto JWK');
            }
            return new arweave_1.ArweaveService(arweavePrivateKey);
        }
        case "IPFS-CLIENT": {
            const { url } = config;
            if (!url) {
                throw new Error('Configurazione IPFS non valida: richiesto url');
            }
            return new ipfs_http_client_1.IpfsService({ url });
        }
        case "LIGHTHOUSE": {
            const { lighthouseApiKey } = config;
            if (!lighthouseApiKey) {
                throw new Error('Configurazione Lighthouse non valida: richiesto lighthouseApiKey');
            }
            return new lighthouse_1.LighthouseStorageService(lighthouseApiKey, defaultConfig);
        }
        default:
            throw new Error(`Servizio di storage non supportato: ${service}`);
    }
}
