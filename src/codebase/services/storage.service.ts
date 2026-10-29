import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';

@Injectable()
export class StorageService {
  private readonly rootDirectory: string;

  constructor() {
    this.rootDirectory = resolve(
      process.env.CODEBASE_STORAGE_DIR ??
        resolve(process.cwd(), 'storage', 'codebases'),
    );
  }

  async saveBuffer(key: string, buffer: Buffer): Promise<void> {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('StorageService.saveBuffer expects a Buffer');
    }

    const destination = this.resolveSafeKey(key);

    await mkdir(dirname(destination), { recursive: true });

    // Write a temporary file in the same directory, then rename it.
    const temporaryPath = `${destination}.${randomUUID()}.tmp`;

    try {
      await writeFile(temporaryPath, buffer, { flag: 'wx' });
      await rename(temporaryPath, destination);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveSafeKey(key);

    await rm(target, {
      recursive: true,
      force: true,
    });
  }

  async deletePrefix(prefix: string): Promise<void> {
    await this.delete(prefix);
  }

  private resolveSafeKey(key: string): string {
    if (
      !key ||
      key.includes('\0') ||
      key.startsWith('/') ||
      isAbsolute(key) ||
      /^[a-zA-Z]:/.test(key)
    ) {
      throw new Error('Invalid storage key');
    }

    const normalized = key.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);

    if (
      segments.length === 0 ||
      segments.some((segment) => segment === '.' || segment === '..')
    ) {
      throw new Error('Invalid storage key');
    }

    const destination = resolve(this.rootDirectory, ...segments);
    const rootPrefix = this.rootDirectory + sep;

    if (!destination.startsWith(rootPrefix)) {
      throw new Error('Storage key resolves outside the storage directory');
    }

    return destination;
  }
}
