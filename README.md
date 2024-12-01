# Mogu v3

<img src="https://github.com/scobru/mogu/raw/7588270975ff5f8b7e8c13db86b28ea5fc3fe7f8/mogu.png" width="300" height="auto" alt="Mogu Logo">

## What is Mogu?

Mogu is a decentralized data management solution that bridges the gap between real-time databases and permanent storage. It combines the power of GunDB's real-time capabilities with IPFS's distributed storage to provide a robust, versioned backup system.

### Core Concept
- **Real-time Database**: Uses GunDB for immediate data synchronization across peers
- **Permanent Storage**: Leverages IPFS and various Web3 storage providers for reliable data persistence
- **Version Control**: Maintains detailed version history with file-level change tracking
- **Binary Support**: Handles both text and binary files (images, documents, etc.)

### Key Benefits
- **Decentralized**: No single point of failure
- **Real-time**: Instant data synchronization
- **Permanent**: Reliable data backup on IPFS
- **Versioned**: Complete version history with detailed comparisons
- **Flexible**: Multiple storage provider options
- **Binary-ready**: Native support for images and documents

### Use Cases
- Decentralized applications (dApps) requiring real-time data
- Systems needing reliable backup with version control
- Applications handling mixed content (text + binary files)
- Projects requiring flexible storage options
- Real-time collaborative applications

## Key Features

- Automatic IPFS data backup
- Advanced versioning with version comparison
- Multiple storage providers support (Pinata, Web3.Storage, NFT.Storage, etc.)
- Real-time synchronization with GunDB
- Binary file support (images, PDFs, etc.)
- Detailed backup comparison
- Custom metadata support
- Incremental backup with change detection

## Latest Updates

- Complete binary file support with automatic type detection
- Improved comparison system for both binary and text files
- Base64 conversion for binary files
- MIME type handling
- Detailed change tracking

### Supported Formats
```typescript
const supportedFormats = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp',  // Images
  '.pdf', '.doc', '.docx',                  // Documents
  '.xls', '.xlsx',                          // Spreadsheets
  '.zip', '.rar', '.7z', '.tar', '.gz'      // Archives
];
```

## Installation

1. Install via npm:
    ```bash
    npm install @scobru/mogu
    ```

2. Create `.env` file:
    ```env
    # Storage Configuration
    PINATA_API_KEY=<your-pinata-api-key>
    PINATA_API_SECRET=<your-pinata-api-secret>
    PINATA_GATEWAY=<your-pinata-gateway>

    # Database and Web3
    DB_NAME=<your-db-name>
    PRIVATE_KEY=<your-private-key>
    PROVIDER_URL=<your-provider-url>
    
    # Features and Paths
    STORAGE=true
    USE_IPFS=true
    BACKUP_PATH=./backup
    RADATA_PATH=./radata
    RESTORE_PATH=./restore
    ```

## Configuration

### Basic Setup
```typescript
import { Mogu } from '@scobru/mogu';

const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  },
  useIPFS: true
});
```

### Full Configuration
```typescript
const mogu = new Mogu({
  // Storage
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET,
    gateway: process.env.PINATA_GATEWAY
  },
  storage: true,
  useIPFS: true,
  
  // Paths
  backupPath: path.join(process.cwd(), 'backup'),
  radataPath: path.join(process.cwd(), 'radata'),
  restorePath: path.join(process.cwd(), 'restore'),
  
  // Optional
  server: expressServer,
  dbName: process.env.DB_NAME,
  privateKey: process.env.PRIVATE_KEY,
  providerUrl: process.env.PROVIDER_URL
});
```

## Core Features

### Data Operations
```typescript
// Basic operations
await mogu.put('key', { data: 'value' });
const data = await mogu.get('key');

// Real-time updates
mogu.on('key', (data) => {
  console.log('Updated:', data);
});
```

### Backup Management
```typescript
// Create backup
const { hash } = await mogu.backup();

// Restore from backup
await mogu.restore(hash);

// Compare versions
const comparison = await mogu.compareDetailedBackup(hash);
console.log('Changes:', {
  added: comparison.totalChanges.added,
  modified: comparison.totalChanges.modified,
  deleted: comparison.totalChanges.deleted
});
```

### Binary File Handling
```typescript
// Backup automatically handles binary files
const backupResult = await mogu.backup();

// Check changes in binary files
const comparison = await mogu.compareDetailedBackup(hash);
console.log('Binary file changes:', 
  comparison.differences.filter(d => d.type === 'binary')
);
```

## Storage Services

