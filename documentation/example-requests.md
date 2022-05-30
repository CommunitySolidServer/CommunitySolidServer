## Interacting with the server

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

