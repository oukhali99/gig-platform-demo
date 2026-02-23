#!/usr/bin/env bash
# Builds the Lambda deployment package for Terraform.
# Run from identity workspace (e.g. yarn build:lambda). Creates build/package/.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IDENTITY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$IDENTITY_ROOT/../../.." && pwd)"
cd "$ROOT"
yarn install
yarn build
PACKAGE_DIR="$IDENTITY_ROOT/build/package"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"
cp -r "$IDENTITY_ROOT/dist/"* "$PACKAGE_DIR/"
cp "$IDENTITY_ROOT/package.json" "$PACKAGE_DIR/"
cd "$PACKAGE_DIR" && yarn install --production
echo "Built Lambda package at $PACKAGE_DIR"
