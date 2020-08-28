import { ResourceStore } from '../../storage/ResourceStore';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { Patch } from '../http/Patch';
import { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import { ResponseDescription } from './ResponseDescription';

export class SimplePatchOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'PATCH') {
      throw new UnsupportedHttpError('This handler only supports PATCH operations.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    await this.store.modifyResource(input.target, input.body as Patch);
    return { identifier: input.target };
  }
}
