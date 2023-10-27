import type { OperationHttpHandler, OperationHttpHandlerInput } from '../OperationHttpHandler';
import type { BaseRouterHandlerArgs } from './BaseRouterHandler';
import { BaseRouterHandler } from './BaseRouterHandler';

/**
 * A {@link BaseRouterHandler} for an {@link OperationHttpHandler}.
 */
export class OperationRouterHandler extends BaseRouterHandler<OperationHttpHandler> {
  public constructor(args: BaseRouterHandlerArgs<OperationHttpHandler>) {
    super(args);
  }

  public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
    await super.canHandleInput(input, input.operation.method, input.operation.target);
  }
}
