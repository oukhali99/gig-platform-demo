#!/usr/bin/env bash
# Builds the Lambda deployment package for Terraform.
# Run from jobs workspace (e.g. yarn build:lambda). Creates build/package/ and build/package.zip.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JOBS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$JOBS_ROOT/../../.." && pwd)"
cd "$ROOT"
yarn install
yarn build
PACKAGE_DIR="$JOBS_ROOT/build/package"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"
cp -r "$JOBS_ROOT/dist/"* "$PACKAGE_DIR/"
cp "$JOBS_ROOT/package.json" "$PACKAGE_DIR/"
# Resolve shared workspace package for Lambda (file path from build/package to repo root)
sed -i 's|"@gig-platform/common": "link:../../common"|"@gig-platform/common": "file:../../../../../app/common"|' "$PACKAGE_DIR/package.json"
cd "$PACKAGE_DIR" && yarn install --production
echo "Built Lambda package at $PACKAGE_DIR"
