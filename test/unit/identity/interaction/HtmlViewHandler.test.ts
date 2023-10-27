import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { HtmlViewEntry, HtmlViewHandler } from '../../../../src/identity/interaction/HtmlViewHandler';
import type { InteractionRoute } from '../../../../src/identity/interaction/routing/InteractionRoute';
import { TEXT_HTML } from '../../../../src/util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { readableToString } from '../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('An HtmlViewHandler', (): void => {
  const idpIndex = 'http://example.com/idp/';
  let index: InteractionRoute;
  let operation: Operation;
  let templates: HtmlViewEntry[];
  let templateEngine: TemplateEngine;
  let handler: HtmlViewHandler;

  beforeEach(async(): Promise<void> => {
    index = {
      getPath: jest.fn().mockReturnValue(idpIndex),
      matchPath: jest.fn().mockReturnValue({}),
    };

    operation = {
      method: 'GET',
      target: { path: 'http://example.com/idp/login/' },
      preferences: { type: { 'text/html': 1 }},
      body: new BasicRepresentation(),
    };

    templates = [
      new HtmlViewEntry({
        getPath: jest.fn().mockReturnValue('http://example.com/idp/login/'),
        matchPath: jest.fn().mockReturnValue({}),
      }, '/templates/login.html.ejs'),
      new HtmlViewEntry({
        getPath: jest.fn().mockReturnValue('http://example.com/idp/register/'),
        matchPath: jest.fn().mockReturnValue({}),
      }, '/templates/register.html.ejs'),
    ];

    templateEngine = {
      handleSafe: jest.fn().mockResolvedValue('<html>'),
    } as any;

    handler = new HtmlViewHandler(index, templateEngine, templates);
  });

  it('rejects non-GET requests.', async(): Promise<void> => {
    operation.method = 'POST';
    await expect(handler.canHandle({ operation })).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('rejects unsupported paths.', async(): Promise<void> => {
    for (const template of templates) {
      (template.route as jest.Mocked<InteractionRoute>).matchPath.mockReturnValue(undefined);
    }
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotFoundHttpError);
  });

  it('rejects requests that do not prefer HTML to JSON.', async(): Promise<void> => {
    operation.preferences = { type: { '*/*': 1 }};
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);

    operation.preferences = { type: { 'application/json': 1, 'text/html': 1 }};
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);

    operation.preferences = { type: { 'application/json': 1, 'text/html': 0.8 }};
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('can handle matching requests.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
  });

  it('returns the resolved template.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(result.metadata.contentType).toBe(TEXT_HTML);
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.handleSafe).toHaveBeenCalledTimes(1);
    expect(templateEngine.handleSafe)
      .toHaveBeenLastCalledWith({
        contents: { idpIndex, authenticating: false },
        template: { templateFile: '/templates/login.html.ejs' },
      });
  });

  it('sets authenticating to true if there is an active interaction.', async(): Promise<void> => {
    const result = await handler.handle({ operation, oidcInteraction: {} as any });
    expect(result.metadata.contentType).toBe(TEXT_HTML);
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.handleSafe).toHaveBeenCalledTimes(1);
    expect(templateEngine.handleSafe)
      .toHaveBeenLastCalledWith({
        contents: { idpIndex, authenticating: true },
        template: { templateFile: '/templates/login.html.ejs' },
      });
  });
});
