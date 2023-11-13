# Identity Provider

Besides implementing the [Solid protocol](https://solidproject.org/TR/protocol),
the community server can also be an Identity Provider (IDP), officially known as an OpenID Provider (OP),
following the [Solid-OIDC specification](https://solid.github.io/solid-oidc/) as much as possible.

It is recommended to use the latest version
of the [Solid authentication client](https://github.com/inrupt/solid-client-authn-js)
to interact with the server.

It also provides account management options for creating pods and WebIDs to be used during authentication,
which are discussed more in-depth below.
The links on this page assume the server is hosted at `http://localhost:3000/`.

## Registering an account

To register an account, you can go to `http://localhost:3000/.account/password/register/`, if this feature is enabled.
There you can create an account with the email/password login method.
The password will be salted and hashed before being stored.
Afterwards you will be redirected to the account page where you can create pods and link WebIDs to your account.

### Creating a pod

To create a pod you simply have to fill in the name you want your pod to have.
This will then be used to generate the full URL of your pod.
For example, if you choose the name `test`,
your pod would be located at `http://localhost:3000/test/`
and your generated WebID would be `http://localhost:3000/test/profile/card#me`.

If you fill in a WebID when creating the pod,
that WebID will be the one that has access to all data in the pod.
If you don't, a WebID will be created in the pod and immediately linked to your account,
allowing you to use it for authentication and accessing the data in that pod

The generated name also depends on the configuration you chose for your server.
If you are using the subdomain feature,
the generated pod URL would be `http://test.localhost:3000/`.

### WebIDs

To use Solid authentication,
you need to link at least one WebID to your account.
This can happen automatically when creating a pod as mentioned above,
or can be done manually with external WebIDs.

If you try to link an external WebID,
the first attempt will return an error indicating you need to add an identification triple to your WebID.
After doing that you can try to register again.
This is how we verify you are the owner of that WebID.
Afterwards the page will inform you
that you have to add a triple to your WebID if you want to use the server as your IDP.

## Logging in

When using an authenticating client,
you will be redirected to a login screen asking for your email and password.
After that you will be redirected to a page showing some basic information about the client
where you can pick the WebID you want to use.
There you need to consent that this client is allowed to identify using that WebID.
As a result the server will send a token back to the client
that contains all the information needed to use your WebID.

## Forgot password

If you forgot your password, you can recover it by going to `http://localhost:3000/.account/login/password/forgot/`.
There you can enter your email address to get a recovery mail to reset your password.
This feature only works if a mail server was configured,
which by default is not the case.

## JSON API

All of the above happens through HTML pages provided by the server.
By default, the server uses the templates found in `/templates/identity/`
but different templates can be used through configuration.

These templates all make use of a JSON API exposed by the server.
A full description of this API can be found [here](account/json-api.md).

## IDP configuration

The above descriptions cover server behaviour with most default configurations,
but just like any other feature, there are several features that can be changed
through the imports in your configuration file.

All available options can be found in
the [`config/identity/` folder](https://github.com/CommunitySolidServer/CommunitySolidServer/tree/main/config/identity).
Below we go a bit deeper into the available options

### access

The `access` option allows you to set authorization restrictions on the IDP API when enabled,
similar to how authorization works on the LDP requests on the server.
For example, if the server uses WebACL as authorization scheme,
you can put a `.acl` resource in the `/.account/account/` container to restrict
who is allowed to access the account creation API.
Note that for everything to work there needs to be a `.acl` resource in `/.account/` when using WebACL
so resources can be accessed as usual when the server starts up.
Make sure you change the permissions on `/.account/.acl` so not everyone can modify those.

All of the above is only relevant if you use the `restricted.json` setting for this import.
When you use `public.json` the API will simply always be accessible by everyone.

### email

In case you want users to be able to reset their password when they forget it,
you will need to tell the server which email server to use to send reset mails.
`example.json` contains an example of what this looks like.
When using this import, you can override the values with those of your own mail client
by adding the following to your `Components.js` configuration with updated values:

```json
{
  "comment": "The settings of your email server.",
  "@type": "Override",
  "overrideInstance": {
    "@id": "urn:solid-server:default:EmailSender"
  },
  "overrideParameters": {
    "@type": "BaseEmailSender",
    "senderName": "Community Solid Server <solid@example.email>",
    "emailConfig_host": "smtp.example.email",
    "emailConfig_port": 587,
    "emailConfig_auth_user": "solid@example.email",
    "emailConfig_auth_pass": "NYEaCsqV7aVStRCbmC"
  }
}
```

### handler

Here you determine which features of account management are available.
`default.json` allows everything, `disabled.json` completely disables account management,
and the other options disable account and/or pod creation.

### pod

The `pod` options determines how pods are created. `static.json` is the expected pod behaviour as described above.
`dynamic.json` is an experimental feature that allows users
to have a custom Components.js configuration for their own pod.
When using such a configuration, a JSON file will be written containing all the information of the user pods,
so they can be recreated when the server restarts.

## Adding a new login method to the server

Due to its modular nature,
it is possible to add new login methods to the server,
allowing users to log in different ways than just the standard email/password combination.
More information on what is required can be found [here](account/login-method.md).

## Data migration

Going from v6 to v7 of the server, the account management is completely rewritten,
including how account data is stored on the server.
More information about how account data of an existing server can be migrated to the newer version
can be found [here](account/migration.md).
