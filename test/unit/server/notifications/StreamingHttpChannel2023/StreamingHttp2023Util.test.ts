import {
  generateChannel,
} from '../../../../../src/server/notifications/StreamingHttpChannel2023/StreamingHttp2023Util';
import { NOTIFY } from '../../../../../src/util/Vocabularies';

describe('StreamingHttp2023Util', (): void => {
  describe('#generateChannel', (): void => {
    it('returns description given topic.', (): void => {
      const topic = { path: 'http://example.com/foo' };
      const channel = generateChannel(topic);
      expect(channel).toEqual({
        id: `${topic.path}.channel`,
        type: NOTIFY.StreamingHTTPChannel2023,
        topic: topic.path,
        accept: 'text/turtle',
      });
    });
  });
});
