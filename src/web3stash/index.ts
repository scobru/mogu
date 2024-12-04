import { Web3StashServices, Web3StashConfig, PinataServiceConfig, IpfsServiceConfig } from "./types";
import { PinataService } from "./services/pinata";
import { IpfsService } from "./services/ipfs-http-client";
import { StorageService } from './services/base-storage';

export function Web3Stash(service: Web3StashServices, config: Web3StashConfig): StorageService {
  switch (service) {
    case "PINATA": {
      const pinataConfig = config as PinataServiceConfig;
      if (!pinataConfig.apiKey || !pinataConfig.apiSecret) {
        throw new Error('Configurazione Pinata non valida: richiesti apiKey e apiSecret');
      }
      return new PinataService(pinataConfig.apiKey, pinataConfig.apiSecret);
    }

    case "IPFS-CLIENT": {
      const ipfsConfig = config as IpfsServiceConfig;
      if (!ipfsConfig.url) {
        throw new Error('Configurazione IPFS non valida: richiesto url');
      }
      return new IpfsService(ipfsConfig.url);
    }

    default:
      throw new Error(`Servizio di storage non supportato: ${service}`);
  }
}
