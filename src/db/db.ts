import { pinJSONToIPFS, unpinFromIPFS, fetchFromIPFS } from "../ipfs/pinataAPI";
import MecenateHelper from "@scobru/crypto-ipfs";
import { ethers } from "ethers";
import { JsonObjectExpression } from "typescript";

export type NodeType = "FILE" | "DIRECTORY";

const NONCE_LENGTH = 24;

let tempCID: string;

export type EncryptedNode = {
    id: string;
    type: NodeType;
    name: string;
    parent?: string;
    children?: string[];
    content?: any;
    encrypted?: boolean;
};

type Query = (node: EncryptedNode) => boolean;

/**
 * Serialize the database
 * @param {Map<string, EncryptedNode>} state - The state of the database
 * @param {Uint8Array} key - The key used to encrypt the database
 * @returns
 */
export const serializeDatabase = async (state: Map<string, EncryptedNode>, key: Uint8Array) => {
    console.log("Serializing DB");

    const nodes = Array.from(state.values());

    const nonce = await MecenateHelper.crypto.asymmetric.generateNonce();

    const encryptedNodes = nodes.map(node => {
        if (!node.content) {
            console.warn("Content is undefined for node:", node);
            return node;
        }

        return {
            ...node,
            content: Buffer.concat([
                Buffer.from(nonce),
                Buffer.from(MecenateHelper.crypto.asymmetric.secretBox.encryptMessage(node.content, nonce, key)),
            ]),
            encrypted: true,
        }
    });

    const json = JSON.stringify(encryptedNodes);

    return json;
};

/**
 * Deserialize the database
 * @param {string} json - The serialized database
 * @param {Uint8Array} key - The key used to decrypt the database
 * @returns
 */
export const deserializeDatabase = async (json: string, key: Uint8Array): Promise<EncryptedNode[]> => {
    console.log("Deserializing DB");

    const encryptedNodes = JSON.parse(JSON.stringify(json)) as EncryptedNode[];

    console.log("Encrypted nodes:", encryptedNodes)

    const nodes = await Promise.all(
        encryptedNodes.map(async node => {
            let content = node.content;
            if (node.encrypted) {
                if (content && typeof content === "object" && !Array.isArray(content)) {
                    content = objectToUint8Array(content);
                }

                if (content === undefined) {
                    console.error("Content is undefined for node:", node);
                    content = new Uint8Array();
                } else {
                    const contentBuffer = Buffer.from(node.content, "hex");

                    const nonce = contentBuffer.slice(0, NONCE_LENGTH);

                    const ciphertext = contentBuffer.slice(NONCE_LENGTH);

                    content = await MecenateHelper.crypto.asymmetric.secretBox.decryptMessage(
                        new Uint8Array(ciphertext),
                        new Uint8Array(nonce),
                        key,
                    );
                }
            }
            return {
                ...node,
                content,
            };
        }),
    );

    return nodes;
};

function objectToUint8Array(obj: any): Uint8Array {
    const arr: any = Object.values(obj);

    return new Uint8Array(arr);
}

export const storeDatabase = async (state: Map<string, EncryptedNode>, key: Uint8Array) => {
    console.log("Store DB");

    const json = await serializeDatabase(state, key);

    const hash = await pinJSONToIPFS(JSON.parse(json));

    unpinFromIPFS(tempCID);
    tempCID = hash;

    return hash;
};

export const retrieveDatabase = async (hash: string, key: Uint8Array) => {
    console.log("Retrieve DB");

    tempCID = hash;

    const json = await fetchFromIPFS(hash);

    const state = await deserializeDatabase(json, key);

    return state;
};

