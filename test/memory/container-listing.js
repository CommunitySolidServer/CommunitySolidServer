'use strict';

const assert = require('node:assert/strict');
const { RepresentationMetadata } = require('../../dist/http/representation/RepresentationMetadata');
const { DataAccessorBasedStore } = require('../../dist/storage/DataAccessorBasedStore');
const { DC, LDP, POSIX, RDF, SOLID_META, XSD } = require('../../dist/util/Vocabularies');

const container = { path: 'http://example.com/large/' };
const childCount = 15_000;
const concurrency = 20;
let generatedChildren = 0;

const accessor = {
  async getMetadata(identifier) {
    const metadata = new RepresentationMetadata(identifier);
    metadata.add(RDF.terms.type, LDP.terms.Container);
    return metadata;
  },
  async* getChildren() {
    for (let i = 0; i < childCount; ++i) {
      generatedChildren += 1;
      const child = new RepresentationMetadata({ path: `${container.path}${i}` });
      child.add(RDF.terms.type, LDP.terms.Resource);
      child.add(DC.terms.modified, '2026-01-01T00:00:00.000Z');
      child.add(POSIX.terms.size, '1');
      yield child;
    }
  },
};
const identifierStrategy = {
  supportsIdentifier: identifier => identifier.path.startsWith('http://example.com/'),
};
const auxiliaryStrategy = {
  addMetadata: async() => {},
  isAuxiliaryIdentifier: () => false,
};
const metadataStrategy = {
  isAuxiliaryIdentifier: () => false,
};
const store = new DataAccessorBasedStore(accessor, identifierStrategy, auxiliaryStrategy, metadataStrategy);

let peakHeap = process.memoryUsage().heapUsed;

async function drainListing() {
  const representation = await store.getRepresentation(container);
  const empty = representation.metadata.get(SOLID_META.terms.containerEmpty, SOLID_META.terms.ResponseMetadata);
  assert.equal(empty.value, 'false');
  assert.equal(empty.datatype.value, XSD.boolean);
  let quadCount = 0;
  for await (const quad of representation.data) {
    assert.equal(quad.termType, 'Quad');
    quadCount += 1;
    if (quadCount % 10_000 === 0) {
      peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
    }
  }
}

Promise.all(Array.from({ length: concurrency }, drainListing)).then(() => {
  globalThis.gc();

  assert.equal(generatedChildren, childCount * concurrency);
  const peakMegabytes = peakHeap / 1024 / 1024;
  assert.ok(peakMegabytes < 110, `Peak heap ${peakMegabytes.toFixed(1)} MB exceeded the 110 MB limit`);
  process.stdout.write(`Container listing peak heap: ${peakMegabytes.toFixed(1)} MB\n`);
}).catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
