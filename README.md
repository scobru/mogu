# MOGU

<img src="./mogu.png" alt="image" width="300" height="300">

inspired by [this post](https://levelup.gitconnected.com/build-a-scalable-database-with-typescript-and-ipfs-11eceaf97e7d)

## API Usage

**Description**: Mogu is a TypeScript-based system that integrates a local database with the InterPlanetary File System (IPFS) and Ethereum blockchain. It enables secure storage, management, and retrieval of encrypted data nodes, leveraging blockchain and IPFS for enhanced data integrity and decentralization.

## Features

- Encrypted local database management.
- IPFS integration via PinataAPI for decentralized storage.
- Ethereum blockchain interaction for Content Identifier (CID) management.
- Flexible and customizable node queries.

## Modules

- **db.ts**: Logic for local database management.
- **api.ts**: API endpoint definitions for database and IPFS interaction.
- **sdk.ts**: Software Development Kit for interacting with the Mogu system.
- **pinataAPI.ts**: Interface with the Pinata service for IPFS operations.
- **CIDRegistry.sol**: Ethereum smart contract for managing CIDs.

## Installation

### Via NPM

```bash
npm install @scobru/mogu
```

### Via GitHub

1. Clone the repository:

   ```bash
   git clone https://github.com/scobru/mogu.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

## Usage

### Initializing Mogu

```typescript
import { Mogu } from "@scobru/mogu";
const mogu = new Mogu("your-key", "pinataApiKey", "pinataApiSecret", "dbName");
```

### Adding a Node

```typescript
const newNode: EncryptedNode = {
  id: "0",
  type: "FILE",
  name: "my-file",
  parent: "",
  children: [],
  content: "Hello World!",
};

const newNode: EncryptedNode = {
  id: "0",
  type: "DIRECTORY",
  name: "my-directory",
  parent: "",
  children: [],
  content: "",
};

mogu.addNode(newNode);
```

### Querying Nodes

```typescript
// Query by name
const nodesByName = mogu.queryByName("nodeName");

// Query by type
const nodesByType = mogu.queryByType(NodeType.FILE);
```

### Loading a Database

```typescript
// Load from local storage
mogu.load("cid");
```

### Saving a Database

```typescript
// Save to local storage
mogu.store();
```

### Blockchain Integration

```typescript
import { MoguOnChain } from "@scobru/mogu";
const moguOnChain = new MoguOnChain("contractAddress", signer);
```

## API Reference

- **Add Node**: Send a POST request to `/api/addNode` with the node data in the request body. The node data should be an object that matches the `EncryptedNode` type.

- **Update Node**: Send a POST request to `/api/updateNode` with the updated node data in the request body.

- **Remove Node**: Send a POST request to `/api/removeNode` with the ID of the node to remove in the request body.

- **Save Database**: Send a POST request to `/api/save` with the encryption key in the request body.

- **Save Database On Chain**: Send a POST request to `/api/saveOnChain` with the encryption key and the contract address in the request body.

- **Load Database From Chain**: Send a POST request to `/api/loadOnChain` with the contract address in the request body.

- **Load Database**: Send a POST request to `/api/load/:cid` with the encryption key in the request body and the CID in the URL.

- **Serialize Database**: Send a POST request to `/api/serialize` with the encryption key in the request body.

- **Query By Name**: Send a POST request to `/api/queryByName` with the name to query in the request body.

- **Query By Type**: Send a POST request to `/api/queryByType` with the type to query in the request body.

- **Query By Content**: Send a POST request to `/api/queryByContent` with the content to query in the request body.

- **Query By Children**: Send a POST request to `/api/queryByChildren` with the children to query in the request body.

- **Query By Parent**: Send a POST request to `/api/queryByParent` with the parent to query in the request body.

- **Get All Nodes**: Send a GET request to `/api/getAllNodes` to retrieve all nodes in the database.

- **Unpin CID**: Send a POST request to `/api/unPinCID/:cid` to unpin a CID from IPFS.

Remember to replace `:cid` with the actual CID when making requests to `/api/load/:cid` and `/api/unPinCID/:cid`.

## Contributing

- Guidelines for contributing to the Mogu project.

## License

- Information about the project's licensing.
