import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { OperationHttpHandlerInput } from '../OperationHttpHandler';
import { OperationHttpHandler } from '../OperationHttpHandler';

/**
 * An {@link OperationHttpHandler} that converts the response of its handler based on the {@link Operation} preferences.
 * If there are no preferences, or no data, the response will be returned as-is.
 */
export class ConvertingOperationHttpHandler extends OperationHttpHandler {
  private readonly converter: RepresentationConverter;
  private readonly operationHandler: OperationHttpHandler;

  public constructor(converter: RepresentationConverter, operationHandler: OperationHttpHandler) {
    super();
    this.converter = converter;
    this.operationHandler = operationHandler;
  }

  public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
    await this.operationHandler.canHandle(input);
  }

  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const response = await this.operationHandler.handle(input);

    if (input.operation.preferences.type && response.data) {
      if (!response.metadata) {
        throw new InternalServerError('A data stream should always have a metadata object.');
      }

      const representation = new BasicRepresentation(response.data, response.metadata);

      const converted = await this.converter.handleSafe({
        identifier: input.operation.target,
        representation,
        preferences: input.operation.preferences,
      });

      response.metadata = converted.metadata;
      response.data = converted.data;
    }

    return response;
  }
}
