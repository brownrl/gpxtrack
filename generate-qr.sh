#!/bin/bash

# Check if a URL was provided
if [ -z "$1" ]; then
    echo "Please provide a URL as an argument"
    echo "Usage: ./generate-qr.sh <URL>"
    exit 1
fi

# URL encode the input URL
encoded_url=$(echo "$1" | perl -MURI::Escape -ne 'print uri_escape($_)')

# Generate the QR code URL
qr_url="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded_url}"

# Open the QR code in the default browser
open "$qr_url"

echo "QR code opened in your browser. You can right-click and save it if needed."
