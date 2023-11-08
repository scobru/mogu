import {
  EncryptedNode,
  NodeType,
  addNode,
  removeNode,
  updateNode,
  getNode,
  getChildren,
  query,
  storeDatabase,
  retrieveDatabase,
  getAllNodes,
  serializeDatabase,
  deserializeDatabase,
} from "../db/db";
import { unpinFromIPFS } from "../ipfs/pinataAPI";

async function run() {
  try {
    let state = initializeDatabase();

    state = await addSampleNodes(state);
    state = await addFileToDirectory(state);
    state = await addAnotherFileAndList(state);

    const key = "my-key";

    const cid = await performDatabaseOperations(state, key);
    console.log("CID:", cid);

    queryDatabase(state);

    await serializeAndDeserializeDatabase(state, key);

    addFileAndStore(cid, key);
  } catch (err) {
    console.error("An error occurred during the test:", err);
  }
}

function initializeDatabase(): Map<string, EncryptedNode> {
  console.log("Initializing database...");
  return new Map<string, EncryptedNode>();
}

async function addSampleNodes(state: Map<string, EncryptedNode>): Promise<Map<string, EncryptedNode>> {
  console.log("Adding sample nodes...");

  const node: EncryptedNode = {
    id: "1",
    type: "DIRECTORY",
    name: "my-node",
    content: "testDir",
    children: [],
    encrypted: false,
  };

  state = addNode(state, node);

  console.log("Sample nodes added", Array.from(state.values()));

  const result = removeNode(state, "1");
  console.log("Sample nodes removed", result);

  // Update a node in the database
  const update = updateNode(state, { ...node, content: "Updated content" });
  console.log("Sample nodes updated", update);

  // Retrieve a single node from the database
  const retrievedNode = getNode(state, "1");
  console.log("Retrieved node", retrievedNode);

  // Retrieve the children of a node
  const children = getChildren(state, "1");
  console.log("Retrieved children", children);

  // Query the database
  const nameQuery = (name: string) => (node: EncryptedNode) => node.name === name;
  const nodesWithName = query(state, nameQuery("my-node"));
  console.log("Nodes with name", nodesWithName);

  const nameIndex = new Map<string, string[]>();

  const updateNameIndex = (state: Map<string, EncryptedNode>) => {
    nameIndex.clear();
    state.forEach((node, id) => {
      const name = node.name;
      if (!nameIndex.has(name)) {
        nameIndex.set(name, []);
      }
      nameIndex.get(name)!.push(id);
    });
  };

  updateNameIndex(state);

  const parentIndex = new Map<string, string[]>();

  const updateParentIndex = (state: Map<string, EncryptedNode>) => {
    parentIndex.clear();
    state.forEach((node, id) => {
      if (!node.parent) return;
      if (!parentIndex.has(node.parent)) {
        parentIndex.set(node.parent, []);
      }
      parentIndex.get(node.parent)!.push(id);
    });
  };

  updateParentIndex(state);

  return state;
}

async function performDatabaseOperations(state: Map<string, EncryptedNode>, key: string): Promise<string> {
  console.log("Performing database operations...");
  const keyUtf8 = new TextEncoder().encode(key);
  // Store and retrieve from IPFS
  const hash = await storeDatabase(state, keyUtf8);
  console.log("Database stored with hash:", hash);

  const retrievedJson = await retrieveDatabase(hash, keyUtf8);

  console.log("Database retrieved:", await retrievedJson);

  return hash;
}

async function addFileAndStore(hash: string, key: string) {
  const keyUtf8 = new TextEncoder().encode(key);

  const node = await retrieveDatabase(hash, keyUtf8);

  let state = initializeDatabase();

  state = addNode(state, JSON.parse(node as any));

  console.log("Unpin File IPFS", await unpinFromIPFS(hash));

  const file: EncryptedNode = {
    id: "2",
    type: "FILE",
    name: "my-file",
    content: "testFile",
    children: [],
    parent: "1",
  };

  state = addNode(state, file);
  console.log("Sample nodes added", Array.from(state.values()));

  const newHash = await storeDatabase(state, keyUtf8);
  return newHash;
}

