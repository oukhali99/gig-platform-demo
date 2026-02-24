#!/usr/bin/env bash
# Builds the Lambda deployment package for Terraform.
# Run from bookings workspace (e.g. yarn build:lambda). Creates build/package/ and build/package.zip.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOOKINGS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$BOOKINGS_ROOT/../../.." && pwd)"
cd "$ROOT"
yarn install
yarn build
PACKAGE_DIR="$BOOKINGS_ROOT/build/package"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"
cp -r "$BOOKINGS_ROOT/dist/"* "$PACKAGE_DIR/"
cp "$BOOKINGS_ROOT/package.json" "$PACKAGE_DIR/"
sed -i 's|"@gig-platform/common": "link:../../common"|"@gig-platform/common": "file:../../../../../app/common"|' "$PACKAGE_DIR/package.json"
cd "$PACKAGE_DIR" && yarn install --production
echo "Built Lambda package at $PACKAGE_DIR"
