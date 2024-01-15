import { DataFactory } from 'n3';
import type { Quad } from '@rdfjs/types';
import type { AuxiliaryStrategy } from '../../http/auxiliary/AuxiliaryStrategy';
import type { RdfDatasetRepresentation } from '../../http/representation/RdfDatasetRepresentation';
import { getLoggerFor } from '../../logging/LogUtil';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { FilterPattern } from '../../util/QuadUtil';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';
import namedNode = DataFactory.namedNode;

/**
 * Guarantees that certain PATCH operations MUST NOT update certain triples in metadata resources.
 * Furthermore, this class also handles the patching for metadata resources.
 * List of triples that must not be updated are given during instantiation with the ImmutableTriple class.
 * When there is a change to an Immutable Triple, then a ConflictError will be thrown.
 */
export class ImmutableMetadataPatcher extends RepresentationPatcher<RdfDatasetRepresentation> {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RepresentationPatcher<RdfDatasetRepresentation>;
  private readonly metadataStrategy: AuxiliaryStrategy;
  private readonly immutablePatterns: FilterPattern[];

  public constructor(
    patcher: RepresentationPatcher<RdfDatasetRepresentation>,
    metadataStrategy: AuxiliaryStrategy,
    immutablePatterns: FilterPattern[],
  ) {
    super();
    this.patcher = patcher;
    this.metadataStrategy = metadataStrategy;
    this.immutablePatterns = immutablePatterns;
  }

  public async canHandle(input: RepresentationPatcherInput<RdfDatasetRepresentation>): Promise<void> {
    if (!this.metadataStrategy.isAuxiliaryIdentifier(input.identifier)) {
      throw new NotImplementedHttpError('This handler only supports metadata resources.');
    }
    await this.patcher.canHandle(input);
  }

  public async handle(input: RepresentationPatcherInput<RdfDatasetRepresentation>): Promise<RdfDatasetRepresentation> {
    if (!input.representation) {
      throw new InternalServerError('Patcher requires a representation as input.');
    }
    const store = input.representation.dataset;

    const immutablePatternMap = new Map<FilterPattern, Quad[]>();
    const baseSubject = namedNode(this.metadataStrategy.getSubjectIdentifier(input.identifier).path);
    for (const immutablePattern of this.immutablePatterns) {
      const { predicate, object } = immutablePattern;
      const subject = immutablePattern.subject ?? baseSubject;
      const matches = store.getQuads(subject, predicate, object, null);
      immutablePatternMap.set({ subject, predicate, object }, matches);
    }

    const patchedRepresentation = await this.patcher.handle(input);

    for (const [ filterPattern, originalQuads ] of immutablePatternMap.entries()) {
      const { subject, predicate, object } = filterPattern;
      const quads = patchedRepresentation.dataset.getQuads(subject, predicate, object, null);
      const predicateString = predicate ? `<${predicate.value}>` : '?p';
      const objectString = object ? `<${object.value}>` : '?o';

      if (quads.length !== originalQuads.length) {
        throw new ConflictHttpError(
          `Not allowed to edit metadata of the form "<${subject!.value}> ${predicateString} ${objectString}.".`,
        );
      }
      const changed = quads.some((inputQuad): boolean => !originalQuads
        .some((patchedQuad): boolean => inputQuad.equals(patchedQuad)));
      if (changed) {
        throw new ConflictHttpError(
          `Not allowed to edit metadata of the form "<${subject!.value}> ${predicateString} ${objectString}.".`,
        );
      }
    }

    return input.representation;
  }
}
