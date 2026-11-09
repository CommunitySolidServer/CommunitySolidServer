/* eslint-disable no-console */
// Benchmark: standard full-pod walk vs. the incremental QuotaCounter.
// Run with: node scripts/benchmark-quota-counter.cjs
'use strict';

const { promises: fs } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { FileSizeReporter } = require('../dist/storage/size-reporter/FileSizeReporter');
const { DuSizeReporter } = require('../dist/storage/size-reporter/DuSizeReporter');
const { QuotaCounter } = require('../dist/storage/quota/QuotaCounter');

const IGNORE = [ '(^|/)\\.internal$' ];
const FILES = 3000;
const FILE_SIZE = 1024;

async function timeMsAsync(fn) {
  const start = process.hrtime.bigint();
  await fn();
  return Number(process.hrtime.bigint() - start) / 1e6;
}

async function main() {
  const root = await fs.mkdtemp(join(tmpdir(), 'quota-bench-'));
  const podPath = join(root, 'alice');
  await fs.mkdir(podPath, { recursive: true });
  const payload = Buffer.alloc(FILE_SIZE, 1);
  for (let i = 0; i < FILES; i++) {
    await fs.writeFile(join(podPath, `f${i}.bin`), payload);
  }

  const mapper = {
    async mapUrlToFilePath(identifier, isMetadata) {
      const url = new URL(identifier.path);
      const base = join(root, url.pathname);
      return { identifier, filePath: isMetadata ? `${base}.meta` : base, contentType: undefined, isMetadata };
    },
    async mapFilePathToUrl() {
      throw new Error('Not implemented');
    },
  };
  const POD = { path: 'http://example.com/alice/' };

  // 1. Standard FileSizeReporter: one full pod walk (what the default quota
  //    setup performs on every write).
  const fileReporter = new FileSizeReporter(mapper, root);
  const tWalk = await timeMsAsync(() => fileReporter.getSize(POD));
  console.log(`FileSizeReporter  full pod walk (${FILES} x ${FILE_SIZE}B): ${tWalk.toFixed(2)} ms`);

  // 2. QuotaCounter bootstrap: first access, fresh counter -> one full walk.
  const counter = new QuotaCounter(mapper, root, IGNORE);
  await counter.register(POD);
  const tBootstrap = await timeMsAsync(() => counter.getSize(POD));
  console.log(`QuotaCounter      bootstrap walk:                    ${tBootstrap.toFixed(2)} ms`);

  // 3. QuotaCounter after bootstrap: O(1) in-memory read.
  const tCached = await timeMsAsync(() => counter.getSize(POD));
  console.log(`QuotaCounter      getSize (cached, O(1)):            ${tCached.toFixed(3)} ms`);

  // 4. QuotaCounter.add: O(1) delta + atomic sidecar persist (per-write cost).
  const tAdd = await timeMsAsync(() => counter.add(POD, 100));
  console.log(`QuotaCounter      add delta + sidecar persist:       ${tAdd.toFixed(3)} ms`);

  // 5. DuSizeReporter: cached du/Node walker (the A+B design).
  const duReporter = new DuSizeReporter(mapper, root, IGNORE, 5000);
  const tDu = await timeMsAsync(() => duReporter.getSize(POD));
  console.log(`DuSizeReporter    first getSize (walk):              ${tDu.toFixed(2)} ms`);
  const tDuCached = await timeMsAsync(() => duReporter.getSize(POD));
  console.log(`DuSizeReporter    cached getSize:                    ${tDuCached.toFixed(3)} ms`);

  await fs.rm(root, { recursive: true, force: true });
  console.log(`\nSpeedup per write check: ${(tWalk / Math.max(tCached, 0.001)).toFixed(0)}x (walk vs. O(1) counter)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
