import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { ProjectService } from '../../projects/services/project.service.js';
import { ProjectRevisionStatus } from '../entities/projectRevision.entity.js';
import { ProjectFileRepository } from '../repositories/projectFile.repository.js';
import { ProjectRevisionRepository } from '../repositories/projectRevision.entity.js';
import { ArchiveService } from './archive.service.js';
import { CodebaseService } from './codebase.service.js';
import { StorageService } from './storage.service.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const mockAsync = (value: any): AsyncMock =>
  jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);

describe('CodebaseService.uploadZip', () => {
  let service: CodebaseService;

  let projectService: {
    ensureOwnedProject: AsyncMock;
  };

  let revisionRepository: {
    getNextVersionNumber: AsyncMock;
    create: AsyncMock;
    findOneAndUpdate: AsyncMock;
    deleteMany: AsyncMock;
  };

  let fileRepository: {
    insertMany: AsyncMock;
    deleteMany: AsyncMock;
  };

  let archiveService: {
    extractAndScan: AsyncMock;
    cleanup: AsyncMock;
  };

  let storageService: {
    saveBuffer: AsyncMock;
    deletePrefix: AsyncMock;
  };

  let session: {
    withTransaction: AsyncMock;
    endSession: AsyncMock;
  };

  let connection: {
    startSession: AsyncMock;
  };

  const userId = new Types.ObjectId();
  const projectId = new Types.ObjectId();
  const revisionId = new Types.ObjectId();

  const file = {
    buffer: Buffer.from('fake zip content'),
    originalname: 'project.zip',
    size: 1024,
    mimetype: 'application/zip',
  };

  let extractedArchive: {
    tempDirectory: string;
    totalSizeBytes: number;
    files: {
      absolutePath: string;
      relativePath: string;
      extension: string;
      sizeBytes: number;
      contentHash: string;
      isIndexable: boolean;
    }[];
  };

  beforeEach(async () => {
    const tempDirectory = await mkdtemp(
      join(tmpdir(), 'coding-assistant-test-'),
    );

    const sourceFilePath = join(tempDirectory, 'src', 'main.ts');

    await mkdir(join(tempDirectory, 'src'), { recursive: true });
    await writeFile(sourceFilePath, 'export const example = true;\n');

    extractedArchive = {
      tempDirectory,
      totalSizeBytes: 20,
      files: [
        {
          absolutePath: sourceFilePath,
          relativePath: 'src/main.ts',
          extension: '.ts',
          sizeBytes: 20,
          contentHash: 'test-content-hash',
          isIndexable: true,
        },
      ],
    };
    projectService = {
      ensureOwnedProject: mockAsync({ _id: projectId }),
    };

    revisionRepository = {
      getNextVersionNumber: mockAsync(1),
      create: mockAsync({ _id: revisionId }),
      findOneAndUpdate: mockAsync({ _id: revisionId }),
      deleteMany: mockAsync({ deletedCount: 0 }),
    };

    fileRepository = {
      insertMany: mockAsync([]),
      deleteMany: mockAsync({ deletedCount: 0 }),
    };

    archiveService = {
      extractAndScan: mockAsync(extractedArchive),
      cleanup: mockAsync(undefined),
    };

    storageService = {
      saveBuffer: mockAsync(undefined),
      deletePrefix: mockAsync(undefined),
    };

    session = {
      withTransaction: jest.fn<(...args: any[]) => Promise<any>>(
        async (callback: () => Promise<any>) => callback(),
      ),
      endSession: mockAsync(undefined),
    };

    connection = {
      startSession: mockAsync(session),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodebaseService,
        {
          provide: ProjectService,
          useValue: projectService,
        },
        {
          provide: ProjectRevisionRepository,
          useValue: revisionRepository,
        },
        {
          provide: ProjectFileRepository,
          useValue: fileRepository,
        },
        {
          provide: ArchiveService,
          useValue: archiveService,
        },
        {
          provide: StorageService,
          useValue: storageService,
        },
        {
          provide: getConnectionToken(),
          useValue: connection,
        },
      ],
    }).compile();

    service = module.get<CodebaseService>(CodebaseService);
  });

  afterEach(async () => {
    jest.clearAllMocks();

    if (extractedArchive?.tempDirectory) {
      await rm(extractedArchive.tempDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('uploads a ZIP and persists its revision and extracted file records', async () => {
    await service.uploadZip(userId, file, projectId);

    expect(projectService.ensureOwnedProject).toHaveBeenCalledWith(
      userId,
      projectId,
    );

    expect(archiveService.extractAndScan).toHaveBeenCalledWith(file.buffer);

    expect(revisionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(Types.ObjectId),
        project: projectId,
        versionNumber: 1,
        originalFileName: file.originalname,
        status: ProjectRevisionStatus.PROCESSING,
      }),
    );

    expect(storageService.saveBuffer).toHaveBeenCalled();

    expect(fileRepository.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          revision: expect.any(Types.ObjectId),
          path: 'src/main.ts',
          contentHash: 'test-content-hash',
          isIndexable: true,
        }),
      ]),
      { session },
    );

    expect(session.withTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();

    expect(archiveService.cleanup).toHaveBeenCalledWith(
      extractedArchive.tempDirectory,
    );
  });
});
