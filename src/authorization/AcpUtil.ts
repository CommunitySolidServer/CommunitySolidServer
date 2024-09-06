import type {
  IAccessControl,
  IAccessControlledResource,
  IAccessControlResource,
  IAccessMode,
  IMatcher,
  IPolicy,
} from '@solid/access-control-policy';
import type { Store } from 'n3';
import type { NamedNode, Term } from '@rdfjs/types';
import { ACP } from '../util/Vocabularies';

/**
 * Returns all objects found using the given subject and predicate, mapped with the given function.
 */
function mapObjects<T>(data: Store, subject: Term, predicate: Term, fn: (data: Store, term: Term) => T): T[] {
  return data.getObjects(subject, predicate, null)
    .map((term): T => fn(data, term));
}

/**
 * Returns the string values of all objects found using the given subject and predicate.
 */
function getObjectValues(data: Store, subject: Term, predicate: NamedNode): string[] {
  return mapObjects(data, subject, predicate, (unused, term): string => term.value);
}

/**
 * Finds the {@link IMatcher} with the given identifier in the given dataset.
 *
 * @param data - Dataset to look in.
 * @param matcher - Identifier of the matcher.
 */
export function getMatcher(data: Store, matcher: Term): IMatcher {
  return {
    iri: matcher.value,
    agent: getObjectValues(data, matcher, ACP.terms.agent),
    client: getObjectValues(data, matcher, ACP.terms.client),
    issuer: getObjectValues(data, matcher, ACP.terms.issuer),
    vc: getObjectValues(data, matcher, ACP.terms.vc),
  };
}

/**
 * Finds the {@link IPolicy} with the given identifier in the given dataset.
 *
 * @param data - Dataset to look in.
 * @param policy - Identifier of the policy.
 */
export function getPolicy(data: Store, policy: Term): IPolicy {
  return {
    iri: policy.value,
    allow: new Set(getObjectValues(data, policy, ACP.terms.allow) as IAccessMode[]),
    deny: new Set(getObjectValues(data, policy, ACP.terms.deny) as IAccessMode[]),
    allOf: mapObjects(data, policy, ACP.terms.allOf, getMatcher),
    anyOf: mapObjects(data, policy, ACP.terms.anyOf, getMatcher),
    noneOf: mapObjects(data, policy, ACP.terms.noneOf, getMatcher),
  };
}

/**
 * Finds the {@link IAccessControl} with the given identifier in the given dataset.
 *
 * @param data - Dataset to look in.
 * @param accessControl - Identifier of the access control.
 */
export function getAccessControl(data: Store, accessControl: Term): IAccessControl {
  const policy = mapObjects(data, accessControl, ACP.terms.apply, getPolicy);
  return {
    iri: accessControl.value,
    policy,
  };
}

/**
 * Finds the {@link IAccessControlResource} with the given identifier in the given dataset.
 *
 * @param data - Dataset to look in.
 * @param acr - Identifier of the access control resource.
 */
export function getAccessControlResource(data: Store, acr: Term): IAccessControlResource {
  const accessControl = data.getObjects(acr, ACP.terms.accessControl, null)
    .map((term): IAccessControl => getAccessControl(data, term));
  const memberAccessControl = data.getObjects(acr, ACP.terms.memberAccessControl, null)
    .map((term): IAccessControl => getAccessControl(data, term));
  return {
    iri: acr.value,
    accessControl,
    memberAccessControl,
  };
}

/**
 * Finds all {@link IAccessControlledResource} in the given dataset.
 *
 * @param data - Dataset to look in.
 */
export function* getAccessControlledResources(data: Store): Iterable<IAccessControlledResource> {
  const acrQuads = data.getQuads(null, ACP.terms.resource, null, null);

  for (const quad of acrQuads) {
    const accessControlResource = getAccessControlResource(data, quad.subject);
    yield {
      iri: quad.object.value,
      accessControlResource,
    };
  }
}
