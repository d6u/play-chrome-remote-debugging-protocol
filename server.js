const koa = require('koa');
const app = koa();

app.use(function *() {
  this.body =
  `<html>
    <head>
      <script>
      function callMe(cb) {
        var d = Date.now();
        document.write(typeof cb);
        cb(d);
      }
      </script>
    </head>
  </html>`;
});

app.listen(11000);
