# Init
Options related to the server initialization.
This is the entry point to the main server setup.

## Handler
Contains a list of initializer that need to be run when starting the server.
For example, when acl authorization is used,
an initializer will be added that makes sure there is an acl file in the root.
* *default*: The default setup that makes sure the root container is marked as pim:storage.
