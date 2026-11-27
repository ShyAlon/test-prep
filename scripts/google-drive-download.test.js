import test from 'node:test';
import assert from 'node:assert/strict';
import { googleDriveApiRequest } from '../src/google-drive-download.js';
import { downloadThemeZip, themeDownloadLink } from '../src/theme-download.js';

const silent = {info(){},error(){}};
test('shared Drive files use the CORS-enabled media API with resource-key headers', async () => {
  const input='https://drive.google.com/file/d/shared-file/view?resourcekey=sharing-key';
  const request=googleDriveApiRequest(themeDownloadLink(input),'restricted-browser-key');
  const url=new URL(request.url);
  assert.equal(url.origin,'https://www.googleapis.com');
  assert.equal(url.pathname,'/drive/v3/files/shared-file');
  assert.equal(url.searchParams.get('alt'),'media');
  assert.equal(url.searchParams.get('key'),'restricted-browser-key');
  assert.deepEqual(request.headers,{'X-Goog-Drive-Resource-Keys':'shared-file/sharing-key'});
  assert.equal(request.referrerPolicy,'strict-origin-when-cross-origin');
  const bytes=await downloadThemeZip(input,{driveApiKey:'restricted-browser-key',logger:silent,fetch:async(target,options)=>{
    assert.equal(target,request.url);
    assert.deepEqual(options.headers,request.headers);
    assert.equal(options.credentials,'omit');
    assert.equal(options.referrerPolicy,request.referrerPolicy);
    return new Response('PKfixture');
  }});
  assert.equal(bytes.length,9);
});

test('Drive imports fail clearly if configuration is missing or a file is private', async () => {
  const input='https://drive.google.com/open?id=shared-file';
  assert.equal(googleDriveApiRequest(themeDownloadLink(input),''),null);
  await assert.rejects(downloadThemeZip(input,{driveApiKey:'',logger:silent,fetch:()=>assert.fail('no request without configuration')}),{reason:'drive-api-not-configured'});
  await assert.rejects(downloadThemeZip(input,{driveApiKey:'test',logger:silent,fetch:async()=>new Response('{}',{status:403,headers:{'content-type':'application/json'}})}),error=>{
    assert.equal(error.reason,'http-error');
    assert.ok(error.message.includes('כל מי שקיבל את הקישור'));
    return true;
  });
  assert.throws(()=>themeDownloadLink(input+'&resourcekey=bad%0Akey'));
});
