import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { getLoggerFor } from '../logging/LogUtil';
import type { ModerationRecord } from './ModerationRecord';

/**
 * Service for storing moderation violation records.
 */
export class ModerationStore {
  protected readonly logger = getLoggerFor(this);

  private readonly storePath: string;

  public constructor(storePath = './data/moderation-logs') {
    this.storePath = storePath;
  }

  public async recordViolation(record: Omit<ModerationRecord, 'id' | 'timestamp'>): Promise<void> {
    try {
      await fs.mkdir(this.storePath, { recursive: true });

      const fullRecord: ModerationRecord = {
        ...record,
        id: this.generateId(),
        timestamp: new Date(),
      };

      const filename = `${new Date().toISOString().split('T')[0]}.jsonl`;
      const filepath = join(this.storePath, filename);
      const logEntry = `${JSON.stringify(fullRecord)}\n`;

      await fs.appendFile(filepath, logEntry);
    } catch (error: unknown) {
      this.logger.error(`Failed to record moderation violation: ${String(error)}`);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}
