# Account management JSON API

Everything related to account management is done through a JSON API,
of which we will describe all paths below.
There are also HTML pages available to handle account management
that use these APIs internally.
Links to these can be found in the HTML controls
All APIs expect JSON as input, and will return JSON objects as output.

## Finding API URLs

All URLs below are relative to the index account API URL, which by default is `http://localhost:3000/.account/`.
Every response of an API request will contain a `controls` object,
containing all the URLs of the other API endpoints.
It is generally advised to make use of these controls instead of hardcoding the URLs.
Only the initial index URL needs to be known then to find the controls.
Certain controls will be missing if those features are disabled in the configuration.

## API requests

Many APIs require a POST request to perform an action.
When doing a GET request on these APIs they will return an object describing what input is expected for the POST.

## Authorization

After logging in, the API will return a `set-cookie` header.
This cookie is necessary to have access to many of the APIs.
When including this cookie, the controls object will also be extended with new URLs that are now accessible.
When logging in, the response body JSON body will also contain a `cookie` field containing the cookie value.
Instead of using cookies,
this value can also be used in an `Authorization` header with auth scheme `CSS-Account-Cookie`
to achieve the same result.

The expiration time of this cookie will be refreshed
every time there is a successful request to the server with that cookie.

## Redirecting

As redirects through status codes 3xx can make working with JSON APIs more difficult,
the API will never make use of this.
Instead, if a redirect is required after an action,
the response JSON object will return a `location` field.
This is the next URL that should be fetched.
This is mostly relevant in OIDC interactions as these cause the interaction to progress.

## Controls

