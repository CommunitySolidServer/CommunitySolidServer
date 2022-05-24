import { Store } from 'n3';
import type { Quad } from 'rdf-js';
import type { AuxiliaryStrategy } from '../../http/auxiliary/AuxiliaryStrategy';
import { getLoggerFor } from '../../logging/LogUtil';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { FilterPattern } from '../../util/QuadUtil';
import { serializeQuads } from '../../util/QuadUtil';
import { readableToString } from '../../util/StreamUtil';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import { RdfStorePatcher } from './RdfStorePatcher';

/**
 * Guarantees that certain PATCH operations MUST NOT update certain triples in metadata resources.
 * Furthermore, this class also handles the patching for metadata resources.
 * List of triples that must not be updated are given during instantiation with the ImmutableTriple class.
 * When there is a change to an Immutable Triple, then a ConflictError will be thrown.
 */
export class ImmutableMetadataPatcher extends RdfStorePatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RdfStorePatcher;
  private readonly metadataStrategy: AuxiliaryStrategy;
  private readonly immutablePatterns: FilterPattern[];

  public constructor(patcher: RdfStorePatcher, metadataStrategy: AuxiliaryStrategy,
    immutablePatterns: FilterPattern[]) {
    super();
    this.patcher = patcher;
    this.metadataStrategy = metadataStrategy;
    this.immutablePatterns = immutablePatterns;
  }

  public async canHandle(input: RdfStorePatcherInput): Promise<void> {
    if (!this.metadataStrategy.isAuxiliaryIdentifier(input.identifier)) {
      throw new NotImplementedHttpError('This handler only supports metadata resources.');
    }
    await this.patcher.canHandle(input);
  }

  public async handle(input: RdfStorePatcherInput): Promise<Store> {
    const inputStore = new Store(input.store.getQuads(null, null, null, null));
    const patchedStore = await this.patcher.handle(input);
    const inputImmutable: Quad[] = [];
    const patchedImmutable: Quad[] = [];

    for (const { subject, predicate, object } of this.immutablePatterns) {
      inputImmutable.push(...inputStore.getQuads(subject, predicate, object, null));
      patchedImmutable.push(...patchedStore.getQuads(subject, predicate, object, null));
    }

    this.logger.debug(`input stream immutable: ${await readableToString(serializeQuads(inputImmutable))}`);
    this.logger.debug(`output stream immutable: ${await readableToString(serializeQuads(patchedImmutable))}`);

    // Filter out differences using custom filter
    if (inputImmutable.length !== patchedImmutable.length) {
      throw new ConflictHttpError('Not allowed to change this type of metadata.');
    }
    const changed = inputImmutable.some((inputQuad): boolean => !patchedImmutable
      .some((patchedQuad): boolean => inputQuad.equals(patchedQuad)));
    if (changed) {
      throw new ConflictHttpError('Not allowed to change this type of metadata.');
    }
    return patchedStore;
  }
}
