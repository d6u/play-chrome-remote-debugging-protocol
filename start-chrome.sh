#!/usr/bin/env bash

rm -rf _temp/chrome-user-profile-dir

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --args \
  --user-data-dir=$(pwd)/_temp/chrome-user-profile-dir \
  --no-default-browser-check \
  --no-first-run \
  --disable-default-apps \
  --disable-popup-blocking \
  --disable-translate \
  --remote-debugging-port=9222 \
  --window-size="1280,800"
