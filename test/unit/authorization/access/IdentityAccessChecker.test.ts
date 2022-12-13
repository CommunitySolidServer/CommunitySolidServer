import { DataFactory, Store } from 'n3';
import type { Credentials } from '../../../../src/authentication/Credentials';
import type { AccessCheckerArgs } from '../../../../src/authorization/access/AccessChecker';
import { accessCheckerIdentityPredicates, AccessChecks } from '../../../../src/authorization/access/AccessChecker';
import { IdentityAccessChecker } from '../../../../src/authorization/access/IdentityAccessChecker';
import namedNode = DataFactory.namedNode;

function generateCredentials(identity: string, type: AccessChecks): Credentials {
  switch (type) {
    case AccessChecks.agent: return { agent: { webId: identity }};
    case AccessChecks.client: return { client: { clientId: identity }};
    case AccessChecks.issuer: return { issuer: { url: identity }};
    // No default
  }
}

describe.each(Object.values(AccessChecks))('An IdentityAccessChecker on %s', (type: AccessChecks): void => {
  const identity = 'http://test.com/alice/profile/card#me';
  const acl = new Store();
  acl.addQuad(namedNode('match'), accessCheckerIdentityPredicates[type], namedNode(identity));
  acl.addQuad(namedNode('noMatch'), accessCheckerIdentityPredicates[type], namedNode('http://test.com/bob'));
  const checker = new IdentityAccessChecker(type);

  it('can handle all requests.', async(): Promise<void> => {
    await expect(checker.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('returns true if a match is found for the given identity.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl,
      rule: namedNode('match'),
      credentials: generateCredentials(identity, type) };
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns false if no match is found.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl,
      rule: namedNode('noMatch'),
      credentials: generateCredentials(identity, type) };
    await expect(checker.handle(input)).resolves.toBe(false);
  });

  it('returns false if the credentials contain no entity of the type.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('match'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });
});