Supported providers:
- PINATA
- BUNDLR
- NFT.STORAGE
- WEB3.STORAGE
- ARWEAVE
- IPFS-CLIENT
- LIGHTHOUSE

### Provider Configuration Examples

#### Pinata
```typescript
const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});
```

#### Bundlr
```typescript
const mogu = new Mogu({
  storageService: 'BUNDLR',
  storageConfig: {
    currency: 'ethereum',
    privateKey: process.env.PRIVATE_KEY,
    testing: true
  }
});
```

## Best Practices

- Use environment variables for sensitive data
- Implement proper error handling
- Monitor backup sizes
- Regular cleanup of old backups
- Use appropriate storage service for your data size

## License

MIT License

## Advanced Features

### GunDB Integration
```typescript
// Access GunDB instance directly
const gunInstance = mogu.gun;

// Custom GunDB operations
mogu.gun.get('custom').put({ data: 'value' });

// Server configuration
const moguWithServer = new Mogu({
  server: expressServer,
  // ... other config
});
```

### Version Management
```typescript
// Get detailed version info
const state = await mogu.getBackupState(hash);
console.log('Version:', state.metadata.versionInfo);

// Compare versions with details
const comparison = await mogu.compareDetailedBackup(hash);
console.log('Changes:', {
  files: comparison.differences,
  stats: comparison.totalChanges,
  timing: comparison.formattedDiff
});
```

### Custom Paths Configuration
```typescript
const mogu = new Mogu({
  // ... other config
  radataPath: './custom/radata',    // GunDB data
  backupPath: './custom/backup',    // Backup files
  restorePath: './custom/restore'   // Restore location
});
```

### Storage Service Integration
```typescript
// IPFS Integration
const moguWithIPFS = new Mogu({
  useIPFS: true,
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});

// Multiple storage providers
const providers = {
  pinata: 'PINATA',
  bundlr: 'BUNDLR',
  nftStorage: 'NFT.STORAGE',
  web3Storage: 'WEB3.STORAGE',
  arweave: 'ARWEAVE',
  ipfsClient: 'IPFS-CLIENT',
  lighthouse: 'LIGHTHOUSE'
};
```

### Event Handling
```typescript
// Real-time data updates
mogu.on('data', (data) => {
  console.log('Data updated:', data);
});

// Multiple subscriptions
const topics = ['users', 'files', 'backups'];
topics.forEach(topic => {
  mogu.on(topic, (data) => {
    console.log(`${topic} updated:`, data);
  });
});
```

### Binary File Management
```typescript
// Supported binary formats
const binaryTypes = {
  images: ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
  documents: ['.pdf', '.doc', '.docx'],
  spreadsheets: ['.xls', '.xlsx'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz']
};

// Binary file handling is automatic
await mogu.backup();  // Handles both text and binary files

// Check binary file changes
const comparison = await mogu.compareDetailedBackup(hash);
const binaryChanges = comparison.differences.filter(d => 
  binaryTypes.images.some(ext => d.path.endsWith(ext))
);
```

### Advanced Backup Features
```typescript
// Custom backup path
const { hash } = await mogu.backup('./custom/path');

// Restore to custom location
await mogu.restore(hash, './custom/restore/path');

// Get backup metadata
const state = await mogu.getBackupState(hash);
console.log('Backup info:', {
  timestamp: state.metadata.timestamp,
  type: state.metadata.type,
  version: state.metadata.versionInfo
});
```

### Error Handling
```typescript
try {
  await mogu.backup();
} catch (error) {
  if (error.message.includes('Storage service')) {
    // Handle storage service errors
  } else if (error.message.includes('Invalid hash')) {
    // Handle invalid hash errors
  } else {
    // Handle other errors
  }
}
```

### Types and Interfaces
```typescript
interface MoguConfig {
  storageService: Web3StashServices;
  storageConfig: Web3StashConfig;
  useIPFS?: boolean;
  server?: any;
  radataPath?: string;
  backupPath?: string;
  restorePath?: string;
}

interface BackupResult {
  hash: string;
  versionInfo: VersionInfo;
  name: string;
}
```

## Quick Start
```typescript
// 1. Install
npm install @scobru/mogu

// 2. Basic Usage
import { Mogu } from '@scobru/mogu';

// Initialize
const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: 'your-api-key',
    apiSecret: 'your-secret'
  }
});

// Store and sync data
await mogu.put('users/1', { name: 'John' });

// Listen for changes
mogu.on('users/1', (data) => {
  console.log('User updated:', data);
});

// Create backup
const { hash } = await mogu.backup();

// Restore from backup
await mogu.restore(hash);
```

## Architecture

