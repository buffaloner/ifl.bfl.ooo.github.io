document.addEventListener('alpine:init', () => {
    // Parse URL parameters on initial hard load
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'all';

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
