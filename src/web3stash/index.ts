import { Web3StashServices, Web3StashConfig } from "./types";
import { PinataService } from "./services/pinata";
import { BundlrService } from "./services/bundlr";
import { NftStorageService } from "./services/nftstorage";
import { Web3StorageService } from "./services/web3storage";
import { ArweaveService } from "./services/arweave";
import { IpfsService } from "./services/ipfs-http-client";
import { LighthouseStorageService } from "./services/lighthouse";
import { StorageService } from './services/base-storage';

export function Web3Stash(service: Web3StashServices, config: Web3StashConfig): StorageService {
  const defaultConfig = {};  // Config di base per tutti i servizi

  switch (service) {
    case "PINATA": {
      const { apiKey, apiSecret } = config;
      if (!apiKey || !apiSecret) {
        throw new Error('Configurazione Pinata non valida: richiesti apiKey e apiSecret');
      }
      return new PinataService(apiKey, apiSecret);
    }

    case "BUNDLR": {
      const { currency, privateKey, testing = false } = config;
      if (!currency || !privateKey) {
        throw new Error('Configurazione Bundlr non valida: richiesti currency e privateKey');
      }
      return new BundlrService(currency, privateKey, testing);
    }

    case "NFT.STORAGE": {
      const { token } = config;
      if (!token) {
        throw new Error('Configurazione NFT.Storage non valida: richiesto token');
      }
      return new NftStorageService(token, defaultConfig);
    }

    case "WEB3.STORAGE": {
      const { token } = config;
      if (!token) {
        throw new Error('Configurazione Web3.Storage non valida: richiesto token');
      }
      return new Web3StorageService(token, defaultConfig);
    }

    case "ARWEAVE": {
      const { arweavePrivateKey } = config;
      if (!arweavePrivateKey || typeof arweavePrivateKey !== 'object') {
        throw new Error('Configurazione Arweave non valida: richiesto arweavePrivateKey come oggetto JWK');
      }
      return new ArweaveService(arweavePrivateKey);
    }

    case "IPFS-CLIENT": {
      const { url } = config;
      if (!url) {
        throw new Error('Configurazione IPFS non valida: richiesto url');
      }
      return new IpfsService({ url });
    }

    case "LIGHTHOUSE": {
      const { lighthouseApiKey } = config;
      if (!lighthouseApiKey) {
        throw new Error('Configurazione Lighthouse non valida: richiesto lighthouseApiKey');
      }
      return new LighthouseStorageService(lighthouseApiKey, defaultConfig);
    }

    default:
      throw new Error(`Servizio di storage non supportato: ${service}`);
  }
}
