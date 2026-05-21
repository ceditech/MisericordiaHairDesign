import re
import os

files = [
    "index.html",
    "blog.html",
    "contact.html",
    "booking.html",
    "payment.html"
]

base_dir = r"d:\DESKTOP-AAG9AO3\Program-App\sources\repos\Clients-App\DedesBraidsApp"

header_placeholder = '<!-- Navigation -->\n  <div id="app-header"></div>'
footer_placeholder = '<!-- Footer -->\n  <div id="app-footer"></div>\n\n  <!-- Component Loader -->\n  <script src="components.js"></script>'

def clean_file(filename):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"Skipping {filename} (not found)")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_len = len(content)

    # 1. Clean Index Header Leftover
    if filename == "index.html":
        # Header leftovers
        content = re.sub(r'(<div id="app-header"></div>)\s+<div class="max-w-7xl.*?</nav>', r'\1', content, flags=re.DOTALL)
        # Footer leftovers
        content = re.sub(r'(<script src="components.js"></script>)\s+<div class="max-w-7xl.*?</footer>', r'\1', content, flags=re.DOTALL)
    
    # 2. Clean Booking Header Leftover
    if filename == "booking.html":
        # Header leftovers
        content = re.sub(r'(<div id="app-header"></div>)\s+<div class="max-w-7xl.*?</header>', r'\1', content, flags=re.DOTALL)

    # 3. Standard Replacement for Header
    if "id=\"app-header\"" not in content:
        # Matches <nav or <header with class="sticky..."
        content = re.sub(r'<(nav|header)[^>]*class="[^"]*sticky[^"]*"[^>]*>.*?</\1>', header_placeholder, content, flags=re.DOTALL)
    
    # 4. Standard Replacement for Footer
    if "id=\"app-footer\"" not in content:
        content = re.sub(r'<footer.*?</footer>', footer_placeholder, content, flags=re.DOTALL)

    # 5. Ensure Script is added if missing (e.g. if we cleaned header but footer was already fine?)
    # The script is part of footer placeholder. If footer replaced, script is there.
    # If footer was ALREADY replaced (e.g. payment.html potentially?), check script.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Processed {filename}: {original_len} -> {len(content)} bytes")

for f in files:
    clean_file(f)
