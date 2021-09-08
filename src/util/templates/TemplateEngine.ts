import { promises as fsPromises } from 'fs';
import { joinFilePath, resolveAssetPath } from '../PathUtil';
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

/* eslint-disable @typescript-eslint/method-signature-style */
/**
 * A template engine renders content into a template.
 */
export interface TemplateEngine<T extends Dict<any> = Dict<any>> {
  /**
   * Renders the given contents into the template.
   *
   * @param contents - The contents to render.
   * @param template - The template to use for rendering;
   *                   if omitted, a default template is used.
   * @returns The rendered contents.
   */
  render(contents: T): Promise<string>;
  render<TCustom = T>(contents: TCustom, template: Template): Promise<string>;
}
/* eslint-enable @typescript-eslint/method-signature-style */

/**
 * Returns the absolute path to the template.
 * Returns undefined if the input does not contain a file path.
 */
export function getTemplateFilePath(template?: Template): string | undefined {
  // The template has been passed as a filename
  if (typeof template === 'string') {
    return getTemplateFilePath({ templateFile: template });
  }
  // The template has already been given as a string so no known path
  if (!template || 'templateString' in template) {
    return;
  }
  const { templateFile, templatePath } = template;
  const fullTemplatePath = templatePath ? joinFilePath(templatePath, templateFile) : templateFile;
  return resolveAssetPath(fullTemplatePath);
}

/**
 * Reads the template and returns it as a string.
 */
export async function readTemplate(template: Template = { templateString: '' }): Promise<string> {
  // The template has already been given as a string
  if (typeof template === 'object' && 'templateString' in template) {
    return template.templateString;
  }
  // The template needs to be read from disk
  return fsPromises.readFile(getTemplateFilePath(template)!, 'utf8');
}
