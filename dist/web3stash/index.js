"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Stash = Web3Stash;
const pinata_1 = require("./services/pinata");
const ipfs_http_client_1 = require("./services/ipfs-http-client");
function Web3Stash(service, config) {
    switch (service) {
        case "PINATA": {
            const pinataConfig = config;
            if (!pinataConfig.apiKey) {
                throw new Error('Configurazione Pinata non valida: richiesto apiKey');
            }
            return new pinata_1.PinataService({
                jwt: pinataConfig.apiKey,
                gateway: pinataConfig.endpoint
            });
        }
        case "IPFS-CLIENT": {
            const ipfsConfig = config;
            if (!ipfsConfig.url) {
                throw new Error('Configurazione IPFS non valida: richiesto url');
            }
            const ipfsOptions = {
                url: ipfsConfig.url,
                port: ipfsConfig.port,
                protocol: ipfsConfig.protocol,
                headers: ipfsConfig.headers
            };
            return new ipfs_http_client_1.IpfsService(ipfsOptions);
        }
        default:
            throw new Error(`Servizio di storage non supportato: ${service}`);
    }
}
