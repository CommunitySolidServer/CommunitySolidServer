# Security considerations

This page lists some things to keep in mind when exposing a server to other users.

For general Solid guidance,
see the Solid Security Considerations document:
<https://solid.github.io/security-considerations/>.

## Public write access and executable content

The Solid document linked above already covers the main risks and recommendations for this topic.
On CSS specifically,
one extra safeguard is adding restrictive response headers.

For example,
you can configure CSS to add a `Content-Security-Policy` header to responses:

```json
{
  "@id": "urn:solid-server:default:Middleware_Header",
  "@type": "HeaderHandler",
  "headers": [
    {
      "HeaderHandler:_headers_key": "Content-Security-Policy",
      "HeaderHandler:_headers_value": "sandbox allow-scripts"
    }
  ]
}
```

This applies globally,
so always verify account pages and other HTML views still work as expected.

## External WebID verification

When someone links an external WebID to an account,
the server needs to verify that they control that WebID.
This is done by sending a GET request to that URL.
It is possible that someone enters an address that points to an internal service,
in which case a GET request will be sent to that internal service.
No information from that request is sent back to the user,
but there still might be cases where you do not want such a request to happen.

### Recommended deployment setup

If this matters for your setup,
the most robust approach is to run the server in an environment with limited network reach.
For example, running it in a container or defining networking rules that prevent it from reaching internal services.

### Blocking specific WebID URL patterns

If you want an extra safeguard,
`TokenOwnershipValidator` can be configured with a `blockedWebIdPatterns` array.
Each entry in that array is interpreted as a regular expression,
and if a WebID matches one of those patterns,
the server will reject it before generating a token or making a request.

This can be done by adding something like the following block to your Components.js configuration:

```json
{
  "@id": "urn:solid-server:default:OwnershipValidator",
  "@type": "TokenOwnershipValidator",
  "blockedWebIdPatterns": [
    "^https?://localhost(?::\\d+)?(?:/|$)",
    "^https?://127\\.",
    "^https?://10\\.",
    "^https?://192\\.168\\.",
    "^https?://169\\.254\\."
  ]
}
```

The exact patterns to use depend on your deployment.
