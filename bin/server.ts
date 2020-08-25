#!/usr/bin/env node
import { ExpressHttpServer } from '..';
import { SimpleServerConfiguration } from '../configs/SimpleServerConfiguration';
import yargs from 'yargs';

const { argv } = yargs
  .usage('node ./bin/server.js [args]')
  .options({
    port: { type: 'number', alias: 'p', default: 3000 },
  })
  .help();

const { port } = argv;

const configuration = new SimpleServerConfiguration(port);

configuration.getHttpServer().then((httpServer: ExpressHttpServer): void => {
  httpServer.listen(port);
  process.stdout.write(`Running at ${configuration.base}\n`);
}).catch((error: any): void => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
