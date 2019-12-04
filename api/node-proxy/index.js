const http = require('http');
const httpProxy = require('http-proxy');
const auth = require('basic-auth');
const crypto = require('crypto');
const randomWords = require('random-words');

const FLAGS = {
  SIMPLE: '-p',
  HASHLONG: '-h32',
  HASH: '-h',
  ENCRYPT: '-e',
  GENERATOR: '-generate'
}


// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({changeOrigin: true, autoRewrite: true, hostRewrite: true, followRedirects: true});


const server = http.createServer(function(req, res) {

  const subdomain = req.headers.host.split(/\.(.*)/).filter(Boolean)[0];
  
  const authRequired = subdomain.endsWith(FLAGS.SIMPLE) || subdomain.endsWith(FLAGS.HASHLONG) || subdomain.endsWith(FLAGS.HASH);
  const authMode = !authRequired 
                    ? undefined
                    : subdomain.endsWith(FLAGS.SIMPLE) 
                    ? "simple"
                    : subdomain.endsWith(FLAGS.HASHLONG) 
                    ? "hashed-long"
                    : subdomain.endsWith(FLAGS.HASH)
                    ? "hashed"
                    : undefined;
  
  const generatorMode = subdomain.endsWith(FLAGS.GENERATOR) ? "generator" : subdomain.endsWith(FLAGS.ENCRYPT) ? "encrypt" : undefined;

  // just in case
  if (authRequired && !authMode) {
    res.statusCode = 400;
    res.end('Bad request.');
  }


  
  
  const subdomainTokens = subdomain.split(/(^.*)-(.*)-(.*)/).filter(Boolean);

  const deploymentId = (authRequired || generatorMode === 'encrypt')
                        ? subdomainTokens[0] 
                        : generatorMode === 'generator' 
                        ? `${subdomainTokens[0]}-${subdomainTokens[1]}` 
                        : subdomain;
  
  const password = (authRequired || generatorMode === 'encrypt') ? subdomainTokens[1] : generatorMode === 'generator' ? randomWords({ exactly: 4, join: '-' }) : undefined;
  const username = deploymentId.split(/(^.*)-(.*)/).filter(Boolean)[0];

  if (authRequired) {
    const credentials = auth(req);
    if (!credentials || !isAuthed(credentials, username, password, authMode)) {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="example"');
      res.end('Access denied.');
    } else {
      // do nothing
      // res.end('Access granted')
    }
  }

  if (generatorMode !== undefined) {
    res.statusCode = 200;
    
    const domain = req.headers.host.split(/\.(.*)/).filter(Boolean)[1];
    
    const links = {
      'target': `https://${deploymentId}.now.sh${req.url}`,
      'passthrough': `https://${deploymentId}.${domain}${req.url}`,
      'simple': `https://${deploymentId}-${password}${FLAGS.SIMPLE}.${domain}${req.url}`,
      'hashed-long': `https://${deploymentId}-${crypto.createHash('md5').update(password).digest('hex')}${FLAGS.HASHLONG}.${domain}${req.url}`,
      'hashed': `https://${deploymentId}-${crypto.createHash('md5').update(password).digest('hex').substring(0,7)}${FLAGS.HASH}.${domain}${req.url}`
    }

    const html = `<html>
      <head>
        <title>now-padlock-proxy for ${domain}</title>
        <link href="https://fonts.googleapis.com/css?family=Solway&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Solway', serif;
          }
          li{
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <h2>now-padlock-proxy for ${domain}</h2>
        <p>Username: ${username}<br/>Password: ${password}</p>
        
        <p><ul>
          <li><b>Now Deployment:</b><br/>${links['target']}</li>
          <li><b>Open Proxy:</b><br/>${links['passthrough']}</li>
          <!--<li><b>Simple Password Proected Proxy:</b><br/>${links['simple']}</li>-->
          <li><b>Encrypted Password Proxy (Complex):</b><br/>${links['hashed-long']}</li>
          <li><b>Encrypted Password Proxy (Simple):</b><br/>${links['hashed']}</li>
        </ul></p>
      </body></html>`;

    res.end(html);
  
    
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




const isAuthed = function (credentials, username, password, authMode) {

  if (authMode === 'simple') {
    return credentials.name === username && credentials.pass === password;
  } else if (authMode === 'hashed-long') {
    return credentials.name === username && crypto.createHash('md5').update(credentials.pass).digest('hex') === password;
  } else if (authMode === 'hashed') {
    return credentials.name === username && crypto.createHash('md5').update(credentials.pass).digest('hex').substring(0,7) === password;
  }
}