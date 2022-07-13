import type { Store } from 'n3';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import type { AuxiliaryStrategy } from '../../http/auxiliary/AuxiliaryStrategy';
import { getLoggerFor } from '../../logging/LogUtil';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { HashMap } from '../../util/map/HashMap';
import type { FilterPattern } from '../../util/QuadUtil';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import { RdfStorePatcher } from './RdfStorePatcher';
import namedNode = DataFactory.namedNode;

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
    const immutablePatternMap = new HashMap<FilterPattern, Quad[]>(
      ({ subject, predicate, object }: FilterPattern): string => {
        subject = subject ?? namedNode('subject');
        predicate = predicate ?? namedNode('predicate');
        object = object ?? namedNode('object');
        return subject.value + predicate.value + object.value;
      },
    );
    for (const { subject, predicate, object } of this.immutablePatterns) {
      const matches = input.store.getQuads(subject, predicate, object, null);
      immutablePatternMap.set({ subject, predicate, object }, matches);
    }

    await this.patcher.handle(input);

    immutablePatternMap.forEach((originalQuads: Quad[], { subject, predicate, object }: FilterPattern): void => {
      const quads = input.store.getQuads(subject, predicate, object, null);
      subject = subject ?? namedNode('');
      predicate = predicate ?? namedNode('');
      object = object ?? namedNode('');
      if (quads.length !== originalQuads.length) {
        throw new ConflictHttpError(
          `Not allowed to metadata of the form "<${subject.value}> <${predicate.value}> <${object.value}>.".`,
        );
      }

      const changed = quads.some((inputQuad): boolean => !originalQuads
        .some((patchedQuad): boolean => inputQuad.equals(patchedQuad)));
      if (changed) {
        throw new ConflictHttpError(
          `Not allowed to metadata of the form "<${subject.value}> <${predicate.value}> <${object.value}>.".`,
        );
      }
    });

    return input.store;
  }
}
