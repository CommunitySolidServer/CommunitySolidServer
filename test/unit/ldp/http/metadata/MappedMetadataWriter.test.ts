import { MappedMetadataWriter } from '../../../../../src/ldp/http/metadata/MappedMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import * as util from '../../../../../src/util/HeaderUtil';
import { CONTENT_TYPE } from '../../../../../src/util/UriConstants';

describe('A MappedMetadataWriter', (): void => {
  const writer = new MappedMetadataWriter({ [CONTENT_TYPE]: 'content-type', dummy: 'dummy' });
  let mock: jest.SpyInstance;
  let addHeaderMock: jest.Mock;

  beforeEach(async(): Promise<void> => {
    addHeaderMock = jest.fn();
    mock = jest.spyOn(util, 'addHeader').mockImplementation(addHeaderMock);
  });

  afterEach(async(): Promise<void> => {
    mock.mockRestore();
  });

  it('adds metadata to the corresponding header.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle', unused: 'text' });
    await expect(writer.handle({ response: 'response' as any, metadata })).resolves.toBeUndefined();
    expect(addHeaderMock).toHaveBeenCalledTimes(1);
    expect(addHeaderMock).toHaveBeenLastCalledWith('response', 'content-type', [ 'text/turtle' ]);
  });
});
