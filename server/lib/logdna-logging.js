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
    "app": config.appName
  };

  var i = 0;
  logs.forEach(function (entry) {
    logger.debug(`auth0 log #${i++}`);
    logger.debug(JSON.stringify(entry));

    single.line=JSON.stringify(entry);
    messages.lines.push(single);
  });

  request({
    method: 'POST',
    timeout: 2000,
    url: `${config.endpoint}=${config.hostname}`,
    headers: {'apikey': config.apikey, 'cache-control': 'no-cache', 'Content-Type': 'application/json' },
    body: messages,
    json: true,
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

function LogdnaLogging (key, app, host) {
  if (!key) {
    throw new Error('LOGDNA_API_KEY is required for Logdna');
  }

  if (!host) {
    throw new Error('HOSTNAME is required for Logdna');
  }

  config = _.merge(
    config,
    {
      key: key,
      appname: app,
      hostname: host
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
