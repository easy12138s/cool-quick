#!/usr/bin/env python3
import base64
import os

# Create placeholder PNG icons (1x1 pixel transparent PNG)
def create_minimal_png():
    # Minimal valid 1x1 transparent PNG
    png_data = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    )
    return png_data

# Generate different sizes
sizes = [32, 128, 256, 512]
png_data = create_minimal_png()

for size in sizes:
    filename = f'{size}x{size}.png' if size != 256 else '128x128@2x.png'
    with open(filename, 'wb') as f:
        f.write(png_data)
    print(f'Created {filename}')

# Create icon.png (512x512)
with open('icon.png', 'wb') as f:
    f.write(png_data)
print('Created icon.png')

# Create a simple ICO file (based on PNG)
# ICO header for 1 image (32x32)
ico_header = bytes([
    0x00, 0x00,  # Reserved
    0x01, 0x00,  # Type: Icon
    0x01, 0x00,  # Count: 1
    0x20,        # Width: 32
    0x20,        # Height: 32
    0x00,        # Colors: 0
    0x00,        # Reserved
    0x01, 0x00,  # Planes
    0x20, 0x00,  # Bit count: 32
    len(png_data) & 0xFF, (len(png_data) >> 8) & 0xFF, (len(png_data) >> 16) & 0xFF, (len(png_data) >> 24) & 0xFF,  # Size
    0x16, 0x00, 0x00, 0x00,  # Offset: 22
])

with open('icon.ico', 'wb') as f:
    f.write(ico_header)
    f.write(png_data)
print('Created icon.ico')

print('\nAll icons generated successfully!')
