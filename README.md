# Mastodon Tool Trunk

Tools for (John's) Mastodon workflow

This repository contains a handful of scripts designed to automate various tasks related to Mastodon, the federated collection of social networking websites that form a significant part of the so-called Fediverse.  I use Mastodon as my primary social network, and part of that use includes some mix of automated and pre-scheduled posts.

Currently, we have two scripts.

## `latest.sh`

This pulls activity for the account (specified in the configuration file), specifically so that I can fill the URLs into my [social media roundup blog posts](https://john.colagioia.net/blog/tag/linkdump) without needing to manually visit Mastodon.

## `schedule.rb`

In progress.  As of now, this mostly works, but sometimes needs some help.

However, it schedules a Mastodon post/toot, complete with optional image, content warning, and future schedule time.  This also takes information from the configuration file, but has command-line options on top of that, specific to the post.  Call the following for a list of such options.

```console
ruby schedule.rb --help
```

Its big problems, at this time, come from error handling, especially in downloading images.

