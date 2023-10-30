import { NotFoundHttpError, StaticTemplateEngine } from '../../../../src';
import type { AsyncHandler, TemplateEngineInput } from '../../../../src';
import Dict = NodeJS.Dict;

describe('A StaticTemplateEngine', (): void => {
  let templateEngine: jest.Mocked<AsyncHandler<TemplateEngineInput<Dict<any>>, string>>;

  it(
    'forwards calls to the handle method of the provided templateEngine, adding the template as an argument.',
    async(): Promise<void> => {
      templateEngine = {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(''),
      } as any;
      const input = { contents: {}};
      const engine = new StaticTemplateEngine(templateEngine, 'template');
      await expect(engine.handleSafe(input)).resolves.toBe('');
      expect(templateEngine.canHandle).toHaveBeenCalledTimes(1);
      expect(templateEngine.canHandle).toHaveBeenLastCalledWith({ contents: {}, template: 'template' });
      expect(templateEngine.handle).toHaveBeenCalledTimes(1);
      expect(templateEngine.handle).toHaveBeenLastCalledWith({ contents: {}, template: 'template' });
    },
  );

  it('propagates errors that occur in the handle method of the provided handler.', async(): Promise<void> => {
    templateEngine = {
      canHandle: jest.fn(),
      handle: jest.fn().mockRejectedValue(new NotFoundHttpError()),
    } as any;
    const input = { contents: {}};
    const engine = new StaticTemplateEngine(templateEngine, 'template');
    await expect(engine.handleSafe(input)).rejects.toThrow(NotFoundHttpError);
    expect(templateEngine.canHandle).toHaveBeenCalledTimes(1);
    expect(templateEngine.canHandle).toHaveBeenLastCalledWith({ contents: input.contents, template: 'template' });
    expect(templateEngine.handle).toHaveBeenCalledTimes(1);
    expect(templateEngine.handle).toHaveBeenLastCalledWith({ contents: input.contents, template: 'template' });
  });

  it('results in an error when calling handle with template defined.', async(): Promise<void> => {
    templateEngine = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(''),
    } as any;
    const input = { contents: {}, template: 'template2' };
    const engine = new StaticTemplateEngine(templateEngine, 'template1');
    await expect(engine.handleSafe(input)).rejects
      .toThrow('StaticTemplateEngine does not support template as handle input');
  });
});
