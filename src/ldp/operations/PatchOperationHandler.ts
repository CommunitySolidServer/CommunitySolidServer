import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { Patch } from '../http/Patch';
import { ResetResponseDescription } from '../http/response/ResetResponseDescription';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';

/**
 * Handles PATCH {@link Operation}s.
 * Calls the modifyResource function from a {@link ResourceStore}.
 */
export class PatchOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'PATCH') {
      throw new NotImplementedHttpError('This handler only supports PATCH operations.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    // Solid, §2.1: "A Solid server MUST reject PUT, POST and PATCH requests
    // without the Content-Type header with a status code of 400."
    // https://solid.github.io/specification/protocol#http-server
    if (!input.body?.metadata.contentType) {
      this.logger.warn('No Content-Type header specified on PATCH request');
      throw new BadRequestHttpError('No Content-Type header specified on PATCH request');
    }
    await this.store.modifyResource(input.target, input.body as Patch, input.conditions);
    return new ResetResponseDescription();
  }
}