function queryDatabase(state: Map<string, EncryptedNode>) {
  console.log("Querying database...");

  const nameQuery = (name: string) => (node: EncryptedNode) => node.name === name;

  const typeQuery = (type: NodeType) => (node: EncryptedNode) => node.type === type;

  const contentQuery = (content: string) => (node: EncryptedNode) => node.content === content;

  const childrenQuery = (children: string[]) => (node: any) =>
    Array.isArray(node.children) && children.every(childId => node.children.includes(childId));

  const parentQuery = (parent: string) => (node: EncryptedNode) => node.parent === parent;

  const allNodes = getAllNodes(state);

  console.log("Nodes with name", query(state, nameQuery("my-node")));
  console.log("Nodes with type", query(state, typeQuery("FILE")));
  console.log("Nodes with type", query(state, typeQuery("DIRECTORY")));
  console.log("Nodes with content This is my file", query(state, contentQuery("This is my file")));
  console.log("Nodes with content This is another file", query(state, contentQuery("This is another file")));
  console.log("Nodes with content testDir", query(state, contentQuery("testDir")));
  console.log("Nodes with children", query(state, childrenQuery(["3"])));
  console.log("Nodes with parent", query(state, parentQuery("1")));
  console.log("All nodes", allNodes);
}

async function serializeAndDeserializeDatabase(state: Map<string, EncryptedNode>, key: string) {
  console.log("Serializing and deserializing database...");
  const keyUtf8 = new TextEncoder().encode(key);

  const serialized = await serializeDatabase(state, keyUtf8);
  console.log("Serialized:", serialized);

  const deserialized = await deserializeDatabase(serialized, keyUtf8);
  console.log("Deserialized:", deserialized);
}

async function addFileToDirectory(state: Map<string, EncryptedNode>): Promise<Map<string, EncryptedNode>> {
  console.log("Adding a file to an existing directory...");

  // Creiamo un nuovo file con l'ID "2" e impostiamo il suo parent alla directory con ID "1"
  const newFile: EncryptedNode = {
    id: "2",
    type: "FILE",
    name: "my-file",
    content: "This is my file",
    parent: "1", // la directory "1" sarà il parent
    children: [],
  };

  // Aggiungiamo il nuovo file allo state
  state = addNode(state, newFile);

  // Ora dobbiamo aggiornare la lista dei children della directory
  const parentDir = getNode(state, "1");
  if (parentDir && Array.isArray(parentDir.children)) {
    parentDir.children.push("2");
    state = updateNode(state, parentDir);
  }

  console.log("File added to directory", Array.from(state.values()));
  return state;
}

async function addAnotherFileAndList(state: Map<string, EncryptedNode>): Promise<Map<string, EncryptedNode>> {
  console.log("Adding another file to the existing directory...");

  // Creiamo un altro nuovo file con l'ID "3" e impostiamo il suo parent alla directory con ID "1"
  const anotherFile: EncryptedNode = {
    id: "3",
    type: "FILE",
    name: "another-file",
    content: "This is another file",
    parent: "1", // la directory "1" sarà il parent
    children: [],
  };

  // Aggiungiamo il nuovo file allo state
  state = addNode(state, anotherFile);

  // Ora dobbiamo aggiornare la lista dei children della directory
  const parentDir = getNode(state, "1");
  if (parentDir && Array.isArray(parentDir.children)) {
    parentDir.children.push("3");
    state = updateNode(state, parentDir);
  }

  console.log("Another file added to directory", Array.from(state.values()));

  // Ora listiamo tutti i file nella directory con l'ID "1"
  const filesInDir = getChildren(state, "1").filter(node => node?.type === "FILE");
  console.log("Files in directory:", filesInDir);

  return state;
}

// Main function to kick off the execution
function main() {
  const go = async () => {
    try {
      await run();
    } catch (err) {
      console.error(err);
    }
  };
  go();
}

main();
