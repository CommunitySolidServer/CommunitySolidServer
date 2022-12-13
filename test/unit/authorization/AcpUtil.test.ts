import { ACL } from '@solid/access-control-policy';
import { DataFactory, Parser, Store } from 'n3';
import {
  getAccessControl,
  getAccessControlledResources,
  getAccessControlResource,
  getMatcher,
  getPolicy,
} from '../../../src/authorization/AcpUtil';
import { joinUrl } from '../../../src/util/PathUtil';
import { ACP } from '../../../src/util/Vocabularies';
import namedNode = DataFactory.namedNode;

describe('AcpUtil', (): void => {
  const baseUrl = 'http://example.com/';
  const data = new Store(new Parser({ format: 'Turtle', baseIRI: baseUrl }).parse(`
  @prefix acp: <http://www.w3.org/ns/solid/acp#>.
  @prefix acl: <http://www.w3.org/ns/auth/acl#>.
  @prefix ex: <http://example.com/>.
  
  ex:acr
    acp:resource <./foo>;
    acp:accessControl ex:ac;
    acp:memberAccessControl ex:ac.
  ex:ac acp:apply ex:policy.
  ex:policy
    acp:allow acl:Read, acl:Append;
    acp:deny acl:Write;
    acp:allOf ex:matcher;
    acp:anyOf ex:matcher;
    acp:noneOf ex:matcher.
  ex:matcher acp:agent acp:PublicAgent, ex:agent;
             acp:client ex:client;
             acp:issuer ex:issuer;
             acp:vc ex:vc.
  `));

  describe('#getMatcher', (): void => {
    it('returns the relevant matcher.', async(): Promise<void> => {
      expect(getMatcher(data, namedNode(`${baseUrl}matcher`))).toEqual({
        iri: joinUrl(baseUrl, 'matcher'),
        agent: [ `${ACP.namespace}PublicAgent`, `${baseUrl}agent` ],
        client: [ `${baseUrl}client` ],
        issuer: [ `${baseUrl}issuer` ],
        vc: [ `${baseUrl}vc` ],
      });
    });
    it('returns an empty matcher if no data is found.', async(): Promise<void> => {
      expect(getMatcher(data, namedNode(`${baseUrl}unknown`))).toEqual({
        iri: `${baseUrl}unknown`,
        agent: [],
        client: [],
        issuer: [],
        vc: [],
      });
    });
  });

  describe('#getPolicy', (): void => {
    it('returns the relevant policy.', async(): Promise<void> => {
      expect(getPolicy(data, namedNode(`${baseUrl}policy`))).toEqual({
        iri: `${baseUrl}policy`,
        allow: new Set([ ACL.Read, ACL.Append ]),
        deny: new Set([ ACL.Write ]),
        allOf: [ expect.objectContaining({ iri: `${baseUrl}matcher` }) ],
        anyOf: [ expect.objectContaining({ iri: `${baseUrl}matcher` }) ],
        noneOf: [ expect.objectContaining({ iri: `${baseUrl}matcher` }) ],
      });
    });
    it('returns an empty policy if no data is found.', async(): Promise<void> => {
      expect(getPolicy(data, namedNode(`${baseUrl}unknown`))).toEqual({
        iri: `${baseUrl}unknown`,
        allow: new Set(),
        deny: new Set(),
        allOf: [],
        anyOf: [],
        noneOf: [],
      });
    });
  });

  describe('#getAccessControl', (): void => {
    it('returns the relevant access control.', async(): Promise<void> => {
      expect(getAccessControl(data, namedNode(`${baseUrl}ac`))).toEqual({
        iri: `${baseUrl}ac`,
        policy: [ expect.objectContaining({ iri: `${baseUrl}policy` }) ],
      });
    });
    it('returns an empty access control if no data is found.', async(): Promise<void> => {
      expect(getAccessControl(data, namedNode(`${baseUrl}unknown`))).toEqual({
        iri: `${baseUrl}unknown`,
        policy: [],
      });
    });
  });

  describe('#getAccessControlResource', (): void => {
    it('returns the relevant access control resource.', async(): Promise<void> => {
      expect(getAccessControlResource(data, namedNode(`${baseUrl}acr`))).toEqual({
        iri: `${baseUrl}acr`,
        accessControl: [ expect.objectContaining({ iri: `${baseUrl}ac` }) ],
        memberAccessControl: [ expect.objectContaining({ iri: `${baseUrl}ac` }) ],
      });
    });
    it('returns an empty access control resource if no data is found.', async(): Promise<void> => {
      expect(getAccessControlResource(data, namedNode(`${baseUrl}unknown`))).toEqual({
        iri: `${baseUrl}unknown`,
        accessControl: [],
        memberAccessControl: [],
      });
    });
  });

  describe('#getAccessControlledResources', (): void => {
    it('returns all access controlled resources found in the dataset.', async(): Promise<void> => {
      expect([ ...getAccessControlledResources(data) ]).toEqual([{
        iri: `${baseUrl}foo`,
        accessControlResource: expect.objectContaining({ iri: `${baseUrl}acr` }),
      }]);
    });
  });
});
