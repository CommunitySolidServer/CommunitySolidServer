# App

Options related to the server startup.

## Init

Contains a list of initializer that need to be run when starting the server.

* *default*: The default setup. The ParallelHandler can be used to add custom Initializers.
* *initialize-root*: Makes sure the root container has the necessary resources to function properly.
                     This is only relevant if setup is disabled but root container access is still required.
* *initialize-prefilled-root*: Similar to `initialize-root` but adds some introductory resources to the root container.

## Main

This is the entry point to the main server setup.

* *default*: The main application. This should only be changed/replaced
  if you want to start from a different kind of class.

## Setup

Handles the setup page the first time the server is started.

* *disabled*: Disables the setup page. Root container access will be impossible unless handled by the Init config above.
              Registration and pod creation is still possible if that feature is enabled.
* *optional*: Setup is available at `/setup` but the server can already be used.
              Everyone can access the setup page so make sure to complete that as soon as possible.
* *required*: All requests will be redirected to the setup page until setup is completed.

## Variables

Handles parsing CLI parameters and assigning values to Components.js variables.
Some parts of the configuration contains variables that can be set as arguments on the command-line.
That way, you don't have to edit the configuration files for small changes,
such as starting the server with a different hostname.
Here, you can customize the mapping from CLI arguments into values for those variables.

* *default*: Assigns CLI parameters for all variables defined in `/config/util/variables/default.json`
