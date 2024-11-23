import { NodeType, EncryptedNode } from './types';
import { pinJSONToIPFS, fetchFromIPFS } from "../ipfs/pinataAPI";

export type { EncryptedNode };
export { NodeType };

// Funzioni base per la gestione dello stato
export const addNode = (state: Map<string, EncryptedNode>, node: EncryptedNode): Map<string, EncryptedNode> => {
  const newState = new Map(state);
  newState.set(node.id, node);
  return newState;
};

export const removeNode = (state: Map<string, EncryptedNode>, id: string): Map<string, EncryptedNode> => {
  const newState = new Map(state);
  newState.delete(id);
  return newState;
};

export const updateNode = (state: Map<string, EncryptedNode>, node: EncryptedNode): Map<string, EncryptedNode> => {
  return addNode(state, node);
};

export const getNode = (state: Map<string, EncryptedNode>, id: string): EncryptedNode | undefined => {
  return state.get(id);
};

export const getAllNodes = (state: Map<string, EncryptedNode>): EncryptedNode[] => {
  return Array.from(state.values());
};

// Funzioni di query semplificate
export const query = (state: Map<string, EncryptedNode>, predicate: (node: EncryptedNode) => boolean): EncryptedNode[] => {
  return getAllNodes(state).filter(predicate);
};

// Funzioni per la serializzazione
export const serializeDatabase = async (state: Map<string, EncryptedNode>): Promise<string> => {
  const nodes = getAllNodes(state);
  return JSON.stringify(nodes);
};

export const deserializeDatabase = async (json: string): Promise<EncryptedNode[]> => {
  const jsonString = typeof json === 'object' ? JSON.stringify(json) : json;
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed.map((node: any) => ({
      id: node.id,
      type: NodeType.NODE,
      name: node.name,
      content: node.content,
      encrypted: Boolean(node.encrypted)
    }));
  } catch (err) {
    console.error('Error deserializing database:', err);
    throw err;
  }
};

// Funzioni IPFS
export const storeDatabase = async (state: Map<string, EncryptedNode>): Promise<string> => {
  const serialized = await serializeDatabase(state);
  return await pinJSONToIPFS(JSON.parse(serialized));
};

export const retrieveDatabase = async (hash: string): Promise<EncryptedNode[]> => {
  try {
    const data = await fetchFromIPFS(hash);
    const jsonString = Array.isArray(data) ? JSON.stringify(data) : data;
    return deserializeDatabase(jsonString);
  } catch (err) {
    console.error('Error retrieving database:', err);
    throw err;
  }
};
