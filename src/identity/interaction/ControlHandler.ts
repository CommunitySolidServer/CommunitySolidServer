import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { readJsonStream } from '../../util/StreamUtil';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';
import type { InteractionRoute } from './routing/InteractionRoute';

const INTERNAL_API_VERSION = '0.3';

/**
 * Adds `controls` and `apiVersion` fields to the output of its source handler,
 * such that clients can predictably find their way to other resources.
 * Control paths are determined by the input routes.
 */
export class ControlHandler extends InteractionHandler {
  private readonly source: InteractionHandler;
  private readonly controls: Record<string, string>;

  public constructor(source: InteractionHandler, controls: Record<string, InteractionRoute>) {
    super();
    this.source = source;
    this.controls = Object.fromEntries(
      Object.entries(controls).map(([ control, route ]): [ string, string ] => [ control, route.getPath() ]),
    );
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await this.source.canHandle(input);
  }

  public async handle(input: InteractionHandlerInput): Promise<Representation> {
    const result = await this.source.handle(input);
    if (result.metadata.contentType !== APPLICATION_JSON) {
      throw new InternalServerError('Source handler should return application/json.');
    }
    const json = await readJsonStream(result.data);
    json.controls = this.controls;
    json.apiVersion = INTERNAL_API_VERSION;
    return new BasicRepresentation(JSON.stringify(json), result.metadata);
  }
}
