# Mogu

<img src="https://github.com/scobru/mogu/raw/7588270975ff5f8b7e8c13db86b28ea5fc3fe7f8/mogu.png" width="300" height="auto" alt="Mogu Logo">

🔐 Mogu is a modern backup system that solves data security and reliability challenges by combining end-to-end encryption with decentralized IPFS storage.

🌐 Unlike traditional cloud backup services, Mogu ensures your data remains under your control, encrypted before leaving your system, and securely distributed across the IPFS network.

🚀 With advanced features like automatic versioning, smart caching, and detailed version comparison, Mogu is the perfect choice for developers and teams who need a robust, secure, and easy-to-integrate backup system.

## Features

- 🚀 **Simple to Use**: Just a few lines of code to backup and restore
- 🔒 **End-to-End Encryption**: Your data is always secure
- 📦 **IPFS Storage**: Decentralized and reliable through Pinata
- 🔄 **Automatic Versioning**: Track changes over time
- 💾 **Smart Caching**: Fast operations with intelligent caching
- 📝 **Structured Logging**: Detailed operation tracking
- 🔍 **Version Comparison**: Compare backups with local files

## Quick Start

```bash
yarn add @scobru/mogu
```

or

```bash
npm install @scobru/mogu
```


```typescript
import { Mogu } from "mogu";

// Initialize Mogu
const mogu = new Mogu({
  storage: {
    service: 'PINATA' as const,
    config: {
      pinataJwt: process.env.PINATA_JWT || '',
      pinataGateway: process.env.PINATA_GATEWAY || ''
    }
  },
  features: {
    encryption: {
      enabled: true,
      algorithm: "aes-256-gcm",
    },
  },
  performance: {
    maxConcurrent: 3,
    chunkSize: 1024 * 1024,
    cacheEnabled: true,
  },
});

// Create a backup
const backup = await mogu.backup("./data");
console.log("Backup created:", backup.hash);

// Compare changes
const comparison = await mogu.compare(backup.hash, "./data");
if (!comparison.isEqual) {
  console.log("Changes detected!");
  console.log(`Time since backup: ${comparison.formattedDiff}`);
}

// Get detailed changes
const details = await mogu.compareDetailed(backup.hash, "./data");
console.log(`Files added: ${details.totalChanges.added}`);
console.log(`Files modified: ${details.totalChanges.modified}`);
console.log(`Files deleted: ${details.totalChanges.deleted}`);

// Restore from backup
await mogu.restore(backup.hash, "./restored");

// Delete a backup
const deleted = await mogu.delete(backup.hash);
if (deleted) {
  console.log("Backup deleted successfully");
} else {
  console.log("Backup not found or deletion failed");
}
```

## Configuration

```typescript
const baseConfig = {
  storage: {
    service: 'PINATA' as const,
    config: {
      pinataJwt: process.env.PINATA_JWT || '',
      pinataGateway: process.env.PINATA_GATEWAY || ''
    }
  },
  paths: {
    backup: './backup',    // Source directory
    restore: './restore',  // Restore directory
    storage: './storage', // Local storage
    logs: path.join(process.cwd(), 'logs')
  },
  features: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm'
    }
  }
};

const mogu = new Mogu(baseConfig);
```

## Version Comparison

Mogu provides powerful comparison features to track changes between your local files and backups:

```typescript
// Basic comparison
const comparison = await mogu.compare(backup.hash, "./data");
console.log("Files changed:", !comparison.isEqual);
console.log("Local version is newer:", comparison.isNewer);
console.log("Time difference:", comparison.formattedDiff);

// Detailed comparison
const details = await mogu.compareDetailed(backup.hash, "./data");
console.log("Added files:", details.totalChanges.added);
console.log("Modified files:", details.totalChanges.modified);
console.log("Deleted files:", details.totalChanges.deleted);

// Inspect specific changes
details.differences.forEach(diff => {
  console.log(`File: ${diff.path}`);
  console.log(`Change type: ${diff.type}`); // 'added', 'modified', or 'deleted'
  if (diff.type === "modified") {
    console.log(`Previous size: ${diff.size.old}`);
    console.log(`New size: ${diff.size.new}`);
    console.log(`Previous checksum: ${diff.oldChecksum}`);
    console.log(`New checksum: ${diff.newChecksum}`);
  }
});
```

