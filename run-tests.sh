#!/bin/bash
# Run skycalc math test suite
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
cd "$(dirname "$0")"
$JSC tests/skycalc-tests.js
