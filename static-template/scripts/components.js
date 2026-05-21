async function loadComponent(elementId, filePath) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element with id '${elementId}' not found. Skipping load for ${filePath}.`);
        return;
    }

    try {
        console.log(`Loading ${filePath} into #${elementId}...`);
        // Add cache busting query param
        const response = await fetch(`${filePath}?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
        const html = await response.text();
        element.innerHTML = html;
        console.log(`Successfully loaded ${filePath} into #${elementId}.`);

        if (elementId === 'app-header') {
            highlightActiveLink();
        }
    } catch (error) {
        console.error(`Error loading component ${filePath}:`, error);
        element.innerHTML = `<div class="text-red-500 p-4">Failed to load ${filePath}. Please refresh the page.</div>`;
    }
}

function highlightActiveLink() {
    const path = window.location.pathname;
    let currentFile = path.substring(path.lastIndexOf('/') + 1);

    if (currentFile === '' || currentFile === '/') {
        currentFile = 'index.html';
    }

    // Select links in the desktop menu (hidden md:flex) and mobile menu
    const navLinks = document.querySelectorAll('#app-header a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // strict match to avoid highlighting "Services" (index.html#services) when on Home (index.html)
        if (href === currentFile || (href === 'index.html' && (currentFile === '' || currentFile === '/'))) {
            link.classList.add('text-primary');
            // Remove default text color if it exists explicitly or rely on CSS cascading
            link.classList.remove('text-slate-900', 'dark:text-white', 'text-slate-600');
        }
    });
}

function initComponents() {
    loadComponent('app-header', 'header.html');
    loadComponent('app-footer', 'footer.html');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
} else {
    initComponents();
}
