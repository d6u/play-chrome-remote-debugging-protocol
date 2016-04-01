'use strict';

const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));
const R = require('ramda');
const chromeRemoteInterface = require('chrome-remote-interface');
const co = require('co');
const lwip = Bluebird.promisifyAll(require('lwip'));
const jsdom = Bluebird.promisifyAll(require('jsdom'));

const IDS = [
  // 'adSide1',
  // 'adSide2',
  // 'adBot',
  // 'google_ads_iframe_\\/1027916\\/BSM_300_250_SIDEBAR_0',
];

const getPath = co.wrap(function *(chrome, path, objectId) {
  const {result: props} = yield chrome.Runtime.getPropertiesAsync({objectId});
  const {value} = R.find(R.propEq('name', path[0]), props);
  if (path.length > 1) {
    return yield getPath(chrome, path.slice(1), value.objectId);
  } else {
    return value;
  }
});

const extractHTML = co.wrap(function *(chrome, nodeId, contextId) {
  // const { outerHTML } = yield chrome.DOM.getOuterHTMLAsync({ nodeId });

  console.log(yield chrome.Runtime.evaluateAsync({expression: 'document.contentDocument.outerHTML', contextId: Number(contextId)}))

  console.log(yield getResourceContentAsync({frameId: frameId})

  const {object: {objectId}} = yield chrome.DOM.resolveNodeAsync({nodeId});

  // const value = yield getPath(chrome, ['outerHTML'], objectId);

  // const value = yield getPath(chrome, ['contentDocument', 'documentElement', 'outerHTML'], objectId);
  const value = yield getPath(chrome, ['contentWindow', 'document'], objectId);

  console.log(value);

  // return outerHTML;
});

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
    chrome.Page.navigate({ url: 'http://pn-exp-main.s3-website-us-east-1.amazonaws.com/' });

    chrome.once('Page.loadEventFired', co.wrap(function *() {

      console.log('page loaded');
      yield Bluebird.delay(1000);

      try {
        const rt = yield chrome.Page.getResourceTreeAsync();

        // console.log(JSON.stringify(rt, null, 4));

        const documentNode = yield chrome.DOM.getDocumentAsync();
        // console.log(JSON.stringify(documentNode, null, 4));
        // const htmlObject = yield chrome.DOM.resolveNodeAsync({
        //   nodeId: documentNode.root.children[1].nodeId
        // });

        // const properties = yield chrome.Runtime.getPropertiesAsync({
        //   objectId: htmlObject.object.objectId
        // });

        // const height = R.find(R.propEq('name', 'offsetHeight'), properties.result);

        // const viewportHeight = yield chrome.Runtime.evaluateAsync({ expression: 'window.innerHeight' });

        // const total = Math.ceil(height.value.value / viewportHeight.result.value);

        // const image = yield lwip.createAsync(1280, height.value.value);

        // Bluebird.promisifyAll(Object.getPrototypeOf(image));

        // let i = 0;
        // while (i < total) {
        //   const data = yield chrome.Page.captureScreenshotAsync();
        //   const partial = yield lwip.openAsync(new Buffer(data.data, 'base64'), 'png');
        //   yield image.pasteAsync(
        //     0,
        //     total !== i + 1 ?
        //       i * viewportHeight.result.value :
        //       height.value.value - viewportHeight.result.value,
        //     partial);
        //   yield chrome.Runtime.evaluateAsync({expression: `window.scrollBy(0,${viewportHeight.result.value})`});
        //   i += 1;
        // }

        // Get AD creative screenshot
        //
        // for (const id of IDS) {
          const {nodeId} = yield chrome.DOM.querySelectorAsync({
            nodeId: documentNode.root.children[1].nodeId,
            // selector: `#${id}`,
            selector: `iframe`,
          });

          // console.log(rt.frameTree.frame.id);

          const outerHTML = yield extractHTML(chrome, nodeId);

          // console.log(outerHTML);

          // const outerHTML = yield chrome.DOM.getOuterHTMLAsync({ nodeId: nodeId.nodeId });

          // const nodeObject = yield chrome.DOM.resolveNodeAsync({
          //   nodeId: nodeId.nodeId,
          // });

          // const props = yield chrome.Runtime.getPropertiesAsync({
          //   objectId: nodeObject.object.objectId
          // });

          // console.log(R.find(R.propEq('name', 'contentDocument'), props.result).value);

        //   break;

        //   const adDomObject = yield chrome.DOM.resolveNodeAsync({
        //     nodeId: nodeId.nodeId
        //   });

        //   const properties = yield chrome.Runtime.getPropertiesAsync({
        //     objectId: adDomObject.object.objectId
        //   });

        //   const offsetTop = R.find(R.propEq('name', 'offsetTop'), properties.result);
        //   const offsetLeft = R.find(R.propEq('name', 'offsetLeft'), properties.result);
        //   const clientWidth = R.find(R.propEq('name', 'clientWidth'), properties.result);
        //   const clientHeight = R.find(R.propEq('name', 'clientHeight'), properties.result);

        //   const adImage = yield image.extractAsync(
        //     offsetLeft.value.value, // left
        //     offsetTop.value.value, // top
        //     offsetLeft.value.value + clientWidth.value.value, // right
        //     offsetTop.value.value + clientHeight.value.value // bottom
        //   );

        //   const adImageBuf = yield adImage.toBufferAsync('png');

        //   yield fs.writeFileAsync(`screenshot-${id}.png`, adImageBuf);
        // }

        // const finalImageBuf = yield image.toBufferAsync('png');

        // yield fs.writeFileAsync('screenshot.png', finalImageBuf);

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
  const index = R.findIndex(R.propEq('type', 'page'), tabs);
  if (index === -1) {
    throw new Error('no tab with page type found');
  }
  return index;
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
