import { PinataService } from "./services/pinata";
import { BundlrService } from "./services/bundlr";
import { NftStorageService } from "./services/nftstorage";
import { Web3StorageService } from "./services/web3storage";
import { ArweaveService } from "./services/arweave";
import { IpfsService } from "./services/ipfs-http-client";
import { LighthouseStorageService } from "./services/lighthouse";
import type { Web3StashServices, Web3StashConfig } from "./types";
import type { StorageService } from "./services/base-storage";

// eslint-disable-next-line @typescript-eslint/naming-convention, complexity
export function Web3Stash(service: Web3StashServices, config: Web3StashConfig, configOptions?: any): StorageService {
  switch (service) {
    case "PINATA":
      if ("apiKey" in config && config.apiKey && config.apiSecret) {
        return new PinataService(config.apiKey, config.apiSecret);
      }

      throw new Error("Please provide pinata API Key and API Secret");
    case "BUNDLR":
      if ("currency" in config && config.currency && config.privateKey) {
        return new BundlrService(config.currency, config.privateKey, config.testing, configOptions);
      }

      throw new Error("Please provide Bundlr Currency and Private Key");
    case "NFT.STORAGE":
      if ("token" in config && config.token) {
        return new NftStorageService(config.token, configOptions);
      }

      throw new Error("Please provide NFT.Storage Auth token");
    case "WEB3.STORAGE":
      if ("token" in config && config.token) {
        return new Web3StorageService(config.token, configOptions);
      }

      throw new Error("Please provide WEB3.Storage Auth token");
    case "ARWEAVE":
      if ("arweavePrivateKey" in config && config.arweavePrivateKey) {
        return new ArweaveService(config.arweavePrivateKey, configOptions);
      }

      throw new Error("Please provide Arweave Private Key ");

    case "IPFS-CLIENT":
      if ("url" in config && config.url) {
        return new IpfsService(config.url, configOptions);
      }

      throw new Error("Please provide IPFS Connection URL");
    case "INFURA":
      if ("projectId" in config && config.projectId && config.projectSecret) {
        const auth = "Basic " + Buffer.from(config.projectId + ":" + config.projectSecret).toString("base64");
        return new IpfsService(
          {
            host: "ipfs.infura.io",
            port: 5001,
            protocol: "https",
            headers: {
              authorization: auth,
            },
          },
          configOptions,
        );
      }

      throw new Error("Please provide INFURA Project ID and Project Secret");
    case "LIGHTHOUSE":
      if ("lighthouseApiKey" in config && config.lighthouseApiKey) {
        return new LighthouseStorageService(config.lighthouseApiKey, configOptions);
      }

      throw new Error("Please provide Lighthouse Api Key");

    default:
      throw new Error("Unknown Service Type");
  }
}
