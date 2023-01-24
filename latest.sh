#!/usr/bin/env bash
# Boilerplate
set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]
then
  set -o xtrace
fi
if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
    echo 'Usage: ./latest.sh

This script will take the user information from the file in the "config"
variable, and generate a file containing the time, URL, and content of
the posts tooted by the user on the current day.

'
    exit
fi

config=~/.config/latest-mastodon.json
result=$(mktemp --tmpdir=/tmp lm.XXXXXXXXXX.json)

# This tells jq to...
# - Filter out any status that isn't from today.
# - Take the ID, creation time, and content string from each remaining object.
today=$(date '+%Y-%m-%dT')
jqarg=".[]|select(.created_at|index(\"${today}\")==0)|.url,.created_at,.content"

server=$(jq -r .server "$config")
user=$(jq -r .user "$config")

# I see no reason to make users find and store their server ID numbers...
id=$(curl -s "https://${server}/api/v1/accounts/lookup?acct=${user}" | jq -r ".id|tonumber")

# Get today's statuses, based on the query created above.
curl -s "https://${server}/api/v1/accounts/${id}/statuses" \
  | jq "${jqarg}" \
  > "${result}"

# If the file is empty, we're done.
size=$(wc -c "${result}" | cut -f1 -d' ')
if [[ "$size" -eq 0 ]]
then
  exit 0
fi

# Figure out the default editor and open the file in it.
editor=$(mimetype -b "${result}" | xargs xdg-mime query default | xargs whereis -b | cut -f2 -d' ')
editor=/usr/bin/gedit
(nohup "${editor}" "${result}" 2>/dev/null &)

# Clean up.
sleep 0.25
rm "${result}" "nohup.out"
cd "$(dirname "$0")"

