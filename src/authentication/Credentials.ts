/**
 * Credentials identifying an entity accessing or owning data.
 */
export interface Credential {
  webId?: string;
}

/**
 * Specific groups that can have credentials.
 */
export enum CredentialGroup {
  public = 'public',
  agent = 'agent',
}

/**
 * A combination of multiple credentials, where their group is specified by the key.
 */
export type CredentialSet = Partial<Record<CredentialGroup, Credential>>;
