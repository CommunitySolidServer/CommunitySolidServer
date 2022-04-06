import type { Readable } from 'stream';
import { Store } from 'n3';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { readableToQuads } from '../../util/StreamUtil';
import type { RdfStorePatcher } from './RdfStorePatcher';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';

/**
 * Patcher that converts the representation to an N3 Store, does the patch using this store
 * and then converts the store back to a representation which gets returned
 */
export class RdfPatcher extends RepresentationPatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RdfStorePatcher;

  public constructor(patcher: RdfStorePatcher) {
    super();
    this.patcher = patcher;
  }

  public async handle({ identifier, patch, representation }: RepresentationPatcherInput): Promise<Representation> {
    if (representation && representation.metadata.contentType !== INTERNAL_QUADS) {
      this.logger.error('Received non-quad data. This should not happen so there is probably a configuration error.');
      throw new InternalServerError('Quad stream was expected for patching.');
    }

    // Drain representation to N3 Store
    const inputStore = representation ? await readableToQuads(representation.data) : new Store();

    // Execute the patcher
    const outputStore = await this.patcher.handleSafe({
      identifier,
      patch,
      store: inputStore,
    });

    // Return the n3 store to the representation
    const metadata = new RepresentationMetadata(identifier, INTERNAL_QUADS);
    const data = outputStore.match() as unknown as Readable;
    return new BasicRepresentation(data, metadata, false);
  }
}
