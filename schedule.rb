require 'highline/import'
require 'json'
require 'net/http'
require 'uri'

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
