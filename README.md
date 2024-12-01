# Mogu v3

<img src="https://github.com/scobru/mogu/raw/7588270975ff5f8b7e8c13db86b28ea5fc3fe7f8/mogu.png" width="300" height="auto" alt="Mogu Logo">

## What is Mogu?

Mogu is a decentralized data management solution that bridges the gap between real-time databases and permanent storage. It combines GunDB's real-time capabilities with IPFS's distributed storage to provide a robust, versioned backup system with encryption support.

### Core Concept
- **Real-time Database**: Uses GunDB for immediate data synchronization
- **Permanent Storage**: Leverages IPFS and Web3 storage providers
- **Version Control**: Maintains detailed version history
- **Encryption**: End-to-end encryption for both files and Gun backups
- **Binary Support**: Handles both text and binary files

## Latest Updates

- Added end-to-end encryption support
- Enhanced binary file handling
- Improved version comparison system
- Added MIME type support
- Added detailed change tracking

## Installation

1. Install via npm:
```bash
npm install @scobru/mogu
```

2. Create `.env` file:
```env
# Required: Storage Provider Configuration
# Choose one of the following providers:
# - PINATA
# - BUNDLR
# - NFT.STORAGE
# - WEB3.STORAGE
# - ARWEAVE
# - IPFS-CLIENT
# - LIGHTHOUSE

# For Pinata (example)
PINATA_API_KEY=<your-pinata-api-key>
PINATA_API_SECRET=<your-pinata-api-secret>
PINATA_GATEWAY=<your-pinata-gateway>

# Optional: Encryption
ENCRYPTION_KEY=<your-encryption-key>

# Note: Paths are configured automatically and can be overridden in the Mogu constructor if needed
```

3. Configure Mogu:
```typescript
import { Mogu } from '@scobru/mogu';

const mogu = new Mogu({
  // Required: Storage configuration
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  },

  // Optional: Features
  useGun: true,  // Enable GunDB support
});
```

## Basic Usage

### With Encryption
```typescript
import { Mogu } from '@scobru/mogu';

const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  }
});

// Encrypted backup
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

### Gun Database with Encryption
```typescript
// Initialize with Gun support
const mogu = new Mogu({
  storageService: 'PINATA',
  storageConfig: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET
  },
  useGun: true
});

// Store data
await mogu.put('users/1', { name: 'John' });

// Create encrypted backup
const backup = await mogu.backupGun(undefined, {
  encryption: {
    enabled: true,
    key: process.env.ENCRYPTION_KEY
  }
});

// Restore encrypted backup
await mogu.restoreGun(backup.hash, undefined, {
  encryption: {
    enabled: true,
    key: process.env.ENCRYPTION_KEY
  }
});
```

## Encryption Support

### Features
- AES-256-CBC encryption (default)
- Custom algorithm support
- Secure key handling
- Binary file encryption
- Metadata encryption

### Supported File Types
```typescript
const encryptedFileTypes = {
  text: ['.txt', '.json', '.md', '.csv'],
  binary: {
    images: ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
    documents: ['.pdf', '.doc', '.docx'],
    spreadsheets: ['.xls', '.xlsx'],
    archives: ['.zip', '.rar', '.7z', '.tar', '.gz']
  }
};
```

### Error Handling
```typescript
try {
  await mogu.backupFiles('./my-directory', {
    encryption: {
      enabled: true,
      key: process.env.ENCRYPTION_KEY
    }
  });
} catch (error) {
  if (error.message.includes('decrypt')) {
    console.error('Encryption error:', error);
  }
}
```

## Storage Providers

Supported providers:
- PINATA
- BUNDLR
- NFT.STORAGE
- WEB3.STORAGE
- ARWEAVE
- IPFS-CLIENT
- LIGHTHOUSE

## Testing

```typescript
// Run encryption tests
yarn test

// This will test:
// - File encryption/decryption
// - Gun backup encryption
// - Wrong key scenarios
// - Binary file handling
```

## Best Practices

### Key Management
```typescript
// Generate secure key
const key = crypto.randomBytes(32).toString('hex');

// Store securely (use environment variables)
process.env.ENCRYPTION_KEY = key;

// Never store keys in code or version control
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

## Technical Details

### Encryption Implementation
```typescript
// From src/utils/encryption.ts
export class Encryption {
  private algorithm: string;
  private key: Buffer;

  constructor(key: string, algorithm = 'aes-256-cbc') {
    this.algorithm = algorithm;
    this.key = crypto.createHash('sha256')
      .update(key).digest();
  }

  encrypt(data: string | Buffer): { encrypted: Buffer; iv: Buffer } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm, 
      this.key, 
      iv
    );
    const input = Buffer.isBuffer(data) ? 
      data : Buffer.from(data);
    const encrypted = Buffer.concat([
      cipher.update(input), 
      cipher.final()
    ]);
    return { encrypted, iv };
  }

  decrypt(encrypted: Buffer, iv: Buffer): Buffer {
    const decipher = crypto.createDecipheriv(
      this.algorithm, 
      this.key, 
      iv
    );
    return Buffer.concat([
      decipher.update(encrypted), 
      decipher.final()
    ]);
  }
}
```

## FAQ

### Is the encryption secure?
Yes, Mogu uses industry-standard AES-256-CBC encryption by default.

### Where is the encryption key stored?
The key is never stored by Mogu. You must provide it for backup and restore operations.

### Can I use custom encryption algorithms?
Yes, specify the algorithm in the encryption options.

### How are binary files handled?
Binary files are automatically detected and handled appropriately during encryption.

## License

MIT License

## Contributing

Contributions are welcome! Please check our contributing guidelines.