import { ChainedTemplateEngine } from '../../../../src/util/templates/ChainedTemplateEngine';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('A ChainedTemplateEngine', (): void => {
  const contents = { title: 'myTitle' };
  const template = { templateFile: '/template.tmpl' };
  let engines: jest.Mocked<TemplateEngine>[];
  let engine: ChainedTemplateEngine;

  beforeEach(async(): Promise<void> => {
    engines = [
      { render: jest.fn().mockResolvedValue('body1') },
      { render: jest.fn().mockResolvedValue('body2') },
    ];

    engine = new ChainedTemplateEngine(engines);
  });

  it('errors if no engines are provided.', async(): Promise<void> => {
    expect((): any => new ChainedTemplateEngine([])).toThrow('At least 1 engine needs to be provided.');
  });

  it('chains the engines.', async(): Promise<void> => {
    await expect(engine.render(contents, template)).resolves.toBe('body2');
    expect(engines[0].render).toHaveBeenCalledTimes(1);
    expect(engines[0].render).toHaveBeenLastCalledWith(contents, template);
    expect(engines[1].render).toHaveBeenCalledTimes(1);
    expect(engines[1].render).toHaveBeenLastCalledWith({ ...contents, body: 'body1' });
  });

  it('can use a different field to pass along the body.', async(): Promise<void> => {
    engine = new ChainedTemplateEngine(engines, 'different');
    await expect(engine.render(contents, template)).resolves.toBe('body2');
    expect(engines[0].render).toHaveBeenCalledTimes(1);
    expect(engines[0].render).toHaveBeenLastCalledWith(contents, template);
    expect(engines[1].render).toHaveBeenCalledTimes(1);
    expect(engines[1].render).toHaveBeenLastCalledWith({ ...contents, different: 'body1' });
  });
});
