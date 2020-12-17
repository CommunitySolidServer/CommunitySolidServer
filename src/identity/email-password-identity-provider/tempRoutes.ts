/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-console, max-len, camelcase, no-unused-vars */
import { strict as assert } from 'assert';
import crypto from 'crypto';
import querystring from 'querystring';
import { inspect } from 'util';
import bodyParser from 'koa-body';

import Router from 'koa-router';
import isEmpty from 'lodash/isEmpty';

import type { InteractionResults, Provider } from 'oidc-provider';
import { errors } from 'oidc-provider';
import Account from './tempAccount';

const keys = new Set();
const debug = (obj: any): string =>
  querystring.stringify(
    Object.entries(obj).reduce(
      (
        acc: Record<string, boolean[] | string>,
        [ key, value ],
      ): Record<string, boolean[] | string> => {
        keys.add(key);
        if (isEmpty(value)) {
          return acc;
        }
        acc[key] = inspect(value, { depth: null });
        return acc;
      },
      {},
    ),
    '<br/>',
    ': ',
    {
      encodeURIComponent(value: string): string {
        return keys.has(value) ? `<strong>${value}</strong>` : value;
      },
    },
  );

export default function getRoutes(provider: Provider): Router {
  const router = new Router();

  router.use(
    async(ctx, next): Promise<void> => {
      ctx.set('Pragma', 'no-cache');
      ctx.set('Cache-Control', 'no-cache, no-store');
      try {
        return await next();
      } catch (err: unknown) {
        if (err instanceof errors.SessionNotFound) {
          ctx.status = err.status;
          const { message: error, error_description } = err;
          ctx.body = {
            error,
            error_description,
          };
        } else {
          throw err;
        }
      }
    },
  );

  router.get('/interaction/:uid', async(ctx: any, next): Promise<string | void> => {
    const { uid, prompt, params, session } = await provider.interactionDetails(
      ctx.req,
      ctx.res,
    );
    const client = await provider.Client.find(params.client_id);

    switch (prompt.name) {
      case 'select_account': {
        if (!session) {
          return provider.interactionFinished(
            ctx.req,
            ctx.res,
            {
              select_account: {},
            },
            { mergeWithLastSubmission: false },
          );
        }

        // TODO [>1.0.0] Do less dangerous casting here
        const account = await provider.Account.findAccount(
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          ctx,
          session.accountId as string,
        );

        if (!account) {
          ctx.body = 'No account';
          return;
        }
        const { email } = await account.claims(
          'prompt',
          'email',
          { email: null },
          [],
        );

        return ctx.render('select_account', {
          client,
          uid,
          email,
          details: prompt.details,
          params,
          title: 'Sign-in',
          session: session ? debug(session as Record<string, unknown>) : undefined,
          dbg: {
            params: debug(params),
            prompt: debug(prompt as unknown as Record<string, unknown>),
          },
        });
      }
      case 'login': {
        return ctx.render('login', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Sign-in',
          google: ctx.google,
          session: session ? debug(session) : undefined,
          dbg: {
            params: debug(params),
            prompt: debug(prompt),
          },
        });
      }
      case 'consent': {
        return ctx.render('interaction', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Authorize',
          session: session ? debug(session) : undefined,
          dbg: {
            params: debug(params),
            prompt: debug(prompt),
          },
        });
      }
      default:
        return next();
    }
  });

  const body = bodyParser({
    text: false,
    json: false,
    patchNode: true,
    patchKoa: true,
  });

  router.get('/interaction/callback/google', async(ctx): Promise<string> =>
    ctx.render('repost', { provider: 'google', layout: false }));

  router.post('/interaction/:uid/login', body, async(ctx): Promise<void> => {
    const {
      prompt: { name },
    } = await provider.interactionDetails(ctx.req, ctx.res);
    assert.equal(name, 'login');

    const account = await Account.findByLogin(ctx.request.body.login);

    const result = {
      // Make sure its skipped by the interaction policy since we just logged in
      select_account: {},
      login: {
        account: account.accountId,
      },
    };

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post('/interaction/:uid/federated', body, async(ctx: any): Promise<void> => {
    const {
      prompt: { name },
    } = await provider.interactionDetails(ctx.req, ctx.res);
    assert.equal(name, 'login');

    const path = `/interaction/${ctx.params.uid}/federated`;

    switch (ctx.request.body.provider) {
      case 'google': {
        const callbackParams = ctx.google.callbackParams(ctx.req);

        // Init
        if (Object.keys(callbackParams).length === 0) {
          const state = `${ctx.params.uid}|${crypto
            .randomBytes(32)
            .toString('hex')}`;
          const nonce = crypto.randomBytes(32).toString('hex');

          ctx.cookies.set('google.state', state, { path, sameSite: 'strict' });
          ctx.cookies.set('google.nonce', nonce, { path, sameSite: 'strict' });

          return ctx.redirect(
            ctx.google.authorizationUrl({
              state,
              nonce,
              scope: 'openid email profile',
            }),
          );
        }

        // Callback
        const state = ctx.cookies.get('google.state');
        ctx.cookies.set('google.state', null, { path });
        const nonce = ctx.cookies.get('google.nonce');
        ctx.cookies.set('google.nonce', null, { path });

        const tokenset = await ctx.google.callback(undefined, callbackParams, {
          state,
          nonce,
          response_type: 'id_token',
        });
        const account = await Account.findByFederated(
          'google',
          tokenset.claims(),
        );

        const result = {
          // Make sure its skipped by the interaction policy since we just logged in
          select_account: {},
          login: {
            account: account.accountId,
          },
        };
        return provider.interactionFinished(ctx.req, ctx.res, result, {
          mergeWithLastSubmission: false,
        });
      }
      default:
    }
  });

  router.post('/interaction/:uid/continue', body, async(ctx): Promise<void> => {
    const interaction = await provider.interactionDetails(ctx.req, ctx.res);
    const {
      // Remember "details" is a part of interaction
      prompt: { name },
    } = interaction;
    assert.equal(name, 'select_account');

    if (ctx.request.body.switch) {
      if (interaction.params.prompt) {
        const prompts = new Set(interaction.params.prompt.split(' '));
        prompts.add('login');
        interaction.params.prompt = [ ...prompts ].join(' ');
      } else {
        interaction.params.prompt = 'login';
      }
      await interaction.save();
    }

    const result = { select_account: {}};
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post('/interaction/:uid/confirm', body, async(ctx): Promise<void> => {
    const {
      prompt: { name },
    } = await provider.interactionDetails(ctx.req, ctx.res);
    assert.equal(name, 'consent');

    const result: InteractionResults = {
      consent: {
        rejectedScopes: [],
        rejectedClaims: [],
        replace: false,
      },
    };

    // // Any scopes you do not wish to grant go in here
    // //   otherwise details.scopes.new.concat(details.scopes.accepted) will be granted
    // consent.rejectedScopes = [];

    // // Any claims you do not wish to grant go in here
    // //   otherwise all claims mapped to granted scopes
    // //   and details.claims.new.concat(details.claims.accepted) will be granted
    // consent.rejectedClaims = [];

    // // Replace = false means previously rejected scopes and claims remain rejected
    // // changing this to true will remove those rejections in favour of just what you rejected above
    // consent.replace = false;

    // const result = { consent };
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: true,
    });
  });

  router.get('/interaction/:uid/abort', async(ctx): Promise<void> => {
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction',
    };

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  return router;
}
