import re
import os

files = [
    "index.html",
    "gallery.html",
    "blog-post.html"
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

    # Clean legacy header/footer if present (for index keys)
    if "id=\"app-header\"" not in content:
        # Matches <nav or <header with class="sticky..."
        # The new index might have a different structure, so we need to be careful
        content = re.sub(r'<(nav|header)[^>]*class="[^"]*sticky[^"]*"[^>]*>.*?</\1>', header_placeholder, content, flags=re.DOTALL)
    
    if "id=\"app-footer\"" not in content:
        # Replace footer
        content = re.sub(r'<footer.*?</footer>', footer_placeholder, content, flags=re.DOTALL)

    # Special handling for potentially missing script in new files
    if "components.js" not in content:
         if "</body>" in content:
             content = content.replace("</body>", "<script src=\"components.js\"></script>\n</body>")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Processed {filename}: {original_len} -> {len(content)} bytes")

for f in files:
    clean_file(f)
