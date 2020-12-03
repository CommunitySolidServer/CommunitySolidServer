# Community Solid Server
[![Build Status](https://travis-ci.com/solid/community-server.svg?branch=master)](https://travis-ci.com/solid/community-server)
[![Coverage Status](https://coveralls.io/repos/github/solid/community-server/badge.svg)](https://coveralls.io/github/solid/community-server)
[![npm version](https://img.shields.io/npm/v/@solid/community-server)](https://www.npmjs.com/package/@solid/community-server)

**An open and modular implementation of the
[Solid](https://solidproject.org/)
[specifications](https://solid.github.io/specification/)**

- Community Solid Server is open software
to provide people with their own Solid Pod.

- It will give developers an environment
to create and test new Solid applications.

- Its modular architecture allows
trying out new ideas on the server side
and thereby shape the future of Solid.

## Current status
This server is in beta stage,
which means you can start using it for developing and testing apps.
Your feedback is most welcome
as [issues on this repository](https://github.com/solid/community-server/issues/new).

However, you can already boot up the server,
play around with it,
and check how it is made.
<br>
The [architectural diagram](https://github.com/RubenVerborgh/solid-server-architecture)
can help you find your way.

If you are interested in helping out with the development of this server,
be sure to have a look at the [developer notes](https://github.com/solid/community-server/wiki/Notes-for-developers)
and [good first issues](https://github.com/solid/community-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## Running locally

```shell
npm ci
npm start
```

This will start up a server running on port 3000 with a backend storing all data in memory.
More configurations with different backends can be found in the `config` folder.

## Interacting with the server

The server supports low-level interaction via HTTP methods,
such as `GET`, `PUT`, `HEAD`, ...

Below, we provide several examples on how to interact with the server using `curl`.

### `PUT`: Creating resources for a given URL

Create a plain text file:
```shell
curl -X PUT -H "Content-Type: text/plain" \
  -d "abc" \
  http://localhost:3000/myfile.txt
```

Create a turtle file:
```shell
curl -X PUT -H "Content-Type: text/turtle" \
  -d "<ex:s> <ex:p> <ex:o>." \
  http://localhost:3000/myfile.ttl
```

### `POST`: Creating resources at a generated URL

Create a plain text file:
```shell
curl -X POST -H "Content-Type: text/plain" \
  -d "abc" \
  http://localhost:3000/
```

Create a turtle file:
```shell
curl -X POST -H "Content-Type: text/turtle" \
  -d "<ex:s> <ex:p> <ex:o>." \
  http://localhost:3000/
```

The response's `Location` header will contain the URL of the created resource.

### `GET`: Retrieving resources

Retrieve a plain text file:
```shell
curl -H "Accept: text/plain" \
  http://localhost:3000/myfile.txt
```

Retrieve a turtle file:
```shell
curl -H "Accept: text/turtle" \
  http://localhost:3000/myfile.ttl
```

Retrieve a turtle file in a different serialization:
```shell
curl -H "Accept: application/ld+json" \
  http://localhost:3000/myfile.ttl
```

### `DELETE`: Deleting resources

```shell
curl -X DELETE http://localhost:3000/myfile.txt
```

### `PATCH`: Modifying resources

Currently, only patches over RDF resources are supported using [SPARQL Update](https://www.w3.org/TR/sparql11-update/)
queries without `WHERE` clause.

```shell
curl -X PATCH -H "Content-Type: application/sparql-update" \
  -d "INSERT DATA { <ex:s2> <ex:p2> <ex:o2> }" \
  http://localhost:3000/myfile.ttl
```

### `HEAD`: Retrieve resources headers

```shell
curl -I -H "Accept: text/plain" \
  http://localhost:3000/myfile.txt
```

### `OPTIONS`: Retrieve resources communication options

```shell
curl -X OPTIONS -i http://localhost:3000/myfile.txt
```
