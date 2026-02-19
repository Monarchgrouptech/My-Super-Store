import json

# Read the Lottie file
with open('src/Particle wave with depth.json', 'r') as f:
    lottie_data = json.load(f)

# Gold gradient colors (normalized to 0-1)
gold_gradient = [
    [0.36, 0.27, 0.00, 1.0],  # #5d4300
    [0.55, 0.37, 0.00, 1.0],  # #8b5e00
    [0.71, 0.50, 0.00, 1.0],  # #b67f00
    [0.96, 0.87, 0.42, 1.0],  # #f6dd6a - brightest gold
    [0.71, 0.50, 0.00, 1.0],  # #b67f00
    [0.55, 0.37, 0.00, 1.0],  # #8b5e00
    [0.36, 0.27, 0.00, 1.0],  # #5d4300
]

# Mix with black for variety (darker gold tones)
dark_gold_gradient = [
    [0.20, 0.15, 0.00, 1.0],  # darker #5d4300
    [0.35, 0.23, 0.00, 1.0],  # darker #8b5e00
    [0.45, 0.32, 0.00, 1.0],  # darker #b67f00
    [0.60, 0.54, 0.26, 1.0],  # darker gold
    [0.45, 0.32, 0.00, 1.0],
    [0.35, 0.23, 0.00, 1.0],
    [0.20, 0.15, 0.00, 1.0],
]

# Blue colors to find and replace
blue_color_1 = [0.294117647059, 0.63137254902, 0.929411824544, 1]
blue_color_2 = [0.345098048449, 0.450980424881, 0.898039281368, 1]
blue_color_3 = [0.239215701818, 0.807843208313, 0.956862807274, 1]

def replace_colors(obj, gold_index=0):
    """Recursively replace blue colors with gold gradient colors"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == 'k' and isinstance(value, list) and len(value) == 4:
                # Check if it's a color value
                try:
                    if (abs(value[0] - blue_color_1[0]) < 0.01 and 
                        abs(value[1] - blue_color_1[1]) < 0.01 and
                        abs(value[2] - blue_color_1[2]) < 0.01):
                        obj[key] = gold_gradient[gold_index % len(gold_gradient)]
                        gold_index += 1
                    elif (abs(value[0] - blue_color_2[0]) < 0.01 and 
                          abs(value[1] - blue_color_2[1]) < 0.01 and
                          abs(value[2] - blue_color_2[2]) < 0.01):
                        obj[key] = dark_gold_gradient[gold_index % len(dark_gold_gradient)]
                        gold_index += 1
                    elif (abs(value[0] - blue_color_3[0]) < 0.01 and 
                          abs(value[1] - blue_color_3[1]) < 0.01 and
                          abs(value[2] - blue_color_3[2]) < 0.01):
                        obj[key] = gold_gradient[(gold_index + 2) % len(gold_gradient)]
                        gold_index += 1
                except (TypeError, IndexError):
                    pass
            else:
                replace_colors(value, gold_index)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            replace_colors(item, gold_index + i)

# Replace all colors
replace_colors(lottie_data)

# Write back
with open('src/Particle wave with depth.json', 'w') as f:
    json.dump(lottie_data, f)

print("✓ Lottie colors converted from blue to gold-black gradient!")
