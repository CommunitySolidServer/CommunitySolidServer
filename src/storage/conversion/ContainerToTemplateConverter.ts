import type { Readable } from 'stream';
import orderBy from 'lodash.orderby';
import type { Quad } from 'rdf-js';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { isContainerIdentifier, isContainerPath } from '../../util/PathUtil';
import { endOfStream } from '../../util/StreamUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import { LDP } from '../../util/Vocabularies';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

interface ResourceDetails {
  name: string;
  identifier: string;
  container: boolean;
}

/**
 * A {@link RepresentationConverter} that creates a templated representation of a container.
 */
export class ContainerToTemplateConverter extends TypedRepresentationConverter {
  private readonly templateEngine: TemplateEngine;
  private readonly contentType: string;

  public constructor(templateEngine: TemplateEngine, contentType: string) {
    super(INTERNAL_QUADS, contentType);
    this.templateEngine = templateEngine;
    this.contentType = contentType;
  }

  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    if (!isContainerIdentifier(args.identifier)) {
      throw new NotImplementedHttpError('Can only convert containers.');
    }
    await super.canHandle(args);
  }

  public async handle({ identifier, representation }: RepresentationConverterArgs): Promise<Representation> {
    const rendered = await this.templateEngine.render({
      container: this.getLocalName(identifier.path),
      children: await this.getChildResources(identifier.path, representation.data),
    });
    return new BasicRepresentation(rendered, representation.metadata, this.contentType);
  }

  /**
   * Collects the children of the container as simple objects.
   */
  private async getChildResources(container: string, quads: Readable): Promise<ResourceDetails[]> {
    // Collect the needed bits of information from the containment triples
    const resources = new Set<string>();
    quads.on('data', ({ subject, predicate, object }: Quad): void => {
      if (subject.value === container && predicate.equals(LDP.terms.contains)) {
        resources.add(object.value);
      }
    });
    await endOfStream(quads);

    // Create a simplified object for every resource
    const children = [ ...resources ].map((resource: string): ResourceDetails => ({
      identifier: resource,
      name: this.getLocalName(resource),
      container: isContainerPath(resource),
    }));

    // Sort the resulting list
    return orderBy(children, [ 'container', 'identifier' ], [ 'desc', 'asc' ]);
  }

  /**
   * Derives a short name for the given resource.
   */
  private getLocalName(iri: string, keepTrailingSlash = false): string {
    const match = /:\/+[^/]+.*\/(([^/]+)\/?)$/u.exec(iri);
    return match ? decodeURIComponent(match[keepTrailingSlash ? 1 : 2]) : '/';
  }
}
