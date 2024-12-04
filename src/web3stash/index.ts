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
    case "PINATA":
      if ("apiKey" in config && "apiSecret" in config) {
        return new PinataService(config.apiKey, config.apiSecret);
      }
      break;

    case "BUNDLR":
      if ("currency" in config && "privateKey" in config) {
        return new BundlrService(
          config.currency,
          config.privateKey,
          config.testing || false
        );
      }
      break;

    case "NFT.STORAGE":
      if ("token" in config) {
        return new NftStorageService(config.token, defaultConfig);
      }
      break;

    case "WEB3.STORAGE":
      if ("token" in config) {
        return new Web3StorageService(config.token, defaultConfig);
      }
      break;

    case "ARWEAVE":
      if ("arweavePrivateKey" in config) {
        return new ArweaveService(config.arweavePrivateKey);
      }
      break;

    case "IPFS-CLIENT":
      if ("url" in config) {
        return new IpfsService(config.url);
      }
      break;

    case "LIGHTHOUSE":
      if ("lighthouseApiKey" in config) {
        return new LighthouseStorageService(config.lighthouseApiKey, defaultConfig);
      }
      break;

    default:
      throw new Error(`Unsupported storage service: ${service}`);
  }

  throw new Error(`Invalid configuration for service: ${service}`);
}
