import type { HttpResponse } from '../../../server/HttpResponse';
import { MethodNotAllowedHttpError } from '../../../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../util/errors/UnsupportedMediaTypeHttpError';
import { addHeader } from '../../../util/HeaderUtil';
import { isContainerPath } from '../../../util/PathUtil';
import { LDP, PIM, RDF, SOLID_ERROR } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

enum ResourceType {
  document,
  container,
  unknown,
}

/**
 * Generates Allow, Accept-Patch, Accept-Post, and Accept-Put headers.
 * The resulting values depend on the choses input methods and types.
 * The input metadata also gets used to remove methods from that list
 * if they are not valid in the given situation.
 */
export class AllowAcceptHeaderWriter extends MetadataWriter {
  private readonly supportedMethods: string[];
  private readonly acceptTypes: { patch: string[]; post: string[]; put: string[] };

  public constructor(supportedMethods: string[], acceptTypes: { patch?: string[]; post?: string[]; put?: string[] }) {
    super();
    this.supportedMethods = supportedMethods;
    this.acceptTypes = { patch: [], post: [], put: [], ...acceptTypes };
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const { response, metadata } = input;

    let resourceType: ResourceType;
    if (metadata.has(RDF.terms.type, LDP.terms.Resource)) {
      resourceType = isContainerPath(metadata.identifier.value) ? ResourceType.container : ResourceType.document;
    } else {
      const target = metadata.get(SOLID_ERROR.terms.target)?.value;
      if (target) {
        resourceType = isContainerPath(target) ? ResourceType.container : ResourceType.document;
      } else {
        resourceType = ResourceType.unknown;
      }
    }

    // Filter out methods which are not allowed
    const allowedMethods = this.filterAllowedMethods(metadata, resourceType);

    // Generate the Allow headers (if required)
    const generateAllow = this.generateAllow(allowedMethods, response, metadata);

    // Generate Accept-[Method] headers (if required)
    this.generateAccept(allowedMethods, generateAllow, response, metadata);
  }

  /**
   * Starts from the stored set of methods and removes all those that are not allowed based on the metadata.
   */
  private filterAllowedMethods(metadata: RepresentationMetadata, resourceType: ResourceType): Set<string> {
    const disallowedMethods = new Set(metadata.getAll(SOLID_ERROR.terms.disallowedMethod)
      .map((term): string => term.value));
    const allowedMethods = new Set(this.supportedMethods.filter((method): boolean => !disallowedMethods.has(method)));

    // POST is only allowed on containers.
    // Metadata only has the resource URI in case it has resource metadata.
    if (!this.isPostAllowed(resourceType)) {
      allowedMethods.delete('POST');
    }

    if (!this.isPutAllowed(metadata, resourceType)) {
      allowedMethods.delete('PUT');
    }

    if (!this.isPatchAllowed(resourceType)) {
      allowedMethods.delete('PATCH');
    }

    if (!this.isDeleteAllowed(metadata, resourceType)) {
      allowedMethods.delete('DELETE');
    }

    // If we are sure the resource does not exist: only keep methods that can create a new resource.
    if (metadata.has(SOLID_ERROR.terms.errorResponse, NotFoundHttpError.uri)) {
      for (const method of allowedMethods) {
        // Containers can only be created by PUT; documents by PUT or PATCH
        if (method !== 'PUT' && (method !== 'PATCH' || resourceType === ResourceType.container)) {
          allowedMethods.delete(method);
        }
      }
    }

    return allowedMethods;
  }

  /**
   * POST is only allowed on containers.
   */
  private isPostAllowed(resourceType: ResourceType): boolean {
    return resourceType !== ResourceType.document;
  }

  /**
   * PUT is not allowed on existing containers.
   */
  private isPutAllowed(metadata: RepresentationMetadata, resourceType: ResourceType): boolean {
    return resourceType !== ResourceType.container || !metadata.has(RDF.terms.type, LDP.terms.Resource);
  }

  /**
   * PATCH is not allowed on containers.
   */
  private isPatchAllowed(resourceType: ResourceType): boolean {
    return resourceType !== ResourceType.container;
  }

  /**
   * DELETE is allowed if the target exists,
   * is not a container,
   * or is an empty container that isn't a storage.
   *
   * Note that the identifier value check only works if the metadata is not about an error.
   */
  private isDeleteAllowed(metadata: RepresentationMetadata, resourceType: ResourceType): boolean {
    if (resourceType !== ResourceType.container) {
      return true;
    }

    const isStorage = metadata.has(RDF.terms.type, PIM.terms.Storage);
    const isEmpty = !metadata.has(LDP.terms.contains);
    return !isStorage && isEmpty;
  }

  /**
   * Generates the Allow header if required.
   * It only needs to get added for successful GET/HEAD requests, 404s, or 405s.
   * The spec only requires it for GET/HEAD requests and 405s.
   * In the case of other error messages we can't deduce what the request method was,
   * so we do not add the header as we don't have enough information.
   */
  private generateAllow(methods: Set<string>, response: HttpResponse, metadata: RepresentationMetadata): boolean {
    const methodDisallowed = metadata.has(SOLID_ERROR.terms.errorResponse, MethodNotAllowedHttpError.uri);
    // 405s indicate the target resource exists.
    // This is a heuristic, but one that should always be correct in our case.
    const resourceExists = methodDisallowed || metadata.has(RDF.terms.type, LDP.terms.Resource);
    const generateAllow = resourceExists || metadata.has(SOLID_ERROR.terms.errorResponse, NotFoundHttpError.uri);
    if (generateAllow) {
      addHeader(response, 'Allow', [ ...methods ].join(', '));
    }
    return generateAllow;
  }

  /**
   * Generates the Accept-[Method] headers if required.
   * Will be added if the Allow header was added, or in case of a 415 error.
   * Specific Accept-[Method] headers will only be added if the method is in the `methods` set.
   */
  private generateAccept(
    methods: Set<string>,
    generateAllow: boolean,
    response: HttpResponse,
    metadata: RepresentationMetadata,
  ): void {
    const typeWasUnsupported = metadata.has(SOLID_ERROR.terms.errorResponse, UnsupportedMediaTypeHttpError.uri);
    const generateAccept = generateAllow || typeWasUnsupported;
    if (generateAccept) {
      if (methods.has('PATCH')) {
        addHeader(response, 'Accept-Patch', this.acceptTypes.patch.join(', '));
      }
      if (methods.has('POST')) {
        addHeader(response, 'Accept-Post', this.acceptTypes.post.join(', '));
      }
      if (methods.has('PUT')) {
        addHeader(response, 'Accept-Put', this.acceptTypes.put.join(', '));
      }
    }
  }
}
