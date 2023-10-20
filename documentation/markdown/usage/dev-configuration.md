# Configuring the CSS as a development server in another project

It can be useful to use the CSS as local server to develop Solid applications against.
As an alternative to using CLI arguments, or environment variables, the CSS can be configured in the `package.json` as follows:

```json
{
  "name": "test",
  "version": "0.0.0",
  "private": "true",
  "config": {
    "community-solid-server": {
      "port": 3001,
      "loggingLevel": "error"
    }
  },
  "scripts": {
    "dev:pod": "community-solid-server"
  },
  "devDependencies": {
    "@solid/community-server": "^7.0.0"
  }
}
```

These parameters will then be used when the `community-solid-server`
command is executed as an npm script (as shown in the example above).
Or whenever the `community-solid-server` command is executed in the same
folder as the `package.json`.

Alternatively, the configuration parameters may be placed in a configuration file named
`.community-solid-server.config.json` as follows:

```json
{
  "port": 3001,
  "loggingLevel": "error"
}
```

The config may also be written in JavaScript with the config as the default export
such as the following `.community-solid-server.config.js`:

```js
module.exports = {
  port: 3001,
  loggingLevel: "error"
};
```
