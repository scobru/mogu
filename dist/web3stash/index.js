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
        case "PINATA":
            if ("apiKey" in config && "apiSecret" in config) {
                return new pinata_1.PinataService(config.apiKey, config.apiSecret);
            }
            break;
        case "BUNDLR":
            if ("currency" in config && "privateKey" in config) {
                return new bundlr_1.BundlrService(config.currency, config.privateKey, config.testing || false);
            }
            break;
        case "NFT.STORAGE":
            if ("token" in config) {
                return new nftstorage_1.NftStorageService(config.token, defaultConfig);
            }
            break;
        case "WEB3.STORAGE":
            if ("token" in config) {
                return new web3storage_1.Web3StorageService(config.token, defaultConfig);
            }
            break;
        case "ARWEAVE":
            if ("arweavePrivateKey" in config) {
                return new arweave_1.ArweaveService(config.arweavePrivateKey);
            }
            break;
        case "IPFS-CLIENT":
            if ("url" in config) {
                return new ipfs_http_client_1.IpfsService(config.url);
            }
            break;
        case "LIGHTHOUSE":
            if ("lighthouseApiKey" in config) {
                return new lighthouse_1.LighthouseStorageService(config.lighthouseApiKey, defaultConfig);
            }
            break;
        default:
            throw new Error(`Unsupported storage service: ${service}`);
    }
    throw new Error(`Invalid configuration for service: ${service}`);
}
