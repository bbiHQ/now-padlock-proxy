const http = require('http');
const httpProxy = require('http-proxy');
const auth = require('basic-auth');
const crypto = require('crypto');
const randomWords = require('random-words');

const FLAGS = {
  OPEN: '-o',
  LOCKED: '-l'
}


// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({changeOrigin: true, autoRewrite: true, hostRewrite: true, followRedirects: true});


const server = http.createServer(function(req, res) {

  const subdomain = req.headers.host.split(/\.(.*)/).filter(Boolean)[0];
  
  const appMode = subdomain.endsWith(FLAGS.OPEN) 
                  ? "open"
                  : subdomain.endsWith(FLAGS.LOCKED) 
                  ? "locked"
                  : 'generate';


  
  
  const subdomainTokens = subdomain.split(/(^.*)-(.*)-(.*)/).filter(Boolean);

  const deploymentId = (appMode !== 'generate')
                        ? subdomainTokens[0] 
                        : subdomain;
  

  const password = appMode === 'generate' ? randomWords({ exactly: 4, join: '-' }) : subdomainTokens[1];
  const username = deploymentId.split(/(^.*)-(.*)/).filter(Boolean)[0];

  if (appMode === 'locked') {
    const credentials = auth(req);
    if (!credentials || !isAuthed(credentials, username, password, appMode)) {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="example"');
      res.end('Access denied.');
    } else {
      // do nothing
      // res.end('Access granted')
    }
  } else if (appMode === 'open') {

  } else if (appMode === 'generate') {
    res.statusCode = 200;
    
    const domain = req.headers.host.split(/\.(.*)/).filter(Boolean)[1];
    
    const links = {
      'target': `https://${deploymentId}.now.sh${req.url}`,
      'passthrough': `https://${deploymentId}.${domain}${req.url}`,
      'locked': `https://${deploymentId}-${crypto.createHash('md5').update(password).digest('hex').substring(0,7)}${FLAGS.LOCKED}.${domain}${req.url}`
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
          #password {
            width: 50%;
            height: 2rem;
          }
        </style>
        
      </head>
      <body>
        <h2><u>now-padlock-proxy</u> for ${domain}</h2>
        <p>Username: ${username}<br/>Password: <input id="password" value="${password}"/></p>
        
        <p><ul>
          <li><b>Now Deployment:</b><br/>${links['target']}</li>
          <li><b>Open Proxy:</b><br/>${links['passthrough']}</li>
          
          <li><b>Password Protected:</b><br/>${links['locked']}</li>
        </ul></p>
        <p style="margin-top:5rem;">
          <a href="https://zeit.co/new/project?template=https://github.com/bbiHQ/now-padlock-proxy/tree/master" target="_blank" style="display:block;margin-bottom:1rem;"><img src="https://zeit.co/button" alt="Deploy to ZEIT Now" /></a>
          <a class="github-button" href="https://github.com/bbiHQ/now-padlock-proxy/fork" data-show-count="true" data-color-scheme="no-preference: light; light: light; dark: dark;" data-icon="octicon-repo-forked" aria-label="Fork bbiHQ/now-padlock-proxy on GitHub">Fork</a>
          <a class="github-button" href="https://github.com/bbiHQ/now-padlock-proxy" data-show-count="true" data-color-scheme="no-preference: light; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star bbiHQ/now-padlock-proxy on GitHub">Star</a>
          
        </p>
        <script async defer src="https://buttons.github.io/buttons.js"></script>
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




const isAuthed = function (credentials, username, password, appMode) {

  if (authMode === 'locked') {
    return credentials.name === username && crypto.createHash('md5').update(credentials.pass).digest('hex').substring(0,7) === password;
  }
}