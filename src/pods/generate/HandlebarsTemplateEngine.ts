import { compile } from 'handlebars';
import type { TemplateEngine } from './TemplateEngine';

/**
 * Fills in Handlebars templates.
 */
export class HandlebarsTemplateEngine implements TemplateEngine {
  public apply(template: string, options: NodeJS.Dict<string>): string {
    const compiled = compile(template);
    return compiled(options);
  }
}
