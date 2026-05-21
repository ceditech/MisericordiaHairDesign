import os
import re

base_dir = r"d:\DESKTOP-AAG9AO3\Program-App\sources\repos\Clients-App\DedesBraidsApp"

def update_index():
    path = os.path.join(base_dir, "index.html")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update "Schedule Appointment" link
    # Looking for href="#" inside the anchor with "Schedule Appointment"
    # We can use a simpler replacement if the string is unique enough
    if 'href="#">\n                    Schedule Appointment' in content:
        content = content.replace('href="#">\n                    Schedule Appointment', 'href="booking.html">\n                    Schedule Appointment')
    
    # Update "Contact Us" link
    if 'href="#">\n                    Contact Us' in content:
        content = content.replace('href="#">\n                    Contact Us', 'href="contact.html">\n                    Contact Us')
        
    # Also update "Book Your Session" in Hero
    if 'href="#">\n                            Book Your Session' in content:
        content = content.replace('href="#">\n                            Book Your Session', 'href="booking.html">\n                            Book Your Session')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated index.html")

def update_gallery():
    path = os.path.join(base_dir, "gallery.html")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace buttons with a tags
    # We need to change <button class="...">...Book Now...</button> to <a href="booking.html" class="...">...Book Now...</a>
    # Using regex to capture the class and content
    
    # Pattern: <button (class=".*?")>\s*<span.*?calendar_month</span>\s*Book Now\s*</button>
    # Note: The span is inside.
    
    pattern = r'<button (class="[^"]*")>\s*(<span [^>]*>calendar_month</span>\s*Book Now)\s*</button>'
    replacement = r'<a href="booking.html" \1>\n\2\n</a>'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated gallery.html")

def update_blog_post():
    path = os.path.join(base_dir, "blog-post.html")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Update "Book Appointment" button in sidebar
    # <button class="...">\n                                        Book Appointment\n                                    </button>
    
    pattern = r'<button (class="[^"]*")>\s*Book Appointment\s*</button>'
    replacement = r'<a href="booking.html" \1>\nBook Appointment\n</a>'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated blog-post.html")

update_index()
update_gallery()
update_blog_post()
