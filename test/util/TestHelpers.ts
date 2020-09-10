import streamifyArray from 'streamify-array';
import { ResourceStore } from '../..';
import { PermissionSet } from '../../src/ldp/permissions/PermissionSet';

export class AclTestHelper {
  public readonly store: ResourceStore;
  public id: string;

  public constructor(store: ResourceStore, id: string) {
    this.store = store;
    this.id = id;
  }

  public async setAcl(
    permissions: PermissionSet,
    control: boolean,
    access: boolean,
    def: boolean,
    agent?: string,
    agentClass?: 'agent' | 'authenticated',
  ): Promise<void> {
    const acl: string[] = [
      '@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.\n',
      '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.\n',
      '<http://test.com/#auth> a acl:Authorization',
    ];

    for (const perm of [ 'Read', 'Append', 'Write', 'Delete' ]) {
      if (permissions[perm.toLowerCase() as keyof PermissionSet]) {
        acl.push(`;\n acl:mode acl:${perm}`);
      }
    }
    if (control) {
      acl.push(';\n acl:mode acl:Control');
    }
    if (access) {
      acl.push(`;\n acl:accessTo <${this.id}>`);
    }
    if (def) {
      acl.push(`;\n acl:default <${this.id}>`);
    }
    if (agent) {
      acl.push(`;\n acl:agent <${agent}>`);
    }
    if (agentClass) {
      acl.push(
        `;\n acl:agentClass ${
          agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'
        }`,
      );
    }

    acl.push('.');

    const representation = {
      binary: true,
      data: streamifyArray(acl),
      metadata: {
        raw: [],
        profiles: [],
        contentType: 'text/turtle',
      },
    };

    return this.store.setRepresentation(
      { path: `${this.id}.acl` },
      representation,
    );
  }

  public async setSimpleAcl(
    permissions: PermissionSet,
    agentClass?: 'agent' | 'authenticated',
  ): Promise<void> {
    return this.setAcl(permissions, true, true, true, undefined, agentClass);
  }
}
