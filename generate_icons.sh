#!/bin/bash

# Finding Sweetie - PWA Icon Generator
# This script helps generate all required PWA icon sizes

echo "🎨 Finding Sweetie PWA Icon Generator"
echo "======================================"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing..."
    echo ""
    echo "On Ubuntu/Debian:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install imagemagick"
    echo ""
    echo "On macOS:"
    echo "  brew install imagemagick"
    echo ""
    read -p "Press Enter after installing ImageMagick, or Ctrl+C to exit..."
fi

# Create icons directory
mkdir -p public/icons
mkdir -p public/screenshots

echo ""
echo "📁 Creating PWA icons..."
echo ""

# Check if source image exists
SOURCE_IMAGE="public/icons/source-icon.png"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Source image not found: $SOURCE_IMAGE"
    echo ""
    echo "Please provide a source image (recommended: 512x512px or larger)"
    echo ""
    echo "Options:"
    echo "  1. Create using online tool:"
    echo "     - Visit: https://www.pwabuilder.com/imageGenerator"
    echo "     - Upload a 512x512 image with your app icon"
    echo "     - Download the generated icons"
    echo "     - Extract to public/icons/"
    echo ""
    echo "  2. Create manually:"
    echo "     - Design a 512x512px icon (e.g., paw print with 'FS')"
    echo "     - Save as: $SOURCE_IMAGE"
    echo "     - Run this script again"
    echo ""
    echo "  3. Use temporary placeholder:"
    echo "     - This script will create a simple SVG placeholder"
    echo ""
    read -p "Create placeholder icons? (y/n): " create_placeholder

    if [ "$create_placeholder" == "y" ] || [ "$create_placeholder" == "Y" ]; then
        echo ""
        echo "Creating placeholder SVG icons..."

        # Create a simple SVG icon
        cat > public/icons/icon.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="256" cy="256" r="256" fill="url(#bg)"/>

  <!-- Paw print -->
  <g fill="#ffffff">
    <!-- Main pad -->
    <ellipse cx="256" cy="320" rx="80" ry="100"/>

    <!-- Top left toe -->
    <ellipse cx="160" cy="220" rx="40" ry="60" transform="rotate(-20 160 220)"/>

    <!-- Top center toe -->
    <ellipse cx="230" cy="180" rx="40" ry="60" transform="rotate(-5 230 180)"/>

    <!-- Top right toe -->
    <ellipse cx="310" cy="180" rx="40" ry="60" transform="rotate(5 310 180)"/>

    <!-- Top far right toe -->
    <ellipse cx="380" cy="220" rx="40" ry="60" transform="rotate(20 380 220)"/>
  </g>

  <!-- Text -->
  <text x="256" y="460" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">FindingSweetie</text>
</svg>
SVGEOF

        echo "✓ Created SVG icon: public/icons/icon.svg"
        echo ""
        echo "Note: SVG icons work in most browsers but PNG is preferred for PWA."
        echo "Converting SVG to PNG requires ImageMagick..."

        # Try to convert SVG to PNG
        if command -v convert &> /dev/null; then
            SIZES=(72 96 128 144 152 192 384 512)

            for size in "${SIZES[@]}"; do
                echo "  Creating ${size}x${size}..."
                convert -background none -resize ${size}x${size} \
                    public/icons/icon.svg \
                    public/icons/icon-${size}x${size}.png
            done

            echo ""
            echo "✅ All PNG icons created successfully!"
        else
            echo ""
            echo "⚠️  ImageMagick not available. SVG icon created only."
            echo "   Install ImageMagick and run this script again to generate PNG files."
        fi
    else
        echo "Exiting. Please add source-icon.png and run again."
        exit 1
    fi
else
    # Source image exists, generate all sizes
    echo "✓ Found source image: $SOURCE_IMAGE"
    echo ""

    SIZES=(72 96 128 144 152 192 384 512)

    for size in "${SIZES[@]}"; do
        echo "  Creating ${size}x${size}..."
        convert "$SOURCE_IMAGE" -resize ${size}x${size} \
            public/icons/icon-${size}x${size}.png
    done

    echo ""
    echo "✅ All icons created successfully!"
fi

echo ""
echo "📸 Icon files:"
ls -lh public/icons/

echo ""
echo "✅ Icon generation complete!"
echo ""
echo "Next steps:"
echo "  1. Verify icons look good: ls public/icons/"
echo "  2. Update HTML files to include PWA meta tags"
echo "  3. Test PWA installation on mobile device"
echo ""
echo "For best results:"
echo "  - Icons should have transparent background or solid color"
echo "  - Keep important content in the 'safe zone' (center 80%)"
echo "  - Test on both light and dark backgrounds"
