document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.getElementById('preloader');
    const introBg = document.getElementById('intro-bg');
    if (!preloader || !introBg) return;

    // Step 1: force reflow before animation (to ensure CSS transition applies)
    void introBg.offsetWidth;

    // Step 2: Slide in the background
    requestAnimationFrame(() => {
        introBg.style.transform = 'translateX(0)';
    });

    // Step 3: Fade in preloader slightly after background starts sliding
    setTimeout(() => {
        preloader.style.opacity = '1';
    }, 400);

    // Step 4: After page load, slide both out to the right
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.style.transform = 'translateX(100%)';
            introBg.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                preloader.style.display = 'none';
                introBg.style.display = 'none';
            }, 800);
        }, 1500); // min visible time
    });
});
