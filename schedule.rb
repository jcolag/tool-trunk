require 'json'

config_name = File.join(Dir.home, '.config', 'latest-mastodon.json')
config_file = File.open config_name
config_text = config_file.read
config = JSON.parse config_text

