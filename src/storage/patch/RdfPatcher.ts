import type { Readable } from 'node:stream';
import { Store } from 'n3';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { RdfDatasetRepresentation } from '../../http/representation/RdfDatasetRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { readableToQuads } from '../../util/StreamUtil';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';

/**
 * Patcher that converts the representation data to a representation with an N3 store, does the patch using this store
 * and then converts the representation with store back to a representation with data which gets returned
 */
export class RdfPatcher extends RepresentationPatcher<Representation> {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RepresentationPatcher<RdfDatasetRepresentation>;

  public constructor(patcher: RepresentationPatcher<RdfDatasetRepresentation>) {
    super();
    this.patcher = patcher;
  }

  public async canHandle({ identifier, patch, representation }: RepresentationPatcherInput<Representation>):
  Promise<void> {
    let newRepresentation: RdfDatasetRepresentation | undefined;
    if (representation) {
      newRepresentation = { ...representation as RdfDatasetRepresentation, dataset: new Store() };
    }
    await this.patcher.canHandle({ identifier, patch, representation: newRepresentation });
  }

  public async handle({ identifier, patch, representation }: RepresentationPatcherInput<Representation>):
  Promise<Representation> {
    let metadata = new RepresentationMetadata(identifier, INTERNAL_QUADS);
    if (representation && representation.metadata.contentType !== INTERNAL_QUADS) {
      this.logger.error('Received non-quad data. This should not happen so there is probably a configuration error.');
      throw new InternalServerError('Quad stream was expected for patching.');
    }

    // Drain representation data to N3 Store
    const inputRepresentation: RdfDatasetRepresentation = representation ?
      representation as RdfDatasetRepresentation :
      new BasicRepresentation() as RdfDatasetRepresentation;

    if (representation) {
      inputRepresentation.dataset = await readableToQuads(representation.data);
      ({ metadata } = representation);
    } else {
      inputRepresentation.dataset = new Store();
    }

    // Execute the patcher
    const patchedRepresentation = await this.patcher.handle({
      identifier,
      patch,
      representation: inputRepresentation,
    });

    // Return the n3 store to the representation
    // This casting is necessary due to N3.js typings not being precise enough
    const data = patchedRepresentation.dataset.match() as unknown as Readable;
    return new BasicRepresentation(data, metadata, false);
  }
}
