# frozen_string_literal: true

require 'digest'
require 'highline/import'
require 'http'
require 'json'
require 'net/http'
require 'optparse'
require 'optparse/time'
require 'ostruct'
require 'rmagick'
require 'uri'

include Magick

class Options
  def self.parse(args)
    options = OpenStruct.new
    options.delete = false
    options.description = nil
    options.image = nil
    options.list = false
    options.media = nil
    options.sensitive = false
    options.status = nil
    options.time = Time.now
    options.warning = nil

    opt_parser = OptionParser.new do |opts|
      opts.banner = 'Usage:  schedule.rb [options]'
      opts.separator ''
      opts.separator 'Specific options:'
      opts.on('-w', '--content-warning CW', 'A content warning') do |cw|
        options.warning = cw
      end
      opts.on('-x', '--delete', 'Delete the toot after scheduling it') do |_|
        options.delete = true
      end
      opts.on('-d', '--description DESC', 'The image description') do |d|
        options.description = d
      end
      opts.on('-f', '--image-file FILE', 'A header image') do |i|
        options.media = i
      end
      opts.on('-i', '--image-url URL', 'The URL of the toot header image') do |i|
        options.image = i
      end
      opts.on('-l', '--list', 'Ignore other arguments and show schedule') do |l|
        options.list = true
      end
      opts.on('-s', '--status STATUS', 'The message conveyed by the toot') do |s|
        options.status = s
      end
      opts.on('-t', '--time TIME', Time, 'The time to post the toot') do |t|
        options.time = t
      end
      opts.on('-v', '--sensitive', 'The linked image has sensitive content') do |_|
        options.sensitive = true
      end
      opts.on('-z', '--zzz', 'Does nothing; just for debugging') { }
    end

    opt_parser.parse!(args)
    options
  end
end

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

def submit_media(filename, description, server, token)
  header_token = "#{token['token_type']} #{token['access_token']}"
  url, http = make_http server, 'api/v2/media'
  form_data = [['file', File.open(filename)], ['description', description]]
  request = Net::HTTP::Post.new url, { 'Authorization' => header_token }
  request.set_form form_data, 'multipart/form-data'
  response = http.request request
  File.delete filename

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
media = nil
options = Options.parse ARGV

if options.list
  scheduled = show_scheduled config['server'], config['token']
  pp scheduled
  return
end

if options.delete
  scheduled = show_scheduled config['server'], config['token']
  scheduled.each do |t|
    puts t['id']
    deletion = delete_scheduled_toot config['server'], config['token'], t['id']
    puts JSON.pretty_generate deletion
  end

  return
end

if config['token'].nil?
  access_token = get_access_token config
  config['token'] = access_token
  new_config = JSON.pretty_generate config
  File.write config_file, new_config
end

config_file.close

unless options.image.nil?
  filename = download_image options.image, 1024
  media = submit_media filename, config.description, config['server'], config['token']
end

return if options.status.empty?

data = {
  media_ids: media.nil? ? nil : [media.id],
  scheduled_at: config.time,
  sensitive: config.sensitive,
  spoiler_text: config.warning,
  status: config.status
}
toot = send_toot config['server'], config['token'], data
p toot
