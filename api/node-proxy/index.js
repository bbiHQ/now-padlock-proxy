var http = require('http'),
    httpProxy = require('http-proxy');

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({changeOrigin: true, autoRewrite: true, hostRewrite: true, followRedirects: true});

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  // console.log(`path:${`https://${req.headers.host.split('.')[0]}.now.sh`}`);

  
  proxy.on('proxyRes', function(proxyRes, req, res) {
    console.log('Raw [target] response', JSON.stringify(proxyRes.headers, true, 2));
    
    proxyRes.headers['x-reverse-proxy'] = "bbi-now-proxy";
    // proxyRes.headers['cache-control'] = "max-age=31536000, public";
    console.log('Updated [proxy] response', JSON.stringify(proxyRes.headers, true, 2));
    
  });
  proxy.web(req, res, { target: `https://${req.headers.host.split('.')[0]}.now.sh` });
  // proxy.web(req, res, { target: `https://macao20.com` });
});

console.log("reverse proxy for ZEIT Now started on port 3000...");
server.listen(3000);