# sqsmonitor

sqsmonitor is used to check on the status of SQS queues.

    Usage:
      sqsmonitor [options] queuename [queuename ...] [interval]

    Parameters:
      queuename [queuename ...]
        The names of one or more queues to watch.  If not specified, defaults to process_actions.
      interval
        Specified for continuous display: seconds between checks.

    Options:
      -e|--extra 
        Display extra metrics like inflight and delayed messages.

      -n|--nonzero
        Only show queues with messages

      -a|--all
        Check all queues

      -s|--sum
	    Only show sum totals, not individual queues

      -t|--top n
	    Only show the largest n queues.

      -r|--regexp
	    Interpret queuenames as regular expressions instead of explicit names.

    Examples:
	  sqsmonitor
	  sqsmonitor -a -n
	  sqsmonitor -e prod_process_actions-opens 1
	  sqsmonitor prod_process_actions-opens prod_process_actions-installs 60
	  sqsmonitor -r 'process_.*_actions' -t 3

Queues are listed by number of messages they hold, fullest queue first.

## Install from repo

Once you have this repository checked out, do:

    npm link

Make sure you've set up your AWS credentials in `~/.aws/credentials`:

```
[default]
aws_access_key_id=AKIABFOJHE19JDLS4G3A
aws_secret_access_key=J29OoH8JlsCdowF+jLSKU2/Hos8VJsl2jslkh22L",
```

Region defaults to `us-east-1`.  You can override this via the
`~/.aws/config` file:

```
[default]
region = us-east-1
```

Like other AWS SDKs, you can use the `AWS_ACCESS_KEY_ID,
`AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` environment
variables instead of or to override the config file.
