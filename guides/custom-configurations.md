By default, the server will start with a set of preconfigured components.
These components are configured in [`config/default.json`](https://github.com/solid/community-server/tree/master/config/default.json).
Learn more about the structure of this config file in the [notes for developers](https://github.com/solid/community-server/wiki/Notes-for-developers#add-components-to-configuration).

## Local development environment

_This guide assumes the server is installed locally by cloning the git repo._

When starting the server via `bin/server.js`, you can provide another config via the `-c` flag.
For example:
```bash
$ bin/server.js -c config/default.json
```

The command above will behave in the exact same way as just running `bin/server.js`, since `config/default.json` is the default server config for when `-c` is not provided.

If you for example create a copy from `config/default.json` named `my-config.json`, and make some adjustments, you can invoke it as follows:
```bash
$ bin/server.js -c my-config.json
```

## Globally installed server

TODO: after making a first release, write a guide on how to create a custom config for it when it is globally installed.

## Including the server as dependency in another package.

TODO: after making a first release, write a guide on how to create a custom config for it when it is included as a dependency in another package.