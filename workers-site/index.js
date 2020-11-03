import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import { fetchSiteAssetFromKvAsHtmlPage } from './cw-site-assets.js';

import { strict as assert } from 'assert';


/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false

addEventListener('fetch', event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})

async function handleEvent(event) {

  const reqUrl = new URL(event.request.url);
  console.log("handleEvent - start, url: " + reqUrl.pathname);

  let page;

  try {

    if ('/app-dir/page-a.html' === reqUrl.pathname) {
      console.log("handleEvent - matched page a");
      page = await fetchSiteAssetFromKvAsHtmlPage('app-dir/page-b.html');
      console.log("handleEvent - back from doPageA");
    } else if ('/app-dir/page-c.html' === reqUrl.pathname) {
      console.log("handleEvent - matched page c");
      page = await doPageC(event);
      console.log("handleEvent - back from doPageC");
    } else if (reqUrl.pathname.startsWith("/tests")) {
      console.log("handleEvent - matched tests");
      page = await handleRunTestRequest(event.request);
      console.log("handleEvent - back from tests");
    } else {
      console.log("handleEvent - not matched page a or c or test, run default handler");
      page = await doStandardUrlToFileMapping(event);
    }

    console.log("handleEvent - about to return normal response");
    const response = new Response(page.body, page);

    return response;

  } catch (e) {

    console.log("handleEvent - error: " + e + ", url: " + reqUrl);

    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/error/404.html`, req),
        })

        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 })
      } catch (e) {}
    }

    return new Response(e.message || e.toString(), { status: 500 })
  }
}


async function doPageC(event) {
  console.log("doPageC - start...");
  //let page;

  try {
    throw 'Toys out of pram';
  } catch (madeUpErr) {
    console.log("doPageC - into catch...");
    /*const page = await getAssetFromKV(event, {
      mapRequestToAsset: req => {
        console.log("Running doPageC mapRequestToAsset map req to asset...");
        return new Request(`${new URL(req.url).origin}/error/500.html`, req);
      },
      cacheControl: { bypassCache: true, },
    });*/
    const page = await fetchSiteAssetFromKvAsHtmlPage('error/500.html');
    return new Response(page.body, { ...page, status: 500 });
  }

}

async function doStandardUrlToFileMapping(event) {

  console.log("doStandardUrlToFileMapping - start...");

  const url = new URL(event.request.url);
  let options = {};

  const page = await getAssetFromKV(event, options)

  // allow headers to be altered
  const response = new Response(page.body, page)

  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'unsafe-url')
  response.headers.set('Feature-Policy', 'none')

  return response;
}


class TestDescription {

  constructor(testName, testFunc) {
    this.testName = testName;
    this.testFunc = testFunc;
  }

}

async function handleRunTestRequest(request) {

  let testList = [];

  // check expected response for page-b

  testList.push(new TestDescription("Fetch an existing page", async function(){

    const page = await fetchSiteAssetFromKvAsHtmlPage('app-dir/page-b.html');

    const pageBody = await page.text();

    const expectedPage = `
<!doctype html>
<html>
<head></head>
<body>
<div class="centered">
<h1>Page B</h1>
Hello, this is page B, which gets loaded instead of page-a.html.
</div>
</body>
</html>`;

    assert.strictEqual(pageBody.trim(), expectedPage.trim(), "Wrong body content: " + pageBody);

  }));


  // run tests

  let allTestsPassed = true;

  for (let yy = 0; yy < testList.length; yy++) {

    let currentTest = testList[yy];

    try {
      await currentTest.testFunc();
      currentTest.testPassed = true;
      console.info("Test passed: " + currentTest.testName);
    } catch (err) {
      allTestsPassed = false;
      currentTest.testPassed = false;
      currentTest.msg = err;
      console.warn("Test failed: " + currentTest.testName + ", msg: " + err);
    }

  }

  // report results

  return new Response(JSON.stringify(testList, null, 2), {
    headers: { 'content-type': 'text/plain' },
    "status": allTestsPassed ? 200 : 500,
  });

}
