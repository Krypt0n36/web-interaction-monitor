#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required. Please install it first."
    echo "On Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "On macOS: brew install imagemagick"
    exit 1
fi

# Check if icon.png exists
if [ ! -f "icon.png" ]; then
    echo "icon.png not found in current directory"
    exit 1
fi

# Create icons in different sizes
echo "Generating icons..."

# 16x16
convert icon.png -resize 16x16 icon16.png

# 32x32
convert icon.png -resize 32x32 icon32.png

# 48x48
convert icon.png -resize 48x48 icon48.png

# 128x128
convert icon.png -resize 128x128 icon128.png

echo "Icons generated successfully!" 