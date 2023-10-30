import type { IAccessControl, IAccessControlledResource, IMatcher, IPolicy } from '@solid/access-control-policy';
import { v4 } from 'uuid';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../src/http/representation/ResourceIdentifier';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { joinUrl } from '../../src/util/PathUtil';

export type CreateMatcherInput = { publicAgent: true } | { agent: string };

export type CreatePolicyInput = {
  allow?: Iterable<'read' | 'append' | 'write' | 'control'>;
  deny?: Iterable<'read' | 'append' | 'write' | 'control'>;
  allOf?: Iterable<IMatcher>;
  anyOf?: Iterable<IMatcher>;
  noneOf?: Iterable<IMatcher>;
};

export type CreateAcrInput = {
  resource: string | ResourceIdentifier;
  policies?: Iterable<IPolicy>;
  memberPolicies?: Iterable<IPolicy>;
};

const baseUrl = 'http://acp.example.com/';

/**
 * Helper class for setting permissions through ACP.
 */
export class AcpHelper {
  public readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    this.store = store;
  }

  public createMatcher(input: CreateMatcherInput): IMatcher {
    return {
      iri: joinUrl(baseUrl, v4()),
      // Prefixed URI as this will be inserted into turtle below
      agent: (input as any).publicAgent ? [ 'acp:PublicAgent' ] : [ (input as any).agent ],
      client: [],
      issuer: [],
      vc: [],
    };
  }

  public createPolicy({ allow, deny, allOf, anyOf, noneOf }: CreatePolicyInput): IPolicy {
    return {
      iri: joinUrl(baseUrl, v4()),
      // Using the wrong identifiers so the turtle generated below uses the prefixed version
      allow: new Set(this.convertModes(allow ?? []) as any),
      deny: new Set(this.convertModes(deny ?? []) as any),
      allOf: [ ...allOf ?? [] ],
      anyOf: [ ...anyOf ?? [] ],
      noneOf: [ ...noneOf ?? [] ],
    };
  }

  private* convertModes<T extends string>(modes: Iterable<T>):
  Iterable<`acl:${Capitalize<T>}`> {
    for (const mode of modes) {
      // Node.js typings aren't fancy enough yet to correctly type this
      yield `acl:${mode.charAt(0).toUpperCase() + mode.slice(1)}` as any;
    }
  }

  public createAcr({ resource, policies, memberPolicies }: CreateAcrInput): IAccessControlledResource {
    return {
      iri: (resource as ResourceIdentifier).path ?? resource,
      accessControlResource: {
        iri: joinUrl(baseUrl, v4()),
        accessControl: policies ?
            [{
              iri: joinUrl(baseUrl, v4()),
              policy: [ ...policies ],
            }] :
            [],
        memberAccessControl: memberPolicies ?
            [{
              iri: joinUrl(baseUrl, v4()),
              policy: [ ...memberPolicies ],
            }] :
            [],
      },
    };
  }

  public async setAcp(
    id: string | ResourceIdentifier,
    resources: IAccessControlledResource[] | IAccessControlledResource,
  ): Promise<void> {
    const turtle = this.toTurtle(resources);
    await this.store.setRepresentation(
      { path: `${(id as ResourceIdentifier).path ?? id}.acr` },
      new BasicRepresentation(turtle, 'text/turtle'),
    );
  }

  public toTurtle(resources: IAccessControlledResource[] | IAccessControlledResource): string {
    if (!Array.isArray(resources)) {
      resources = [ resources ];
    }
    const result: string[] = [
      '@prefix acp: <http://www.w3.org/ns/solid/acp#>.',
      '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
    ];

    const added = new Set<string>();
    const acs: IAccessControl[] = [];
    const policies: IPolicy[] = [];
    const matchers: IMatcher[] = [];

    for (const resource of resources) {
      result.push(`<${resource.accessControlResource.iri}> a acp:AccessControlResource`);
      result.push(`  ; acp:resource <${resource.iri}>`);
      for (const key of [ 'accessControl', 'memberAccessControl' ] as const) {
        if (resource.accessControlResource[key].length > 0) {
          result.push(`  ; acp:${key} ${resource.accessControlResource[key].map((ac): string => {
            acs.push(ac);
            return `<${ac.iri}>`;
          }).join(', ')}`);
        }
      }
      result.push('  .');
    }

    for (const ac of acs) {
      if (added.has(ac.iri)) {
        continue;
      }

      result.push(`<${ac.iri}> a acp:AccessControl`);
      result.push(`  ; acp:apply ${ac.policy.map((policy): string => {
        policies.push(policy);
        return `<${policy.iri}>`;
      }).join(', ')}`);
      result.push('  .');
      added.add(ac.iri);
    }

    for (const policy of policies) {
      if (added.has(policy.iri)) {
        continue;
      }

      const { policyString, requiredMatchers } = this.policyToTurtle(policy);
      result.push(policyString);
      matchers.push(...requiredMatchers);
      added.add(policy.iri);
    }

    for (const matcher of matchers) {
      if (added.has(matcher.iri)) {
        continue;
      }

      result.push(this.matcherToTurtle(matcher));
      added.add(matcher.iri);
    }

    return result.join('\n');
  }

  private policyToTurtle(policy: IPolicy): { policyString: string; requiredMatchers: IMatcher[] } {
    const result: string[] = [];

    result.push(`<${policy.iri}> a acp:Policy`);

    for (const key of [ 'allow', 'deny' ] as const) {
      if (policy[key].size > 0) {
        result.push(`  ; acp:${key} ${[ ...policy[key] ].join(', ')}`);
      }
    }

    const requiredMatchers: IMatcher[] = [];
    for (const key of [ 'allOf', 'anyOf', 'noneOf' ] as const) {
      if (policy[key].length > 0) {
        result.push(`  ; acp:${key} ${policy[key].map((matcher): string => {
          requiredMatchers.push(matcher);
          return `<${matcher.iri}>`;
        }).join(', ')}`);
      }
    }

    result.push('  .');

    return { policyString: result.join('\n'), requiredMatchers };
  }

  private matcherToTurtle(matcher: IMatcher): string {
    const result: string[] = [];

    result.push(`<${matcher.iri}> a acp:Matcher`);
    for (const key of [ 'agent', 'client', 'issuer', 'vc' ] as const) {
      if (matcher[key].length > 0) {
        result.push(`  ; acp:${key} ${matcher[key].join(', ')}`);
      }
    }
    result.push('  .');

    return result.join('\n');
  }
}
