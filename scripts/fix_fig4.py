import os
from PIL import Image, ImageDraw, ImageFont

img_path = "experiments/figures/fig4_shap_summary.png"
img = Image.open(img_path).copy()
w, h = img.size
print(f"Dimensions: {w}x{h}")

# Check the region around the 11th label at the bottom of the y-axis
crop_region = img.crop((0, 1450, 700, 1680))
crop_region.save("experiments/figures/crop_before.png")

# Erase and redraw with arial.ttf
draw = ImageDraw.Draw(img)
# White fill over the old label
draw.rectangle([15, 1530, 620, 1640], fill=(255, 255, 255, 255))
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 54)
draw.text((32, 1546), "Sum of 5 other features", fill=(51, 51, 51, 255), font=font)

crop_fixed = img.crop((0, 1450, 700, 1680))
crop_fixed.save("experiments/figures/crop_after.png")

# Save fixed version
img.save("experiments/figures/fig4_shap_summary.png")
img.save("final_submission/experiments/figures/fig4_shap_summary.png")
print("Saved updated fig4_shap_summary.png to both experiment folders.")
