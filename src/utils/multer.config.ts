import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

export const multerConfig = {
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req: any, file: any, callback: any) => {
    if (extname(file.originalname).toLowerCase() !== '.zip') {
      return callback(
        new BadRequestException('Only ZIP files are accepted'),
        false,
      );
    }

    callback(null, true);
  },
};
