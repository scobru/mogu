"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Stash = Web3Stash;
const pinata_1 = require("./services/pinata");
const ipfs_http_client_1 = require("./services/ipfs-http-client");
function Web3Stash(service, config) {
    switch (service) {
        case "PINATA": {
            const pinataConfig = config.config;
            if (!pinataConfig.pinataJwt) {
                throw new Error('Configurazione Pinata non valida: richiesto pinataJwt');
            }
            return new pinata_1.PinataService(pinataConfig);
        }
        case "IPFS-CLIENT": {
            const ipfsConfig = config.config;
            if (!ipfsConfig.url) {
                throw new Error('Configurazione IPFS non valida: richiesto url');
            }
            return new ipfs_http_client_1.IpfsService(ipfsConfig);
        }
        default:
            throw new Error(`Servizio di storage non supportato: ${service}`);
    }
}
