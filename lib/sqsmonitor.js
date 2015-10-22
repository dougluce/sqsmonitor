var AWS = require('aws-sdk'),
    async = require('async'),
    fs = require('fs'),
    ach = require('./aws_config_hack'),
    yargs = require('yargs');

var argv = yargs
    .usage('Usage: $0 -t N [options] [queuename [queuename [...]]] [seconds]')
    .example('$0 -r LogQueue\.* 5', 'Display a count of all the LogQueues every 5 seconds.')
    .boolean('e').alias('e', 'extra').describe('e', 'Show inflight and delayed metrics.')
    .boolean('a').alias('a', 'all').describe('a', 'Show all queues.')
    .boolean('n').alias('n', 'nonzero').describe('n', 'Only show queues with entries.')
    .boolean('r').alias('r', 'regexp').describe('r', 'Treat queuenames as patterns.')
    .boolean('s').alias('s', 'sum').describe('s', 'Only show the sum total and not individual queues.')
    .alias('t', 'top').nargs('t',1).describe('t', 'Show only N fullest queues.')
    .help('h').alias('h', 'help')
    .wrap(null)
    .argv;

var interval = 0;

if (argv._.length > 0 && !isNaN(Number(argv._[argv._.length-1]))) // Look for number on end.
  interval = argv._.pop();

var allqueues = false;

if (argv._.length > 0) {
  onlywatch = argv._;
} else if (argv.all || argv.nonzero || argv.top) {
  allqueues = true;
} else {
  yargs.showHelp()
  process.exit(1);
}

if (argv.r) {
  onlywatch = onlywatch.map(function(watch) {
    return new RegExp(watch);
  });
}

var prior = {};

AWS.config.update(ach.getRegion());

var sqs = new AWS.SQS();

var formatDelta = function(delta) {
  return ' (' + (delta>=0?'+':'') + delta.toString() + ')';
}

var isWatching = function(queueName) {
  if (allqueues) // Watch all queues.
    return true;
  if (argv.regexp) {
    return onlywatch.some(function(watchName) {
      return watchName.test(queueName);
    });
  } else {
    return onlywatch.indexOf(queueName) >= 0;
  }
}

var reportOnQueue = function(queue, cb) {
  var queueName = queue.replace(/^.*\/([^\/]+)$/,'$1');

  var reportQueueAttributes = function(err, data) {
    var msgs = +data.Attributes.ApproximateNumberOfMessages;
    var report;
    var text = queueName + ": " + msgs;
    var delta = 0;

    if (msgs > 0 || !argv.nonzero) {
      if (prior[queueName]) {
        delta = msgs - prior[queueName];
        text += formatDelta(delta);
      }
      prior[queueName] = msgs

      if (argv.extra) {
        if ((nv = data.Attributes.ApproximateNumberOfMessagesNotVisible) > 0)
          text += ' inflight: ' + nv;
        if ((d = data.Attributes.ApproximateNumberOfMessagesDelayed) > 0)
          text += ' delayed: ' + d;
      }

      report = {
        msgs: msgs,
        text: text,
        delta: delta
      };
    }
    cb(null,report)
  }

  if (isWatching(queueName)) {
    sqs.getQueueAttributes({QueueUrl: queue, AttributeNames: ['All']}, reportQueueAttributes);
  } else {
    cb(null,null);
  }
}


var reportOnQueues = function(err, queues) {
  if (err) {
    console.log(err);
    return;
  }

  async.concat(queues.QueueUrls, reportOnQueue, function(err, results) {
    if (err) console.log(err);

    results.sort(function(a,b) {
      return b.msgs - a.msgs;
    }); 

    if (argv.top) // Chop list to requested length
      results.length = argv.top

    var sum = 0;
    var delta = 0
    var spacer = results.length>1?'  ':'';
    
    results.forEach(function (report) {
      sum += report.msgs;
      delta += report.delta;
      if (!argv.sum)
        console.log(spacer + report.text);
    });

    if (results.length != 1 || argv.sum) { // Give summary
      console.log("Total: " + sum + formatDelta(delta) + ' Queues: ' + results.length);
    }

    if (interval > 0) {
      setTimeout(function(){
        reportOnQueues(null, queues);
      }, 1000 * interval)
    }
  });
};

exports.run = function () {
  sqs.listQueues({}, reportOnQueues);
}

