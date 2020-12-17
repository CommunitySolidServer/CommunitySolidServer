// T
// import path from 'path';
// import Koa from 'koa';
// import render from 'koa-ejs';
// import mount from 'koa-mount';
// import { Provider } from 'oidc-provider';
// import Account from './tempAccount';
// import { configuration } from './tempConfiguration';
// import routes from './tempRoutes';

// configuration.findAccount = Account.findAccount;

// // TODO: [>1.0.0]:  include CORS
// // app.use(cors());

// // TODO: [>1.0.0]:  configure issuer properly
// const ISSUER = `http://localhost:3000`;

// export default function getApp(): Koa {
//   const app = new Koa();
//   // TODO [>1.0.0] Use helmet to help with security
//   // app.use(helmet());
//   render(app, {
//     cache: false,
//     viewExt: 'ejs',
//     layout: '_layout',
//     root: path.join(__dirname, '../../../src/identity/email-password/default-views'),
//   });

//   // TODO [>1.0.0] Enable https redirecting for production
//   // if (process.env.NODE_ENV === 'production') {
//   //   app.proxy = true;
//   //   set(configuration, 'cookies.short.secure', true);
//   //   set(configuration, 'cookies.long.secure', true);

//   //   app.use(async(ctx, next): Promise<void> => {
//   //     if (ctx.secure) {
//   //       return await next();
//   //     }
//   //     if (ctx.method === 'GET' || ctx.method === 'HEAD') {
//   //       ctx.redirect(ctx.href.replace(/^http:\/\//i, 'https://'));
//   //     } else {
//   //       ctx.body = {
//   //         error: 'invalid_request',
//   //         // eslint-disable-next-line @typescript-eslint/naming-convention
//   //         error_description: 'do yourself a favor and only use https',
//   //       };
//   //       ctx.status = 400;
//   //     }
//   //   });
//   // }

//   // TODO [>1.0.0] Add persistant adapters
//   // let adapter;
//   // if (process.env.MONGODB_URI) {
//   //   adapter = require('./adapters/mongodb'); // eslint-disable-line global-require
//   //   await adapter.connect();
//   // }

//   const provider = new Provider(ISSUER, { ...configuration });

//   // TODO [>1.0.0] Use helmet to help with security
//   // provider.use(helmet());

//   app.use(routes(provider).routes());
//   app.use(mount(provider.app));

//   return app;
// }
