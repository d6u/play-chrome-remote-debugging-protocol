'use strict';

const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));
const R = require('ramda');
const chromeRemoteInterface = require('chrome-remote-interface');
const co = require('co');
const lwip = Bluebird.promisifyAll(require('lwip'));
const jsdom = Bluebird.promisifyAll(require('jsdom'));

const selectors = [
  'html',
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

const main = co.wrap(function *(chrome) {
  console.log('page loaded');

  let got = false;

  chrome.on('DOM.setChildNodes', (nodes) => {
    if (!got) {
      got = true;
      const iframeContentDocumentId =
        R.path(['nodes', 3, 'contentDocument', 'nodeId'], nodes);
      chrome.DOM.requestChildNodesAsync({
        nodeId: iframeContentDocumentId,
        depth: -1,
      });
    } else {
      console.log(JSON.stringify(nodes, null, 4));
    }
  });

  yield Bluebird.delay(1000);

  const {root: rootDocument} = yield chrome.DOM.getDocumentAsync();
  const {nodeId: iframeNodeId} = yield chrome.DOM.querySelectorAsync({
    nodeId: rootDocument.nodeId,
    selector: 'iframe',
  });

  console.log('finish');
});

chromeRemoteInterface({port: 9222, chooseTab}, (chrome) => {

  Bluebird.promisifyAll(chrome.Page, {promisifier: commonPromisifier});
  Bluebird.promisifyAll(chrome.DOM, {promisifier: commonPromisifier});
  Bluebird.promisifyAll(chrome.Runtime, {promisifier: commonPromisifier});

  chrome.Page.enable();
  chrome.Network.enable();
  chrome.Network.setCacheDisabled({cacheDisabled: true});
  chrome.Runtime.enable();

  chrome.once('ready', () => {
    chrome.Page.navigate({url: 'http://pn-exp-main.s3-website-us-east-1.amazonaws.com/'});
    chrome.once('Page.loadEventFired', () => {
      main(chrome).catch((err) => {
        console.error(err);
        console.error(err.stack);
      });
    });
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
