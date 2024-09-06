import type { Term } from '@rdfjs/types';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import { ACL, AUTH } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * Add the necessary WAC-Allow header values.
 * Solid, §10.1: "Servers exposing client’s access privileges on a resource URL MUST advertise
 * by including the WAC-Allow HTTP header in the response of HTTP HEAD and GET requests."
 * https://solid.github.io/specification/protocol#web-access-control
 */
export class WacAllowMetadataWriter extends MetadataWriter {
  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    let userModes = new Set(input.metadata.getAll(AUTH.terms.userMode).map(this.aclToPermission));
    const publicModes = new Set(input.metadata.getAll(AUTH.terms.publicMode).map(this.aclToPermission));

    // Public access implies user access
    userModes = new Set([ ...userModes, ...publicModes ]);

    const headerStrings: string[] = [];
    if (userModes.size > 0) {
      headerStrings.push(this.createAccessParam('user', userModes));
    }
    if (publicModes.size > 0) {
      headerStrings.push(this.createAccessParam('public', publicModes));
    }

    // Only add the header if there are permissions to show
    if (headerStrings.length > 0) {
      addHeader(input.response, 'WAC-Allow', headerStrings.join(','));
    }
  }

  private aclToPermission(this: void, aclTerm: Term): string {
    return aclTerm.value.slice(ACL.namespace.length).toLowerCase();
  }

  private createAccessParam(name: string, modes: Set<string>): string {
    // Sort entries to have consistent output
    return `${name}="${[ ...modes ].sort((left, right): number => left.localeCompare(right)).join(' ')}"`;
  }
}
