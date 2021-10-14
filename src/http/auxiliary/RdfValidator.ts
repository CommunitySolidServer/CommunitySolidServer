import arrayifyStream from 'arrayify-stream';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { cloneRepresentation } from '../../util/ResourceUtil';
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
    const identifier = { path: representation.metadata.identifier.value };
    const preferences = { type: { [INTERNAL_QUADS]: 1 }};
    let result;
    try {
      // Creating new representation since converter might edit metadata
      const tempRepresentation = await cloneRepresentation(representation);
      result = await this.converter.handleSafe({
        identifier,
        representation: tempRepresentation,
        preferences,
      });
    } catch (error: unknown) {
      representation.data.destroy();
      throw error;
    }
    // Drain stream to make sure data was parsed correctly
    await arrayifyStream(result.data);
  }
}
