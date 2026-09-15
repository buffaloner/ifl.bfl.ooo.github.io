document.addEventListener('alpine:init', () => {
    // Parse URL parameters on initial hard load
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'all';

    // Global app state for UI toggles
    Alpine.store('app', {
        searchMode: null // 'location', 'events', or null
    });

    // Register global reactive memory store
    Alpine.store('filters', {
        category: initialCategory,
        
        setCategory(newCategory) {
            this.category = newCategory;
            
            // Sync state to URL for shareability without triggering a page reload
            const url = new URL(window.location);
            if (newCategory === 'all') {
                url.searchParams.delete('category');
            } else {
                url.searchParams.set('category', newCategory);
            }
            window.history.pushState({}, '', url);
        }
    });
});

// -----------------------------------------------------------------------------
// UX FIX: Accordion Expansion on Text Click
// With `navigation.indexes` enabled, MkDocs separates the menu text (a link) 
// from the chevron (the accordion toggle label). 
// This intercepts clicks on the text to trigger the chevron's expansion 
// instead of navigating to the index page immediately.
// -----------------------------------------------------------------------------
document.addEventListener('click', function(e) {
    if (e.button !== 0) return;

    // Target the text link inside a split nav container
    const linkText = e.target.closest('.md-nav__container > a.md-nav__link');
    
    if (linkText) {
        const toggleLabel = linkText.nextElementSibling;
        // If there is a chevron label right next to it, trigger the accordion instead!
        if (toggleLabel && toggleLabel.tagName.toLowerCase() === 'label') {
            e.preventDefault();
            toggleLabel.click();
        }
    }
});
