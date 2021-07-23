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

## Running the server

### Installing and running locally
```shell
npm install -g @solid/community-server
community-solid-server # add parameters if needed
```

### Installing and running from source
```shell
npm ci
npm start -- # add parameters if needed
```

### Running via Docker
```shell
# Build the Docker image
docker build --rm -f Dockerfile -t css:latest .
# Run the image against your `~/Solid` directory on `http://localhost:3000`
docker run --rm -v ~/Solid:/data -p 3000:3000 -it css:latest
# Use alternative built-in configurations
docker run --rm -p 3000:3000 -it css:latest -c config/default.json
# Use your own configuration mapped to the right directory
docker run --rm -v ~/solid-config:/config -p 3000:3000 -it css:latest -c /config/my-config.json
```

## Configuring the server
Community Solid Server (CSS) uses
[ComponentJS](https://componentsjs.readthedocs.io/en/latest/) to manage all
configuration for the server. There are a variety of configuration files for
common use cases in the `config` folder.

Additional recipes for configuring and deploying the server can be found at [solid/community-server-recipes](https://github.com/solid/community-server-recipes).

| Parameter              | Default                     | Description                                                                                                 |
| ---------              | -------                     | -----------                                                                                                 |
| `--port, -p`           | `3000`                      |                                                                                                             |
| `--baseUrl. -b`        | `"http://localhost:$PORT/"` | Needs to be set to the base URL of the server for authentication and authorization to function.             |
| `--config, -c`         | `"config/default.json"`     | `config/default.json` stores all data in memory. To persist data to your filesystem, try `config/file.json` |
| `--mainModulePath, -m` |                             | Absolute path to the package root from which ComponentJS module resolution should start.                    |
| `--loggingLevel, -l`   | `"info"`                    |                                                                                                             |
| `--rootFilePath, -f`   | `"./"`                      | Folder to start the server in when using a file-based config.                                               |
| `--sparqlEndpoint, -s` |                             | Endpoint to call when using a SPARQL-based config.                                                          |
| `--showStackTrace, -t` | false                       | Whether error stack traces should be shown in responses.                                                    |
| `--podConfigJson`      | `"./pod-config.json"`       | JSON file to store pod configuration when using a dynamic config.                                           |

## Developing server code
The [📗 API documentation](https://solid.github.io/community-server/docs/) and
the [📐 architectural diagram](https://rubenverborgh.github.io/solid-server-architecture/solid-architecture-v1-3-0.pdf)
can help you find your way.

If you want to help out with the development of this server,
have a look at the [📓 developer notes](guides/developer-notes.md) and
[🛠️ good first issues](https://github.com/solid/community-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).
