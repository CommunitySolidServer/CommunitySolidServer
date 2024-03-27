import type { ComponentsManager } from 'componentsjs';
import { PrefetchedDocumentLoader } from 'componentsjs';
import { ContextParser } from 'jsonld-context-parser';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { readPackageJson } from '../../util/PathUtil';

/**
 * Indicates a class is only meant to work in singlethreaded setups and is thus not threadsafe.
 */
export interface SingleThreaded {}

/**
 * Convert an exported interface name to the properly expected Components.js type URI.
 *
 * @param componentsManager - The currently used ComponentsManager
 * @param interfaceName - An interface name
 *
 * @returns A Components.js type URI
 */
export async function toComponentsJsType<T>(componentsManager: ComponentsManager<T>, interfaceName: string):
Promise<string> {
  const pkg = await readPackageJson();
  const contextParser = new ContextParser({
    documentLoader: new PrefetchedDocumentLoader({ contexts: componentsManager.moduleState.contexts }),
    skipValidation: true,
  });
  // The keys of the package.json `lsd:contexts` array contains all the IRIs of the relevant contexts;
  const lsdContexts = Object.keys(pkg['lsd:contexts'] as Record<string, string>);
  // Feed the lsd:context IRIs to the ContextParser
  const cssContext = await contextParser.parse(lsdContexts);
  // We can now expand a simple interface name, to its full Components.js type identifier.
  const interfaceIRI = cssContext.expandTerm(interfaceName, true);

  if (!interfaceIRI) {
    throw new InternalServerError(`Could not expand ${interfaceName} to IRI!`);
  }
  return interfaceIRI;
}

/**
 * Will list class names of components instantiated implementing the {@link SingleThreaded}
 * interface while the application is being run in multithreaded mode.
 *
 * @param componentsManager - The componentsManager being used to set up the application
 */
export async function listSingleThreadedComponents<T>(componentsManager: ComponentsManager<T>): Promise<string[]> {
  const interfaceType = await toComponentsJsType(componentsManager, 'SingleThreaded');
  const violatingClasses: string[] = [];

  // Loop through all instantiated Resources
  for (const resource of componentsManager.getInstantiatedResources()) {
    // If implementing interfaceType, while not being the interfaceType itself.
    if (resource?.isA(interfaceType) && resource.value !== interfaceType) {
      // Part after the # in an IRI is the actual class name
      const name = resource.property?.type?.value?.split('#')?.[1];
      violatingClasses.push(name);
    }
  }
  return violatingClasses;
}
