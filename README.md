# Community Solid Server

An open and modular implementation of the [Solid specifications](https://solid.github.io/specification/) 

- Community Solid Server is open software
to provide people with their own data pod.

- It will give developers an environment
to create and test new Solid applications.

- Its modular architecture will allows us
to try out new ideas on the server side
and thereby shape the future of Solid.

## Current status
This software is in **alpha status**,
which means it is **too early for use with Solid apps**.

However, you can already boot up the server,
play around with it,
and check how it is made.

## Running locally

```
npm ci
npm start
```

## Interacting with the server

The server supports low-level interaction via HTTP methods,
such as `GET`, `PUT`, `HEAD`, ...

Below, we provide several examples on how to interact with the server using `curl`.

### `PUT`: Creating resources for a given URL

Create a plain text file:
```bash
$ curl -X PUT -H "Content-Type: text/plain" \
  -d "abc" \
  http://localhost:3000/myfile.txt
```

Create a turtle file:
```bash
$ curl -X PUT -H "Content-Type: text/turtle" \
  -d "<ex:s> <ex:p> <ex:o>." \
  http://localhost:3000/myfile.ttl
```

### `POST`: Creating resources at a generated URL

Create a plain text file:
```bash
$ curl -X POST -H "Content-Type: text/plain" \
  -d "abc" \
  http://localhost:3000/
```

Create a turtle file:
```bash
$ curl -X POST -H "Content-Type: text/turtle" \
  -d "<ex:s> <ex:p> <ex:o>." \
  http://localhost:3000/
```

The response's `Location` header will contain the URL of the created resource.

### `GET`: Retrieving resources

Retrieve a plain text file:
```bash
$ curl -H "Accept: text/plain" \
  http://localhost:3000/myfile.txt
```

Retrieve a turtle file:
```bash
$ curl -H "Accept: text/turtle" \
  http://localhost:3000/myfile.ttl
```

Retrieve a turtle file in a different serialization:
```bash
$ curl -H "Accept: application/ld+json" \
  http://localhost:3000/myfile.ttl
```

### `DELETE`: Deleting resources

```bash
$ curl -X DELETE http://localhost:3000/myfile.txt
```

### `PATCH`: Modifying resources

Currently, only patches over RDF resources are supported using [SPARQL Update](https://www.w3.org/TR/sparql11-update/)
queries without `WHERE` clause.

```bash
$ curl -X PATCH -H "Content-Type: application/sparql-update" \
  -d "INSERT DATA { <ex:s2> <ex:p2> <ex:o2> }" \
  http://localhost:3000/myfile.ttl
```

### `HEAD`: Retrieve resources headers

```bash
$ curl -I -H "Accept: text/plain" \
  http://localhost:3000/myfile.txt
```

### `OPTIONS`: Retrieve resources communication options

```bash
$ curl -X OPTIONS -i http://localhost:3000/myfile.txt
```
