const _ = require('lodash');
const request = require('request');
const logger = require('../lib/logger');

let config = {
  endpoint: 'https://logs.logdna.com/logs/ingest?hostname=',
};

function sendLogs(logs, callback) {
  if (logs.length === 0) {
    callback();
  }

  const messages = {
    "lines": []
  };

  var single = {
    "app": config.appname
  };

  var i = 0;
  logs.forEach(function (entry) {
    logger.debug(`auth0 log #${i++}`);
    logger.debug(JSON.stringify(entry));

    single.line=JSON.stringify(entry);
    messages.lines.push(single);
  });

  // logger.debug('Before sending request...');
  // logger.debug(`config: ${config}`);
  // logger.debug(`url: ${config.endpoint}${config.hostname}`);
  // logger.debug({'apikey': config.key, 'cache-control': 'no-cache', 'Content-Type': 'application/json' });
  // logger.debug({
  //   'user': config.username,
  //   'pass': config.password,
  //   'sendImmediately': false
  // });

  request({
    method: 'POST',
    timeout: 2000,
    url: `${config.endpoint}${config.hostname}`,
    headers: {'apikey': config.key, 'cache-control': 'no-cache', 'Content-Type': 'application/json' },
    body: messages,
    json: true,
    // auth: {
    //   'user': config.username,
    //   'pass': config.password,
    //   'sendImmediately': false
    // }
  }, (error, response, body) => {
    logger.debug('error:', error);
    logger.debug('statusCode:', response && response.statusCode);
    logger.debug('body:', body);

    const isError = !!error || response.statusCode < 200 || response.statusCode >= 400;

    if (isError) {
      return callback(error || response.error || response.body);
    }

    return callback();
  });
}

function LogdnaLogging (host, key, app, username, password) {
  if (!host) {
    throw new Error('HOSTNAME is required for Logdna');
  }

  if (!key) {
    throw new Error('LOGDNA_INGESTION_KEY is required for Logdna');
  }

  if (!app) {
    throw new Error('LOGDNA_APP_NAME is required for Logdna');
  }

  if (!username) {
    throw new Error('LOGDNA_USER_NAME is required for Logdna');
  }

  if (!password) {
    throw new Error('LOGDNA_USER_PASSWORD is required for Logdna');
  }

  config = _.merge(
    config,
    {
      hostname: host,
      key: key,
      appname: app,
      username: username,
      password: password
    },
  );
}

LogdnaLogging.prototype.send = function(logs, callback) {
  if (!logs || !logs.length) {
    return callback();
  }

  return sendLogs(logs, callback);
};

module.exports = LogdnaLogging;
