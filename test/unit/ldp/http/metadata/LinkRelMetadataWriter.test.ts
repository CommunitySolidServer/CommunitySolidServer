import { LinkRelMetadataWriter } from '../../../../../src/ldp/http/metadata/LinkRelMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import * as util from '../../../../../src/util/HeaderUtil';
import { LDP, RDF } from '../../../../../src/util/UriConstants';
import { toNamedNode } from '../../../../../src/util/UriUtil';

describe('A LinkRelMetadataWriter', (): void => {
  const writer = new LinkRelMetadataWriter({ [RDF.type]: 'type', dummy: 'dummy' });
  let mock: jest.SpyInstance;
  let addHeaderMock: jest.Mock;

  beforeEach(async(): Promise<void> => {
    addHeaderMock = jest.fn();
    mock = jest.spyOn(util, 'addHeader').mockImplementation(addHeaderMock);
  });

  afterEach(async(): Promise<void> => {
    mock.mockRestore();
  });

  it('adds the correct link headers.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [RDF.type]: toNamedNode(LDP.Resource), unused: 'text' });
    await expect(writer.handle({ response: 'response' as any, metadata })).resolves.toBeUndefined();
    expect(addHeaderMock).toHaveBeenCalledTimes(1);
    expect(addHeaderMock).toHaveBeenLastCalledWith('response', 'link', [ `<${LDP.Resource}>; rel="type"` ]);
  });
});
