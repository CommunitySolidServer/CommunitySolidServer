import Dict = NodeJS.Dict;

/**
 * A template engine takes as input a template and applies the given options to it.
 */
export interface TemplateEngine {
  apply: (template: string, options: Dict<string>) => string;
}
