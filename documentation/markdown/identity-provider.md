# Identity Provider

Besides implementing the [Solid protocol](https://solidproject.org/TR/protocol),
the community server can also be an Identity Provider (IDP), officially known as an OpenID Provider (OP),
following the [Solid OIDC spec](https://solid.github.io/solid-oidc/) as much as possible.

It is recommended to use the latest version 
of the [Solid authentication client](https://github.com/inrupt/solid-client-authn-js)
to interact with the server.

The links here assume the server is hosted at `http://localhost:3000/`.

## Registering an account
To register an account, you can go to `http://localhost:3000/idp/register/` if this feature is enabled,
which it is on all configurations we provide.
Currently our registration page ties 3 features together on the same page:
 * Creating an account on the server.
 * Creating or linking a WebID to your account.
 * Creating a pod on the server.

### Account
To create an account you need to provide an email address and password.
The password will be salted and hashed before being stored.
As of now, the account is only used to log in and identify yourself to the IDP
when you want to do an authenticated request,
but in future the plan is to also use this for account/pod management.

### WebID
We require each account to have a corresponding WebID.
You can either let the server create a WebID for you in a pod,
which will also need to be created then,
or you can link an already existing WebID you have on an external server.

In case you try to link your own WebID, you can choose if you want to be able 
to use this server as your IDP for this WebID.
If not, you can still create a pod,
but you will not be able to direct the authentication client to this server to identify yourself.

Additionally, if you try to register with an external WebID,
the first attempt will return an error indicating you need to add an identification triple to your WebID.
After doing that you can try to register again.
This is how we verify you are the owner of that WebID.
After registration the next page will inform you
that you have to add an additional triple to your WebID if you want to use the server as your IDP.

All of the above is automated if you create the WebID on the server itself.

### Pod
To create a pod you simply have to fill in the name you want your pod to have.
This will then be used to generate the full URL of your pod.
For example, if you choose the name `test`,
your pod would be located at `http://localhost:3000/test/`
and your generated WebID would be `http://localhost:3000/test/profile/card#me`.

The generated name also depends on the configuration you chose for your server.
If you are using the subdomain feature, 
such as being done in the `config/memory-subdomains.json` configuration,
the generated pod URL would be `http://test.localhost:3000/`.

## Logging in
When using an authenticating client,
you will be redirected to a login screen asking for your email and password.
After that you will be redirected to a page showing some basic information about the client.
There you need to consent that this client is allowed to identify using your WebID.
As a result the server will send a token back to the client
that contains all the information needed to use your WebID.

## Forgot password
If you forgot your password, you can recover it by going to `http://localhost:3000/idp/forgotpassword/`.
There you can enter your email address to get a recovery mail to reset your password.
This feature only works if a mail server was configured,
which by default is not the case.

## JSON API
All of the above happens through HTML pages provided by the server.
By default, the server uses the templates found in `/templates/identity/email-password/`
but different templates can be used through configuration.

These templates all make use of a JSON API exposed by the server.
For example, when doing a GET request to `http://localhost:3000/idp/register/`
with a JSON accept header, the following JSON is returned:
```json
{
  "required": {
    "email": "string",
    "password": "string",
    "confirmPassword": "string",
    "createWebId": "boolean",
    "register": "boolean",
    "createPod": "boolean",
    "rootPod": "boolean"
  },
  "optional": {
    "webId": "string",
    "podName": "string",
    "template": "string"
  },
  "controls": {
    "register": "http://localhost:3000/idp/register/",
    "index": "http://localhost:3000/idp/",
    "prompt": "http://localhost:3000/idp/prompt/",
    "login": "http://localhost:3000/idp/login/",
    "forgotPassword": "http://localhost:3000/idp/forgotpassword/"
  },
  "apiVersion": "0.3"
}
```
The `required` and `optional` fields indicate which input fields are expected by the API.
These correspond to the fields of the HTML registration page.
To register a user, you can do a POST request with a JSON body containing the correct fields:
```json
{
  "email": "test@example.com",
  "password": "secret",
  "confirmPassword": "secret",
  "createWebId": true,
  "register": true,
  "createPod": true,
  "rootPod": false,
  "podName": "test"
}
```
Two fields here that are not covered on the HTML page above are `rootPod` and `template`.
`rootPod` tells the server to put the pod in the root of the server instead of a location based on the `podName`.
By default the server will reject requests where this is `true`, except during setup.
`template` is only used by servers running the `config/dynamic.json` configuration,
which is a very custom setup where every pod can have a different Components.js configuration,
so this value can usually be ignored.

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
you can put a `.acl` resource in the `/idp/register/` container to restrict
who is allowed to access the registration API.
Note that for everything to work there needs to be a `.acl` resource in `/idp/` when using WebACL
so resources can be accessed as usual when the server starts up.
Make sure you change the permissions on `/idp/.acl` so not everyone can modify those.

All of the above is only relevant if you use the `restricted.json` setting for this import.
When you use `public.json` the API will simply always be accessible by everyone.

### email
In case you want users to be able to reset their password when they forget it,
you will need to tell the server which email server to use to send reset mails.
`example.json` contains an example of what this looks like,
which you will need to copy over to your base configuration and then remove the `config/identity/email` import.

### handler
There is only one option here. This import contains all the core components necessary to make the IDP work.
In case you need to make some changes to core IDP settings, this is where you would have to look.

### pod
The `pod` options determines how pods are created. `static.json` is the expected pod behaviour as described above.
`dynamic.json` is an experimental feature that allows users
to have a custom Components.js configuration for their own pod.
When using such a setup, a JSON file will be written containing all the information of the user pods
so they can be recreated when the server restarts.

### registration
This setting allows you to enable/disable registration on the server.
Disabling registration here does not disable registration during setup,
meaning you can still use this server as an IDP with the account created there.
