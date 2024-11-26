# Mogu Project Documentation

<img src="https://github.com/scobru/mogu/raw/7588270975ff5f8b7e8c13db86b28ea5fc3fe7f8/mogu.png" width="300" height="auto" alt="Mogu Logo">





Mogu is a TypeScript-based project that integrates GunDB with IPFS to provide a decentralized and efficient data storage solution. It includes features for real-time updates, backups, and restores via Web3Stash and IPFS.

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Server Configuration](#server-configuration)
  - [Mogu SDK](#mogu-sdk)
  - [IPFS Adapter](#ipfs-adapter)
  - [Web3Stash](#web3stash)
  - [Backup and Restore](#backup-and-restore)
- [Testing](#testing)
- [File Structure](#file-structure)
- [License](#license)

---

## Introduction

Mogu provides developers with tools to build decentralized and efficient applications using GunDB for data synchronization and IPFS for storage. It supports features like data backup, restore, and real-time updates, making it ideal for decentralized applications (dApps).

## Features
- Real-time data synchronization using GunDB
- Data backup and restore using IPFS and Web3Stash
- Supports both local and IPFS-based storage
- Modular design for easy integration with other services
- Backup comparison functionality
- Support for basic CRUD operations
- Reliable backup and restore system
- Support for multiple storage providers (Pinata, Web3.Storage, NFT.Storage)
- Automatic cryptographic key management
- Integrated caching system
- Support for structured and unstructured data

---

## Installation

To set up the project locally, follow these steps:

1. Install the package via npm:
    ```bash
    npm install @scobru/mogu
    ```

2. Create a `.env` file in the root directory with the following variables:
    ```
    PINATA_API_KEY=<your-pinata-api-key>
    PINATA_API_SECRET=<your-pinata-api-secret>
    PINATA_GATEWAY=<your-pinata-gateway>
    DB_NAME=<your-db-name>
    PRIVATE_KEY=<your-private-key>
    PROVIDER_URL=<your-provider-url>
    STORAGE=true
    ```

3. Import and initialize Mogu in your project:
    ```typescript
    import { Mogu } from '@scobru/mogu';
    
    const mogu = new Mogu({
      dbName: process.env.DB_NAME,
      storage: process.env.STORAGE === 'true',
      privateKey: process.env.PRIVATE_KEY,
      providerUrl: process.env.PROVIDER_URL
    });
    ```

---

## Usage

### Mogu SDK

The Mogu SDK provides a comprehensive set of features to interact with the system. Here's the detailed documentation:

#### Initialization

```typescript
import { Mogu } from '@scobru/mogu';

const options = {
  key: "optional-key",
  storageService: "pinata", // or other supported services
  storageConfig: {
    // storage service configuration
  },
  server: {}, // optional GunDB server configuration
  useIPFS: true // enable IPFS usage
};

const mogu = new Mogu(options);
```

#### Core Methods

##### `getGun()`
Returns the GunDB instance.
```typescript
const gunInstance = mogu.getGun();
```

##### `get(key: string)`
Retrieves data from the specified key.
```typescript
const data = await mogu.get("myKey");
```

##### `put(key: string, data: any)`
Puts data at the specified key.
```typescript
await mogu.put("myKey", { data: "value" });
```

##### `on(key: string, callback: (data: any) => void)`
Subscribes to updates on a specific key.
```typescript
mogu.on("myKey", (data) => {
  console.log("Updated data:", data);
});
```

#### Backup Management

##### `backup()`
Performs data backup.
```typescript
const hash = await mogu.backup();
console.log("Backup hash:", hash);
```

##### `restore(hash: string)`
Restores data from a backup.
```typescript
const success = await mogu.restore("backupHash");
```

##### `removeBackup(hash: string)`
Removes a specific backup.
```typescript
await mogu.removeBackup("backupHash");
```

##### `compareBackup(hash: string)`
Compares a backup with local data.
```typescript
const comparison = await mogu.compareBackup("backupHash");
console.log("Comparison results:", comparison);
```

#### Interfaces

```typescript
interface MoguOptions {
  key?: string;
  storageService?: Web3StashServices;
  storageConfig?: Web3StashConfig;
  server?: any;
  useIPFS?: boolean;
}

interface BackupFileData {
  fileName: string;
  content: string | object;
}
```

#### Error Handling

The SDK includes comprehensive error handling. All methods that might fail throw errors that should be handled with try/catch:

```typescript
try {
  await mogu.backup();
} catch (error) {
  console.error("Backup error:", error);
}
```

### Advanced Usage Examples

#### Real-Time Synchronization
```typescript
// Sync configuration
const mogu = new Mogu({ useIPFS: true });

// Subscribe to updates
mogu.on("documents", (data) => {
  console.log("Documents updated:", data);
});

// Update data
await mogu.put("documents", { new: "content" });
```

#### Automatic Backup Management
```typescript
const mogu = new Mogu({
  storageService: "pinata",
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});

// Periodic backup
setInterval(async () => {
  try {
    const hash = await mogu.backup();
    console.log("Automatic backup completed:", hash);
  } catch (error) {
    console.error("Automatic backup error:", error);
  }
}, 3600000); // every hour
```

### Advanced Examples

#### Working with IPFS
```typescript
// Initialize Mogu with IPFS support
const mogu = new Mogu({
  useIPFS: true,
  storageService: "PINATA",
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});

// Store data on IPFS
await mogu.put("myKey", { data: "test" });

// Retrieve data from IPFS
const data = await mogu.get("myKey");
```

#### Error Handling Examples
```typescript
try {
  const mogu = new Mogu({
    useIPFS: true,
    storageConfig: {} // Missing required config
  });
} catch (error) {
  console.error("Configuration error:", error);
}

try {
  await mogu.backup();
} catch (error) {
  if (error.message === "Storage service not initialized") {
    console.error("Storage service configuration missing");
  } else {
    console.error("Backup failed:", error);
  }
}
```

#### Backup Management Examples
```typescript
// Create backup
const backupHash = await mogu.backup();

// Compare backup with current state
const comparison = await mogu.compareBackup(backupHash);
if (!comparison.isEqual) {
  console.log("Differences found:", comparison.differences);
}

// Restore from backup
await mogu.restore(backupHash);

// Remove old backup
await mogu.removeBackup(oldHash);
```

#### Event Handling
```typescript
// Subscribe to real-time updates
mogu.on("users/active", (data) => {
  console.log("Active users updated:", data);
});

// Multiple subscriptions
const subscriptions = [
  "users/active",
  "system/status",
  "messages/new"
];

subscriptions.forEach(topic => {
  mogu.on(topic, (data) => {
    console.log(`${topic} updated:`, data);
  });
});
```

## Storage Services

Mogu supports multiple storage services:

- **Pinata**: IPFS pinning service
- **Bundlr**: Arweave-based storage
- **NFT.Storage**: Decentralized storage for NFTs
- **Web3.Storage**: IPFS and Filecoin storage
- **Arweave**: Permanent storage
- **IPFS HTTP Client**: Direct IPFS node connection
- **Lighthouse**: Decentralized storage solution

### Storage Service Configuration Examples

#### Pinata
```typescript
const mogu = new Mogu({
  storageService: "PINATA",
  storageConfig: {
    apiKey: "your-api-key",
    apiSecret: "your-api-secret"
  }
});
```

#### Bundlr
```typescript
const mogu = new Mogu({
  storageService: "BUNDLR",
  storageConfig: {
    currency: "ethereum",
    privateKey: "your-private-key",
    testing: true // Use testnet
  }
});
```

## Performance Considerations

- Use appropriate storage service based on data size and persistence requirements
- Consider enabling IPFS for large datasets
- Implement proper error handling for network issues
- Monitor backup sizes and cleanup old backups

## Security Best Practices

- Store API keys and secrets in environment variables
- Implement proper access control for sensitive data
- Regularly rotate API keys
- Validate data before storage
- Use encryption for sensitive data

## Troubleshooting

Common issues and solutions:

1. **Storage Service Connection Failed**
   ```typescript
   // Check service configuration
   const mogu = new Mogu({
     storageService: "PINATA",
     storageConfig: {
       apiKey: process.env.PINATA_API_KEY,
       apiSecret: process.env.PINATA_API_SECRET
     }
   });
   ```

2. **Backup Failures**
   ```typescript
   try {
     await mogu.backup();
   } catch (error) {
     // Check storage quota
     // Verify network connection
     // Validate data integrity
   }
   ```

3. **Data Synchronization Issues**
   ```typescript
   // Implement retry logic
   const maxRetries = 3;
   let retries = 0;
   
   async function syncData() {
     while (retries < maxRetries) {
       try {
         await mogu.put("key", data);
         break;
       } catch (error) {
         retries++;
         await new Promise(resolve => setTimeout(resolve, 1000));
       }
     }
   }
   ```

---

## Testing

The project includes unit and integration tests to ensure code robustness and stability.

---

## File Structure

The project is structured in a modular way, with each component separated and well-defined.

---

## License

Mogu is released under the MIT license.
