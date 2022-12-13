import type { ResourceStore } from '../../src/';
import { BasicRepresentation } from '../../src/';
import type { AclPermissionSet } from '../../src/authorization/permissions/AclPermissionSet';

export type AclHelperInput = {
  permissions: AclPermissionSet;
  agentClass?: 'agent' | 'authenticated';
  agent?: string;
  accessTo?: boolean;
  default?: boolean;
};

export class AclHelper {
  public readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    this.store = store;
  }

  public async setSimpleAcl(
    resource: string,
    options: AclHelperInput | AclHelperInput[],
  ): Promise<void> {
    options = Array.isArray(options) ? options : [ options ];

    const acl: string[] = [
      '@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.\n',
      '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.\n',
    ];

    for (const [ i, option ] of options.entries()) {
      acl.push(`\n<http://test.com/#auth${i}> a acl:Authorization`);

      if (!option.agentClass && !option.agent) {
        throw new Error('At least one of agentClass or agent have to be provided.');
      }
      if (!option.accessTo && !option.default) {
        throw new Error('At least one of accessTo or default have to be true.');
      }

      for (const perm of [ 'Read', 'Append', 'Write', 'Control' ]) {
        if (option.permissions[perm.toLowerCase() as keyof AclPermissionSet]) {
          acl.push(`;\n acl:mode acl:${perm}`);
        }
      }
      if (option.accessTo) {
        acl.push(`;\n acl:accessTo <${resource}>`);
      }
      if (option.default) {
        acl.push(`;\n acl:default <${resource}>`);
      }
      if (option.agentClass) {
        acl.push(
          `;\n acl:agentClass ${
            option.agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'
          }`,
        );
      }
      if (option.agent) {
        acl.push(`;\n acl:agent ${option.agent}`);
      }

      acl.push('.');
    }

    await this.store.setRepresentation({ path: `${resource}.acl` }, new BasicRepresentation(acl, 'text/turtle'));
  }
}
