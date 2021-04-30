import type { ResourceStore, PermissionSet } from '../../src/';
import { BasicRepresentation } from '../../src/';

export class AclHelper {
  public readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    this.store = store;
  }

  public async setSimpleAcl(
    resource: string,
    options: {
      permissions: Partial<PermissionSet>;
      agentClass?: 'agent' | 'authenticated';
      agent?: string;
      accessTo?: boolean;
      default?: boolean;
    },
  ): Promise<void> {
    if (!options.agentClass && !options.agent) {
      throw new Error('At least one of agentClass or agent have to be provided.');
    }
    if (!options.accessTo && !options.default) {
      throw new Error('At least one of accessTo or default have to be true.');
    }

    const acl: string[] = [
      '@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.\n',
      '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.\n',
      '<http://test.com/#auth> a acl:Authorization',
    ];

    for (const perm of [ 'Read', 'Append', 'Write', 'Control' ]) {
      if (options.permissions[perm.toLowerCase() as keyof PermissionSet]) {
        acl.push(`;\n acl:mode acl:${perm}`);
      }
    }
    if (options.accessTo) {
      acl.push(`;\n acl:accessTo <${resource}>`);
    }
    if (options.default) {
      acl.push(`;\n acl:default <${resource}>`);
    }
    if (options.agentClass) {
      acl.push(
        `;\n acl:agentClass ${
          options.agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'
        }`,
      );
    }
    if (options.agent) {
      acl.push(`;\n acl:agent ${options.agent}`);
    }

    acl.push('.');

    await this.store.setRepresentation({ path: `${resource}.acl` }, new BasicRepresentation(acl, 'text/turtle'));
  }
}
