# Configuring the CSS as a development server in another project

It can be useful to use the CSS as local server to develop Solid applications against.
The CSS can be configured in the `package.json` as follows:

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
    "@solid/community-server": "^6.0.0"
  }
}
```

alternatively, the configuration parameters may be placed in a configuration file named
`.community-solid-server.config.json` as follows

```json
{
  "port": 3001,
  "loggingLevel": "error"
}
```

the config may also be written in javascript with the config as the default export
such as the following `.community-solid-server.config.js`

```js
module.exports = {
  port: 3001,
  loggingLevel: "error"
}
```
