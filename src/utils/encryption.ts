import crypto from 'crypto';

export class Encryption {
  private algorithm: string;
  private key: Buffer;

  constructor(key: string, algorithm = 'aes-256-cbc') {
    this.algorithm = algorithm;
    this.key = crypto.createHash('sha256').update(key).digest();
  }

  encrypt(data: string | Buffer): { encrypted: Buffer; iv: Buffer } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    const input = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    
    return { encrypted, iv };
  }

  decrypt(encrypted: Buffer, iv: Buffer): Buffer {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
} 