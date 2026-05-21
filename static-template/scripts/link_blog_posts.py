import os
import re

base_dir = r"d:\DESKTOP-AAG9AO3\Program-App\sources\repos\Clients-App\DedesBraidsApp"
blog_path = os.path.join(base_dir, "blog.html")

def link_blog_posts():
    with open(blog_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Replace "Read Full Story" button with <a>
    # <button class="...">\n                        Read Full Story <span ...>arrow_forward</span>\n                    </button>
    
    # We capture the class in group 1, and the inner content (including span) in group 2
    pattern_featured = r'<button (class="[^"]*")>(\s*Read Full Story\s*<span[^>]*>arrow_forward</span>\s*)</button>'
    replacement_featured = r'<a href="blog-post.html" \1>\2</a>'
    
    content = re.sub(pattern_featured, replacement_featured, content, flags=re.DOTALL)
    
    # 2. Replace "Read More" buttons in grid with <a>
    # <button class="...">\n                        Read More <span ...>chevron_right</span>\n                    </button>
    
    pattern_grid = r'<button (class="[^"]*")>(\s*Read More\s*<span[^>]*>chevron_right</span>\s*)</button>'
    replacement_grid = r'<a href="blog-post.html" \1>\2</a>'
    
    content = re.sub(pattern_grid, replacement_grid, content, flags=re.DOTALL)

    # 3. Wrap Title text in <a> tags
    # <h3 class="...">\n                        Title Here</h3>
    # The titles have classes like: text-xl font-bold ... hover:text-primary cursor-pointer ...
    # We want to keep the h3 but wrap the text content in an <a>
    
    # Regex to find these H3s. They seem to all have "cursor-pointer" in their class list in this file.
    pattern_title = r'(<h3[^>]*class="[^"]*cursor-pointer[^"]*"[^>]*>)(\s*)(.*?)(\s*</h3>)'
    
    # \1 is the opening tag
    # \2 is whitespace
    # \3 is the title text (potentially multiline if we are not careful, but usually one block)
    # \4 is closing tag
    
    # We will replace this with: \1\2<a href="blog-post.html">\3</a>\4
    
    content = re.sub(pattern_title, r'\1\2<a href="blog-post.html">\3</a>\4', content, flags=re.DOTALL)

    # 4. Make images clickable? 
    # The images are inside a div with class "h-64 overflow-hidden relative" inside the article.
    # The article itself isn't a link.
    # We can wrap the image in an anchor.
    # structure: <div class="..."><img ...> ... </div>
    # It might be safer to just target the specific images in the grid using the article structure nearby or just the img tag if unique enough.
    # Let's try to wrap the image <img> specific to the blog cards.
    # These images are inside <article> -> <div>.
    
    # Find: <article ...> ... <div ...> ... <img ... src="...">
    # This is getting complex with regex. The "Read More" and Title links should be sufficient for "clicking any article or post", 
    # but normally users expect the image to be clickable too.
    # Let's skip image wrapping for now to avoid breaking layout (block vs inline issues) unless I modify the container.
    # Actually, wrapping <img> in <a> is standard block behavior in HTML5.
    
    # Let's stick to Titles and Buttons first as that covers the text interactions. 
    # If I wrap the image, I need to be careful about the absolute positioned span (category label) inside the same div.
    # <div class="relative"> <img ...> <span class="absolute ..."> </div>
    # If I wrap <img>, the specific <span> is fine as it's sibling.
    
    with open(blog_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Linked mock blog posts to blog-post.html")

if __name__ == "__main__":
    link_blog_posts()
