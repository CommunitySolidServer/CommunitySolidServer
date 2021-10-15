import arrayifyStream from 'arrayify-stream';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { cloneRepresentation } from '../../util/ResourceUtil';
import type { Representation } from '../representation/Representation';
import type { ValidatorArgs } from './Validator';
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

  public async handle(input: ValidatorArgs): Promise<Representation> {
    // If the data already is quads format we know it's RDF
    if (input.representation.metadata.contentType === INTERNAL_QUADS) {
      return input.representation;
    }
    const preferences = { type: { [INTERNAL_QUADS]: 1 }};
    let result;
    try {
      // Creating new representation since converter might edit metadata
      const tempRepresentation = await cloneRepresentation(input.representation);
      result = await this.converter.handleSafe({
        identifier: input.identifier,
        representation: tempRepresentation,
        preferences,
      });
    } catch (error: unknown) {
      input.representation.data.destroy();
      throw error;
    }
    // Drain stream to make sure data was parsed correctly
    await arrayifyStream(result.data);

    return input.representation;
  }
}
