import { readableToString } from '../../../../src';
import type { ResponseDescription, ResponseWriter, HttpResponse } from '../../../../src';

import { TemplateHandler } from '../../../../src/server/util/TemplateHandler';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('A TemplateHandler', (): void => {
  const contents = { contents: 'contents' };
  const templateFile = '/templates/main.html.ejs';
  let responseWriter: jest.Mocked<ResponseWriter>;
  let templateEngine: jest.Mocked<TemplateEngine>;
  const response: HttpResponse = {} as any;

  beforeEach((): void => {
    responseWriter = {
      handleSafe: jest.fn(),
    } as any;

    templateEngine = {
      render: jest.fn().mockResolvedValue('rendered'),
    };
  });

  it('renders the template in the response.', async(): Promise<void> => {
    const handler = new TemplateHandler(responseWriter, templateEngine);
    await handler.handle({ response, contents, templateFile });

    expect(templateEngine.render).toHaveBeenCalledTimes(1);
    expect(templateEngine.render).toHaveBeenCalledWith(contents, { templateFile });

    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const input: { response: HttpResponse; result: ResponseDescription } = responseWriter.handleSafe.mock.calls[0][0];

    expect(input.response).toBe(response);
    expect(input.result.statusCode).toBe(200);
    expect(input.result.metadata?.contentType).toBe('text/html');
    await expect(readableToString(input.result.data!)).resolves.toBe('rendered');
  });
});
