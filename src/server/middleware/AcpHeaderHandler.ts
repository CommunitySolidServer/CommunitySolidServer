import type { AuxiliaryIdentifierStrategy } from '../../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { TargetExtractor } from '../../http/input/identifier/TargetExtractor';
import { addHeader } from '../../util/HeaderUtil';
import { ACP } from '../../util/Vocabularies';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';

/**
 * Handles all the required ACP headers as defined at
 * https://solid.github.io/authorization-panel/acp-specification/#conforming-acp-server
 */
export class AcpHeaderHandler extends HttpHandler {
  private readonly targetExtractor: TargetExtractor;
  private readonly strategy: AuxiliaryIdentifierStrategy;
  private readonly modes: string[];
  private readonly attributes: string[];

  public constructor(
    targetExtractor: TargetExtractor,
    strategy: AuxiliaryIdentifierStrategy,
    modes: string[],
    attributes: string[],
  ) {
    super();
    this.targetExtractor = targetExtractor;
    this.strategy = strategy;
    this.modes = modes;
    this.attributes = attributes;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    const identifier = await this.targetExtractor.handleSafe({ request });
    if (!this.strategy.isAuxiliaryIdentifier(identifier)) {
      return;
    }
    const linkValues = [
      `<${ACP.AccessControlResource}>; rel="type"`,
      ...this.modes.map((mode): string => `<${mode}>; rel="${ACP.grant}"`),
      ...this.attributes.map((attribute): string => `<${attribute}>; rel="${ACP.attribute}"`),
    ];
    addHeader(response, 'Link', linkValues);
  }
}
