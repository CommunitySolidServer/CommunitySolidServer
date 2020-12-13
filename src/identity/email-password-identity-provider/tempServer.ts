import { RegExpUrlMatcher, Router } from '@bessonovs/node-http-router';
import { Provider } from 'oidc-provider';

import Account from './tempAccount';
import { configuration } from './tempConfiguration';

configuration.findAccount = Account.findAccount;

// TODO: [>1.0.0]:  include CORS
// app.use(cors());

// TODO: [>1.0.0]:  configure issuer properly
const ISSUER = `http://localhost:3000`;

export default function getRouter(): Router {
  const router = new Router((): void => {
    // TODO: [>1.0.0]: handle Error
  });

  // TODO [>1.0.0]:  configure a real adapter
  // let adapter;
  // if (process.env.MONGODB_URI) {
  //   adapter = require('./adapters/mongodb'); // eslint-disable-line global-require
  //   await adapter.connect();
  // }

  // TODO [>1.0.0]:  configure prod for more security
  // const prod = process.env.NODE_ENV === 'production';
  // if (prod) {
  //   set(configuration, 'cookies.short.secure', true);
  //   set(configuration, 'cookies.long.secure', true);
  // }

  const provider = new Provider(ISSUER, { ...configuration });

  // TODO: [>1.0.0]:  include security to require https
  // if (prod) {
  //   app.enable('trust proxy');
  //   provider.proxy = true;

  //   app.use((req, res, next) => {
  //     if (req.secure) {
  //       next();
  //     } else if (req.method === 'GET' || req.method === 'HEAD') {
  //       res.redirect(url.format({
  //         protocol: 'https',
  //         host: req.get('host'),
  //         pathname: req.originalUrl,
  //       }));
  //     } else {
  //       res.status(400).json({
  //         error: 'invalid_request',
  //         error_description: 'do yourself a favor and only use https',
  //       });
  //     }
  //   });
  // }

  // routes(router, provider);
  router.addRoute({
    matcher: new RegExpUrlMatcher([ /.*/u ]),
    handler: provider.callback,
  });
  return router;
}
