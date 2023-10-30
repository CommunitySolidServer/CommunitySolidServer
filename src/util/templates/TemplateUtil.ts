import { promises as fsPromises } from 'node:fs';
import { joinFilePath, resolveAssetPath } from '../PathUtil';
import type { Template } from './TemplateEngine';

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
export async function readTemplate(template?: Template): Promise<string> {
  // The template has already been given as a string
  if (typeof template === 'undefined' || (typeof template === 'object' && 'templateString' in template)) {
    return template?.templateString ?? '';
  }
  // The template needs to be read from disk
  return fsPromises.readFile(getTemplateFilePath(template)!, 'utf8');
}
