#!/bin/sh

if [ -z "$1" ]; then
  echo "::error::Must supply pack version argument"
  exit 1
fi

pack_version="$(pack --version 2>&1)"
echo "Found pack version: $pack_version"
if [ -z "$(echo $pack_version | grep --fixed-strings $1)" ]; then
  echo "::error::Unexpected version"
  exit 1
fi
