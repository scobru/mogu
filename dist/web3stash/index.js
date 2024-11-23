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
// eslint-disable-next-line @typescript-eslint/naming-convention, complexity
function Web3Stash(service, config, configOptions) {
    switch (service) {
        case "PINATA":
            if ("apiKey" in config && config.apiKey && config.apiSecret) {
                return new pinata_1.PinataService(config.apiKey, config.apiSecret);
            }
            throw new Error("Please provide pinata API Key and API Secret");
        case "BUNDLR":
            if ("currency" in config && config.currency && config.privateKey) {
                return new bundlr_1.BundlrService(config.currency, config.privateKey, config.testing, configOptions);
            }
            throw new Error("Please provide Bundlr Currency and Private Key");
        case "NFT.STORAGE":
            if ("token" in config && config.token) {
                return new nftstorage_1.NftStorageService(config.token, configOptions);
            }
            throw new Error("Please provide NFT.Storage Auth token");
        case "WEB3.STORAGE":
            if ("token" in config && config.token) {
                return new web3storage_1.Web3StorageService(config.token, configOptions);
            }
            throw new Error("Please provide WEB3.Storage Auth token");
        case "ARWEAVE":
            if ("arweavePrivateKey" in config && config.arweavePrivateKey) {
                return new arweave_1.ArweaveService(config.arweavePrivateKey, configOptions);
            }
            throw new Error("Please provide Arweave Private Key ");
        case "IPFS-CLIENT":
            if ("url" in config && config.url) {
                return new ipfs_http_client_1.IpfsService(config.url, configOptions);
            }
            throw new Error("Please provide IPFS Connection URL");
        case "INFURA":
            if ("projectId" in config && config.projectId && config.projectSecret) {
                const auth = "Basic " + Buffer.from(config.projectId + ":" + config.projectSecret).toString("base64");
                return new ipfs_http_client_1.IpfsService({
                    host: "ipfs.infura.io",
                    port: 5001,
                    protocol: "https",
                    headers: {
                        authorization: auth,
                    },
                }, configOptions);
            }
            throw new Error("Please provide INFURA Project ID and Project Secret");
        case "LIGHTHOUSE":
            if ("lighthouseApiKey" in config && config.lighthouseApiKey) {
                return new lighthouse_1.LighthouseStorageService(config.lighthouseApiKey, configOptions);
            }
            throw new Error("Please provide Lighthouse Api Key");
        default:
            throw new Error("Unknown Service Type");
    }
}
