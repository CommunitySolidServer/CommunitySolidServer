# Community Solid Server

<img src="https://raw.githubusercontent.com/CommunitySolidServer/CommunitySolidServer/main/templates/images/solid.svg"
 alt="[Solid logo]" height="150" align="right"/>

[![MIT license](https://img.shields.io/npm/l/@solid/community-server)](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/LICENSE.md)
[![npm version](https://img.shields.io/npm/v/@solid/community-server)](https://www.npmjs.com/package/@solid/community-server)
[![Node.js version](https://img.shields.io/node/v/@solid/community-server)](https://www.npmjs.com/package/@solid/community-server)
[![Build Status](https://github.com/CommunitySolidServer/CommunitySolidServer/workflows/CI/badge.svg)](https://github.com/CommunitySolidServer/CommunitySolidServer/actions)
[![Coverage Status](https://coveralls.io/repos/github/CommunitySolidServer/CommunitySolidServer/badge.svg)](https://coveralls.io/github/CommunitySolidServer/CommunitySolidServer)
[![DOI](https://zenodo.org/badge/265197208.svg)](https://zenodo.org/badge/latestdoi/265197208)
[![GitHub discussions](https://img.shields.io/github/discussions/CommunitySolidServer/CommunitySolidServer)](https://github.com/CommunitySolidServer/CommunitySolidServer/discussions)
[![Chat on Gitter](https://badges.gitter.im/CommunitySolidServer/community.svg)](https://gitter.im/CommunitySolidServer/community)

**The Community Solid Server is open software
that provides you with a [Solid](https://solidproject.org/) Pod and identity.
This Pod acts as your own personal storage space
so you can share data with people and Solid applications.**

As an open and modular implementation of the
[Solid specifications](https://solidproject.org/TR/),
the Community Solid Server is a great companion:

- 🧑🏽 **for people** who want to try out having their own Pod

- 👨🏿‍💻 **for developers** who want to create and test Solid apps

- 👩🏻‍🔬 **for researchers** who want to design new features for Solid

And, of course, for many others who like to experience Solid.

You can install the software locally or on your server
and get started with Solid immediately.

## ⚡ Running the server

To run the server, you will need [Node.js](https://nodejs.org/en/).
We support versions 14.14 and up.

If you do not use Node.js,
you can run a [Docker](https://www.docker.com/) version instead.

### 💻 Installing and running locally

After installing Node.js,
install the latest server version
from the [npm package repository](https://www.npmjs.com/):

```shell
npm install -g @solid/community-server
```

To run the server with in-memory storage, use:

```shell
community-solid-server # add parameters if needed
```

To run the server with your current folder as storage, use:

```shell
community-solid-server -c @css:config/file.json
```

### 📃 Installing and running from source

If you rather prefer to run the latest source code version,
or if you want to try a specific [branch](https://www.npmjs.com/) of the code,
you can use:

```shell
git clone https://github.com/CommunitySolidServer/CommunitySolidServer.git
cd CommunitySolidServer
npm ci
npm start -- # add parameters if needed
```

### 📦 Running via Docker

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

### 🗃️ Helm Chart

The official [Helm](https://helm.sh/) Chart for Kubernetes deployment is maintained at
[CommunitySolidServer/css-helm-chart](https://github.com/CommunitySolidServer/css-helm-chart) and published on
[ArtifactHUB](https://artifacthub.io/packages/helm/community-solid-server/community-solid-server).
There you will find complete installation instructions.

```shell
# Summary
helm repo add community-solid-server https://communitysolidserver.github.io/css-helm-chart/charts/
helm install my-css community-solid-server/community-solid-server
```

## 🔧 Configuring the server

The Community Solid Server is designed to be flexible
such that people can easily run different configurations.
This is useful for customizing the server with plugins,
testing applications in different setups,
or developing new parts for the server
without needing to change its base code.

### ⏱ Parameters

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
| `--seedConfig`         |                            | Path to the file that keeps track of seeded account configurations.                                                                               |
| `--mainModulePath, -m`  |                            | Path from where Components.js will start its lookup when initializing configurations.                                                         |
| `--workers, -w`         | `1`                        | Run in multithreaded mode using workers. Special values are `-1` (scale to `num_cores-1`), `0` (scale to `num_cores`) and 1 (singlethreaded). |

### 🔀 Multithreading

The Community Solid Server can be started in multithreaded mode with any config. The config must only contain components
that are threadsafe though. If a non-threadsafe component is used in multithreaded mode, the server will describe with
an error which class is the culprit.

```shell
# Running multithreaded with autoscaling to number of logical cores minus 1
npm start -- -c config/file.json -w -1
```

### 🖥️ Environment variables

Parameters can also be passed through environment variables.

They are prefixed with `CSS_` and converted from `camelCase` to `CAMEL_CASE`

> eg. `--showStackTrace` => `CSS_SHOW_STACK_TRACE`

**Note: command-line arguments will always override environment variables!**

### 🧶 Custom configurations

More substantial changes to server behavior can be achieved
by writing new configuration files in JSON-LD.
The Community Solid Server uses [Components.js](https://componentsjs.readthedocs.io/en/latest/)
to specify how modules and components need to be wired together at runtime.

Examples and guidance on configurations
are available in the [`config` folder](https://github.com/CommunitySolidServer/CommunitySolidServer/tree/main/config),
and the [configurations tutorial](https://github.com/CommunitySolidServer/tutorials/blob/main/custom-configurations.md).
There is also a [configuration generator](https://communitysolidserver.github.io/configuration-generator/).

Recipes for configuring the server can be found at [CommunitySolidServer/recipes](https://github.com/CommunitySolidServer/recipes).

## 👩🏽‍💻 Developing server code

The server allows writing and plugging in custom modules
without altering its base source code.

The [📗 API documentation](https://communitysolidserver.github.io/CommunitySolidServer/5.x/docs) and
the [📓 user documentation](https://communitysolidserver.github.io/CommunitySolidServer/)
can help you find your way.
There is also a repository of [📚 comprehensive tutorials](https://github.com/CommunitySolidServer/tutorials/)

## 📜 License

The Solid Community Server code
is copyrighted by [Inrupt Inc.](https://inrupt.com/)
and [imec](https://www.imec-int.com/)
and available under the [MIT License](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/LICENSE.md).

## 🎤 Feedback and questions

Don't hesitate to [start a discussion](https://github.com/CommunitySolidServer/CommunitySolidServer/discussions)
or [report a bug](https://github.com/CommunitySolidServer/CommunitySolidServer/issues).

Learn more about Solid at [solidproject.org](https://solidproject.org/).
