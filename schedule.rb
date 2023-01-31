# frozen_string_literal: true

require 'digest'
require 'highline/import'
require 'http'
require 'json'
require 'net/http'
require 'rmagick'
require 'uri'

include Magick

def make_http(server, path)
  url = URI "https://#{server}/#{path}"
  http = Net::HTTP.new url.host, url.port
  http.use_ssl = true
  http.set_debug_output $stdout
  [url, http]
end

def error(response)
  puts "Error: #{response.code} - #{response.body}" unless response.code == '200'
  response.code != '200'
end

def get_access_token(config)
  url, http = make_http config['server'], 'oauth/token'
  request = Net::HTTP::Post.new url
  request.set_form_data(
    'client_id' => config['client_id'],
    'client_secret' => config['client_secret'],
    'scope' => 'read write',
    'grant_type' => 'client_credentials'
  )
  response = http.request request

  error response ? nil : JSON.parse(response.body)
end

def call_http_get(server, path, token)
  header_token = "#{token['token_type']} #{token['access_token']}"
  url, http = make_http server, "api/v1/#{path}"
  request = Net::HTTP::Get.new url, { 'Authorization' => header_token }
  response = http.request request

  return nil if error response

  JSON.parse response.body
end

def verify_account(server, token)
  call_http_get server, 'accounts/verify_credentials', token
end

def show_scheduled(server, token)
  call_http_get server, 'scheduled_statuses', token
end

def send_toot(server, token, parameters)
  header_token = "#{token['token_type']} #{token['access_token']}"
  url, http = make_http server, 'api/v1/statuses'
  request = Net::HTTP::Post.new url,
                                { 'Authorization' => header_token,
                                  'Idempotency-Key' => Digest::SHA256.base64digest(parameters['status']) }
  request.set_form_data parameters
  response = http.request request

  return nil if error response

  JSON.parse response.body
end

def delete_scheduled_toot(server, token, id)
  header_token = "#{token['token_type']} #{token['access_token']}"
  url, http = make_http server, "api/v1/scheduled_statuses/#{id}"
  request = Net::HTTP::Delete.new url, { 'Authorization' => header_token }
  response = http.request request

  return nil if error response

  JSON.parse response.body
end

def convert_image(filename, max_width)
  outfile = "#{filename}.png"
  img = Image.read(filename).first
  small = img.change_geometry!("#{max_width}x#{max_width}>") do |cols, rows, _img|
    img.resize(cols, rows)
  end
  small.write outfile
  File.delete filename
  outfile
end

def download_image(address, max_width)
  url = URI address
  _, http = make_http url.host, url.path
  request = Net::HTTP::Get.new url
  response = http.request request

  return nil if error response

  filename = File.basename url.path
  File.open(filename, 'w') { |f| f.write response.body }
  convert_image filename, max_width
end

config_name = File.join(Dir.home, '.config', 'latest-mastodon.json')
config_file = File.open config_name
config_text = config_file.read
config = JSON.parse config_text

if config['token'].nil?
  access_token = get_access_token config
  config['token'] = access_token
  new_config = JSON.pretty_generate config
  File.write config_file, new_config
end

config_file.close
