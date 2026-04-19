import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM authenticated encryption for platform tokens.
 * Storage format: hex(iv):hex(authTag):hex(ciphertext)
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private key: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const keyHex = this.config.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      this.logger.warn(
        'TOKEN_ENCRYPTION_KEY is missing or not 64 hex chars. ' +
        'Token encryption is DISABLED — tokens will be stored in plaintext.',
      );
      return;
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    if (!this.key) return plaintext; // dev fallback: no encryption
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(stored: string): string {
    if (!this.key) return stored; // dev fallback: no encryption
    // If the value doesn't look encrypted (no colons), return as-is (plaintext token)
    if (!stored.includes(':')) return stored;
    const parts = stored.split(':');
    if (parts.length !== 3) return stored;
    try {
      const [ivHex, authTagHex, ciphertextHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const ciphertext = Buffer.from(ciphertextHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
    } catch {
      // Token was stored as plaintext before encryption was enabled — return as-is
      return stored;
    }
  }
}
