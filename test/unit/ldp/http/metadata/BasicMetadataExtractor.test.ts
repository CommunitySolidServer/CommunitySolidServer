import { BasicMetadataExtractor } from '../../../../../src/ldp/http/metadata/BasicMetadataExtractor';
import type { MetadataParser } from '../../../../../src/ldp/http/metadata/MetadataParser';
import type { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { RDF } from '../../../../../src/util/Vocabularies';

class BasicParser implements MetadataParser {
  private readonly header: string;

  public constructor(header: string) {
    this.header = header;
  }

  public async parse(input: HttpRequest, metadata: RepresentationMetadata): Promise<void> {
    const header = input.headers[this.header];
    if (header) {
      if (typeof header === 'string') {
        metadata.add(RDF.type, header);
      }
    }
  }
}

describe('A BasicMetadataExtractor', (): void => {
  const handler = new BasicMetadataExtractor([
    new BasicParser('aa'),
    new BasicParser('bb'),
  ]);

  it('can handle all requests.', async(): Promise<void> => {
    await expect(handler.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('will add metadata from the parsers.', async(): Promise<void> => {
    const metadata = await handler.handle({ headers: { aa: 'valA', bb: 'valB' } as any } as HttpRequest);
    expect(metadata.getAll(RDF.type).map((term): any => term.value)).toEqual([ 'valA', 'valB' ]);
  });
});
