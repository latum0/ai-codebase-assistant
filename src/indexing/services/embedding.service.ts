import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type EmbeddingTask = 'RETRIEVAL_DOCUMENT' | 'CODE_RETRIEVAL_QUERY';

@Injectable()
export class EmbeddingService {
  constructor(private readonly configService: ConfigService) {}

  // returns the vector generated of a chunk
  async embed(
    text: string,
    taskType: EmbeddingTask = 'RETRIEVAL_DOCUMENT',
  ): Promise<number[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Set GEMINI_API_KEY before starting an indexing run. Create a key in Google AI Studio.',
      );
    }

    const model = this.configService.get<string>(
      'GEMINI_EMBEDDING_MODEL',
      'gemini-embedding-001',
    );
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          taskType,
          content: {
            parts: [{ text }],
          },
        }),
      },
    );

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Gemini embedding request failed with HTTP ${response.status}. Check the API key, model, and free-tier quota.`,
      );
    }

    const result: unknown = await response.json();
    if (
      typeof result !== 'object' ||
      result === null ||
      !('embedding' in result) ||
      typeof result.embedding !== 'object' ||
      result.embedding === null ||
      !('values' in result.embedding) ||
      !Array.isArray(result.embedding.values) ||
      !result.embedding.values.every(
        (value: unknown) => typeof value === 'number' && Number.isFinite(value),
      )
    ) {
      throw new InternalServerErrorException(
        'Gemini returned an invalid embedding response.',
      );
    }

    return result.embedding.values as number[];
  }
}
