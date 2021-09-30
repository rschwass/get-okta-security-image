# get-okta-security-image.js

There are two places where you need to replace "REPLACEME" with the real okta url of the victim site.

Be sure you have a Chrome browser running with remote debugging enabled.

Chrome --remote-debugging-port=9222 --headless

run this script with node

node get-okta-security-image.js username browserfingerprint
