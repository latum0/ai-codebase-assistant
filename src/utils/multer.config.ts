import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

export const multerConfig = {
  limits: {
    fileSize: 50 * 1024 * 1024,
    file: 1,
  },
  filterFile: (_req: any, file: any, callback: any) => {
    if (extname(file.originalName).toLowerCase() !== '.zip') {
      return callback(
        new BadRequestException('Only ZIP files are accepted'),
        false,
      );
    }
    callback(null, true);
  },
};
