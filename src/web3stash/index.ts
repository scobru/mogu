import { Web3StashServices, Web3StashConfig, PinataServiceConfig, IpfsServiceConfig } from "./types";
import { PinataService } from "./services/pinata";
import { IpfsService } from "./services/ipfs-http-client";
import { StorageService } from './services/base-storage';

export function Web3Stash(service: Web3StashServices, config: Web3StashConfig): StorageService {
  switch (service) {
    case "PINATA": {
      const pinataConfig = config.config as PinataServiceConfig;
      if (!pinataConfig.pinataJwt) {
        throw new Error('Configurazione Pinata non valida: richiesto pinataJwt');
      }
      return new PinataService(pinataConfig);
    }

    case "IPFS-CLIENT": {
      const ipfsConfig = config.config as IpfsServiceConfig;
      if (!ipfsConfig.url) {
        throw new Error('Configurazione IPFS non valida: richiesto url');
      }
      return new IpfsService(ipfsConfig);
    }

    default:
      throw new Error(`Servizio di storage non supportato: ${service}`);
  }
}
