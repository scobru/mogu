"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFromIPFS = exports.unpinFromIPFS = exports.pinJSONToIPFS = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.PINATA_API_KEY || "";
const apiSecret = process.env.PINATA_API_SECRET || "";
const pinJSONToIPFS = async JSONBody => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  return await axios_1.default
    .post(url, JSONBody, {
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    })
    .then(response => {
      return response.data.IpfsHash;
    })
    .catch(error => {
      console.error("Error pinning JSON to IPFS: ", error);
      return null;
    });
};
exports.pinJSONToIPFS = pinJSONToIPFS;
const unpinFromIPFS = async hashToUnpin => {
  const url = `https://api.pinata.cloud/pinning/unpin/${hashToUnpin}`;
  return await axios_1.default
    .delete(url, {
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    })
    .then(response => {
      return true;
    })
    .catch(error => {
      console.error("Error unpinning from IPFS: ", error);
      return false;
    });
};
exports.unpinFromIPFS = unpinFromIPFS;
const fetchFromIPFS = async cid => {
  try {
    const url = `https://sapphire-financial-fish-885.mypinata.cloud/ipfs/${cid}`;
    const response = await axios_1.default.get(url);
    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error("Failed to fetch from IPFS via Pinata");
    }
  } catch (err) {
    console.error(`Error fetching from IPFS via Pinata: ${err}`);
    throw err;
  }
};
exports.fetchFromIPFS = fetchFromIPFS;
