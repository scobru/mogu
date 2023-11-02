no# IPFS Database SDK

## Overview

This SDK provides functionalities for creating a simple file system-like structure stored in a decentralized manner using IPFS and TypeScript.

## Installation

First, make sure you have NodeJS and npm installed on your machine. Then, run:

\`\`\`
npm install
\`\`\`

## Initialize Database

To initialize your database, you can use the `initializeDatabase` function.

```typescript
import { initializeDatabase } from "./db";

const state = initializeDatabase();
```

This will return a new `state` object, which represents the current state of your database.

## Add a Node

You can add a node (either a file or directory) using the `addNode` function.

```typescript
import { addNode, Node, NodeType } from "./db";

const newNode: Node = {
  id: "1",
  type: NodeType.FILE,
  name: "my-file",
  content: "Hello, World!",
  children: [],
};

const newState = addNode(state, newNode);
```

## Query the Database

You can query the database using various attributes like `name`, `type`, etc.

```typescript
import { query } from "./db";

const nameQuery = (name: string) => (node: Node) => node.name === name;
const results = query(state, nameQuery("my-file"));
```

## Save Database to IPFS

To store your database state on IPFS, use the `storeDatabase` function.

```typescript
import { storeDatabase } from "./pinataAPI";

const hash = await storeDatabase(state);
```

## Retrieve Database from IPFS

If you have the hash of a previously stored state, you can retrieve it using the `retrieveDatabase` function.

```typescript
import { retrieveDatabase } from "./pinataAPI";

const hash = "your_database_hash_here";
const state = await retrieveDatabase(hash);
```

## Remove a Node and Update the State

### Retrieve State from Database

If you already have a hash of the database stored on IPFS, you can retrieve the current `state` using the `retrieveDatabase` function.

```typescript
import { retrieveDatabase } from "./pinataAPI";

const hash = "your_database_hash_here";
const state = await retrieveDatabase(hash);
```

### Remove a Node

Use the `removeNode` function to remove a specific node from the `state`. This function takes the current `state` and the ID of the node to be removed as inputs.

```typescript
import { removeNode } from "./db";

const nodeIdToRemove = "2";
const newState = removeNode(state, nodeIdToRemove);
```

### Update the State

After removing the node, the `state` will be updated. You can use the `storeDatabase` function to store the new `state` on IPFS.

```typescript
import { storeDatabase } from "./pinataAPI";

const newHash = await storeDatabase(newState);
```

Now, `newHash` represents the hash of your updated database on IPFS. You can use this for future retrieval operations.
