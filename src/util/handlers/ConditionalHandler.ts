import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { NotImplementedHttpError } from '../errors/NotImplementedHttpError';
import { AsyncHandler } from './AsyncHandler';

/**
 * This handler will pass all requests to the wrapped handler,
 * until a specific value has been set in the given storage.
 * After that all input will be rejected.
 * Once the value has been matched this behaviour will be cached,
 * so changing the value again afterwards will not enable this handler again.
 */
export class ConditionalHandler<TIn, TOut> extends AsyncHandler<TIn, TOut> {
  private readonly source: AsyncHandler<TIn, TOut>;
  private readonly storage: KeyValueStorage<string, unknown>;
  private readonly storageKey: string;
  private readonly storageValue: unknown;

  private finished: boolean;

  public constructor(source: AsyncHandler<TIn, TOut>, storage: KeyValueStorage<string, unknown>, storageKey: string,
    storageValue: unknown) {
    super();
    this.source = source;
    this.storage = storage;
    this.storageKey = storageKey;
    this.storageValue = storageValue;

    this.finished = false;
  }

  public async canHandle(input: TIn): Promise<void> {
    await this.checkCondition();
    await this.source.canHandle(input);
  }

  public async handleSafe(input: TIn): Promise<TOut> {
    await this.checkCondition();
    return this.source.handleSafe(input);
  }

  public async handle(input: TIn): Promise<TOut> {
    return this.source.handle(input);
  }

  /**
   * Checks if the condition has already been fulfilled.
   */
  private async checkCondition(): Promise<void> {
    if (!this.finished) {
      this.finished = await this.storage.get(this.storageKey) === this.storageValue;
    }

    if (this.finished) {
      throw new NotImplementedHttpError('The condition has been fulfilled.');
    }
  }
}
