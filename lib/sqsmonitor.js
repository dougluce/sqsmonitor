var AWS = require('aws-sdk'),
    async = require('async'),
    fs = require('fs'),
    stdio = require('stdio');

var CONFIG_FILE = process.env.HOME + "/.sqsmonitor";
var S3CFG_CONFIG = process.env.HOME + '/.s3cfg';

// Command-line options.

var opts = stdio.getopt({ 
    'extra': {key: 'e', args: 0, description: 'Extra metrics: inflight, delayed'},
    'nonzero': {key: 'n', args: 0, description: 'Only show queues if they have messages'},
    'all': {key: 'a', args: 0, description: 'Show all queues'},
    'regexp': {key: 'r', args: 0, description: 'Treat given queuenames as patterns'},
    'sum': {key: 's', args: 0, description: 'Only show the sum total and not individual queues'},
    'top': {key: 't', args: 1, description: 'Show top queues'},
}, '[queuename [queuename [...]]] [interval]');

var args = opts.args; // Remaining args left.
if (!args) args = []; // Makes conditionals simplier.

var interval = 0;

if (args.length > 0 && args[args.length-1].search(/^\d+$/) != -1) // Look for number on end.
    interval = args.pop();

var onlywatch = ['prod_process_actions'];
var allqueues = false;

if (args.length > 0) {
    onlywatch = args;
} else if (opts.all || opts.nonzero || opts.top) {
    allqueues = true;
}

if (opts.regexp) {
    onlywatch = onlywatch.map(function(watch) {
	return new RegExp(watch);
    });
}


try {
    AWS.config.loadFromPath(CONFIG_FILE);
} catch (err) { // Backup is the s3cfg file.
    if (err.code !== 'ENOENT') throw err;
    var iniparser = require('iniparser');

    try {
	var config = iniparser.parseSync(S3CFG_CONFIG);
	if (!config.default || !config.default.access_key || !config.default.secret_key) {
	    console.log(S3CFG_CONFIG + " doesn't have a [default] section with access_key and secret_key");
	    process.exit(-1);
	}
	AWS.config.update({
	    accessKeyId: config.default.access_key,
	    secretAccessKey:config.default.secret_key,
	    region: 'us-east-1'
	});
    } catch (err) {
	if (err.code !== 'ENOENT') throw err;
	console.log("I need a config file: " + CONFIG_FILE + " or " + S3CFG_CONFIG);
	process.exit(-1);
    }
}

var prior = {};

var sqs = new AWS.SQS();

var formatDelta = function(delta) {
    return ' (' + (delta>=0?'+':'') + delta.toString() + ')';
}

var isWatching = function(queueName) {
    if (allqueues) // Watch all queues.
	return true;
    if (opts.regexp) {
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

	if (msgs > 0 || !opts.nonzero) {
	    if (prior[queueName]) {
		delta = msgs - prior[queueName];
		text += formatDelta(delta);
	    }
	    prior[queueName] = msgs

	    if (opts.extra) {
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
    if (err) console.log(err);

    async.concat(queues.QueueUrls, reportOnQueue, function(err, results) {
	if (err) console.log(err);

	results.sort(function(a,b) {
	    return b.msgs - a.msgs;
	}); 

	if (opts.top) // Chop list to requested length
	    results.length = opts.top

	var sum = 0;
	var delta = 0
	var spacer = results.length>1?'  ':'';
	
	results.forEach(function (report) {
	    sum += report.msgs;
	    delta += report.delta;
	    if (!opts.sum)
		console.log(spacer + report.text);
	});

	if (results.length != 1 || opts.sum) { // Give summary
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

