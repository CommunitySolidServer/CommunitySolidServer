# Configuring the CSS as a development server in another project

It can be useful to use the CSS as local server to develop Solid applications against.
There are several ways to configure and run a server in your project.
Note that starting up the server takes some time so set your timeout high enough if you are using this in your tests.

## Starting the server through code

You can create a server instance in your code, or tests, by calling the `create` function of a new `AppRunner` instance.
The resulting object has `start` and `stop` functions.
The `create` function takes as input an object with 5 optional parameters
which can all be used to define the server configuration.
None of these are mandatory, if you don't think you need one you can probably ignore it.
These are discussed below.

### loaderProperties

These values are specifically to configure how Components.js handles starting the server.
Most of these are generally not going to be relevant,
but here are some of those you might want to change:

* **mainModulePath**: Determines where Components.js will look for components.
                        Defaults to the folder where the server dependency is installed.
                        In case you are making a custom component,
                        this value needs to point to the directory of your project instead.
* **logLevel**: The logging level of Components.js when building. Defaults to `warn`.

### config

The file path of the Components.js configuration that needs to be used.
This can also be an array of configuration paths.
The `@css:` prefix can be used for file paths to generate a path
relative to the folder where the server dependency is installed.
Defaults to `@css:config/default.json`.

### variableBindings

Allows you to assign values to the variables that are used in a Components.js configuration.
For example, `{ 'urn:solid-server:default:variable:port': 3000  }` tells the server to use port 3000.

### shorthand

Allows you to assign values to parameters similarly as if you would call the server from the CLI.
For example, `{ port: 3000  }` tells the server to use port 3000.

This is very similar to the `variableBindings` field mentioned above,
as CLI parameters all get translated into Components.js variables,
although some get transformed before being put into a variable.
If you are not sure which one to use, `shorthand` is the safer choice to use.

### argv

If used, this parameter expects a string array.
Here you can provide the raw dump of CLI values,
so you don't have to parse them yourself,
should this be useful for your application.

## Configuring the server in `package.json`

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
command is executed as an `npm` script (as shown in the example above).
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
  loggingLevel: 'error'
};
```
