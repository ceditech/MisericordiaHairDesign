import os

base_dir = r"d:\DESKTOP-AAG9AO3\Program-App\sources\repos\Clients-App\DedesBraidsApp"

# Target color to replace
OLD_HEX = "#ee2b8c"
NEW_HEX = "#a319c5"

# Variations (just in case)
OLD_RGB_SPACE = "rgb(238 43 140)"
NEW_RGB_SPACE = "rgb(163 25 197)"

OLD_RGB_COMMA = "rgb(238, 43, 140)"
NEW_RGB_COMMA = "rgb(163, 25, 197)"

# We should also handle the alpha channel cases found in booking.html: #ee2b8c20 and #ee2b8c40
# Since simple string replacement of #ee2b8c will cover the prefix of #ee2b8c20 -> #a319c520, 
# we don't need special handling IF we replace the base hex first and it's unique.
# Replacing #ee2b8c inside #ee2b8c20 results in #a319c520, which is correct (keeps the alpha).

def update_colors():
    count = 0
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(('.html', '.js', '.css', '.py', '.txt', '.md')):
                # Skip the script itself and git files
                if file == "update_colors.py" or ".git" in root:
                    continue
                
                path = os.path.join(root, file)
                
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    
                    # Perform replacements
                    if OLD_HEX in new_content:
                        new_content = new_content.replace(OLD_HEX, NEW_HEX)
                    
                    if OLD_RGB_SPACE in new_content:
                         new_content = new_content.replace(OLD_RGB_SPACE, NEW_RGB_SPACE)
                         
                    if OLD_RGB_COMMA in new_content:
                         new_content = new_content.replace(OLD_RGB_COMMA, NEW_RGB_COMMA)
                    
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Updated {file}")
                        count += 1
                        
                except Exception as e:
                    print(f"Error processing {path}: {e}")

    print(f"Color replacement complete. Updated {count} files.")

if __name__ == "__main__":
    update_colors()
