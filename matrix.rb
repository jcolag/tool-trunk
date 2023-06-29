# frozen_string_literal: true

require 'matrix_sdk'

# Post a message to a specified chatroom on Matrix.
config_name = File.join Dir.home, '.config', 'matrix.json'
config_file = File.open config_name
config = JSON.parse config_file.read
client = MatrixSdk::Client.new config['server']

client.login config['user'], config['password']

room = client.find_room config['room']

if room.nil?
  puts "\nUser #{config['user']} doesn't appear to have " \
       "access to #{config['room']}.\n\n"
  return
end

room.send_text ARGV.join(' ')
