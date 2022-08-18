# Constrained containers

In CSS, it is possible to have containers where all its resources conform to a given [SHACL](https://www.w3.org/TR/shacl/) shape.
Providing shape validation ensures that applications can then rely on the fact that 
the structure of the graph in the resources are valid.

## Constrained containers in practice

### Making a container constrained by a shape

A container can be made shape constrained by editing its description resource.
A triple of the form `?container ldp:constrainedBy ?shape .` must be added,
where `?container` is the URL of the container being made constrained and `?shape` is the URL of the SHACL shape.

A precondition for making a container constrained is that the container must not contain any resource at initialisation of making it shape constrained.
Furthermore, it is only possible to initialise one shape resource per container.

### Discovery of a constrained container

Exposing that a container is constrained by shape is done through advertising a Link Header
with `"rel"` `http://www.w3.org/ns/ldp#constrainedBy` as is defined in [LDP](https://www.w3.org/TR/ldp/) 4.2.1.6.

## Impact of constraining a container

Obviously, only resources can be created that conform to the constraints on a constrained container.
However, some additional restrictions are enforced by the server on that container:

* It is not possible to add any non-RDF resources.
* Creating containers within this constrained container is not allowed.
* Requests that results into a resource where no targetClasses from the shape are present are prohibited and will thus produce an error.

## Example of a workflow on how to constrain a container

In this example, we want to constrain a container `http://localhost:3000/container/` with a SHACL shape.

We have started the CSS with the default configuration and have already created a container at `http://localhost:3000/container/`
and added a SHACL shape at `http://localhost:3000/shape`.

We make the container constrained by adding the constraint to the description resource of the container.

```shell
curl -X PATCH 'http://localhost:3000/container/.meta' \
-H 'Content-Type: text/n3' \
--data-raw  '@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<> a solid:InsertDeletePatch;
solid:inserts { <http://localhost:3000/container/> <http://www.w3.org/ns/ldp#constrainedBy> <http://localhost:3000/shape>. }.'
```

After this update, we can verify that the container is indeed constrained with a shape by
performing a `HEAD` request to container.

```curl
curl --head http://localhost:3000/container/ 
```
which will produce a response with at least this header:

```HTTP
Link: <http://localhost:3000/shape>; rel="http://www.w3.org/ns/ldp#constrainedBy"
```

The container is now indeed constrained by the shape. 
This means that all the resources that will be added in this container are conform to the shape.

In this example, we used a SHACL shape that was stored on the server. 
However, we can use any SHACL shape that can be fetched on the web via HTTP.