The comparison system:

- Supports recursive directory structures
- Compares actual file contents
- Provides detailed change information
- Calculates checksums for each file
- Tracks file sizes

## Testing Versioning

The versioning tests verify Mogu's ability to handle different file versions and compare them accurately. The test suite includes:

### Backup and Restore Testing
- Verifies backup creation and restoration with automatic retries
- Validates backup integrity through test restorations
- Handles errors and multiple backup attempts

### Version Testing
1. **Version 1 (Initial)**
   - Creates initial files with base content
   - Verifies correct backup creation

2. **Version 2 (Modifications)**
   - Modifies existing files
   - Verifies changes are tracked correctly

3. **Version 3 (Additions and Deletions)**
   - Adds new files
   - Removes existing files
   - Verifies all changes

### Comparison Testing
- Compares different versions to verify:
  - Modified files
  - Added files
  - Deleted files
  - Timestamps and time differences
  - Checksums and data integrity

### Restore Verification
- Restores each version to separate directories
- Verifies restored content against expected data
- Validates restored file integrity

## Storage Providers

Currently supported:

- **PINATA**: Managed IPFS storage with automatic hash validation and error handling. Requires a Pinata JWT token.
- **IPFS-CLIENT**: Direct IPFS node connection for decentralized storage. Requires a running IPFS node with its HTTP API endpoint.

### PINATA Configuration
```typescript
const config = {
  storage: {
    service: 'PINATA' as const,
    config: {
      pinataJwt: process.env.PINATA_JWT || '',
      pinataGateway: process.env.PINATA_GATEWAY || ''
    }
  }
};
```

### IPFS-CLIENT Configuration
```typescript
const config = {
  storage: {
    service: 'IPFS-CLIENT' as const,
    config: {
      url: 'http://localhost:5001' // Your IPFS node HTTP API endpoint
    }
  }
};
```

## Advanced Usage

### Encrypted Backup

```typescript
// Backup with encryption
const backup = await mogu.backup("./data", {
  encryption: {
    enabled: true,
    key: "your-encryption-key",
  },
});

// Restore encrypted backup
await mogu.restore(backup.hash, "./restore", {
  encryption: {
    enabled: true,
    key: "your-encryption-key",
  },
});
```

### Direct Storage Operations

```typescript
// Upload JSON data directly
const jsonResult = await mogu.uploadJson({
  name: "test",
  data: { key: "value" }
});
console.log("JSON uploaded:", jsonResult.id);

// Upload a single file
const fileResult = await mogu.uploadFile("./path/to/file.txt");
console.log("File uploaded:", fileResult.id);

// Get data by hash
const data = await mogu.getData("QmHash...");
console.log("Retrieved data:", data);

// Get metadata
const metadata = await mogu.getMetadata("QmHash...");
console.log("Content metadata:", metadata);

// Check if content is pinned
const isPinned = await mogu.isPinned("QmHash...");
console.log("Is content pinned?", isPinned);

// Unpin content
const unpinned = await mogu.unpin("QmHash...");
if (unpinned) {
  console.log("Content unpinned successfully");
}

// Get storage service instance
const storage = mogu.getStorage();
```

### Storage Service Methods

Mogu fornisce accesso diretto ai metodi del servizio di storage sottostante:

- `uploadJson(jsonData: Record<string, unknown>)`: Carica dati JSON direttamente su IPFS
- `uploadFile(path: string)`: Carica un singolo file su IPFS
- `getData(hash: string)`: Recupera dati da un hash IPFS
- `getMetadata(hash: string)`: Recupera i metadati associati a un hash
- `isPinned(hash: string)`: Verifica se un contenuto è pinnato
- `unpin(hash: string)`: Rimuove il pin di un contenuto
- `getStorage()`: Ottiene l'istanza del servizio di storage

### Backup Options

```typescript
const backup = await mogu.backup("./data", {
  // Exclude patterns
  excludePatterns: ["*.log", ".DS_Store"],

  // File size limits
  maxFileSize: 100 * 1024 * 1024, // 100MB

  // Recursive backup
  recursive: true,

  // Custom metadata
  metadata: {
    description: "Daily backup",
    tags: ["prod", "db"],
  },
});
```

### General Operations




## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Build
yarn build
```

## License

MIT License

Copyright (c) 2024 scobru

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


