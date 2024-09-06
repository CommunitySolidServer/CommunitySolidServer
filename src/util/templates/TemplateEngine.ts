import { AsyncHandler } from '../handlers/AsyncHandler';
import Dict = NodeJS.Dict;

export type Template = TemplateFileName | TemplateString | TemplatePath;

export type TemplateFileName = string;

export interface TemplateString {
  // String contents of the template
  templateString: string;
}

export interface TemplatePath {
  // Name of the template file
  templateFile: string;
  // Path of the template file
  templatePath?: string;
}

/**
 * Utility interface for representing TemplateEngine input.
 */
export interface TemplateEngineInput<T> {
  // The contents to render
  contents: T;
  // The template to use for rendering (optional)
  template?: Template;
}

/**
 * Generic interface for classes that implement a template engine.
 * A template engine renders content into a template.
 */
export abstract class TemplateEngine<T extends Dict<unknown> = Dict<unknown>>
  extends AsyncHandler<TemplateEngineInput<T>, string> {}
