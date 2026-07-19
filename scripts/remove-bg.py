"""
Remove dark/black backgrounds from chest images.
Uses luminance thresholding: pixels below a brightness threshold become transparent.
"""
from PIL import Image
import sys
import os

def remove_dark_bg(input_path, output_path, threshold=40):
    """Make dark pixels transparent based on luminance threshold."""
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Calculate perceived luminance
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum < threshold:
                # Fully transparent
                pixels[x, y] = (r, g, b, 0)
            elif lum < threshold + 30:
                # Soft fade for smoother edges
                fade = int((lum - threshold) / 30 * 255)
                pixels[x, y] = (r, g, b, min(a, fade))
    
    img.save(output_path, "PNG")
    print(f"✅ {os.path.basename(output_path)} saved ({w}x{h})")

files = [
    ("public/venachest.png", "public/venachest-nobg.png"),
    ("public/venapremiumchest.png", "public/venapremiumchest-nobg.png"),
    ("public/venachest-glow.png", "public/venachest-glow-nobg.png"),
    ("public/venapremiumchest-glow.png", "public/venapremiumchest-glow-nobg.png"),
    ("public/venachest-open.png", "public/venachest-open-nobg.png"),
    ("public/venapremiumchest-open.png", "public/venapremiumchest-open-nobg.png"),
]

for inp, out in files:
    remove_dark_bg(inp, out, threshold=35)

print("\\n🎉 All backgrounds removed!")
