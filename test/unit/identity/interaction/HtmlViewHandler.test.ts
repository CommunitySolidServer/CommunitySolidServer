import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { HtmlViewHandler } from '../../../../src/identity/interaction/HtmlViewHandler';
import type { InteractionRoute } from '../../../../src/identity/interaction/routing/InteractionRoute';
import { TEXT_HTML } from '../../../../src/util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { readableToString } from '../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('An HtmlViewHandler', (): void => {
  let operation: Operation;
  let templates: Record<string, jest.Mocked<InteractionRoute>>;
  let templateEngine: TemplateEngine;
  let handler: HtmlViewHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://example.com/idp/login/' },
      preferences: { type: { 'text/html': 1 }},
      body: new BasicRepresentation(),
    };

    templates = {
      '/templates/login.html.ejs': { getPath: jest.fn().mockReturnValue('http://example.com/idp/login/') } as any,
      '/templates/register.html.ejs': { getPath: jest.fn().mockReturnValue('http://example.com/idp/register/') } as any,
    };

    templateEngine = {
      render: jest.fn().mockReturnValue(Promise.resolve('<html>')),
    };

    handler = new HtmlViewHandler(templateEngine, templates);
  });

  it('rejects non-GET requests.', async(): Promise<void> => {
    operation.method = 'POST';
    await expect(handler.canHandle({ operation })).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('rejects unsupported paths.', async(): Promise<void> => {
    operation.target.path = 'http://example.com/idp/otherPath/';
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
  });
});
