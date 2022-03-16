# Account management JSON API

Everything related to account management is done through a JSON API,
of which we will describe all paths below.
There are also HTML pages available to handle account management
that use these APIs internally.

Most API responses will contain controls pointing to different actions that are available.

When an API requires a POST request, you can do a GET request to the same API to see which fields are expected.

# TODO: separate list of all APIs?
# TODO: tutorial with example requests
# TODO: all requests that change the account need to include the cookie header
# TODO: mention that there are still plans to expand in the future?
# TODO: separate document describing the email/password functionality + mailserver
# TODO: list of curl requests setting everything up?
# TODO: registration API
# TODO: just go through all the class changes in this PR and see what needs to be said
# TODO: also mention all the changes in data relevant for migration

## Creating an account

Creating an account is a 2-step process.
First you create a temporary account.
After this you need to register a login method for the account,
which will make it permanent.

You create such an account by doing an empty post to `/.account/`.
The response will contain the necessary cookie headers so you can authenticate as this account.
It will also contain a Location header `/.account/$ID/` indicating the URL of your new account.
Most account options are disabled until you register a login method though.

To register a login method for the account, you need to do a POST to the corresponding API.
All available registration endpoints can be found by doing a GET to `/.account/$ID/login/`.
By default, the server only has an email/password login method,
but others can be added by adding new components.

# TODO: link to password documentation


## Logging in

Logging in to an account can be done using any of the login methods associated with that account.
To get a list of all available login methods on the server, you can do a GET request to `/.account/login/`.
After a successful login the server will respond with a Set-Cookie header that can be used for authenticated requests,
and a Location header pointing to the account URL.

To find out how to login with a specific login API, look at the corresponding documentation.

# TODO: link to password documentation

## Pods

To create a pod for an account you need to do a POST to `/.account/$ID/pod/`
with a JSON body containing the correct settings.
The response will contain both the base URL of the pod, and the WebID that was associated with the pod.

The only required field is the `name` field which will be used to determine the URL of the created pod.
Optionally a `settings` object can be provided which will be used to fill in the contents of the pod.
The required contents depend on the templates that are being used.

A relevant field is `settings.webId`. This is the WebID that will have access to the contents of the pod.
If no WebID is provided, the WebID that is in the generated pod will be used.

# TODO: talk about other useful settings fields
# TODO: owners -> will probably not be used for now

## Account management

Doing a GET to `/.account/$ID/` will return all the relevant metadata for that account.
Currently this is a list of pods this account is the owner of,
the WebIDs this account can identify as, 
the login methods that can be used to authenticate as this account,
and the associated client credentials.

# TODO: correct response keys/URLs

A response would look something like this:

```json
{
  "pods": {
    "http://localhost:3000/pod/": "http://localhost:3000/.account/123456/pod/abcdef"
  },
  "logins": {
    "password": "http://localhost:3000/.account/123456/logins/password"
  },
  "webIds": {
    "http://localhost:3000/pod/profile/card#me": "http://localhost:3000/.account/123456/webid/abcdef",
    "http://example.com/#me": "http://localhost:3000/.account/123456/webid/ghijkl"
  },
  "credentials": {
    "token_987654": "http://localhost:3000/.account/123456/credentials/token_987654"
  }
}
```

For every object, the keys are the relevant values, 
while the URL values are URLs uniquely identifying this entry in your account.
These entries can be removed by sending a DELETE request to the corresponding URL.
Pods can not be removed though.

# TODO: might already want to do something with these URLs so passwords can be changed? or perhaps this happens in /login/password

In the future these URLs could also be used to provide additional metadata about the relevant resources.

## Client credentials

# TODO: update client credentials page and link to it from here

## Performing a Solid-OIDC request

# TODO: will have to check OIDC cookies work out with these paths

When doing an OIDC request to the server, 
at some point there will be a redirect to the server so the user can authenticate.
This is done through HTML pages, but these also make use of the JSON API.
Every successful response will contain a `location` field indicating the next URL to redirect to.

The server will redirect the user to the correct pages to fulfill the following steps.
Some steps might be skipped if they have previously been completed.
* The user needs to be logged in. The steps here are similar to those in the [Logging In section](#logging-in).
* The user needs to pick a WebID to authenticate as for Solid-OIDC.
  The list of WebIDs that can be chosen is found by doing a GET to `/.account/$ID/webid/`.
  The choice is made by doing a POST to `/.account/webid/`. 
  The JSON body should contain a `webid` field and optionally a `remember: true` field 
  if the server should remember to use this WebID.
* The user needs to consent to give the client application access.
  Doing a GET to `/.account/consent/` will return all the known metadata of the client doing the request.
  Consent is granted by POSTing an empty JSON to `/.account/consent/`.
  Optionally, a `remember: true` field can be provided to allow the client access to refresh tokens.


