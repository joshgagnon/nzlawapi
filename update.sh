#!/usr/bin/env bash
set -e

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <config-file> <server-username>"
    exit 1
fi

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root"
    exit 1
fi

python scripts/go_down.py

sudo -u $2 git pull

sudo -u $2 python migration.py $1

sudo -u $2 NODE_ENV=production gulp

service browser-uwsgi restart
service browser-uwsgi start || true

python scripts/go_up.py
