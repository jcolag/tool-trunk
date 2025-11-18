#!/bin/sh
ruby schedule.rb --list | jq .[].scheduled_at | sort

