#!/bin/bash

# Extracts latitude and longitude from a GPX file

GPX_FILE="simulated_walk.gpx"

# Use xmllint to parse the GPX file and extract coordinates
xmllint --xpath '//*[local-name()="trkpt"]/@lat | //*[local-name()="trkpt"]/@lon' "$GPX_FILE" |
awk 'NR%2{printf $0" ";next;}1' | sed 's/lat="//g; s/" lon="/, /g; s/"//g' > coordinates.txt

echo "Coordinates extracted to coordinates.txt"
