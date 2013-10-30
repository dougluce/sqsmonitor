# sqsmonitor

sqsmonitor is used to check on the status of SQS queues.

    Usage:
      sqsmonitor [options] queue [queue ...] [interval]

    Parameters:
      queue [queue ...]
        One or more queue names to watch.  If not specified, defaults to process_actions.
      interval
        Specified for continuous display: seconds between checks.

    Options:
      -e|--extra 
        Display extra metrics like inflight and delayed messages.

      -n|--nonzero
        Only show given queues if they have messages

      -a|--all
        Check all queues

      -t|--totals
	    Only show totals, not individual queues

    Examples:
	  sqsmonitor
	  sqsmonitor -a -n
	  sqsmonitor -e prod_process_actions-opens 1
	  sqsmonitor prod_process_actions-opens prod_process_actions-installs 60
	  
## Install from repo

Once you have this repository checked out, do:

    npm link

You'll need either a working ~/.s3cmd configuration or a ~/.sqsmonitor
JSON config file, which looks like this:

```json
{ 
  "accessKeyId": "AKIABFOJHE19JDLS4G3A",
  "secretAccessKey": "J29OoH8JlsCdowF+jLSKU2/Hos8VJsl2jslkh22L",
  "region": "us-west-1"
}
```



