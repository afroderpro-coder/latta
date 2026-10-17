from rembg import remove
from PIL import Image
import sys
import os

input_path = sys.argv[1]
output_path = sys.argv[2]
bg_color = (232, 232, 232, 255) # #e8e8e8

with open(input_path, 'rb') as i:
    input_data = i.read()
    
# Remove background
output_data = remove(input_data)
# output_data is bytes of PNG

with open("temp.png", "wb") as o:
    o.write(output_data)

# Open the new transparent image
fg = Image.open("temp.png").convert("RGBA")

# Create a new background image
bg = Image.new("RGBA", fg.size, bg_color)
bg.paste(fg, (0, 0), fg)

# Convert back to RGB for saving as JPEG
bg = bg.convert("RGB")
bg.save(output_path, "JPEG", quality=95)
os.remove("temp.png")
print("Successfully replaced background!")
