import re
import os

files = [
    "blog.html",
    "contact.html",
    "payment.html"
]

base_dir = r"d:\DESKTOP-AAG9AO3\Program-App\sources\repos\Clients-App\DedesBraidsApp"

def clean_file(filename):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"Skipping {filename}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_len = len(content)

    # Clean Header Leftovers
    # Pattern: <div id="app-header"></div> ... content ... </nav>
    # Note: Regex needs to be loose to catch whitespace
    # Using specific class 'max-w-7xl' which seems common in the leftovers
    
    if "id=\"app-header\"" in content:
        # Try to find the leftover block
        new_content = re.sub(r'(<div id="app-header"></div>)\s+<div class="max-w-7xl.*?</nav>', r'\1', content, flags=re.DOTALL)
        
        if new_content != content:
            content = new_content
            print(f"Cleaned header in {filename}")
        else:
            print(f"No header leftover match found in {filename} (check manual if needed)")
            
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Processed {filename}: {original_len} -> {len(content)} bytes")

for f in files:
    clean_file(f)
