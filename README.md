# cw-site-assets

## Introduction

Access arbitrary site assets from a Cloudflare Workers Site. Helps you 
dynamically determin which page to return for a given user request.

The primary method is:

    async function fetchSiteAssetFromKv(assetPath)

This method fetches a site asset from site KV based on its path.

The path is absolute path within the site with no leading '/', no protocol 
and no hostname, so it's of the form:

    app-dir/page-a.html


Returns a "Response" object with the body set as an 'arrayBuffer' created 
from the result of awaiting a 'get' of the asset from the _STATIC_CONTENT KV 
namespace (as per getAssetFromKV).

Throws an exception if assetPath isn't a key in __STATIC_CONTENT_MANIFEST.

Uses 'await' on call to KV, so this method needs to be awaited...

NOTE, Current implementation:
- Does not set any headers (such as Content-Type)
- Assumes site content is in the default namespace
- Does not handle URL encoded paths
- Doesn't try to do any of the caching stuff that getAssetFromKV does
- Relies upon the Workers Site platform setting up global vars
    - __STATIC_CONTENT_MANIFEST
    - __STATIC_CONTENT

There are a couple of useful subsidiary methods:

    async function fetchSiteAssetFromKvAsHtmlPage(assetPath)

        adds a Content-Type header with value text/html

    function addStandardResponseHeaders(response)

        adds the headers that the workers site example adds


## Development

The code lives in [this GitHub repo](https://github.com/my-liminal-space/cw-site-assets).

Testing code that depends upon features of the Cloudflare Workers Site platform 
(such as the voodoo setup of __STATIC_CONTENT_MANIFEST and _STATIC_CONTENT) is 
"interesting". In order to build confidence that the code will work as 
expected, the approach taken is to test by deploying the lib along with a [test 
site](https://cf-site-assets.deaddodgeydigitaldeals.com/index.html) into Cloudflare Workers.
The index.js file handles requests coming into the test site.

If you want to replicate the test environment, you will need to modify 
wrangler.toml to use your own values.


## Distribution

When packaged for deployment (using pkg.sh), a new folder structure is created 
that is sets up a package focussed on distribtion, which means:
 - only cw-site-assets.js is included (renamed as index.js)
 - an alternative package.json is included, pointing to index.js

