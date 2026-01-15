import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
import type { HttpResponse } from '../server/HttpResponse';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import { ModerationConfig } from './ModerationConfig';

export interface ModerationHttpInput {
  request: HttpRequest;
  response: HttpResponse;
}

/**
 * HTTP handler for moderation system.
 * Note: Admin dashboard has been removed. Use CLI tools to view logs.
 */
export class ModerationHttpHandler extends AsyncHandler<ModerationHttpInput, void> {
  protected readonly logger = getLoggerFor(this);

  public constructor(moderationConfig: ModerationConfig) {
    super();
    this.logger.info('ModerationHttpHandler initialized (admin dashboard removed)');
  }

  public async canHandle({ request }: ModerationHttpInput): Promise<void> {
    // No longer handles any requests - admin dashboard removed
    throw new Error('Admin dashboard has been removed');
  }

  public async handle({ request, response }: ModerationHttpInput): Promise<void> {
    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/plain');
    response.end('Admin dashboard has been removed. Use CLI tools to view moderation logs.');
  }
}