Mogu works on three layers:
1. **Real-time Layer** (GunDB): Handles immediate data synchronization
2. **Storage Layer** (IPFS/Web3): Manages permanent data storage
3. **Version Control Layer**: Tracks changes and manages backups

## Common Scenarios

### Real-time Collaborative App
```typescript
// Setup real-time sync
const mogu = new Mogu({ /* config */ });

// Share data between peers
mogu.put('shared/doc', { content: 'Hello' });
mogu.on('shared/doc', (data) => {
  updateUI(data);
});
```

## FAQ

### When should I use Mogu?
- When you need real-time data sync with permanent backup
- When handling both text and binary data
- When you need version control for your data
- In decentralized applications (dApps)

### How does it handle large files?
Mogu automatically chunks large files and handles them efficiently through IPFS.

### Can I use custom storage providers?
Yes, Mogu supports multiple storage providers and can be extended with custom ones.

### Is it production-ready?
Yes, Mogu is being used in production environments. However, always test thoroughly for your specific use case.

## Performance

- Real-time sync: < 100ms latency
- Backup creation: ~2s for 100MB
- Binary file handling: Efficient base64 encoding
- Version comparison: O(n) complexity

## Testing

The test suite verifies the core functionality of Mogu through three main test categories:

### Basic Operations Test
```typescript
// Tests GunDB operations and real-time sync
await testBasicOperations(mogu);
```
- Tests put/get operations with GunDB
- Verifies real-time data synchronization
- Validates data consistency
- Tests event handling with callbacks

### Backup Test
```typescript
// Tests backup and restore functionality
await testBackup(mogu);
```
- Creates test data structure:
  ```typescript
  const testData = {
    'test/1': { value: 'one' },
    'test/2': { value: 'two' },
    'test/nested/3': { value: 'three' }
  };
  ```
- Performs backup operations
- Verifies backup integrity
- Tests restore functionality
- Validates data consistency after restore
- Tests binary file handling
- Performs detailed version comparison

### IPFS Operations Test
```typescript
// Tests IPFS integration
await testIPFSOperations(mogu);
```
- Tests IPFS data storage
- Verifies data retrieval
- Tests data updates
- Validates data consistency

### Running Tests

```bash
# Run all tests
yarn test

# This will execute:
# - Basic operations test
# - Backup test
# - IPFS operations test
# Both with and without IPFS enabled
```

### Test Configuration
```typescript
// Test with IPFS disabled
const moguWithoutIPFS = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  },
  useIPFS: false
});

// Test with IPFS enabled
const moguWithIPFS = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  },
  useIPFS: true,
  backupPath: path.join(process.cwd(), 'backup'),
  radataPath: path.join(process.cwd(), 'radata'),
  restorePath: path.join(process.cwd(), 'restore')
});
```

### Test Coverage

The test suite verifies:
- ✓ Basic GunDB operations (put/get/on)
- ✓ Real-time data synchronization
- ✓ Backup creation and integrity
- ✓ Restore functionality
- ✓ Binary file handling
- ✓ Version comparison
- ✓ IPFS integration
- ✓ Data consistency

## Server Configuration

Mogu includes a built-in server functionality for GunDB peer synchronization.

### Starting the Server
```typescript
import { startServer } from '@scobru/mogu';

// Start the server
const { gunDb, server } = await startServer();

// The server will run on port 8765 by default
// You can customize the port through environment variable:
// PORT=3000 yarn start
```

### Using with Express
```typescript
import express from 'express';
import { Mogu } from '@scobru/mogu';

const app = express();
const server = app.listen(8765);

// Initialize Mogu with the server
const mogu = new Mogu({
  server,
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});

// GunDB will be available at /gun endpoint
app.use('/gun', (req, res) => {
  mogu.gun.web(req, res);
});
```

### Server Configuration Options
```typescript
// Environment variables
PORT=8765              // Server port (default: 8765)
DB_NAME=mydb          // Database name
RADATA_PATH=./radata  // Data directory path

// Server initialization with options
const serverOptions = {
  port: process.env.PORT || 8765,
  radataPath: process.env.RADATA_PATH || 'radata'
};

const { gunDb, server } = await startServer(serverOptions);
```

### Peer Synchronization
```typescript
// On the server
const serverMogu = new Mogu({
  server,
  // ... other config
});

// On the client
const clientMogu = new Mogu({
  peers: ['http://localhost:8765/gun'], // Connect to server
  // ... other config
});

// Data will automatically sync between peers
clientMogu.put('shared/data', { value: 'test' });
serverMogu.on('shared/data', (data) => {
  console.log('Received on server:', data);
});
```
