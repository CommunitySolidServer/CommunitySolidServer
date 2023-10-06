# App

Options related to the server startup.

## Init

Contains a list of initializer that need to be run when starting the server.

* *default*: The default setup. The ParallelHandler can be used to add custom Initializers.
* *initialize-root*: Makes sure the root container has the necessary resources to function properly.
* *initialize-prefilled-root*: Similar to `initialize-root` but adds an index page to the root container.
* *initialize-intro*: Similar to `initialize-prefilled-root` but adds an index page
                      specific to the memory-based server of the default configuration.
* *initialize-root-pod*: Initializes the server with a pod in the root.
                         Email and password have not yet been set and need to be defined in the base configuration.
                         See `file-root-pod.json` for an example.
* *static-root*: Shows a static introduction page at the server root. This is not a Solid resource.

## Main

This is the entry point to the main server setup.

* *default*: The main application. This should only be changed/replaced
  if you want to start from a different kind of class.

## Variables

Handles parsing CLI parameters and assigning values to Components.js variables.
Some parts of the configuration contains variables that can be set as arguments on the command-line.
That way, you don't have to edit the configuration files for small changes,
such as starting the server with a different hostname.
Here, you can customize the mapping from CLI arguments into values for those variables.

* *default*: Assigns CLI parameters for all variables defined in `/config/util/variables/default.json`
