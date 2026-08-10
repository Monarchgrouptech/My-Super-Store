import os
import json
from PIL import Image

def generate_icons():
    logo_path = 'public/logo.png'
    public_dir = 'public'
    
    if not os.path.exists(logo_path):
        print(f"Error: Logo file not found at {logo_path}")
        return
        
    img = Image.open(logo_path)
    
    # Simple transparency converter (threshold near-black pixels to transparent)
    def make_transparent(pil_img):
    
        rgba = pil_img.convert("RGBA")
        datas = rgba.getdata()
        newData = []
        for item in datas:
            # threshold: if R, G, B are all less than 15, make transparent
            if item[0] < 15 and item[1] < 15 and item[2] < 15:
                newData.append((0, 0, 0, 0))
            else:
                newData.append(item)
        rgba.putdata(newData)
        return rgba

    img_transparent = make_transparent(img)
    
    # Standard PNG sizes
    sizes = {
        'favicon-16x16.png': (16, 16, True),
        'favicon-32x32.png': (32, 32, True),
        'favicon-48x48.png': (48, 48, True),
        'favicon-64x64.png': (64, 64, True),
        'android-chrome-192x192.png': (192, 192, False),
        'android-chrome-512x512.png': (512, 512, False),
        'apple-touch-icon.png': (180, 180, False),
        'mstile-150x150.png': (150, 150, False),
        'icon-192.png': (192, 192, False),
        'icon-512.png': (512, 512, False),
        'maskable-icon-192.png': (192, 192, False),
        'maskable-icon-512.png': (512, 512, False),
    }
    
    for filename, (w, h, trans) in sizes.items():
        source = img_transparent if trans else img
        resized = source.resize((w, h), Image.Resampling.LANCZOS)
        out_path = os.path.join(public_dir, filename)
        resized.save(out_path, format="PNG")
        print(f"Generated {out_path} ({w}x{h})")
        
    # 2. Generate favicon.ico (containing multiple sizes)
    ico_img = img_transparent.resize((64, 64), Image.Resampling.LANCZOS)
    ico_path = os.path.join(public_dir, 'favicon.ico')
    ico_img.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"Generated {ico_path} with sizes 16, 32, 48, 64")
    
    # 3. Generate site.webmanifest
    manifest = {
        "name": "MySuperStore Nigeria",
        "short_name": "MySuperStore",
        "description": "Premium electronics, fashion & home goods in Nigeria",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0F0F0F",
        "theme_color": "#0F0F0F",
        "orientation": "portrait-primary",
        "icons": [
            {
                "src": "/favicon-16x16.png",
                "sizes": "16x16",
                "type": "image/png"
            },
            {
                "src": "/favicon-32x32.png",
                "sizes": "32x32",
                "type": "image/png"
            },
            {
                "src": "/favicon-48x48.png",
                "sizes": "48x48",
                "type": "image/png"
            },
            {
                "src": "/favicon-64x64.png",
                "sizes": "64x64",
                "type": "image/png"
            },
            {
                "src": "/android-chrome-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/android-chrome-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
            },
            {
                "src": "/icon-192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/icon-512.png",
                "sizes": "512x512",
                "type": "image/png"
            },
            {
                "src": "/maskable-icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": "/maskable-icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ]
    }
    manifest_path = os.path.join(public_dir, 'site.webmanifest')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated {manifest_path}")
    
    # 4. Generate browserconfig.xml
    browserconfig_content = """<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>#0F0F0F</TileColor>
    </tile>
  </msapplication>
</browserconfig>"""
    bc_path = os.path.join(public_dir, 'browserconfig.xml')
    with open(bc_path, 'w', encoding='utf-8') as f:
        f.write(browserconfig_content)
    print(f"Generated {bc_path}")

    # 5. Verify all files exist
    required_files = [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'favicon-64x64.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'apple-touch-icon.png',
        'mstile-150x150.png',
        'icon-192.png',
        'icon-512.png',
        'maskable-icon-192.png',
        'maskable-icon-512.png',
        'site.webmanifest',
        'browserconfig.xml'
    ]
    
    missing = []
    for f in required_files:
        fpath = os.path.join(public_dir, f)
        if os.path.exists(fpath):
            print(f"VERIFIED: {fpath} exists (Size: {os.path.getsize(fpath)} bytes)")
        else:
            missing.append(f)
            
    if missing:
        print(f"Verification Failed. Missing files: {missing}")
    else:
        print("ALL FAVICONS AND APP ICONS VERIFIED SUCCESSFULLY!")

if __name__ == '__main__':
    generate_icons()
