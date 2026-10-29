import { BadRequestException, Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';

export interface ExtractedCodeFile {
  absolutePath: string;
  relativePath: string;
  extension?: string;
  sizeBytes: number;
  contentHash: string;
  isIndexable: boolean;
}

export interface ExtractedArchive {
  tempDirectory: string;
  files: ExtractedCodeFile[];
  totalSizeBytes: number;
}

@Injectable()
export class ArchiveService {
  private readonly maxEntries = 10_000;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10 MB
  private readonly maxTotalSize = 100 * 1024 * 1024; // 100 MB

  async extractAndScan(buffer: Buffer): Promise<ExtractedArchive> {
    if (!buffer?.length) {
      throw new BadRequestException('The ZIP file is empty');
    }

    let zip: AdmZip;

    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestException('Invalid ZIP file');
    }

    const entries = zip.getEntries();

    if (entries.length > this.maxEntries) {
      throw new BadRequestException('Too many files in the ZIP');
    }

    // Validate paths and declared sizes before extracting anything.
    const seenPaths = new Set<string>();
    let declaredTotalSize = 0;

    for (const entry of entries) {
      const relativePath = this.getSafeRelativePath(entry.entryName);

      if (!relativePath) {
        continue; // An empty root-directory entry.
      }

      if (seenPaths.has(relativePath)) {
        throw new BadRequestException(`Duplicate path in ZIP: ${relativePath}`);
      }

      seenPaths.add(relativePath);

      if (entry.isDirectory) {
        continue;
      }

      const size = entry.header.size;

      if (!Number.isSafeInteger(size) || size < 0) {
        throw new BadRequestException('Invalid file size in ZIP');
      }

      if (size > this.maxFileSize) {
        throw new BadRequestException(`File is too large: ${relativePath}`);
      }

      declaredTotalSize += size;

      if (declaredTotalSize > this.maxTotalSize) {
        throw new BadRequestException(
          'Extracted codebase exceeds the size limit',
        );
      }
    }

    const tempDirectory = await mkdtemp(resolve(tmpdir(), 'coding-assistant-'));

    const files: ExtractedCodeFile[] = [];
    let totalSizeBytes = 0;

    try {
      for (const entry of entries) {
        const relativePath = this.getSafeRelativePath(entry.entryName);

        if (!relativePath || entry.isDirectory) {
          continue;
        }

        // Reconstruct the output path from a validated relative path.
        const absolutePath = resolve(tempDirectory, ...relativePath.split('/'));

        const rootPrefix = resolve(tempDirectory) + sep;

        if (!absolutePath.startsWith(rootPrefix)) {
          throw new BadRequestException('Unsafe ZIP entry path');
        }

        // adm-zip reads the contents of this entry into a Buffer.
        const content = entry.getData();

        if (content.length > this.maxFileSize) {
          throw new BadRequestException('Extracted file is too large');
        }

        totalSizeBytes += content.length;

        if (totalSizeBytes > this.maxTotalSize) {
          throw new BadRequestException(
            'Extracted codebase exceeds the size limit',
          );
        }

        await mkdir(dirname(absolutePath), { recursive: true });

        await writeFile(absolutePath, content, { flag: 'wx' });

        files.push({
          absolutePath,
          relativePath,
          extension: extname(relativePath).toLowerCase() || undefined,
          sizeBytes: content.length,
          contentHash: createHash('sha256').update(content).digest('hex'),
          isIndexable: this.isIndexable(relativePath),
        });
      }

      if (files.length === 0) {
        throw new BadRequestException('The ZIP contains no files');
      }

      return {
        tempDirectory,
        files,
        totalSizeBytes,
      };
    } catch (error) {
      await this.cleanup(tempDirectory);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Could not extract the ZIP file');
    }
  }

  async cleanup(tempDirectory: string): Promise<void> {
    const tempRoot = resolve(tmpdir());
    const target = resolve(tempDirectory);
    const relativePath = relative(tempRoot, target);

    if (
      !relativePath ||
      relativePath === '..' ||
      relativePath.startsWith(`..${sep}`) ||
      relativePath.includes(sep) ||
      !basename(target).startsWith('coding-assistant-')
    ) {
      throw new Error('Refusing to remove an unsafe temporary directory');
    }

    await rm(target, { recursive: true, force: true });
  }

  private getSafeRelativePath(entryName: string): string {
    const normalized = entryName.replace(/\\/g, '/');

    if (
      !normalized ||
      normalized.includes('\0') ||
      normalized.startsWith('/') ||
      /^[a-zA-Z]:/.test(normalized)
    ) {
      throw new BadRequestException('Invalid ZIP entry path');
    }

    const segments = normalized
      .split('/')
      .filter((segment) => segment !== '' && segment !== '.');

    if (segments.includes('..')) {
      throw new BadRequestException('ZIP contains an unsafe path');
    }

    return segments.join('/');
  }

  private isIndexable(relativePath: string): boolean {
    const segments = relativePath.toLowerCase().split('/');

    const ignoredDirectories = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
    ];

    if (segments.some((segment) => ignoredDirectories.includes(segment))) {
      return false;
    }

    const fileName = segments[segments.length - 1];

    if (
      (fileName.startsWith('.env') &&
        !/^\.env\.(example|sample|template)$/.test(fileName)) ||
      /\.(pem|key|p12|pfx)$/i.test(fileName) ||
      /^id_(rsa|ed25519)$/.test(fileName)
    ) {
      return false;
    }

    return true;
  }
}
