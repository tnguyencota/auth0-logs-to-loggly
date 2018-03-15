const async = require('async');
const moment = require('moment');
const Logdna = require('logdna');
const loggingTools = require('auth0-log-extension-tools');
const config = require('../lib/config');
const logger = require('../lib/logger');

module.exports = (storage) =>
  (req, res, next) => {
    const wtBody = (req.webtaskContext && req.webtaskContext.body) || req.body || {};
    const wtHead = (req.webtaskContext && req.webtaskContext.headers) || {};
    const isCron = (wtBody.schedule && wtBody.state === 'active') || (wtHead.referer === `${config('AUTH0_MANAGE_URL')}/` && wtHead['if-none-match']);

    if (!isCron) {
      return next();
    }

    const logdna_opts = {
      app: config('LOGDNA_APP_NAME')
    };
    
    const API_KEY = config('LOGDNA_API_KEY');
    
    console.log('This is my API Key: %j', API_KEY);
    
    const logdna = Logdna.createLogger(API_KEY, logdna_opts);

    const onLogsReceived = (logs, callback) => {
      if (!logs || !logs.length) {
        return callback();
      }

      // logger.info('Printing log message...');
      // var i = 0;
      // logs.forEach(function (entry) {
      //   logger.info(`auth0 log #${i++}`);
      //   logger.info(JSON.stringify(entry));
      // });

      logger.info(`Sending ${logs.length} logs to Logdna.`);

      for (var j = 0; j < logs.length; j++) {
        logger.info(JSON.stringify(logs[j]));
        logdna.log(JSON.stringify(logs[j]));
      }

      logger.info('Upload complete.');

        //need this otherwise will get 500 error from extension run
        return callback();
    };

    const slack = new loggingTools.reporters.SlackReporter({
      hook: config('SLACK_INCOMING_WEBHOOK_URL'),
      username: 'cota-auth0-to-logdna',
      title: 'Logs To Logdna'
    });

    const options = {
      domain: config('AUTH0_DOMAIN'),
      clientId: config('AUTH0_CLIENT_ID'),
      clientSecret: config('AUTH0_CLIENT_SECRET'),
      batchSize: config('BATCH_SIZE'),
      startFrom: config('START_FROM'),
      logLevel: config('LOG_LEVEL'),
      logTypes: config('LOG_TYPES')
    };

    if (!options.batchSize || options.batchSize > 100) {
      options.batchSize = 100;
    }

    if (options.logTypes && !Array.isArray(options.logTypes)) {
      options.logTypes = options.logTypes.replace(/\s/g, '').split(',');
    }

    const auth0logger = new loggingTools.LogsProcessor(storage, options);

    const sendDailyReport = (lastReportDate) => {
      const current = new Date();

      const end = current.getTime();
      const start = end - 86400000;
      auth0logger.getReport(start, end)
        .then(report => slack.send(report, report.checkpoint))
        .then(() => storage.read())
        .then((data) => {
          data.lastReportDate = lastReportDate;
          return storage.write(data);
        });
    };

    const checkReportTime = () => {
      storage.read()
        .then((data) => {
          const now = moment().format('DD-MM-YYYY');
          const reportTime = config('DAILY_REPORT_TIME') || 16;

          if (data.lastReportDate !== now && new Date().getHours() >= reportTime) {
            sendDailyReport(now);
          }
        })
    };

    return auth0logger
      .run(onLogsReceived)
      .then(result => {
        if (result && result.status && result.status.error) {
          slack.send(result.status, result.checkpoint);
        } else if (config('SLACK_SEND_SUCCESS') === true || config('SLACK_SEND_SUCCESS') === 'true') {
          slack.send(result.status, result.checkpoint);
        }
        checkReportTime();
        res.json(result);
      })
      .catch(err => {
        slack.send({ error: err, logsProcessed: 0 }, null);
        checkReportTime();
        next(err);
      });
  };
