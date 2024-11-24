# MOGU - Decentralized Database with GunDB and IPFS Backup

A decentralized database solution that combines GunDB's real-time capabilities with IPFS backup functionality.

## Features

- Real-time decentralized database using GunDB
- Automatic IPFS backup and restore
- Multiple storage providers support (Pinata, Web3.Storage, NFT.Storage, etc.)
- Backup integrity verification
- Simple and intuitive API

## Quick Start

```typescript
// Initialize Mogu
const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});

// Login (creates user if doesn't exist)
await mogu.login('username', 'password');

// Store data
await mogu.put('users/1', { name: 'John' });

// Read data
const user = await mogu.get('users/1');

// Real-time updates
mogu.on('users/1', (data) => {
  console.log('User updated:', data);
});

// Create backup
const backupHash = await mogu.backup();

// Verify backup integrity
const comparison = await mogu.compareBackup(backupHash);
if (comparison.isEqual) {
  console.log('Backup verified successfully');
}

// Restore from backup
await mogu.restore(backupHash);
```

## Installation

```bash
npm install mogu
# or
yarn add mogu
```

## Architecture

### Core Components

1. **GunDB Layer**
   - Real-time data synchronization
   - P2P network communication
   - User authentication
   - Data persistence

2. **IPFS Layer**
   - Distributed file storage
   - Content-addressed data
   - Multiple storage providers
   - Backup integrity verification

3. **SDK Layer**
   - Simple API interface
   - Automatic backup management
   - Data consistency checks
   - Error handling

## API Reference

### Initialization

```typescript
interface MoguOptions {
  key?: string;                    // Encryption key
  storageService?: Web3StashServices; // Storage provider
  storageConfig?: Web3StashConfig;    // Provider config
  server?: any;                    // Optional server instance
}

const mogu = new Mogu(options: MoguOptions);
```

### Authentication

```typescript
await mogu.login(username: string, password: string);
```

### Data Operations

```typescript
// Store data
await mogu.put(path: string, data: any);

// Read data
const data = await mogu.get(path: string);

// Subscribe to changes
mogu.on(path: string, callback: (data: any) => void);
```

### Backup Operations

```typescript
// Create backup
const hash = await mogu.backup();

// Restore from backup
await mogu.restore(hash: string);

// Compare backup with current state
const comparison = await mogu.compareBackup(hash: string);

// Remove backup
await mogu.removeBackup(hash: string);
```

## Storage Providers

Currently supported providers:
- Pinata
- Web3.Storage
- NFT.Storage
- Lighthouse
- Arweave
- Bundlr

Add a new provider by implementing the `StorageService` interface:

```typescript
interface StorageService {
  uploadJson(data: Record<string, unknown>): Promise<UploadOutput>;
  get(hash: string): Promise<any>;
  unpin(hash: string): Promise<void>;
}
```

## Best Practices

1. **Data Organization**
   - Use hierarchical paths (e.g., 'users/123/profile')
   - Keep data structures consistent
   - Validate data before storing

2. **Backup Management**
   - Regular backup schedule
   - Verify backup integrity
   - Keep backup history
   - Clean up old backups

3. **Error Handling**
   - Handle network errors gracefully
   - Verify data consistency
   - Implement retry mechanisms

## Testing

```bash
# Run all tests
yarn test

# Run specific test
yarn test:backup
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For support, please open an issue or contact the maintainers.