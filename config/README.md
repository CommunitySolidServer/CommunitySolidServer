This folder contains several configurations that can be used to start up the server.
All those configurations are created in the same way:
features are enabled or disabled by choosing a specific option for every component.
All components are represented by the subfolders found in the folders here:
`ldp` contains all LDP related components,
`identity` all IDP components, etc.
Options are then chosen by importing 1 entry from every component subfolder.
In case none of the available options have the exact feature configuration you want,
it is always possible to not choose any of them and create your own custom version instead.

# How to use
The easiest way to create a new config is by creating a JSON-LD file
that imports one option from every component subfolder 
(such as either `allow-everything.json` or `webacl.json` from `ldp/authorization`).
In case none of the available options suffice, there are 2 other ways to handle this:

## Append to an existing config
In case the options mostly suffice, but they just need to do a bit more,
it might be possible to append to one of the solutions.

For example, in case all the existing metadata parsers can remain,
but an additional one needs to be added,
you could import `ldp/metadata-parser/default.json`
and then add the following in your root config:
```json
    {
      "@id": "urn:solid-server:default:MetadataParser",
      "ParallelHandler:_handlers": [
        { "@type": "MyNewParser" }
      ]
    }
```
This will add the new parser to the list of metadata parsers.

Note that generally it is only advised to append to ParallelHandlers or key/value maps.
In case the order is important this can not be guaranteed over separate files.

## Create a new option
If a more drastic change is required,
the solution is to not import anything from that folder but instead write your own.

For example, in case you only want the slug parser but not any of the others,
you would have to not import anything from `ldp/metadata-parser` folder,
but instead have the following in your root config:
```json
    {
      "@id": "urn:solid-server:default:MetadataParser",
      "@type": "ParallelHandler",
      "handlers": [
        { "@type": "SlugParser" }
      ]
    }
```
Don't forget that in some cases you would also have to copy some imports!
The existing options can be used as inspiration.
