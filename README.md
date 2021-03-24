# Community Solid Server
[![Build Status](https://github.com/solid/community-server/workflows/CI/badge.svg)](https://github.com/solid/community-server/actions)
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
This server is in beta stage, which means you can start using it for developing
and testing apps, with some limitations:
- User account / pod creation is not yet supported fully, and you must rely on
  an external identity provider to log you in and authenticate your WebID.
  [solid/node-solid-server](https://github.com/solid/node-solid-server) or any
  other pod provider can serve this purpose, and all you need to do is pass in
  an external WebID when creating pods. More information on creating pods can be
  found under [Interacting with the server](#interacting-with-the-server).
- The spec is still under active development, and as such some features (like
  `trustedApps`) are not yet implemented because they are likely to change. If
  your users rely on this functionality, migrating is not yet recommended.

Your feedback is most welcome as [issues on this
repository](https://github.com/solid/community-server/issues/new).

However, you can already boot up the server, play around with it, and check how
it is made.

The [📗 API documentation](https://solid.github.io/community-server/docs/) and
the [📐 architectural
diagram](https://rubenverborgh.github.io/solid-server-architecture/solid-architecture-v1-3-0.pdf)
can help you find your way. The organization and structure of the classes and
components in the [src folder](/src) is designed to align with this
architectural diagram to the extent possible (i.e. the [ldp folder](src/ldp)
should contain all the components from the `ldp` section of the diagram.

If you are interested in helping out with the development of this server, be
sure to have a look at the [📓 developer
notes](documentation/Notes-for-developers.md) and
[🛠️ good first
issues](https://github.com/solid/community-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## Running the server

### Configuring the server
Community Solid Server (CSS) uses
[ComponentJS](https://componentsjs.readthedocs.io/en/latest/) to manage all
configuration for the server. There are a variety of configuration files for
common use cases in the `config` folder.

Additional recipes for configuring and deploying the server can be found at [solid/community-server-recipes](https://github.com/solid/community-server-recipes).

| Parameter | Default | Description |
| --------- | ------- | ----------- |
| `--port, -p` | `3000` | |
| `--baseUrl. -b` | `"http://localhost:$PORT/"` | Needs to be set to the base URL of the server for authnetication and authorization to function. |
| `--config, -c` | `"config/config-default.json"` | `config-default.json` stores all data in memory. If you would like to persist data to your filesystem, try `config-file.json` |
| `--mainModulePath, -m` | | Absolute path to the package root from which ComponentJS module resolution should start. |
| `--loggingLevel, -l` | `"info"`| |
| `--podTemplateFolder, -t` | `"templates/pod"` | Folder containing the templates used for pod provisioning. |
| `--rootFilePath, -f` | `"./"` | Folder to start the server in when using a file-based config. |
| `--sparqlEndpoint, -s` | | Endpoint to call when using a SPARQL-based config. |
| `--podConfigJson` | `"./pod-config.json"` | JSON file to store pod configuration when using a dynamic config. |

### Installing and running locally

```shell
$ npm ci
$ npm start [-- ARGS]
```

## Interacting with the server
CSS is still under active development, and as such the easiest and fastest way
to understand what functionality is supported is to read the integration tests.
This section is only intended as a high level summary of what's supported.

The server supports low-level interaction via HTTP methods, such as `GET`,
`PUT`, `HEAD`, ...

Below, we provide several examples on how to interact with the server using
`curl`.

### `POST`: Creating a new pod

Create a pod using an external WebID for authentication:
```shell
curl -X POST -H "Content-Type: application/json" \
  -d '{"login": "timbl", "webId": "http://timbl.inrupt.net/profile/card#me"}' \
  http://localhost:3000/pods
```

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

## Run using Docker

A Docker image is available to run the containerised Solid Community Server against your filesystem.

Common usage:
- Build the Docker image
  ```shell
  docker build --rm -f Dockerfile -t css:latest .
  ```
- Run the image against your `~/Solid` directory on `http://localhost:3000`
  ```shell
  docker run --rm -v ~/Solid:/data -p 3000:3000 -it css:latest
  ```
- Use alternative versions of the built in config. The filestorage is just the default configuration, you can override with any of the configurations included with the server
  ```shell
  docker run --rm -p 3000:3000 -it css:latest -c config/config-default.json
  ```
  Or override it with your own config mapped to the right directory
  ```shell
  docker run --rm -v ~/solid-config:/config -p 3000:3000 -it css:latest -c /config/my-config.json
  ```

## Using the identity provider

1. Launch the Community Solid Server:
    ```bash
    git clone git@github.com:solid/community-server.git
    cd community-server
    npm ci
    npm start
    ```
2. To use the identity provider, you need a compatible client application.

    You can use for example `@inrupt/solid-client-authn-js`:

    ```bash
    git clone https://github.com/inrupt/solid-client-authn-js
    cd solid-client-authn-js
    npm ci
    cd packages/node/example/demoClientApp/
    npm ci
    npm start
    ```

    Go to `http://localhost:3001`.
3. Use the base URL of your running CSS instance to as Identity provider, for
   example `http://localhost:3000`, to fill the form. Click the `login` button.
4. Follow the instructions to register/login/...

    A WebID hosted in your pod will be required to complete registration.
    
    In your running community server, you could create `http://localhost:3000/profile/card`
    with the following content:
    ```turtle
    prefix : <#>
    prefix solid: <http://www.w3.org/ns/solid/terms#>

    :me solid:oidcIssuer <http://localhost:3000/> .
    ```

    When registering, follow the on screen instructions and add the OIDC issuer
    registration token to your WebID, which you can do for example by PATCHing
    `http://localhost:3000/profile/card` with:
    ```turtle
    PREFIX : <#>
    PREFIX solid: <http://www.w3.org/ns/solid/terms#>
    INSERT DATA {
      :me solid:oidcIssuerRegistrationToken "IDP_TOKEN" .
    }
    ```
5. Once logged in, you get redirected to your client app, running for example on
   `http://localhost:3001/`.
6. You're now authenticated and can fetch public and private resources.
