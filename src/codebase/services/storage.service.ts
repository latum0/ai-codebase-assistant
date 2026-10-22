import { Injectable } from '@nestjs/common';
@Injectable()
export class StorageService {
  async saveBuffer(archiveStorageKey: string, buffer: Buffer) {}
}
