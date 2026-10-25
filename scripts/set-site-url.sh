#!/bin/sh
# Link previews (iMessage, WhatsApp) need absolute URLs for the share image.
# Vercel provides the production domain at build time; fall back to the deployment URL.
HOST="${VERCEL_PROJECT_PRODUCTION_URL:-$VERCEL_URL}"
if [ -n "$HOST" ]; then
  sed -i "s#__SITE__#https://$HOST#g" public/index.html
else
  sed -i "s#__SITE__##g" public/index.html
fi
