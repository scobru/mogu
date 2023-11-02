import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

let apiKey = process.env.PINATA_API_KEY || "";
let apiSecret = process.env.PINATA_API_SECRET || "";

export const setCredentials = (_apiKey: string, _apiSecret: string) => {
  apiKey = _apiKey;
  apiSecret = _apiSecret;
  console.log("Credentials set");
};

export const pinJSONToIPFS = async (JSONBody: any) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  return await axios
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
