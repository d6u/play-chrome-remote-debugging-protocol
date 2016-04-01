'use strict';

/**
 * 1. Run `./start-chrome.sh`
 * 2. Run `node --harmony_destructuring get-screenshots.js` with Node 5
 * 3. Look for *.png at current directory
 */

const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));
const R = require('ramda');
const chromeRemoteInterface = require('chrome-remote-interface');
const co = require('co');
const lwip = Bluebird.promisifyAll(require('lwip'));
const jsdom = Bluebird.promisifyAll(require('jsdom'));

const IDS = [
  'adSide1',
  'adSide2',
  'adBot',
];

chromeRemoteInterface({ port: 9222, chooseTab }, (chrome) => {

  // Add promise API to Chrome domains
  //
  Bluebird.promisifyAll(chrome.Page, { promisifier: commonPromisifier });
  Bluebird.promisifyAll(chrome.DOM, { promisifier: commonPromisifier });
  Bluebird.promisifyAll(chrome.Runtime, { promisifier: commonPromisifier });
  Bluebird.promisifyAll(chrome.Emulation, { promisifier: commonPromisifier });

  chrome.Page.enable();
  chrome.Network.enable();
  chrome.Network.setCacheDisabled({ cacheDisabled: true });
  chrome.Runtime.enable();

  chrome.once('ready', () => {
    chrome.Page.navigate({ url: 'http://www.spanishdict.com/' });

    chrome.once('Page.loadEventFired', co.wrap(function *() {

      console.log('page loaded');
      yield Bluebird.delay(3000);

      try {
        const documentNode = yield chrome.DOM.getDocumentAsync();

        const htmlObject = yield chrome.DOM.resolveNodeAsync({
          nodeId: documentNode.root.children[1].nodeId
        });

        const properties = yield chrome.Runtime.getPropertiesAsync({
          objectId: htmlObject.object.objectId
        });

        const height = R.find(R.propEq('name', 'offsetHeight'), properties.result);

        const viewportHeight = yield chrome.Runtime.evaluateAsync({ expression: 'window.innerHeight' });

        const total = Math.ceil(height.value.value / viewportHeight.result.value);

        const image = yield lwip.createAsync(1280, height.value.value);

        Bluebird.promisifyAll(Object.getPrototypeOf(image));

        let i = 0;
        while (i < total) {
          const data = yield chrome.Page.captureScreenshotAsync();
          const partial = yield lwip.openAsync(new Buffer(data.data, 'base64'), 'png');
          yield image.pasteAsync(
            0,
            total !== i + 1 ?
              i * viewportHeight.result.value :
              height.value.value - viewportHeight.result.value,
            partial);
          yield chrome.Runtime.evaluateAsync({expression: `window.scrollBy(0,${viewportHeight.result.value})`});
          i += 1;
        }

        // Get AD creative screenshot
        //
        for (const id of IDS) {
          const {nodeId} = yield chrome.DOM.querySelectorAsync({
            nodeId: documentNode.root.children[1].nodeId,
            selector: `#${id}`,
          });

          const adDomObject = yield chrome.DOM.resolveNodeAsync({nodeId});

          const properties = yield chrome.Runtime.getPropertiesAsync({
            objectId: adDomObject.object.objectId
          });

          const offsetTop = R.find(R.propEq('name', 'offsetTop'), properties.result);
          const offsetLeft = R.find(R.propEq('name', 'offsetLeft'), properties.result);
          const clientWidth = R.find(R.propEq('name', 'clientWidth'), properties.result);
          const clientHeight = R.find(R.propEq('name', 'clientHeight'), properties.result);

          const adImage = yield image.extractAsync(
            offsetLeft.value.value, // left
            offsetTop.value.value, // top
            offsetLeft.value.value + clientWidth.value.value, // right
            offsetTop.value.value + clientHeight.value.value // bottom
          );

          const adImageBuf = yield adImage.toBufferAsync('png');

          yield fs.writeFileAsync(`screenshot-${id}.png`, adImageBuf);
        }

        const finalImageBuf = yield image.toBufferAsync('png');

        yield fs.writeFileAsync('screenshot.png', finalImageBuf);

        console.log('finish');
      } catch (err) {
        console.error(err);
        console.error(err.stack);
      }

    }));
  });
})
.on('error', function (err) {
  console.error(err.stack);
});

function chooseTab(tabs) {
  return R.findIndex(R.propEq('type', 'page'), tabs);
}

function commonPromisifier(originalFunction) {
  return function promisified() {
    const args = [].slice.call(arguments);
    return new Promise((resolve, reject) => {
      args.push((hasError, data) => {
        if (hasError) {
          reject(data);
        } else {
          resolve(data);
        }
      });
      originalFunction.apply(this, args);
    });
  };
}
