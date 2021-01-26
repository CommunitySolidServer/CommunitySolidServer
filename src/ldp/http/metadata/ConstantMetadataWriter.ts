import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import { MetadataWriter } from './MetadataWriter';

/**
 * A {@link MetadataWriter} that takes a constant map of header names and values.
 */
export class ConstantMetadataWriter extends MetadataWriter {
  private readonly headers: [string, string][];

  public constructor(headers: Record<string, string>) {
    super();
    this.headers = Object.entries(headers);
  }

  public async handle({ response }: { response: HttpResponse }): Promise<void> {
    for (const [ key, value ] of this.headers) {
      addHeader(response, key, value);
    }
  }
}
