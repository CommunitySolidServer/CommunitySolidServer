import arrayifyStream from 'arrayify-stream';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { guardedStreamFrom } from '../../util/StreamUtil';
import { BasicRepresentation } from '../representation/BasicRepresentation';
import type { Representation } from '../representation/Representation';
import { Validator } from './Validator';

/**
 * Validates a Representation by verifying if the data stream contains valid RDF data.
 * It does this by letting the stored RepresentationConverter convert the data.
 */
export class RdfValidator extends Validator {
  protected readonly converter: RepresentationConverter;

  public constructor(converter: RepresentationConverter) {
    super();
    this.converter = converter;
  }

  public async handle(representation: Representation): Promise<void> {
    // If the data already is quads format we know it's RDF
    if (representation.metadata.contentType === INTERNAL_QUADS) {
      return;
    }

    // eslint-disable-next-line unicorn/expiring-todo-comments
    // TODO: Everything below should be part of a utility cloneRepresentation function.

    const identifier = { path: representation.metadata.identifier.value };

    // Read data in memory first so it does not get lost
    const data = await arrayifyStream(representation.data);
    const preferences = { type: { [INTERNAL_QUADS]: 1 }};

    // Creating new representation since converter might edit metadata
    const tempRepresentation = new BasicRepresentation(data, identifier, representation.metadata.contentType);
    const result = await this.converter.handleSafe({ identifier, representation: tempRepresentation, preferences });
    // Drain stream to make sure data was parsed correctly
    await arrayifyStream(result.data);

    // Stream has been drained so need to create new stream
    representation.data = guardedStreamFrom(data);
  }
}
