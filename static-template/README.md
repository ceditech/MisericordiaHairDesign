# Static Template Archive

This folder contains the original static HTML website files that were converted to the Next.js application.

## Contents

### HTML Files (9)
- `index.html` - Original homepage
- `gallery.html` - Gallery page
- `booking.html` - Booking page
- `payment.html` - Payment confirmation page
- `blog.html` - Blog listing page
- `blog-post.html` - Blog post template
- `contact.html` - Contact page
- `header.html` - Header partial
- `footer.html` - Footer partial

### JavaScript (1)
- `components.js` - Script that injected header/footer into static pages

### Python Scripts (7)
- `fix_featured_blog_link.py` - Fixed blog post links
- `link_blog_posts.py` - Blog post linking utility
- `refactor.py` - Refactoring script v1
- `refactor_v2.py` - Refactoring script v2
- `refactor_v3.py` - Refactoring script v3
- `update_colors.py` - Color scheme update script
- `update_links.py` - Link update utility

## Why Archived?

These files were used for the original static website that was served via Python's HTTP server. They have been **fully converted** to a modern Next.js application located in the `../web/` directory.

The Next.js application:
- Is completely self-contained
- Does not depend on any of these files
- Uses React components instead of static HTML
- Has its own dev server and build process

## Can These Be Deleted?

Yes, these files can be safely deleted if you no longer need them. They are kept here as:
1. **Reference** - In case you need to check the original implementation
2. **Backup** - Historical record of the original site
3. **Documentation** - Shows the evolution of the project

## Migration Date

Archived on: February 14, 2026

## Next.js Application

The active application is located at: `../web/`

To run the Next.js app:
```bash
cd ../web
npm run dev
```
