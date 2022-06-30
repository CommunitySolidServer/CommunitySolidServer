import { ChainedTemplateEngine } from '../../../../src/util/templates/ChainedTemplateEngine';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('A ChainedTemplateEngine', (): void => {
  const contents = { title: 'myTitle' };
  const template = { templateFile: '/template.tmpl' };
  const input = { contents, template };
  let engines: jest.Mocked<TemplateEngine>[];
  let engine: ChainedTemplateEngine;

  beforeEach(async(): Promise<void> => {
    engines = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue('body1'),
      } as any,
      {
        canHandle: jest.fn(),
        handleSafe: jest.fn().mockResolvedValue('body2'),
      } as any,
    ];

    engine = new ChainedTemplateEngine(engines);
  });

  it('errors if no engines are provided.', async(): Promise<void> => {
    expect((): any => new ChainedTemplateEngine([])).toThrow('At least 1 engine needs to be provided.');
  });

  it('chains the engines.', async(): Promise<void> => {
    await expect(engine.handleSafe(input)).resolves.toBe('body2');
    expect(engines[0].handle).toHaveBeenCalledTimes(1);
    expect(engines[0].handle).toHaveBeenLastCalledWith(input);
    expect(engines[1].handleSafe).toHaveBeenCalledTimes(1);
    expect(engines[1].handleSafe).toHaveBeenLastCalledWith({ contents: { ...contents, body: 'body1' }});
  });

  it('can use a different field to pass along the body.', async(): Promise<void> => {
    engine = new ChainedTemplateEngine(engines, 'different');
    await expect(engine.handleSafe(input)).resolves.toBe('body2');
    expect(engines[0].handle).toHaveBeenCalledTimes(1);
    expect(engines[0].handle).toHaveBeenLastCalledWith(input);
    expect(engines[1].handleSafe).toHaveBeenCalledTimes(1);
    expect(engines[1].handleSafe).toHaveBeenLastCalledWith({ contents: { ...contents, different: 'body1' }});
  });
});
