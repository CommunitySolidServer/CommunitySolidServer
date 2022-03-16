# Starting the Community Solid Server

## Quickly spinning up a server

Use [Node.js](https://nodejs.org/en/) 18.0 or up and execute:

```shell
npx @solid/community-server
```

Now visit your brand new server at [http://localhost:3000/](http://localhost:3000/)!

To persist your pod's contents between restarts, use:

```shell
npx @solid/community-server -c @css:config/file.json -f data/
```

## Local installation

Install the npm package globally with:

```shell
npm install -g @solid/community-server
```

To run the server with in-memory storage, use:

```shell
community-solid-server # add parameters if needed
```

To run the server with your current folder as storage, use:

```shell
community-solid-server -c @css:config/file.json -f data/
```

## Configuring the server

The Community Solid Server is designed to be flexible
such that people can easily run different configurations.
This is useful for customizing the server with plugins,
testing applications in different setups,
or developing new parts for the server
without needing to change its base code.

An easy way to customize the server is
by passing parameters to the server command.
These parameters give you direct access
to some commonly used settings:

| parameter name          | default value              | description                                                                                                                                   |
|-------------------------|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `--port, -p`            | `3000`                     | The TCP port on which the server should listen.                                                                                               |
| `--baseUrl, -b`         | `http://localhost:$PORT/`  | The base URL used internally to generate URLs. Change this if your server does not run on `http://localhost:$PORT/`.                          |
| `--socket`              |                            | The Unix Domain Socket on which the server should listen. `--baseUrl` must be set if this option is provided                                  |
| `--loggingLevel, -l`    | `info`                     | The detail level of logging; useful for debugging problems. Use `debug` for full information.                                                 |
| `--config, -c`          | `@css:config/default.json` | The configuration(s) for the server. The default only stores data in memory; to persist to your filesystem, use `@css:config/file.json`       |
| `--rootFilePath, -f`    | `./`                       | Root folder where the server stores data, when using a file-based configuration.                                                              |
| `--sparqlEndpoint, -s`  |                            | URL of the SPARQL endpoint, when using a quadstore-based configuration.                                                                       |
| `--showStackTrace, -t`  | false                      | Enables detailed logging on error output.                                                                                                     |
| `--podConfigJson`       | `./pod-config.json`        | Path to the file that keeps track of dynamic Pod configurations. Only relevant when using `@css:config/dynamic.json`.                         |
| `--seedConfig`          |                            | Path to the file that keeps track of seeded account configurations.                                                                           |
| `--mainModulePath, -m`  |                            | Path from where Components.js will start its lookup when initializing configurations.                                                         |
| `--workers, -w`         | `1`                        | Run in multithreaded mode using workers. Special values are `-1` (scale to `num_cores-1`), `0` (scale to `num_cores`) and 1 (singlethreaded). |

Parameters can also be passed through environment variables.

They are prefixed with `CSS_` and converted from `camelCase` to `CAMEL_CASE`

> eg. `--showStackTrace` => `CSS_SHOW_STACK_TRACE`

Command-line arguments will always override environment variables.

## Alternative ways to run the server

### From source

If you rather prefer to run the latest source code version,
or if you want to try a specific [branch](https://www.npmjs.com/) of the code,
you can use:

```shell
git clone https://github.com/CommunitySolidServer/CommunitySolidServer.git
cd CommunitySolidServer
npm ci
npm start -- # add parameters if needed
```

### Via Docker

Docker allows you to run the server without having Node.js installed. Images are built on each tagged version and hosted
on [Docker Hub](https://hub.docker.com/r/solidproject/community-server).

```shell
# Clone the repo to get access to the configs
git clone https://github.com/CommunitySolidServer/CommunitySolidServer.git
cd CommunitySolidServer
# Run the image, serving your `~/Solid` directory on `http://localhost:3000`
docker run --rm -v ~/Solid:/data -p 3000:3000 -it solidproject/community-server:latest
# Or use one of the built-in configurations
docker run --rm -p 3000:3000 -it solidproject/community-server -c config/default.json
# Or use your own configuration mapped to the right directory
docker run --rm -v ~/solid-config:/config -p 3000:3000 -it solidproject/community-server -c /config/my-config.json
# Or use environment variables to configure your css instance
docker run --rm -v ~/Solid:/data -p 3000:3000 -it -e CSS_CONFIG=config/file-no-setup.json -e CSS_LOGGING_LEVEL=debug solidproject/community-server
```

### Using a Helm Chart

The official [Helm](https://helm.sh/) Chart for Kubernetes deployment is maintained at
[CommunitySolidServer/css-helm-chart](https://github.com/CommunitySolidServer/css-helm-chart) and published on
[ArtifactHUB](https://artifacthub.io/packages/helm/community-solid-server/community-solid-server).
There you will find complete installation instructions.

```shell
# Summary
helm repo add community-solid-server https://communitysolidserver.github.io/css-helm-chart/charts/
helm install my-css community-solid-server/community-solid-server
```
