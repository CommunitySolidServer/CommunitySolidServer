import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../../http/representation/RepresentationMetadata';
import { MetadataWriter } from '../../../http/output/metadata/MetadataWriter';

/**
 * A {@link MetadataWriter} that adds link to the receiveFrom endpoint
 * of the corresponding Streaming HTTP notifications channel
 */
export class StreamingHTTPMetadataWriter extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  public constructor(
    private readonly baseUrl: string,
    private readonly pathPrefix: string
  ) {
    super();
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const resourcePath = input.metadata.identifier.value.replace(this.baseUrl, '')
    const receiveFrom = `${this.baseUrl}${this.pathPrefix}${resourcePath}`
    const link = `<${receiveFrom}>; rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHTTP2023"`
    this.logger.debug('Adding updatesViaStreamingHTTP2023  to the Link header');
    addHeader(input.response, 'Link', link);
  }
}