Below is an overview of all the keys in a controls object returned by the server,
with all features enabled.
An example of what such an object looks like can be found at the [bottom](#example) of the page.

### controls.main

General controls that require no authentication.

#### controls.main.index

General entrypoint to the API.
Returns an empty object, including the controls, on all GET requests.

#### controls.main.logins

Returns an overview of all login systems available on the server in `logins` object.
Keys are a string description of the login system and values are links to their login pages.
This can be used to let users choose how they want to log in.
By default, the object only contains the email/password login system.

### controls.account

All controls related to account management.
All of these require authorization, except for the create action.

#### controls.account.create

Creates a new account on empty POST requests.
The response contains the necessary cookie values to log and a `resource` field containing the URL of the account.
This account can not be used until a login method has been added to it.
All other interactions will fail until this is the case.
See the [controls.password.create](#controlspasswordcreate) section below for more information on how to do this.
This account will expire after some time if no login method is added.

#### controls.account.logout

Logs the account out on an empty POST request.
Invalidates the cookie that was used.

#### controls.account.webId

POST requests link a WebID to the account,
allowing the account to identify as that WebID during an OIDC authentication interaction.
Expected input is an object containing a `webId` field.

If the chosen WebID is contained within a Solid pod associated with this account,
the request will succeed immediately.
If not, an error will be thrown,
asking the user to add a specific triple to the WebID to confirm that they are the owner.
After this triple is added, a second request will be successful.

#### controls.account.pod

Creates a Solid pod for the account on POST requests.
The only required field is `name`, which will determine the name of the pod.

Additionally, a `settings` object can be sent along,
the values of which will be sent to the templates used when generating the pod.
If this `settings` object contains a `webId` field,
that WebID will be the WebID that has initial access to the pod.

If no WebID value is provided,
a WebID will be generated in the pod and immediately linked to the account
as described in [controls.account.webID](#controlsaccountwebid).
This WebID will then be the WebID that has initial access.

#### controls.account.clientCredentials

Creates a client credentials token on POST requests.
More information on these tokens can be found [here](../client-credentials.md).
Expected input is an object containing a `name` and `webId` field.
The name is optional and will be used to name the token,
the WebID determines which WebID you will identify as when using that token.
It needs to be a WebID linked to the account as described in [controls.account.webID](#controlsaccountwebid).

#### controls.account.account

This value corresponds to the resource URL of the account you received when creating it.
This returns all resources linked to this account, such as login methods, WebIDs, pods, and client credentials tokens.

Below is an example response object:

```json
{
  "logins": {
    "password": {
      "test@example.com": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/login/password/test%40example.com/"
    }
  },
  "pods": {
    "http://localhost:3000/test/": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/pod/7def7830df1161e422537db594ad2b7412ffb735e0e2320cf3e90db19cd969f9/"
  },
  "webIds": {
    "http://localhost:3000/test/profile/card#me": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/webid/5c1b70d3ffaa840394dda86889ed1569cf897ef3d6041fb4c9513f82144cbb7f/"
  },
  "clientCredentials": {
    "token_562cdeb5-d4b2-4905-9e62-8969ac10daaa": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/client-credentials/token_562cdeb5-d4b2-4905-9e62-8969ac10daaa/"
  },
  "settings": {}
}
```

In each of the sub-objects, the key is always the unique identifier of whatever is being described,
while the value is the resource URL that can potentially be used to modify the resource.
Removing an entry can be done by sending a DELETE request to the resource URL,
except for pods, which cannot be deleted.
Login methods can only be deleted if the account has at least 1 login method remaining afterwards.

The password login resource URL can also be used to modify the password,
which can be done by sending a POST request to it with the body containing an `oldPassword` and a `newPassword` field.

### controls.password

Controls related to managing the email/password login method.

#### controls.password.create

POST requests create an email/password login and adds it to the account you are logged in as.
Expects `email` and `password` fields.

#### controls.password.login

POST requests log a user in and return the relevant cookie values.
Expected fields are `email`, `password`, and optionally a `remember` boolean.
The `remember` value determines if the returned cookie is only valid for the session,
or for a longer time.

#### controls.password.forgot

Can be used when a user forgets their password.
POST requests with an `email` field will send an email with a link to reset the password.

#### controls.password.reset

Used to handle reset password URLs generated when a user forgets their password.
Expected input values for the POST request are `recordId`,
which was generated when sending the reset mail,
and `password` with the new password value.

### controls.oidc

These controls are related to completing OIDC interactions.

#### controls.oidc.cancel

Sending a POST request to this API will cancel the OIDC interaction
and return the user to the client that started the interaction.

#### controls.oidc.prompt

This API is used to determine what the next necessary step is in the OIDC interaction.
The response will contain a `location` field,
containing the URL to the next page the user should go to,
and a `prompt` field,
indicating the next step that is necessary to progress the OIDC interaction.
The three possible prompts are the following:

* **account**: The user needs to log in, so they have an account cookie.
* **login**: The user needs to pick the WebID they want to use in the resulting OIDC token.
* **consent**: The user needs to consent to the interaction.

#### controls.oidc.webId

Relevant for solving the **login** prompt.
GET request will return a list of WebIDs the user can choose from.
This is the same result as requesting the account information and looking at the linked WebIDs.
The POST requests expects a `webId` value and optionally a `remember` boolean.
The latter determines if the server should remember the picked WebID for later interactions.

#### controls.oidc.forgetWebId

POST requests to this API will cause the OIDC interaction to forget the picked WebID
so a new one can be picked by the user.

#### controls.oidc.consent

A GET request to this API will return all the relevant information about the client doing the request.
A POST requests causes the OIDC interaction to finish.
It can have an optional `remember` value, which allows for refresh tokens if it is set to true.

#### controls.html

All these controls link to HTML pages and are thus mostly relevant to provide links to let the user navigate around.

## Example

Below is an example of a controls object in a response.

```json
{
  "main": {
    "index": "http://localhost:3000/.account/",
    "logins": "http://localhost:3000/.account/login/"
  },
  "account": {
    "create": "http://localhost:3000/.account/account/",
    "logout": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/logout/",
    "webId": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/webid/",
    "pod": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/pod/",
    "clientCredentials": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/client-credentials/",
    "account": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/"
  },
  "password": {
    "create": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/login/password/",
    "login": "http://localhost:3000/.account/login/password/",
    "forgot": "http://localhost:3000/.account/login/password/forgot/",
    "reset": "http://localhost:3000/.account/login/password/reset/"
  },
  "oidc": {
    "cancel": "http://localhost:3000/.account/oidc/cancel/",
    "prompt": "http://localhost:3000/.account/oidc/prompt/",
    "webId": "http://localhost:3000/.account/oidc/pick-webid/",
    "forgetWebId": "http://localhost:3000/.account/oidc/forget-webid/",
    "consent": "http://localhost:3000/.account/oidc/consent/"
  },
  "html": {
    "main": {
      "login": "http://localhost:3000/.account/login/"
    },
    "account": {
      "createClientCredentials": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/client-credentials/",
      "createPod": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/pod/",
      "linkWebId": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/webid/",
      "account": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/"
    },
    "password": {
      "register": "http://localhost:3000/.account/login/password/register/",
      "login": "http://localhost:3000/.account/login/password/",
      "create": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/login/password/",
      "forgot": "http://localhost:3000/.account/login/password/forgot/"
    }
  }
}
```
