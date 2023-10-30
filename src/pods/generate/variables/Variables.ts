import { createVocabulary } from '../../../util/Vocabularies';

export const TEMPLATE = createVocabulary(
  'urn:solid-server:template:',
  'ResourceStore',
);

// Variables used for configuration templates
// This is not an exclusive list
export const TEMPLATE_VARIABLE = createVocabulary(
  `${TEMPLATE.namespace}variable:`,
  'baseUrl',
  'rootFilePath',
  'sparqlEndpoint',
  'templateConfig',
);

/**
 * Checks if the given variable is one that is supported.
 * This can be used to weed out irrelevant parameters in an object.
 */
export function isValidVariable(variable: string): boolean {
  return variable.startsWith(TEMPLATE_VARIABLE.namespace);
}
