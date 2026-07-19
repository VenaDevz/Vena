from PIL import Image
import sys

img = Image.open(sys.argv[1]).convert("RGBA")
datas = img.getdata()
new_data = []

for item in datas:
    # If the pixel is very close to white, make it transparent
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)

img.putdata(new_data)
img.save(sys.argv[2], "PNG")
