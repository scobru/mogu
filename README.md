
# MUGU

**Description**: This project is a local database interfacing with IPFS. It allows users to encrypt content and exposes an API for interacting with the database and IPFS.

## Modules Overview

- **db.ts**: Manages the local database logic.
- **api.ts**: Defines the API endpoints to interface with the database and IPFS.
- **sdk.ts**: Provides software functionalities to interact with the system.
- **pinataAPI.ts**: Handles interactions with Pinata, an IPFS pinning service.
- **CIDRegistry.sol**: A Solidity smart contract to register CID on IPFS.

## Installation and Configuration

### From NPM

```
npm install @scobru/mogu
```

### From Github

1. Clone the repository:

```
git clone https://github.com/scobru/mogu
```

2. Install dependencies:

```
npm install
```

3. Start the server:

```
npm start
```

## API Usage

### Add a Node

To add a node, make a POST request to the `/api/addNode` endpoint:

```json
POST http://localhost:3000/api/addNode
Content-Type: application/json

{
  "id": "1",
  "type": "FILE",
  "name": "my-file1",
  "parent": "0",
  "children": [],
  "content": "Hello World1!"
}
```

... (repeat for other nodes)

### Update a Node

To update an existing node:

```json
POST http://localhost:3000/api/updateNode
Content-Type: application/json

{
  "id": "0",
  "type": "DIRECTORY",
  "name": "my-dir",
  "parent": "",
  "children": [],
  "content": ""
}
```

### Save the Database

To save the database:

```json
POST http://localhost:3000/api/save
Content-Type: application/json

{
  "key": "testkey"
}
```

### Retrieve All Nodes

To retrieve all nodes:

```
GET http://localhost:3000/api/getAllNodes
Content-Type: application/json
```

... (repeat for other API calls)

### Load Existing CID

Before loading an existing CID, ensure to load it into the state first:

```
GET http://localhost:3000/api/load/:Cid
{
  "key": "testkey"
}
```

Then, you can use the loaded CID in subsequent API calls.
