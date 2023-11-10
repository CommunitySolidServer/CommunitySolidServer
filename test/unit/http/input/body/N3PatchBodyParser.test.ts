import 'jest-rdf';
import type { Term } from '@rdfjs/types';
import { DataFactory } from 'n3';
import type { BodyParserArgs } from '../../../../../src/http/input/body/BodyParser';
import { N3PatchBodyParser } from '../../../../../src/http/input/body/N3PatchBodyParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { guardedStreamFrom } from '../../../../../src/util/StreamUtil';

const { defaultGraph, literal, namedNode, quad, variable } = DataFactory;

describe('An N3PatchBodyParser', (): void => {
  let input: BodyParserArgs;
  const parser = new N3PatchBodyParser();

  beforeEach(async(): Promise<void> => {
    input = {
      request: { headers: {}} as HttpRequest,
      metadata: new RepresentationMetadata({ path: 'http://example.com/foo' }, 'text/n3'),
    };
  });

  it('can only handle N3 data.', async(): Promise<void> => {
    input.metadata.contentType = 'text/plain';
    await expect(parser.canHandle(input)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    input.metadata.contentType = 'text/n3';
    await expect(parser.canHandle(input)).resolves.toBeUndefined();
  });

  it('errors on invalid N3.', async(): Promise<void> => {
    input.request = guardedStreamFrom([ 'invalid syntax' ]) as HttpRequest;
    await expect(parser.handle(input)).rejects.toThrow(BadRequestHttpError);
  });

  it('extracts the patch quads from the request.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName "Alex". };
  solid:deletes { ?person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    const patch = await parser.handle(input);
    expect(patch.conditions).toBeRdfIsomorphic([
      quad(variable('person'), namedNode('http://www.example.org/terms#familyName'), literal('Garcia')),
      quad(variable('person'), namedNode('http://www.example.org/terms#nickName'), literal('Garry')),
    ]);
    expect(patch.inserts).toBeRdfIsomorphic([
      quad(variable('person'), namedNode('http://www.example.org/terms#givenName'), literal('Alex')),
    ]);
    expect(patch.deletes).toBeRdfIsomorphic([
      quad(variable('person'), namedNode('http://www.example.org/terms#givenName'), literal('Claudia')),
    ]);
  });

  it('strips the graph from the result quads.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName "Alex". };
  solid:deletes { ?person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    const patch = await parser.handle(input);
    const quads = [ ...patch.deletes, ...patch.inserts, ...patch.conditions ];
    const uniqueGraphs = [ ...new Set(quads.map((entry): Term => entry.graph)) ];
    expect(uniqueGraphs).toHaveLength(1);
    expect(uniqueGraphs[0]).toEqualRdfTerm(defaultGraph());
  });

  it('errors if no solid:InsertDeletePatch is found.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName "Alex". };
  solid:deletes { ?person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects.toThrow(
      'This patcher only supports N3 Patch documents with exactly 1 solid:InsertDeletePatch entry, but received 0.',
    );
  });

  it('errors if multiple solid:InsertDeletePatch entries are found.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:other a solid:InsertDeletePatch.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName "Alex". };
  solid:deletes { ?person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects.toThrow(
      'This patcher only supports N3 Patch documents with exactly 1 solid:InsertDeletePatch entry, but received 2.',
    );
  });

  it('errors if the patch subject is not a blank or named node.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

?rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName "Alex". };
  solid:deletes { ?person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch subject needs to be a blank or named node.');
  });

  it('errors if there are multiple where entries.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:where { ?person ex:givenName "Alex". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch can have at most 1 http://www.w3.org/ns/solid/terms#where.');
  });

  it('errors if there are multiple delete entries.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:deletes   { ex:person ex:familyName "Garcia". };
  solid:deletes { ex:person ex:givenName "Alex". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch can have at most 1 http://www.w3.org/ns/solid/terms#deletes.');
  });

  it('errors if there are multiple insert entries.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:inserts   { ex:person ex:familyName "Garcia". };
  solid:inserts { ex:person ex:givenName "Alex". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch can have at most 1 http://www.w3.org/ns/solid/terms#inserts.');
  });

  it('errors if there are blank nodes in the delete formula.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName "Alex". };
  solid:deletes { _:person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch delete/insert formula can not contain blank nodes.');
  });

  it('errors if there are blank nodes in the insert formula.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { _:person ex:givenName "Alex". };
  solid:deletes { ?person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch delete/insert formula can not contain blank nodes.');
  });

  it('errors if there are unknown variables in the delete formula.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName "Alex". };
  solid:deletes { ?person ex:givenName ?name. }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch delete/insert formula can only contain variables found in the conditions formula.');
  });

  it('errors if there are unknown variables in the insert formula.', async(): Promise<void> => {
    const n3 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:where   { ?person ex:familyName "Garcia"; ex:nickName "Garry". };
  solid:inserts { ?person ex:givenName ?name. };
  solid:deletes { ?person ex:givenName "Claudia". }.`;
    input.request = guardedStreamFrom([ n3 ]) as HttpRequest;
    await expect(parser.handle(input)).rejects
      .toThrow('An N3 Patch delete/insert formula can only contain variables found in the conditions formula.');
  });
});
