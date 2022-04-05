import type { Quad } from 'rdf-js';
import type { AuxiliaryStrategy } from '../../http/auxiliary/AuxiliaryStrategy';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { serializeQuads, uniqueQuads } from '../../util/QuadUtil';
import { cloneRepresentation } from '../../util/ResourceUtil';
import { readableToQuads, readableToString } from '../../util/StreamUtil';
import { RDF, PIM, LDP } from '../../util/Vocabularies';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';

export class RdfImmutableCheckPatcher extends RepresentationPatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RepresentationPatcher;
  private readonly metadataStrategy: AuxiliaryStrategy;

  public constructor(patcher: RepresentationPatcher, metadataStrategy: AuxiliaryStrategy) {
    super();
    this.patcher = patcher;
    this.metadataStrategy = metadataStrategy;
  }

  public async handle(input: RepresentationPatcherInput): Promise<Representation> {
    let { representation } = input;
    const { identifier } = input;

    representation = representation ?? new BasicRepresentation([], INTERNAL_QUADS);
    const immutableTriples: [string, string | undefined][] = [];
    immutableTriples.push([ RDF.type, PIM.Storage ]);
    immutableTriples.push([ LDP.contains, undefined ]);

    let patched: Representation;
    if (this.metadataStrategy.isAuxiliaryIdentifier(identifier)) {
      const clonedRepresentation = await cloneRepresentation(representation);
      patched = await this.patcher.handleSafe(input);
      const clonedPatchedRepresentation = await cloneRepresentation(patched);

      const inputStore = await readableToQuads(clonedRepresentation.data);

      const patchedStore = await readableToQuads(clonedPatchedRepresentation.data);

      const inputImmutable: Quad[] = [];
      const patchedImmutable: Quad[] = [];

      // For loop over triples that can not be changed in solid metadata
      for (const immutable of immutableTriples) {
        const predicate = immutable[0];
        const object = immutable[1] ? immutable[1] : null;
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
    } else {
      patched = await this.patcher.handleSafe(input);
    }

    return patched;
  }
}
