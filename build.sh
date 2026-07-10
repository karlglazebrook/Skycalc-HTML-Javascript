#!/bin/bash
# Regenerate the embedded math + compute blocks inside skycalc.html from the
# standalone source files. Edit skycalc-math.js and/or skycalc-compute.js, then
# run ./build.sh to refresh the single-file app. The test suite's drift-guard
# fails if skycalc.html is out of sync with the sources, so you can't forget.
set -e
cd "$(dirname "$0")"

awk '
  /BEGIN:skycalc-math\.js/ {
    print
    while ((getline line < "skycalc-math.js") > 0) print line
    close("skycalc-math.js"); skip = 1; next
  }
  /END:skycalc-math\.js/     { skip = 0 }
  /BEGIN:skycalc-compute\.js/ {
    print
    while ((getline line < "skycalc-compute.js") > 0) print line
    close("skycalc-compute.js"); skip = 1; next
  }
  /END:skycalc-compute\.js/  { skip = 0 }
  !skip { print }
' skycalc.html > skycalc.html.tmp

mv skycalc.html.tmp skycalc.html
echo "Rebuilt skycalc.html from skycalc-math.js + skycalc-compute.js"
