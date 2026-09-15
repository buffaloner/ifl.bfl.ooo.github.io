const hijackFooter = () => {
    const prevButton = document.querySelector('.md-footer__link--prev');
    const nextButton = document.querySelector('.md-footer__link--next');

    if (prevButton) {
        // 1. Nuke the href entirely so MkDocs' internal router can't intercept it
        prevButton.removeAttribute('href');
        prevButton.style.cursor = 'pointer';

        // 2. Wipe the existing nested spans and replace them with a single, bold "BACK"
        const titleContainer = prevButton.querySelector('.md-footer__title');
        if (titleContainer) {
            titleContainer.innerHTML = '<div class="md-ellipsis font-pixel-cowboy" style="font-size: 1.5rem; text-align: right;">BACK</div>';
        }

        // 3. Take absolute control of the click event
        prevButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation(); // Stop MkDocs from attempting to process the click
            
            // Smart routing: If they clicked from your homepage, send them back. 
            // If they opened the link directly from Google or a text message, send them home.
            if (document.referrer.includes(window.location.host)) {
                window.history.back();
            } else {
                window.location.href = '/'; 
            }
        };
    }

    // Hide the "Next" button on categories/neighborhoods so they don't wander sideways
    if (nextButton && (window.location.pathname.includes('/categories/') || window.location.pathname.includes('/neighborhoods/'))) {
        nextButton.style.display = 'none';
    }
};

// Hook into MkDocs Material's dynamic page loading
if (typeof document$ !== "undefined") {
    document$.subscribe(hijackFooter);
} else {
    document.addEventListener('DOMContentLoaded', hijackFooter);
}