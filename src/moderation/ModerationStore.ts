import { promises as fs } from 'fs';
import { join } from 'path';
import { ModerationRecord } from './ModerationRecord';

/**
 * Service for storing moderation violation records.
 */
export class ModerationStore {
  private readonly storePath: string;

  public constructor(storePath: string = './data/moderation-logs') {
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
      const logEntry = JSON.stringify(fullRecord) + '\n';
      
      await fs.appendFile(filepath, logEntry);
    } catch (error) {
      console.error('Failed to record moderation violation:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}