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
 * Furthermore, this class also handles the patching for metadata resources.
 * List of triples that must not be updated are given during instantiation with the ImmutableTriple class.
 * When there is a change to an Immutable Triple, then a ConflictError will be thrown.
 */
export class ImmutableMetadataPatcher extends RdfStorePatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RdfStorePatcher;
  private readonly metadataStrategy: AuxiliaryStrategy;
  private readonly immutableTriples: ImmutableTriple[];

  public constructor(patcher: RdfStorePatcher, metadataStrategy: AuxiliaryStrategy,
    immutableTriples: ImmutableTriple[]) {
    super();
    this.patcher = patcher;
    this.metadataStrategy = metadataStrategy;
    this.immutableTriples = immutableTriples;
  }

  public async canHandle({ identifier }: RdfStorePatcherInput): Promise<void> {
    if (!this.metadataStrategy.isAuxiliaryIdentifier(identifier)) {
      throw new NotImplementedHttpError('Only metadata resources can be checked on immutable triples.');
    }
  }

  public async handle({ store, identifier, patch }: RdfStorePatcherInput): Promise<Store> {
    const inputStore = new Store(store.getQuads(null, null, null, null));
    const patchedStore = await this.patcher.handleSafe({ identifier, patch, store });
    const inputImmutable: Quad[] = [];
    const patchedImmutable: Quad[] = [];

    // For loop over triples that can not be changed in solid metadata
    for (const { subject, predicate, object } of this.immutableTriples) {
      inputImmutable.push(...inputStore.getQuads(subject, predicate, object, null));
      patchedImmutable.push(...patchedStore.getQuads(subject, predicate, object, null));
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

/**
 * Class to define which triples MUST NOT be changed during patching.
 *
 * The constructor arguments are optional, which allows for partial matches.
 * E.g. when only the predicate is given as argument,
 * there MUST be no change in quads after the patch that have that given predicate.
 */
export class ImmutableTriple {
  public readonly subject: string | null;
  public readonly predicate: string | null;
  public readonly object: string | null;

  public constructor(subject?: string, predicate?: string, object?: string) {
    this.subject = subject ?? null;
    this.predicate = predicate ?? null;
    this.object = object ?? null;
  }
}
