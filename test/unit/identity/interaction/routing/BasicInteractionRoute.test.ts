import type {
  InteractionHandler,
} from '../../../../../src/identity/interaction/email-password/handler/InteractionHandler';
import { BasicInteractionRoute } from '../../../../../src/identity/interaction/routing/BasicInteractionRoute';
import { IdpInteractionError } from '../../../../../src/identity/interaction/util/IdpInteractionError';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';

describe('A BasicInteractionRoute', (): void => {
  const path = '^/route$';
  const viewTemplates = { 'text/html': '/viewTemplate' };
  let handler: jest.Mocked<InteractionHandler>;
  const prompt = 'login';
  const responseTemplates = { 'text/html': '/responseTemplate' };
  const controls = { login: '/route' };
  const response = { type: 'response' };
  let route: BasicInteractionRoute;

  beforeEach(async(): Promise<void> => {
    handler = {
      handleSafe: jest.fn().mockResolvedValue(response),
    } as any;

    route = new BasicInteractionRoute(path, viewTemplates, handler, prompt, responseTemplates, controls);
  });

  it('returns its controls.', async(): Promise<void> => {
    expect(route.getControls()).toEqual(controls);
  });

  it('supports a path if it matches the stored route.', async(): Promise<void> => {
    expect(route.supportsPath('/route')).toBe(true);
    expect(route.supportsPath('/notRoute')).toBe(false);
  });

  it('supports prompts when targeting the base path.', async(): Promise<void> => {
    expect(route.supportsPath('/', prompt)).toBe(true);
    expect(route.supportsPath('/notRoute', prompt)).toBe(false);
    expect(route.supportsPath('/', 'notPrompt')).toBe(false);
  });

  it('returns a response result on a GET request.', async(): Promise<void> => {
    await expect(route.handleOperation({ method: 'GET' } as any))
      .resolves.toEqual({ type: 'response', templateFiles: viewTemplates });
  });

  it('returns the result of the InteractionHandler on POST requests.', async(): Promise<void> => {
    await expect(route.handleOperation({ method: 'POST' } as any))
      .resolves.toEqual({ ...response, templateFiles: responseTemplates });
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ operation: { method: 'POST' }});
  });

  it('creates a response result in case the InteractionHandler errors.', async(): Promise<void> => {
    const error = new Error('bad data');
    handler.handleSafe.mockRejectedValueOnce(error);
    await expect(route.handleOperation({ method: 'POST' } as any))
      .resolves.toEqual({ type: 'response', details: { errorMessage: 'bad data' }, templateFiles: viewTemplates });
  });

  it('adds prefilled data in case the error is an IdpInteractionError.', async(): Promise<void> => {
    const error = new IdpInteractionError(400, 'bad data', { name: 'Alice' });
    handler.handleSafe.mockRejectedValueOnce(error);
    await expect(route.handleOperation({ method: 'POST' } as any)).resolves.toEqual({
      type: 'response',
      details: { errorMessage: 'bad data', prefilled: { name: 'Alice' }},
      templateFiles: viewTemplates,
    });
  });

  it('errors for non-supported operations.', async(): Promise<void> => {
    const prom = route.handleOperation({ method: 'DELETE', target: { path: '/route' }} as any);
    await expect(prom).rejects.toThrow(BadRequestHttpError);
    await expect(prom).rejects.toThrow('Unsupported request: DELETE /route');
    expect(handler.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('defaults to empty controls.', async(): Promise<void> => {
    route = new BasicInteractionRoute(path, viewTemplates, handler, prompt);
    expect(route.getControls()).toEqual({});
  });

  it('defaults to empty response templates.', async(): Promise<void> => {
    route = new BasicInteractionRoute(path, viewTemplates, handler, prompt);
    await expect(route.handleOperation({ method: 'POST' } as any)).resolves.toEqual({ ...response, templateFiles: {}});
  });
});
