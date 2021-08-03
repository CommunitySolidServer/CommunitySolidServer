import type { Template, TemplateEngine } from './TemplateEngine';
import Dict = NodeJS.Dict;

/**
 * Calls the given array of {@link TemplateEngine}s in the order they appear,
 * feeding the output of one into the input of the next.
 *
 * The first engine will be called with the provided contents and template parameters.
 * All subsequent engines will be called with no template parameter.
 * Contents will still be passed along and another entry will be added for the body of the previous output.
 */
export class ChainedTemplateEngine<T extends Dict<any> = Dict<any>> implements TemplateEngine<T> {
  private readonly firstEngine: TemplateEngine<T>;
  private readonly chainedEngines: TemplateEngine[];
  private readonly renderedName: string;

  /**
   * @param engines - Engines will be executed in the same order as the array.
   * @param renderedName - The name of the key used to pass the body of one engine to the next.
   */
  public constructor(engines: TemplateEngine[], renderedName = 'body') {
    if (engines.length === 0) {
      throw new Error('At least 1 engine needs to be provided.');
    }
    this.firstEngine = engines[0];
    this.chainedEngines = engines.slice(1);
    this.renderedName = renderedName;
  }

  public async render(contents: T): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template: Template): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template?: Template): Promise<string> {
    let body = await this.firstEngine.render(contents, template!);
    for (const engine of this.chainedEngines) {
      body = await engine.render({ ...contents, [this.renderedName]: body });
    }
    return body;
  }
}
