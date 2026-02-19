
import os
import re

files_to_check = [
    r"src\pages\Shop.tsx",
    r"src\pages\ProductDetail.tsx",
    r"src\pages\Home.tsx",
    r"src\pages\Cart.tsx",
    r"src\pages\Account.tsx",
    r"src\lib\supabase.ts",
    r"src\context\CartContext.tsx",
    r"src\context\AuthContext.tsx",
    r"src\App.tsx",
    r"package.json",
    r"package-lock.json"
]

# Adjust paths to be absolute
base_dir = r"c:\Users\Monarch Group\Downloads\My Super Store-20251215T091603Z-1-001\My Super Store"
abs_files = [os.path.join(base_dir, f) for f in files_to_check]

# Regex pattern to match conflict blocks
# Matches <<<<<<< HEAD ... ======= ... >>>>>>> commit-hash
# We want to keep the HEAD part (group 1)
pattern = re.compile(r'<<<<<<< HEAD\s*(.*?)\s*=======\s*(.*?)\s*>>>>>>> [a-f0-9]+', re.DOTALL)

for file_path in abs_files:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Check if file has markers
        if '<<<<<<< HEAD' not in content:
            print(f"No conflicts found in {file_path}")
            continue
            
        # Replace keeping HEAD content
        # \1 refers to the first group (content between HEAD and =======)
        # We need to be careful about newlines. The regex captures content.
        # usually <<<<<<< HEAD\ncontent\n=======\n...
        # My regex: <<<<<<< HEAD\s*(.*?)\s*=======\s*...
        # This might consume newlines.
        
        # Safer regex that preserves structure slightly better?
        # Let's try to just replace the whole block with the HEAD content.
        
        new_content = re.sub(
            r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [a-f0-9]+', 
            r'\1', 
            content, 
            flags=re.DOTALL
        )
        
        # If the above strict newline regex fails, try a looser one but manual reconstruction
        # The grep showed markers at start of lines.
        
        if new_content == content:
             # Try looser regex if exact newline structure didn't match (e.g. EOF issues)
             new_content = re.sub(
                r'<<<<<<< HEAD\r?\n(.*?)\r?\n=======\r?\n.*?\r?\n>>>>>>> [a-f0-9]+', 
                r'\1', 
                content, 
                flags=re.DOTALL
             )

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Resolved conflicts in {file_path}")
        else:
            print(f"Could not match regex in {file_path} despite finding marker")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
