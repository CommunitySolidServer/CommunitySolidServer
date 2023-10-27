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

After logging in, the API will return a `set-cookie` header of the format `css-account=$VALUE`
This cookie is necessary to have access to many of the APIs.
When including this cookie, the controls object will also be extended with new URLs that are now accessible.
When logging in, the response body JSON body will also contain an `authorization` field
containing the `$VALUE` value mentioned above.
Instead of using cookies,
this value can be used in an `Authorization` header with value `CSS-Account-Token $VALUE`
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
The response contains the necessary cookie values to log in.
This account can not be used until a login method has been added to it.
All other interactions will fail until this is the case.
See the [controls.password.create](#controlspasswordcreate) section below for more information on how to do this.
This account will expire after some time if no login method is added.

#### controls.account.logout

Logs the account out on an empty POST request.
Invalidates the cookie that was used.

#### controls.account.webId

GET requests return all WebIDs linked to this account in the following format:

```json
{
  "webIdLinks": {
    "http://localhost:3000/test/profile/card#me": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/webid/fdfc48c1-fe6f-4ce7-9e9f-1dc47eff803d/"
  }
}
```

The URL value is the resource URL corresponding to the link with this WebID.
The link can be removed by sending a DELETE request to that URL.

POST requests link a WebID to the account,
allowing the account to identify as that WebID during an OIDC authentication interaction.
Expected input is an object containing a `webId` field.
The response will include the resource URL.

If the chosen WebID is contained within a Solid pod created by this account,
the request will succeed immediately.
If not, an error will be thrown,
asking the user to add a specific triple to the WebID to confirm that they are the owner.
After this triple is added, a second request will be successful.

#### controls.account.pod

GET requests return all pods created by this account in the following format:

```json
{
  "pods": {
    "http://localhost:3000/test/": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/pod/df2d5a06-3ecd-4eaf-ac8f-b88a8579e100/"
  }
}
```

The URL value is the resource URL corresponding to the link with this WebID.
Doing a GET request to this resource will return the base URl of the pod, and all its owners of a pod, as shown below.
You can send a POST request to this resource with a `webId` and `visible: boolean` field
to add/update an owner and set its visibility.
Visibility determines whether the owner is exposed through a link header when requesting the pod.
You can also send a POST request to this resource with a `webId` and `remove: true` field to remove the owner.

```json
{
  "baseUrl": "http://localhost:3000/my-pod/",
  "owners": [
    {
      "webId": "http://localhost:3000/my-pod/profile/card#me",
      "visible": false
    }
  ]
}
```

POST requests to `controls.account.pod` create a Solid pod for the account.
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

GET requests return all client credentials created by this account in the following format:

```json
{
  "clientCredentials": {
    "token_562cdeb5-d4b2-4905-9e62-8969ac10daaa": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/client-credentials/063ee3a7-e80f-4508-9f79-ffddda9df8d4/"
  }
}
```

The URL value is the resource URL corresponding to that specific token.
Sending a GET request to that URL will return information about the token,
such as what the associated WebID is.
The token can be removed by sending a DELETE request to that URL.

Creates a client credentials token on POST requests.
More information on these tokens can be found [here](../client-credentials.md).
Expected input is an object containing a `name` and `webId` field.
The name is optional and will be used to name the token,
the WebID determines which WebID you will identify as when using that token.
It needs to be a WebID linked to the account as described in [controls.account.webID](#controlsaccountwebid).

### controls.password

Controls related to managing the email/password login method.

#### controls.password.create

GET requests return all email/password logins of this account in the following format:

```json
{
  "passwordLogins": {
    "test@example.com": "http://localhost:3000/.account/account/c63c9e6f-48f8-40d0-8fec-238da893a7f2/login/password/7f042779-e2b2-444d-8cd9-50bd9cfa516d/"
  }
}
```

The URL value is the resource URL corresponding to the login with the given email address.
The login can be removed by sending a DELETE request to that URL.
The password can be updated by sending a POST request to that URL
with the body containing an `oldPassword` and a `newPassword` field.

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
The most important one is probably `controls.html.account.account` which links to an overview page for the account.

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
    "clientCredentials": "http://localhost:3000/.account/account/ade5c046-e882-4b56-80f4-18cb16433360/client-credentials/"
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
