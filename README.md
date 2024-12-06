# Mogu

<img src="https://github.com/scobru/mogu/raw/7588270975ff5f8b7e8c13db86b28ea5fc3fe7f8/mogu.png" width="300" height="auto" alt="Mogu Logo">

A modern decentralized backup system with encryption and versioning.

## Features

- 🚀 **Simple to Use**: Just a few lines of code to backup and restore
- 🔒 **End-to-End Encryption**: Your data is always secure
- 📦 **IPFS Storage**: Decentralized and reliable
- 🔄 **Automatic Versioning**: Track changes over time
- 💾 **Smart Caching**: Fast operations with intelligent caching
- 📝 **Structured Logging**: Detailed operation tracking
- 🔍 **Version Comparison**: Compare backups with local files

## Quick Start

```bash
yarn add mogu
```

```typescript
import { Mogu } from "mogu";

// Initialize Mogu
const mogu = new Mogu({
  storage: {
    service: "PINATA",
    config: {
      pinataJwt: "your-pinata-jwt",
      pinataGateway: "gateway.pinata.cloud"
    },
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
const mogu = new Mogu({
  // Storage configuration
  storage: {
    service: "PINATA", // IPFS storage provider
    config: {
      pinataJwt: "your-pinata-jwt",
      pinataGateway: "gateway.pinata.cloud"
    },
  },

  // File paths
  paths: {
    backup: "./backup", // Source directory
    restore: "./restore", // Restore directory
    storage: "./storage", // Local storage
    logs: "./logs", // Log files
  },

  // Features
  features: {
    encryption: {
      enabled: true,
      algorithm: "aes-256-gcm",
    },
  },

  // Performance tuning
  performance: {
    maxConcurrent: 3, // Concurrent operations
    chunkSize: 1024 * 1024, // 1MB chunks
    cacheEnabled: true, // Enable caching
    cacheSize: 100, // Cache size
  },
});
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

Choose your preferred storage:

- **PINATA**: Managed IPFS storage with automatic hash validation and error handling
- **IPFS-CLIENT**: Local IPFS node
- **BUNDLR**: Arweave storage
- **NFT.STORAGE**: Free IPFS storage
- **WEB3.STORAGE**: Decentralized IPFS
- **ARWEAVE**: Permanent storage
- **LIGHTHOUSE**: Decentralized storage

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


