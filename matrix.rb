# frozen_string_literal: true

require 'matrix_sdk'

# Post a message to a specified chatroom on Matrix.
config_file = File.open 'matrix.json'
config = JSON.parse config_file.read
client = MatrixSdk::Client.new config['server']

client.login config['user'], config['password']

room = client.find_room config['room']

room.send_text ARGV.join(' ')
