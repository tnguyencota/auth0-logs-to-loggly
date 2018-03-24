var Logger = require('logdna');
const loggingTools = require('auth0-log-extension-tools');
const tools = require('auth0-extension-tools');
const path = require('path');
const moment = require('moment');
const request = require('request');
const url = require('url');

//get logs
const options = {
  domain: 'AUTH0_DOMAIN',
  clientId: 'AUTH0_CLIENT_ID',
  clientSecret: 'AUTH0_CLIENT_SECRET',
  startFrom: 'AUTH0_LOG_MESSAGE_ID',
};
const storage = new tools.FileStorageContext(path.join(__dirname, './data.json'), { mergeWrites: true });
const auth0logger = new loggingTools.LogsProcessor(storage, options);


const onLogsReceived = (logs, callback) => {
  if (!logs || !logs.length) {
    return callback();
  }

  var options = {
    app: 'auth0',
    env: 'dev'
  };
  var dnaLogger = Logger.setupDefaultLogger('LOGDNA_INGEST_KEY', options);
  
  console.log('Printing log message...');
  var i = 0;
  logs.forEach(function (entry) {
    console.log(`auth0 log #${i++}`);
    console.log(JSON.stringify(entry));
    dnaLogger.log(JSON.stringify(entry));
  });

  console.log('Done printing log message');
};


const onLogsReceivedHttp = (logs, callback) => {
  if (!logs || !logs.length) {
    return callback();
  }

  var messages = {
    "lines": []
  };
  var single = {
    "app": "auth0"
  };

  //printing and constructing message to be sent to logdna
  console.log('Printing log message...');
  var i = 0;
  logs.forEach(function (entry) {
    console.log(`auth0 log #${i++}`);
    console.log(JSON.stringify(entry));

    single.line=JSON.stringify(entry);
    single.timestamp=Date.parse(entry.date);

    console.log('---');
    console.log(single);
    messages.lines.push(single);
  });
  console.log('Done printing log message');

  //sending logs to logdna
  request({
    method: 'POST',
    timeout: 2000,
    url: 'https://logs.logdna.com/logs/ingest?hostname=hostname.com',
    headers: {'apikey': 'LOGDNA_INGEST_KEY', 'cache-control': 'no-cache', 'Content-Type': 'application/json' },
    body: messages,
    json: true,
    // auth: {
    //   'user': 'LOGDNA_USERNAME',
    //   'pass': 'LOGDNA_PASSWORD',
    //   'sendImmediately': false
    // }
  }, (error, response, body) => {
    console.log('Status of sending to logs to logdna');
    console.log('error:', error); 
    console.log('statusCode:', response && response.statusCode); 
    console.log('body:', body); 
  });
};

auth0logger
  .run(onLogsReceivedHttp)
  .then(result => {
    if (result && result.status && result.status.error) {
      console.log('status of getting logs from auth0');
      console.log(result.status);
      console.log(result.status.error);
    } else {
      console.log('status of getting logs from auth0');
      console.log(result.status);
      console.log(result.checkpoint);
    }
    
    res.json(result);
  })
  .catch(err => {
    console.log('status of getting logs from auth0');
    console.log(err);
    console.log(result.status);
    next(err);
  });
