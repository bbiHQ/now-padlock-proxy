var http = require('http'),
    httpProxy = require('http-proxy');

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({changeOrigin: true, autoRewrite: true, hostRewrite: true});

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  
  proxy.on('proxyRes', function(proxyRes, req, res) { res.setHeader('reverse-proxy', 'bbi-now'); });
  proxy.web(req, res, { target: `https://${req.headers.host.replace('bbi.space', 'now.sh')}` });
});

console.log("reverse proxy for ZEIT Now started on port 3000");
server.listen(3000);