from PIL import Image
import sys

img = Image.open(sys.argv[1])
# Assuming the background is mostly the corners
corners = [
    img.getpixel((0, 0)),
    img.getpixel((img.width - 1, 0)),
    img.getpixel((0, img.height - 1)),
    img.getpixel((img.width - 1, img.height - 1))
]
print("Corners:", corners)
