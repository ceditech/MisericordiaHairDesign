import os
import re

base_dir = r"d:\DESKTOP-AAG9AO3\Program-App\sources\repos\Clients-App\DedesBraidsApp"
blog_path = os.path.join(base_dir, "blog.html")

def fix_featured_link():
    with open(blog_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix Featured "Read Full Story" button
    # The button tag spans multiple lines:
    # <button
    #    class="...">
    #    Read Full Story ...
    # </button>
    
    # We'll use re.DOTALL and match <button ... > ... Read Full Story ... </button>
    # We want to capture the class content to reuse it.
    
    # Pattern: <button\s+class="([^"]*)"\s*>\s*Read Full Story\s*<span[^>]*>arrow_forward</span>\s*</button>
    # \s+ handles the newline after <button
    
    pattern_btn = r'<button\s+class="([^"]*)"\s*>\s*Read Full Story\s*<span[^>]*>arrow_forward</span>\s*</button>'
    replacement_btn = r'<a href="blog-post.html" class="\1">\n                        Read Full Story <span class="material-icons text-sm">arrow_forward</span>\n                    </a>'
    
    content = re.sub(pattern_btn, replacement_btn, content, flags=re.DOTALL)
    
    # Check if Featured Title is linked (it was an h2, my previous script only did h3)
    # <h2 class="...">The Ultimate Guide...</h2>
    
    pattern_h2 = r'(<h2[^>]*class="[^"]*"[^>]*>)(\s*)(The Ultimate Guide to 2024 Knotless Trends)(\s*</h2>)'
    # Note: the h2 in file didn't seem to have cursor-pointer or hover classes in previous view, let's add them or just link existing text.
    # Lines 76-77: <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">The Ultimate Guide\n to 2024 Knotless Trends</h2>
    
    # I'll just find the specific h2 content and wrap it.
    if 'The Ultimate Guide' in content and '<a href="blog-post.html">The Ultimate Guide' not in content:
        # It's safer to not rely on strict regex for the h2 tag attributes if unchanged, but I can match the text content.
        # But wait, I should verify if I need to add hover classes to the H2 if they aren't there.
        # The prompt said "clicking any article... redirects".
        
        # Let's replace the inner text of that specific H2.
        # Finding the H2 start tag and closing tag is better.
        
        pattern_h2_loose = r'(<h2[^>]*>)(.*?)(</h2>)'
        # This matches all h2s. There is only one in the view I saw (Featured).
        # I'll target the text specifically.
        
        target_text = "The Ultimate Guide\n                        to 2024 Knotless Trends"
        # The newlines might be different. regex \s+ is key.
        
        # Let's try to match the H2 with the specific title text handling whitespace
        content = re.sub(
            r'(<h2[^>]*>)(\s*The Ultimate Guide\s+to 2024 Knotless Trends\s*)(</h2>)', 
            r'\1<a href="blog-post.html" class="hover:text-primary transition-colors">\2</a>\3', 
            content, 
            flags=re.DOTALL
        )

    with open(blog_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Fixed featured post link in blog.html")

if __name__ == "__main__":
    fix_featured_link()
