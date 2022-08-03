import { HttpHandler } from '../../server/HttpHandler';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import type { WellKnownBuilder } from './WellKnownBuilder';

export class WellKnownHandler extends HttpHandler {
  public constructor(
    private readonly wellKnownBuilder: WellKnownBuilder,
  ) {
    super();
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const wellKnown = await this.wellKnownBuilder.getWellKnownSegment();
    input.response.setHeader('Content-Type', 'application/ld+json');
    input.response.write(JSON.stringify(wellKnown));
    input.response.end();
  }
}
