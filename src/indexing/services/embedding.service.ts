import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  constructor(private readonly configService: ConfigService) {}

  async embed(text: string): Promise<number[]> {
    const baseUrl = this.configService
      .getOrThrow<string>('EMBEDDING_API_URL')
      .replace(/\/+$/, '');
    const apiKey = this.configService.getOrThrow<string>('EMBEDDING_API_KEY');
    const model = this.configService.getOrThrow<string>('EMBEDDING_MODEL');

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Embedding provider returned HTTP ${response.status}`,
      );
    }

    const result: unknown = await response.json();

    if (
      typeof result !== 'object' ||
      result === null ||
      !('data' in result) ||
      !Array.isArray(result.data) ||
      typeof result.data[0] !== 'object' ||
      result.data[0] === null ||
      !('embedding' in result.data[0]) ||
      !Array.isArray(result.data[0].embedding) ||
      !result.data[0].embedding.every(
        (value: unknown) => typeof value === 'number' && Number.isFinite(value),
      )
    ) {
      throw new InternalServerErrorException(
        'Embedding provider returned an invalid response',
      );
    }

    return result.data[0].embedding as number[];
  }
}
