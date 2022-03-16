# Adding a new login method

By default, the server allows users to use email/password combinations to identify as the owner of their account.
But, just like with many other parts of the server,
this can be extended so other login methods can be used.
Here we'll cover everything that is necessary.

## Components

These are the components that are needed for adding a new login method.
Not all of these are mandatory,
but they can make the life of the user easier when trying to find and use the new method.
Also have a look at the general [structure](../../architecture/features/accounts/routes.md)
of new API components to see what is expected of such a component.

### Create component

There needs to be one or more components that allow a user
to create an instance of the new login method and assign it to their account.
The `CreatePasswordHandler` can be used as an example.
This does not necessarily have to happen in a single request,
potentially multiple requests can be used if the user has to perform actions on an external site for example.
The only thing that matters is that at the end there is a new entry in the account's `logins` object.

When adding logins of your method a new key will need to be chosen to group these logins together.
The email/password method uses `password` for example.

A new storage will probably need to be created to storage relevant metadata about this login method entry.
Below is an example of how the `PasswordStore` is created:

```json
{
  "@id": "urn:solid-server:default:PasswordStore",
  "@type": "BasePasswordStore",
  "storage": {
    "@id": "urn:solid-server:default:PasswordStorage",
    "@type": "EncodingPathStorage",
    "relativePath": "/accounts/logins/password/",
    "source": {
      "@id": "urn:solid-server:default:KeyValueStorage"
    }
  }
}
```

### Login component

After creating a login instance, a user needs to be able to log in using the new method.
This can again be done with multiple API calls if necessary,
but the final one needs to be one that handles the necessary actions
such as creating a cookie and finishing the OIDC interaction if necessary.
The `ResolveLoginHandler` can be extended to take care of most of this,
the `PasswordLoginHandler` provides an example of this.

### Additional components

Besides creating a login instance and logging in,
it is always possible to offer additional functionality specific to this login method.
The email/password method, for example, also has components for password recovery and updating a password.

### HTML pages

To make the life easier for users,
at the very least you probably want to make an HTML page which people can use
to create an instance of your login method.
Besides that you could also make a page where people can combine creating an account with creating a login instance.
The `templates/identity` folder contains all the pages the server has by default,
which can be used as inspiration.

These pages need to be linked to the `urn:solid-server:default:HtmlViewHandler`.
Below is an example of this:

```json
{
  "@id": "urn:solid-server:default:HtmlViewHandler",
  "@type": "HtmlViewHandler",
  "templates": [{
    "@id": "urn:solid-server:default:CreatePasswordHtml",
    "@type": "HtmlViewEntry",
    "filePath": "@css:templates/identity/password/create.html.ejs",
    "route": {
      "@id": "urn:solid-server:default:AccountPasswordRoute"
    }
  }]
}
```

### Updating the login handler

The `urn:solid-server:default:LoginHandler` returns a list of available login methods,
which are used to offer users a choice of which login method they want to use on the default login page.
If you want the new method to also be offered you will have to add similar Components.js configuration:

```json
{
  "@id": "urn:solid-server:default:LoginHandler",
  "@type": "ControlHandler",
  "controls": [
    {
      "ControlHandler:_controls_key": "Email/password combination",
      "ControlHandler:_controls_value": {
        "@id": "urn:solid-server:default:LoginPasswordRoute"
      }
    }
  ]
}
```

### Controls

All new relevant API endpoints should be added to the controls object,
otherwise there is no way for users to find out where to send their requests.
Similarly, links to the HTML pages should also be in the controls, so they can be navigated to.
Examples of how to do this can be found [here](../../architecture/features/accounts/routes.md).

The default account overview page makes some assumptions about the controls when building the page.
Specifically, it checks if `controls.html.<LOGIN_METHOD>.create` exists,
if yes, it automatically creates a link on the page so users can create new login instances for their account.
