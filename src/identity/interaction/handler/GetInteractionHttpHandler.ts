import { getLoggerFor } from '../../../logging/LogUtil';
import type {
  IdPInteractionHttpHandlerInput,
} from '../IdPInteractionHttpHandler';
import { BaseInteractionHttpHandler } from './BaseInteractionHttpHandler';

export class GetInteractionHttpHandler extends BaseInteractionHttpHandler {
  private readonly logger = getLoggerFor(this);

  public constructor() {
    super({
      allowedMethods: [ 'GET' ],
      pathnamePostfix: '',
    });
  }

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    this.logger.info('Get Interaction');

    // Uncomment later
    // const { uid, prompt, params, session } = await provider.interactionDetails(
    //   request,
    //   response,
    // );
    // // const client = await provider.Client.find(params.client_id);
    try {
      const { request, response, provider } = input;
      const { prompt } = await provider.interactionDetails(request, response);
      this.logger.info(`HERE IS PROMPT: ${prompt.name}`);
    } catch (err: unknown) {
      this.logger.info(err as string);
    }

    // Switch (prompt.name) {
    //   case 'select_account': {
    //     if (!session) {
    //       return provider.interactionFinished(
    //         ctx.req,
    //         ctx.res,
    //         {
    //           select_account: {},
    //         },
    //         { mergeWithLastSubmission: false },
    //       );
    //     }

    //     // TODO [>1.0.0] Do less dangerous casting here
    //     const account = await provider.Account.findAccount(
    //       // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    //       ctx,
    //       session.accountId as string,
    //     );

    //     if (!account) {
    //       ctx.body = 'No account';
    //       return;
    //     }
    //     const { email } = await account.claims(
    //       'prompt',
    //       'email',
    //       { email: null },
    //       [],
    //     );

    //     return ctx.render('select_account', {
    //       client,
    //       uid,
    //       email,
    //       details: prompt.details,
    //       params,
    //       title: 'Sign-in',
    //       session: session ? debug(session as Record<string, unknown>) : undefined,
    //       dbg: {
    //         params: debug(params),
    //         prompt: debug(prompt as unknown as Record<string, unknown>),
    //       },
    //     });
    //   }
    //   case 'login': {
    //     return ctx.render('login', {
    //       client,
    //       uid,
    //       details: prompt.details,
    //       params,
    //       title: 'Sign-in',
    //       google: ctx.google,
    //       session: session ? debug(session) : undefined,
    //       dbg: {
    //         params: debug(params),
    //         prompt: debug(prompt),
    //       },
    //     });
    //   }
    //   case 'consent': {
    //     return ctx.render('interaction', {
    //       client,
    //       uid,
    //       details: prompt.details,
    //       params,
    //       title: 'Authorize',
    //       session: session ? debug(session) : undefined,
    //       dbg: {
    //         params: debug(params),
    //         prompt: debug(prompt),
    //       },
    //     });
    //   }
    //   default:
    //     return next();
    // }
  }
}
