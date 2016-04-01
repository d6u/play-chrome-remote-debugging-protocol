'use strict';

const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));
const R = require('ramda');
const chromeRemoteInterface = require('chrome-remote-interface');
const co = require('co');

connect().then(console.log);

class ChooseTabError extends Error {
  constructor() {
    super('No tab with page type found');
  }
}

function connect() {
  return Bluebird.fromCallback(function (done) {
    process.on('uncaughtException', function uncaughtExceptionHandler(err) {
      if (err instanceof ChooseTabError) {
        process.removeListener('uncaughtException', uncaughtExceptionHandler);
        done(err);
      } else {
        throw err;
      }
    });

    chromeRemoteInterface({port: 9222, chooseTab}, (chrome) => {
      done(null, chrome);
    }).on('error', done);
  });
}

function chooseTab(tabs) {
  return R.findIndex(R.propEq('type', 'pagexxxx'), tabs);
}
