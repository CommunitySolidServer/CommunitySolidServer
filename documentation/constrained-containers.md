# Constrained containers

In CSS, it is possible to have containers where all its resources conform to a given [SHACL](https://www.w3.org/TR/shacl/) shape.
Providing shape validation ensures that applications can then rely on the fact that 
the structure of the graph in the resources are valid.

## Constrained containers in practice

### Making a container constrained by a shape

* edit the container description resource

Note: 
* can only be done when there are no resources available in that container
* a container can only be constrained by one shape resource

### Discovery of a constrained container

It is now visible due to its link header

## Impact of constraining a container

* no non-RDF resources can be posted there
* no containers can be created in this constrained container as this does not conform to the shape.

## Example of a workflow on how to constrain a container
We have CSS container http://localhost:3000/container/ that we want to constrain with http://localhost:3000/shape.

Send request to the container

Optionally check when that has succeeded

Send requests, but now we know they will be validated against the shape
