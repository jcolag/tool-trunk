# frozen_string_literal: true

require 'date'
require 'json'
require 'optparse'
require 'ostruct'

# Class to process command-line arguments
class Options
  def self.parse(args)
    options = OpenStruct.new

    opt_parser = OptionParser.new do |opts|
      opts.banner = 'Usage:  schedule.rb [options]'
      opts.separator ''
      opts.separator 'Specific options:'
      opts.on('-f', '--file FILE', 'The blog post to parse') do |i|
        options.file = i
      end
    end

    opt_parser.parse!(args)
    options
  end
end

def parse_date(heading)
  tz = DateTime.now.zone.gsub ':', ''
  part = heading.split
  param = {}

  return param if part.length < 7

  param[:time] = DateTime.parse "#{part[7]} #{part[6]} #{part[5]} #{part[1]}#{tz}"
  param
end

def build_status(params)
  return "#{params[:quote]}\n\n#{params[:cite]}\n\n#{params[:hashtags]}" unless params[:cite].nil?

  "#{params[:title]} #{params[:url]}\n\n#{params[:quote]}\n\n#{params[:hashtags]}"
end

def process(params)
  return if params[:status].nil?

  puts params.to_json
  %x(/usr/bin/echo -e '#{params[:status]}')
  unless $? == 0
    puts 'Oops'
  end
end

options = Options.parse ARGV
parameters = {}

File.open(options.file).each_line do |line|
  if line.start_with? '## '
    parameters[:status] = build_status parameters
    process parameters
    parameters = parse_date line
    break if parameters[:time].nil?
  elsif line.start_with? '{% cw '
    parameters[:cw] = line.split[2..-2].join ' '
  elsif line.start_with? '{% embed '
    part = line.split[2..-2].join(' ').split '|'
    parameters[:image] = part[0]
    parameters[:description] = part[1]
    parameters[:sensitive] = true unless part[2] == 'false'
  elsif line.start_with? '[<i '
    link = line.split '['

    if link.length > 2
      link = link[2]
      parameters[:title] = link.split(']')[0]
      parameters[:url] = link.split('(')[1].split(')')[0]
    end
  elsif line.start_with? ' > '
    parameters[:quote] = line.slice 3, line.length
  elsif line.start_with? '{% cite '
    parameters[:cite] = line.split[2..-2].join ' '
  elsif line.start_with? 'Hashtags: '
    parameters[:hashtags] = line.split(':')[1].strip
  end
end
