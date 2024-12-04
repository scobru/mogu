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
import { Mogu } from 'mogu';

// Initialize Mogu
const mogu = new Mogu({
  storage: {
    service: 'PINATA',
    config: {
      apiKey: 'your-api-key',
      apiSecret: 'your-secret'
    }
  },
  features: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm'
    }
  },
  performance: {
    maxConcurrent: 3,
    chunkSize: 1024 * 1024,
    cacheEnabled: true
  }
});

// Create a backup
const backup = await mogu.backup('./data');
console.log('Backup created:', backup.hash);

// Compare changes
const comparison = await mogu.compare(backup.hash, './data');
if (!comparison.isEqual) {
  console.log('Changes detected!');
  console.log(`Time since backup: ${comparison.formattedDiff}`);
}

// Get detailed changes
const details = await mogu.compareDetailed(backup.hash, './data');
console.log(`Files added: ${details.totalChanges.added}`);
console.log(`Files modified: ${details.totalChanges.modified}`);
console.log(`Files deleted: ${details.totalChanges.deleted}`);

// Restore from backup
await mogu.restore(backup.hash, './restored');
```

## Configuration

```typescript
const mogu = new Mogu({
  // Storage configuration
  storage: {
    service: 'PINATA',  // IPFS storage provider
    config: {
      apiKey: 'your-api-key',
      apiSecret: 'your-secret'
    }
  },
  
  // File paths
  paths: {
    backup: './backup',    // Source directory
    restore: './restore',  // Restore directory
    storage: './storage',  // Local storage
    logs: './logs'        // Log files
  },
  
  // Features
  features: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm'
    }
  },
  
  // Performance tuning
  performance: {
    maxConcurrent: 3,        // Concurrent operations
    chunkSize: 1024 * 1024,  // 1MB chunks
    cacheEnabled: true,      // Enable caching
    cacheSize: 100          // Cache size
  }
});
```

## Version Comparison

Mogu provides powerful comparison features to track changes between your local files and backups:

```typescript
// Basic comparison
const comparison = await mogu.compare(backup.hash, './data');
console.log('Files changed:', !comparison.isEqual);
console.log('Local version is newer:', comparison.isNewer);
console.log('Time difference:', comparison.formattedDiff);

// Detailed comparison
const details = await mogu.compareDetailed(backup.hash, './data');
console.log('Added files:', details.totalChanges.added);
console.log('Modified files:', details.totalChanges.modified);
console.log('Deleted files:', details.totalChanges.deleted);

// Inspect specific changes
details.differences.forEach(diff => {
  console.log(`File: ${diff.path}`);
  console.log(`Change type: ${diff.type}`); // 'added', 'modified', or 'deleted'
  if (diff.type === 'modified') {
    console.log(`Old size: ${diff.size.old}`);
    console.log(`New size: ${diff.size.new}`);
  }
});

// Compare specific versions
const versionInfo = {
  localVersion: details.localVersion,
  remoteVersion: details.remoteVersion,
  timeDiff: details.timeDiff,
  formattedDiff: details.formattedDiff
};
```

## Storage Providers

Choose your preferred storage:

- **PINATA**: Managed IPFS storage
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
const backup = await mogu.backup('./data', {
  encryption: {
    enabled: true,
    key: 'your-encryption-key'
  }
});

// Restore encrypted backup
await mogu.restore(backup.hash, './restore', {
  encryption: {
    enabled: true,
    key: 'your-encryption-key'
  }
});
```

### Backup Options

```typescript
const backup = await mogu.backup('./data', {
  // Exclude patterns
  excludePatterns: ['*.log', '.DS_Store'],
  
  // File size limits
  maxFileSize: 100 * 1024 * 1024, // 100MB
  
  // Recursive backup
  recursive: true,
  
  // Custom metadata
  metadata: {
    description: 'Daily backup',
    tags: ['prod', 'db']
  }
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

MIT © [@scobru/mogu](https://github.com/scobru/mogu)