#!/bin/sh
convert -size 100x100 xc:#dccea1 test.png
ruby schedule.rb --content-warning 'Test Message - Please Ignore' --description 'A yellow-ish square' --image-file 'test.png' --status 'Ignore me.  I am testing a script, and will probably delete this before you can finish your reply, assuming that it posts at all...' --sensitive

