import { parse } from 'querystring';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { APPLICATION_JSON, APPLICATION_X_WWW_FORM_URLENCODED } from '../../util/ContentTypes';
import { readableToString } from '../../util/StreamUtil';
import { CONTENT_TYPE } from '../../util/Vocabularies';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts application/x-www-form-urlencoded data to application/json.
 * Due to the nature of form data, the result will be a simple key/value JSON object.
 */
export class FormToJsonConverter extends TypedRepresentationConverter {
  public constructor() {
    super(APPLICATION_X_WWW_FORM_URLENCODED, APPLICATION_JSON);
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const body = await readableToString(representation.data);
    const json = JSON.stringify(parse(body));
    const metadata = new RepresentationMetadata(representation.metadata, { [CONTENT_TYPE]: APPLICATION_JSON });
    return new BasicRepresentation(json, metadata);
  }
}
