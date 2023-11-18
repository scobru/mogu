import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

let apiKey = process.env.PINATA_API_KEY || "";
let apiSecret = process.env.PINATA_API_SECRET || "";
let dbName = process.env.DB_NAME || "";

export const setCredentials = (_apiKey: string, _apiSecret: string, _dbName: string) => {
  apiKey = _apiKey;
  apiSecret = _apiSecret;
  dbName = _dbName;
  console.log("Credentials set");
};

export const pinJSONToIPFS = async (JSONBody: any) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  // Preparazione del corpo della richiesta
  const requestBody = {
    pinataContent: JSONBody,
    pinataMetadata: {
      name: dbName,
    },
  };

  return await axios
    .post(url, requestBody, {
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

export const unpinFromIPFS = async (hashToUnpin: string) => {
  const url = `https://api.pinata.cloud/pinning/unpin/${hashToUnpin}`;

  return await axios
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

export const fetchFromIPFS = async (cid: string) => {
  try {
    const url = `https://sapphire-financial-fish-885.mypinata.cloud/ipfs/${cid}`;
    const response = await axios.get(url);
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
