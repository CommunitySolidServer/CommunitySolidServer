#!/usr/bin/env node
const { AppRunner } = require('..');

// Attaching a logger to the uncaughtExceptionMonitor event,
// such that the default uncaughtException behavior still occurs.
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error(`Process is halting due to an ${origin} with error ${err.message}`);
});

new AppRunner().runCliSync(process);
