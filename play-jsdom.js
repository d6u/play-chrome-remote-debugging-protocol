const jsdom = require("jsdom");

jsdom.env(
  {
    html: '<p><a class="the-link" href="https://github.com/tmpvar/jsdom">jsdom!</a></p>',
    features: {
      FetchExternalResources: false
    }
  },
  function (err, window) {
    console.log(window.document.querySelectorAll('a'));
  }
);
