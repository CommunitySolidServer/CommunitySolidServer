/* eslint-disable @typescript-eslint/naming-convention, function-paren-newline */

type PrefixResolver<T> = (localName: string) => T;
type RecordOf<TKey extends any[], TValue> = Record<TKey[number], TValue>;

export type Namespace<TKey extends any[], TValue> =
  PrefixResolver<TValue> & RecordOf<TKey, TValue>;

/**
 * Creates a function that expands local names from the given base URI,
 * and exports the given local names as properties on the returned object.
 */
export const createNamespace = <T extends string>(baseUri: string, ...localNames: T[]):
Namespace<typeof localNames, string> => {
  // Create a function that expands local names
  const expanded = {} as Record<string, string>;
  const namespace = ((localName: string): string => {
    if (!(localName in expanded)) {
      expanded[localName] = `${baseUri}${localName}`;
    }
    return expanded[localName];
  }) as Namespace<typeof localNames, string>;

  // Expose the listed local names as properties
  for (const localName of localNames) {
    (namespace as RecordOf<typeof localNames, string>)[localName] = namespace(localName);
  }
  return namespace;
};

export const ACL = createNamespace('http://www.w3.org/ns/auth/acl#',
  'accessTo',
  'agent',
  'agentClass',
  'default',
  'mode',

  'Write',
  'Read',
  'Append',
  'Control',
);

export const DCTERMS = createNamespace('http://purl.org/dc/terms/',
  'modified',
);

export const FOAF = createNamespace('http://xmlns.com/foaf/0.1/',
  'Agent',
  'AuthenticatedAgent',
);

export const HTTP = createNamespace('urn:solid:http:',
  'location',
  'slug',
);

export const LDP = createNamespace('http://www.w3.org/ns/ldp#',
  'contains',

  'BasicContainer',
  'Container',
  'Resource',
);

export const MA = createNamespace('http://www.w3.org/ns/ma-ont#',
  'format',
);

export const PIM = createNamespace('http://www.w3.org/ns/pim/space#',
  'Storage',
);

export const POSIX = createNamespace('http://www.w3.org/ns/posix/stat#',
  'mtime',
  'size',
);

export const RDF = createNamespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'type',
);

export const XSD = createNamespace('http://www.w3.org/2001/XMLSchema#',
  'dateTime',
  'integer',
);

// Alias for most commonly used URI
export const CONTENT_TYPE = MA.format;
