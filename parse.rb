# frozen_string_literal: true

require 'English'
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
  tz = (Time.now + (6 * 86_400)).utc_offset / 36
  part = heading.split
  param = {}

  return param if part.length < 7

  dt = DateTime.parse "#{part[6]} #{part[5]} #{part[4]} #{part[1]}#{tz}"

  param[:time] = dt.iso8601.sub(/.*\K:/, '')
  param
end

def parse_link(line)
  link = line.split '['
  title = nil
  url = nil

  if link.length > 2
    link = link[2]
    title = link.split(']')[0]
    url = link.split('(')[1].split(')')[0]
  end

  [title, url]
end

def build_status(params)
  return if params[:quote].nil?
  return "#{params[:quote].gsub "\n\n", "\n"}\n\n#{params[:cite]}\n\n#{params[:hashtags]}" unless params[:cite].nil?

  "#{params[:title]} #{params[:url]}\n\n#{params[:quote].strip}\n\n#{params[:hashtags]}"
end

def fmt_args(command, params)
  result = command.split

  params.each_key do |k|
    result.push "--#{k.to_s.gsub '_', '-'}"
    result.push "\"#{params[k]}\""
  end

  result
end

def process(params)
  return if params[:status].nil? || params[:status].strip.empty?

  args = fmt_args 'ruby schedule.rb', params
  system args.join ' '
  puts args.join ' ' unless $CHILD_STATUS == 0
end

options = Options.parse ARGV
parameters = {}

File.open(options.file).each_line do |line|
  if line.start_with? '## '
    parameters[:status] = build_status parameters

    process parameters.except(:cite, :hashtags, :quote, :title, :url)
    parameters = parse_date line
    break if parameters[:time].nil?
  elsif line.start_with? '{% cw '
    parameters[:content_warning] = line.split[2..-2].join ' '
  elsif line.start_with? '{% embed '
    part = line.split[2..-2].join(' ').split '|'

    parameters[:image_url] = part[0]
    parameters[:description] = part[1]
    parameters[:sensitive] = true unless part[2] == 'false'
  elsif line.start_with? '[<i '
    part = parse_link line

    parameters[:title] = part[0]
    parameters[:url] = part[1]
  elsif line.start_with? ' > '
    parameters[:quote] += "\n#{line.slice(3, line.length)}"
  elsif line.start_with? '{% cite '
    parameters[:cite] = line.split[2..-2].join ' '
  elsif line.start_with? 'Hashtags: '
    parameters[:hashtags] = line.split(':')[1].strip
  end
end
