A reverse proxy allows you to run a Solid server on a local port and let the proxy handle traffic to public HTTP(S) ports.

Use the following configuration options on an Apache webserver.

## Prerequisites

In this example, we assume that:

- your server is running on port `3000`
- the public URL of your reverse proxy is https://solid.example/
- your server is running with the `-b https://solid.example/` option
- you have installed Apache and its configuration folder in `/etc/httpd/`
- you have installed (free) TLS certificates for Apache [Hint](https://duckduckgo.com/?q=apache+https+centos+letsencrypt&t=vivaldi&ia=web)

## Configuration

Verify that you have the required proxy and rewrite modules enabled:

```
$ httpd -M
```

This command will display all enabled Apache modules. Search for the modules:

- `rewrite_module`
- `proxy_http_module`

When the modules are not available enable them in the `/etc/httpd/conf.modules.d` directory.

Modify the Apache configuration files and add a reverse proxy. E.g. edit in `/etc/httpd/conf.d` the
configuration file that defines the `VirtualHost` of your website:

```
<VirtualHost *:443>
    ServerName solid.example

    .
    . (snip)
    .

    RewriteEngine 

    # Pass the host and protocol
    RequestHeader set X-Forwarded-Host solid.example 
    RequestHeader set X-Forwarded-Proto https

    # Delegate to the Solid server
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Enable websockets
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]
    
    .
    . (snip)
    .
</VirtualHost>
```

## Activating the configuration

Restart Apache to activate the new configuration:

```
sudo systemctl restart httpd
```