import { Store } from 'n3';
import type { Quad } from 'rdf-js';
import type { AuxiliaryStrategy } from '../../http/auxiliary/AuxiliaryStrategy';
import { getLoggerFor } from '../../logging/LogUtil';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { serializeQuads, uniqueQuads } from '../../util/QuadUtil';
import { readableToString } from '../../util/StreamUtil';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import { RdfStorePatcher } from './RdfStorePatcher';

/**
 * Guarantees that certain PATCH operations MUST NOT update certain triples in metadata resources.
 * List of triples that must not be updated are given during instantiation.
 *
 * This list is a list of tuples where the first element is the predicate and the second element the object.
 * Thus, when a triple has been added/removed in the metadata resource
 * where its predicate is equal to the first element and its object is equal to the second element,
 * then this Patcher throws a ConflictHttpError as this is not allowed.
 * Note that the object can be an empty string,
 * which will be interpreted that the object of the modified triple can be anything.
 */
export class ImmutableMetadataPatcher extends RdfStorePatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RdfStorePatcher;
  private readonly metadataStrategy: AuxiliaryStrategy;
  private readonly immutableTriples: [string, string][];

  public constructor(patcher: RdfStorePatcher, metadataStrategy: AuxiliaryStrategy,
    immutableTriples: [string, string][]) {
    super();
    this.patcher = patcher;
    this.metadataStrategy = metadataStrategy;
    this.immutableTriples = immutableTriples;
  }

  public async canHandle({ identifier }: RdfStorePatcherInput): Promise<void> {
    if (!this.metadataStrategy.isAuxiliaryIdentifier(identifier)) {
      throw new NotImplementedHttpError('Only metadata resources can be checked on immutable tripples.');
    }
  }

  public async handle({ store, identifier, patch }: RdfStorePatcherInput): Promise<Store> {
    const inputStore = store;
    const patchedStore = await this.patcher.handleSafe({
      identifier,
      patch,
      store: new Store(store.getQuads(null, null, null, null)),
    });

    const inputImmutable: Quad[] = [];
    const patchedImmutable: Quad[] = [];

    // For loop over triples that can not be changed in solid metadata
    for (const immutable of this.immutableTriples) {
      const predicate = immutable[0];
      const object = immutable[1] !== '' ? immutable[1] : null;
      inputImmutable.push(...inputStore.getQuads(null, predicate, object, null));
      patchedImmutable.push(...patchedStore.getQuads(null, predicate, object, null));
    }

    this.logger.debug(`input stream immutable: ${await readableToString(serializeQuads(inputImmutable))}`);
    this.logger.debug(`output stream immutable: ${await readableToString(serializeQuads(patchedImmutable))}`);

    // Filter out differences using custom filter
    const unique = uniqueQuads([ ...inputImmutable, ...patchedImmutable ]);
    const lengthTogether = unique.length;

    this.logger.debug(`Nothing has changed: ${lengthTogether === inputImmutable.length &&
        lengthTogether === patchedImmutable.length}`);
    if (!(lengthTogether === inputImmutable.length && lengthTogether === patchedImmutable.length)) {
      throw new ConflictHttpError('Not allowed to change this type of metadata.');
    }

    return patchedStore;
  }
}
