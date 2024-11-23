import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

let apiKey = process.env.PINATA_API_KEY || "";
let apiSecret = process.env.PINATA_API_SECRET || "";
let dbName = process.env.DB_NAME || "";
let apiGateway = process.env.PINATA_GATEWAY || "";

export const setCredentials = (_apiKey: string, _apiSecret: string, _dbName: string, _apiGateway: string) => {
  apiKey = _apiKey;
  apiSecret = _apiSecret;
  dbName = _dbName;
  apiGateway = _apiGateway;
  console.log("Credentials set");
};

export const pinJSONToIPFS = async (data: any) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  const content = typeof data === 'string' ? 
    { data } : 
    data;

  const requestBody = {
    pinataContent: content,
    pinataMetadata: {
      name: `${dbName}-${Date.now()}`,
      keyvalues: {
        type: 'gun-node',
        timestamp: Date.now().toString()
      }
    },
    pinataOptions: {
      cidVersion: 1
    }
  };

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    });
    return response.data.IpfsHash;
  } catch (error) {
    console.error("Error pinning to IPFS:", error);
    throw error;
  }
};

export const unpinFromIPFS = async (hashToUnpin: string) => {
  const url = `https://api.pinata.cloud/pinning/unpin/${hashToUnpin}`;

  try {
    await axios.delete(url, {
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    });
    return true;
  } catch (error) {
    console.error("Error unpinning from IPFS:", error);
    throw error;
  }
};

export const fetchFromIPFS = async (cid: string) => {
  try {
    const url = `${apiGateway}/ipfs/${cid}`;
    
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const response = await axios.get(url);
        if (response.status === 200) {
          return response.data;
        }
      } catch (err) {
        lastError = err;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const publicGateway = `https://ipfs.io/ipfs/${cid}`;
    const response = await axios.get(publicGateway);
    
    if (response.status === 200) {
      return response.data;
    }

    throw lastError || new Error('Failed to fetch from IPFS');
  } catch (err) {
    console.error(`Error fetching from IPFS: ${err}`);
    throw err;
  }
};

export const getPinMetadata = async (cid: string) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS/${cid}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting pin metadata:", error);
    throw error;
  }
};

export const updatePinMetadata = async (cid: string, metadata: any) => {
  const url = `https://api.pinata.cloud/pinning/hashMetadata`;
  
  try {
    await axios.put(url, {
      ipfsPinHash: cid,
      keyvalues: metadata
    }, {
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating pin metadata:", error);
    throw error;
  }
};
