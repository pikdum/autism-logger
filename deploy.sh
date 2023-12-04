#!/usr/bin/env bash
set -euxo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="root@autism-logger.usagi.zone"

pushd "$SCRIPT_DIR"

ssh $SERVER 'rm -rf ~/autism-logger && mkdir ~/autism-logger'

git archive --format=tar.gz HEAD | ssh "$SERVER" 'tar -xzv -C ~/autism-logger/'

ssh $SERVER 'cp ~/autism-logger/autism-logger.service /etc/systemd/system/ && \
    cd ~/autism-logger && \
    npm install && \
    npx playwright install-deps && \
    npx playwright install && \
    systemctl daemon-reload && \
    systemctl restart autism-logger && \
    systemctl enable autism-logger'

popd
