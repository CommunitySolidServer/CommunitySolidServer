import { createResponse } from 'node-mocks-http';
import type { HttpResponse } from '../../../../src';
import { TemplateHandler } from '../../../../src/server/util/TemplateHandler';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('A TemplateHandler', (): void => {
  const contents = { contents: 'contents' };
  const templateFile = '/templates/main.html.ejs';
  let templateEngine: jest.Mocked<TemplateEngine>;
  let response: HttpResponse;

  beforeEach((): void => {
    templateEngine = {
      render: jest.fn().mockResolvedValue('rendered'),
    };
    response = createResponse() as HttpResponse;
  });

  it('renders the template in the response.', async(): Promise<void> => {
    const handler = new TemplateHandler(templateEngine);
    await handler.handle({ response, contents, templateFile });

    expect(templateEngine.render).toHaveBeenCalledTimes(1);
    expect(templateEngine.render).toHaveBeenCalledWith(contents, { templateFile });

    expect(response.getHeaders()).toHaveProperty('content-type', 'text/html');
    expect((response as any)._isEndCalled()).toBe(true);
    expect((response as any)._getData()).toBe('rendered');
    expect((response as any)._getStatusCode()).toBe(200);
  });
});
