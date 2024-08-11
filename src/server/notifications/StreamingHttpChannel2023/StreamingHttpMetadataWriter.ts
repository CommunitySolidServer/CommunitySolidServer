import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../../http/representation/RepresentationMetadata';
import { MetadataWriter } from '../../../http/output/metadata/MetadataWriter';

/**
 * A {@link MetadataWriter} that adds a link to the receiveFrom endpoint
 * of the corresponding Streaming HTTP notifications channel
 */
export class StreamingHttpMetadataWriter extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  public constructor(
    private readonly baseUrl: string,
    private readonly pathPrefix: string,
  ) {
    super();
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const encodedUrl = encodeURIComponent(input.metadata.identifier.value);
    const receiveFrom = `${this.baseUrl}${this.pathPrefix}${encodedUrl}`;
    const link = `<${receiveFrom}>; rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023"`;
    this.logger.debug('Adding updatesViaStreamingHttp2023  to the Link header');
    addHeader(input.response, 'Link', link);
  }
}
