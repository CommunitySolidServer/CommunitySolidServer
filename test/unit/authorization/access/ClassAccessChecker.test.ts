import { DataFactory, Store } from 'n3';
import type { Credentials } from '../../../../src/authentication/Credentials';
import type { AccessCheckerArgs } from '../../../../src/authorization/access/AccessChecker';
import {
  accessCheckerClassPredicates,
  accessCheckerPrivateClasses,
  accessCheckerPublicClasses,
  AccessChecks,
} from '../../../../src/authorization/access/AccessChecker';
import { ClassAccessChecker } from '../../../../src/authorization/access/ClassAccessChecker';
import namedNode = DataFactory.namedNode;

function generateCredentials(identity: string, type: AccessChecks): Credentials {
  switch (type) {
    case AccessChecks.agent: return { agent: { webId: identity }};
    case AccessChecks.client: return { client: { clientId: identity }};
    case AccessChecks.issuer: return { issuer: { url: identity }};
    // No default
  }
}

describe.each(Object.values(AccessChecks))('A ClassAccessChecker on %s', (type: AccessChecks): void => {
  const identity = 'http://test.com/alice/profile/card#me';
  const acl = new Store();
  acl.addQuad(namedNode('publicMatch'), accessCheckerClassPredicates[type], accessCheckerPublicClasses[type]);
  acl.addQuad(namedNode('privateMatch'), accessCheckerClassPredicates[type], accessCheckerPrivateClasses[type]);
  const checker = new ClassAccessChecker(type);

  it('can handle all requests.', async(): Promise<void> => {
    await expect(checker.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('returns true if the rule supports the public class.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('publicMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns true for authenticated entities with a private class rule.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl,
      rule: namedNode('privateMatch'),
      credentials: generateCredentials(identity, type) };
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns false for unauthenticated entities with a private class rule.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('privateMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });

  it('returns false if no class rule is found.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('noMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });
});

