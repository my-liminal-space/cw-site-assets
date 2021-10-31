#!/bin/bash

# Publishes latest version and uses curl to access test page

set -e

wrangler publish

curl "https://cf-site-assets.deaddodgeydigitaldeals.com/tests" | jq