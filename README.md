# Mogu v3

<img src="https://github.com/scobru/mogu/raw/7588270975ff5f8b7e8c13db86b28ea5fc3fe7f8/mogu.png" width="300" height="auto" alt="Mogu Logo">

## What is Mogu?

Mogu is a decentralized data management solution that bridges the gap between real-time databases and permanent storage. It combines GunDB's real-time capabilities with IPFS's distributed storage to provide a robust, versioned backup system with encryption support.

### Core Features
- **Real-time Database**: Uses GunDB for immediate data synchronization
- **Permanent Storage**: Leverages IPFS and Web3 storage providers
- **Version Control**: Maintains detailed version history
- **Encryption**: End-to-end encryption for both files and Gun backups
- **Binary Support**: Handles both text and binary files

## Quick Start

### Installation

```bash
# Using npm
npm install @scobru/mogu

# Using yarn
yarn add @scobru/mogu
```

### Basic Configuration

```typescript
import { Mogu } from '@scobru/mogu';

const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  },
  useGun: true  // Enable GunDB support
});
```

### Environment Setup

Create a `.env` file:
```env
# Required: Storage Provider Configuration
PINATA_API_KEY=<your-pinata-api-key>
PINATA_API_SECRET=<your-pinata-api-secret>
PINATA_GATEWAY=<your-pinata-gateway>

# Optional: Encryption
ENCRYPTION_KEY=<your-encryption-key>
```

## Features

### Encrypted File Backup

```typescript
// Create encrypted backup
const backup = await mogu.backupFiles('./my-directory', {
  encryption: {
    enabled: true,
    key: process.env.ENCRYPTION_KEY
  }
});

// Restore encrypted backup
await mogu.restoreFiles(backup.hash, './restore-dir', {
  encryption: {
    enabled: true,
    key: process.env.ENCRYPTION_KEY
  }
});
```

### Gun Database Integration

```typescript
// Store data in Gun
await mogu.put('users/1', { name: 'John' });

// Create encrypted Gun backup
const backup = await mogu.backupGun(undefined, {
  encryption: {
    enabled: true,
    key: process.env.ENCRYPTION_KEY
  }
});

// Restore Gun backup
await mogu.restoreGun(backup.hash, undefined, {
  encryption: {
    enabled: true,
    key: process.env.ENCRYPTION_KEY
  }
});
```

## Storage Providers

Mogu supports multiple storage providers:
- **PINATA**: Popular IPFS pinning service
- **BUNDLR**: Arweave-based storage
- **NFT.STORAGE**: Free IPFS storage for NFTs
- **WEB3.STORAGE**: Decentralized storage platform
- **ARWEAVE**: Permanent storage blockchain
- **IPFS-CLIENT**: Direct IPFS node connection
- **LIGHTHOUSE**: Decentralized storage network

## Security Features

### Encryption Support
- AES-256-CBC encryption (default)
- Custom algorithm support
- Secure key handling
- Binary file encryption
- Metadata encryption

### Supported File Types
- **Text**: .txt, .json, .md, .csv
- **Images**: .png, .jpg, .jpeg, .gif, .bmp
- **Documents**: .pdf, .doc, .docx
- **Spreadsheets**: .xls, .xlsx
- **Archives**: .zip, .rar, .7z, .tar, .gz

## Development

### Running Tests
```bash
# Run all tests
yarn test

# Tests cover:
# - File encryption/decryption
# - Gun backup encryption
# - Wrong key scenarios
# - Binary file handling
```

### Landing Page
The project includes a modern landing page showcasing Mogu's features. To view it:
1. Navigate to the `landing` directory
2. Open `index.html` in your browser

## Best Practices

### Key Management
```typescript
// Generate secure key
const key = crypto.randomBytes(32).toString('hex');

// Store securely (use environment variables)
process.env.ENCRYPTION_KEY = key;
```

### Error Handling
```typescript
try {
  await mogu.restoreFiles(hash, './restore-dir', {
    encryption: {
      enabled: true,
      key: process.env.ENCRYPTION_KEY
    }
  });
} catch (error) {
  if (error.message.includes('decrypt')) {
    // Handle decryption errors
  } else if (error.message.includes('not found')) {
    // Handle missing file errors
  }
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- GitHub Issues: [Report a bug](https://github.com/tuouser/mogu/issues)
- Documentation: [Read the docs](https://github.com/tuouser/mogu#readme)
- Community: [Join our Discord](https://discord.gg/yourdiscord)