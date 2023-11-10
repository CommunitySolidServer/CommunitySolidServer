/**
 * Credentials identifying an entity accessing or owning data.
 */
export type Credentials = {
  agent?: { webId: string };
  client?: { clientId: string };
  issuer?: { url: string };
  [key: string]: unknown;
};
