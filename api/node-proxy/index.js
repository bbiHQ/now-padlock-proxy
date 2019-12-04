const http = require('http'),
    httpProxy = require('http-proxy'),
    auth = require('basic-auth');


// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({changeOrigin: true, autoRewrite: true, hostRewrite: true, followRedirects: true});


const server = http.createServer(function(req, res) {

  const subdomain = req.headers.host.split('.')[0];
  const subdomainTokens = subdomain.split(/(^.*)-(.*)-(.*)/).filter(Boolean);
  const authRequired = subdomain.endsWith('-p');
  
  
  const deploymentId = authRequired ? subdomainTokens[0] : subdomain;
  
  const password = authRequired ? subdomainTokens[1] : undefined;
  const username = authRequired ? deploymentId.split(/(^.*)-(.*)/).filter(Boolean)[0] : undefined;

  if (authRequired) {
    const credentials = auth(req)
    if (!credentials || !(credentials.name === username && credentials.pass === password)) {
      res.statusCode = 401
      res.setHeader('WWW-Authenticate', 'Basic realm="example"')
      res.end('Access denied.')
    } else {
      // do nothing
      // res.end('Access granted')
    }
  }


  proxy.on('proxyRes', function(proxyRes, req, res) {
    // console.log('Raw [target] response', JSON.stringify(proxyRes.headers, true, 2));
    
    proxyRes.headers['x-proxy'] = "now-padlock-proxy";
    
    // console.log('Updated [proxy] response', JSON.stringify(proxyRes.headers, true, 2));
    
  });
  proxy.web(req, res, { target: `https://${deploymentId}.now.sh` });
  
});

console.log("padlock proxy for ZEIT Now started on port 3000...");
server.listen(3000);




// const check = function (name, pass, deploymentId) {
//   var valid = true
 
//   // if (deploymentId === undefined) {
//   //   // Simple method to prevent short-circut and use timing-safe compare
//   //   valid = name === 'client' && valid
//   //   valid = pass === 'secret' && valid
//   // } else {
    
//   // }
 
//   return valid
// }