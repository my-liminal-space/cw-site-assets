/*
  Fetch a site page from site KV based on its path.

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

*/
export async function fetchSiteAssetFromKv(assetPath) {
    let response;

    //console.log("fetchSiteAssetFromKv - Looking for asset: " + assetPath);

    const siteAssetPath2KvKey = JSON.parse(__STATIC_CONTENT_MANIFEST);

    const pageKey = siteAssetPath2KvKey[assetPath];
    //console.log("fetchSiteAssetFromKv - Asset: " + assetPath + " has page key: " + pageKey);

    if (pageKey) {

        const body = await __STATIC_CONTENT.get(pageKey, 'arrayBuffer');

        if (body === null) {
            throw "Null asset found in __STATIC_CONTENT for: " + assetPath;
        }

        response = new Response(body);

    } else {
        throw "No entry in site manifest for asset path: " + assetPath;
    }

    return response;
}


/*
    Calls fetchSiteAssetFromKv (so this method needs to be awaited too...) and 
    adds a Content-Type header set to text/html.
*/
export async function fetchSiteAssetFromKvAsHtmlPage(assetPath) {
    let response = await fetchSiteAssetFromKv(assetPath);
    response.headers.set('Content-Type', 'text/html');
    return response;
}

/*
    Add response headers as per Cloudflare Workers Site skeleton.
*/
export function addStandardResponseHeaders(response) {

    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'unsafe-url');
    //response.headers.set('Feature-Policy', 'none');
  
    return response;
}