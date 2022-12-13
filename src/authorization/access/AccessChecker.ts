import type { NamedNode } from '@rdfjs/types';
import type { Store, Term } from 'n3';
import type { Credentials } from '../../authentication/Credentials';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import { ACL, FOAF, INTEROP, SOLID } from '../../util/Vocabularies';

/**
 * Levels on which AccessCheckers can check.
 */
export enum AccessChecks {
  agent = 'agent',
  client = 'client',
  issuer = 'issuer',
}

/**
 * Performs an authorization check against the given acl resource.
 */
export abstract class AccessChecker extends AsyncHandler<AccessCheckerArgs, boolean> {
  protected readonly type: AccessChecks;
  protected constructor(type: AccessChecks) {
    super();
    this.type = type;
  }

  protected getIdentity(credentials: Credentials): string | undefined {
    switch (this.type) {
      case AccessChecks.agent: return credentials.agent?.webId;
      case AccessChecks.client: return credentials.client?.clientId;
      case AccessChecks.issuer: return credentials.issuer?.url;
      // No default
    }
  }
}

export interface AccessCheckerArgs {
  /**
   *  A store containing the relevant triples of the authorization.
   */
  acl: Store;

  /**
   * Authorization rule to be processed.
   */
  rule: Term;

  /**
   * Credentials of the entity that wants to use the resource.
   */
  credentials: Credentials;
}

export const accessCheckerIdentityPredicates: Record<AccessChecks, NamedNode> = {
  [AccessChecks.agent]: ACL.terms.agent,
  [AccessChecks.client]: ACL.terms.client,
  [AccessChecks.issuer]: ACL.terms.issuer,
};

export const accessCheckerClassPredicates: Record<AccessChecks, NamedNode> = {
  [AccessChecks.agent]: ACL.terms.agentClass,
  [AccessChecks.client]: ACL.terms.clientClass,
  [AccessChecks.issuer]: ACL.terms.issuerClass,
};

export const accessCheckerGroupPredicates: Record<AccessChecks, NamedNode> = {
  [AccessChecks.agent]: ACL.terms.agentGroup,
  [AccessChecks.client]: ACL.terms.clientGroup,
  [AccessChecks.issuer]: ACL.terms.issuerGroup,
};

export const accessCheckerPublicClasses: Record<AccessChecks, NamedNode> = {
  [AccessChecks.agent]: FOAF.terms.Agent,
  [AccessChecks.client]: INTEROP.terms.Application,
  [AccessChecks.issuer]: SOLID.terms.OidcIssuer,
};

export const accessCheckerPrivateClasses: Record<AccessChecks, NamedNode> = {
  [AccessChecks.agent]: ACL.terms.AuthenticatedAgent,
  [AccessChecks.client]: ACL.terms.SpecifiedClient,
  [AccessChecks.issuer]: ACL.terms.SpecifiedIssuer,
};