export const addNode = (state: Map<string, EncryptedNode>, node: EncryptedNode) => {
    console.log("Adding Node");

    // Verifica se il nodo esiste già
    if (state.has(node.id)) {
        console.log("Node already exists, updating instead");
        const existingNode = state.get(node.id);

        // Aggiorna il nodo esistente con i nuovi valori
        const updatedNode = {
            ...existingNode,
            ...node,
        };

        state.set(node.id, updatedNode);
    } else {
        console.log("Node does not exist, adding new node");
        state.set(node.id, node);
    }

    // Gestione genitore e figli se necessario
    if (node.parent) {
        const parent = state.get(node.parent);
        if (parent && parent.children) {
            // Aggiorna l'elenco dei figli del genitore per includere questo nodo
            if (!parent.children.includes(node.id)) {
                parent.children.push(node.id);
            }
            state.set(node.parent, parent);
        }
    }

    return state;
};


export const removeNode = (state: Map<string, EncryptedNode>, id: string) => {
    console.log("Removing Node");

    const node = state.get(id);
    console.log("Node", node)

    if (!node) {
        console.error("Node not found with id:", id);
        return state; // or throw an error
    }

    // Handle children of the node if necessary
    // For example, delete children or reassign them

    state.delete(id);

    if (node.parent) {
        const parent = state.get(node.parent);
        if (parent && parent.children) {
            const index = parent.children.indexOf(id);
            if (index > -1) {
                parent.children.splice(index, 1);
                state.set(node.parent, parent);
            }
        }
    }

    return state;
};

export const getNode = (state: Map<string, EncryptedNode>, id: string) => {
    console.log("Getting Nodes..");

    return state.get(id);
};

export const getAllNodes = (state: Map<string, EncryptedNode>): EncryptedNode[] => {
    console.log("Getting All Nodes..");

    return Array.from(state.values());
};

export const getParent = (state: Map<string, EncryptedNode>, id: string) => {
    console.log("Getting Parent..");

    const node = state.get(id);

    if (node && node.parent) {
        return state.get(node.parent);
    }

    return null;
};

export const updateNode = (state: Map<string, EncryptedNode>, updatedNode: EncryptedNode) => {
    if (state.has(updatedNode.id)) {
        console.log("Node exists, updating");

        // Aggiorna il nodo esistente con i nuovi valori
        const existingNode = state.get(updatedNode.id);
        const newNode = {
            ...existingNode,
            ...updatedNode,
        };

        state.set(updatedNode.id, newNode);
    } else {
        console.error("Node not found, cannot update");
        // Qui puoi gestire l'errore come preferisci
        // Ad esempio, potresti lanciare un'eccezione o semplicemente non fare nulla
    }

    return state;
};

export const getChildren = (state: Map<string, EncryptedNode>, id: string) => {
    console.log("Getting Children...");

    const node = state.get(id);
    if (!node || !node.children) return [];
    return node.children.map(childId => state.get(childId)).filter(Boolean);
};

export const query = (state: Map<string, EncryptedNode>, predicate: Query) => {
    console.log("Execute Query...");

    const nodes = Array.from(state.values());

    const matches = nodes.filter(predicate);

    return matches;
};

export const storeOnChain = async (state: Map<string, EncryptedNode>, key: Uint8Array, contract: any) => {
    console.log("Storing on chain...");

    const abi: any[] = [
        "event CIDRegistered(string cid)",
        "function registerCID(string memory cidNew) public",
        "function getCID() public view returns (string memory)",
    ];

    const signer = new ethers.Wallet(
        process.env.PRIVATE_KEY as string,
        new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL),
    );

    const instance = new ethers.Contract(contract, abi, signer).connect(signer);

    const json = await serializeDatabase(state, key);

    const hash = await pinJSONToIPFS(JSON.parse(json));

    const tx = await instance.registerCID(ethers.utils.toUtf8Bytes(hash));

    await tx.wait();

    return hash;
};

export const getCidOnChain = async (contract: any) => {
    console.log("Getting CID on chain...");

    const abi: any[] = [
        "event CIDRegistered(string cid)",
        "function registerCID(string memory cidNew) public",
        "function getCID() public view returns (string memory)",
    ];

    const signer = new ethers.Wallet(
        process.env.PRIVATE_KEY as string,
        new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL),
    );

    const instance = new ethers.Contract(contract, abi, signer).connect(signer);

    const cidBytes = await instance.getCID();

    return ethers.utils.toUtf8String(cidBytes);
};


