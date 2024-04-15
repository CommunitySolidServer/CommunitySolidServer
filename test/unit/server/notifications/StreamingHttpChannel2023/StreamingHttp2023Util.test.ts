import { defaultChannel } from '../../../../../src/server/notifications/StreamingHttpChannel2023/StreamingHttp2023Util';
import { NOTIFY } from '../../../../../src/util/Vocabularies';

describe('defaultChannel', (): void => {
  it('returns description given topic.', (): void => {
    const topic = { path: 'http://example.com/foo' };
    const channel = defaultChannel(topic);
    expect(channel).toEqual({
      id: `${topic.path}.channel`,
      type: NOTIFY.StreamingHTTPChannel2023,
      topic: topic.path,
      accept: 'text/turtle',
    });
  });
});
