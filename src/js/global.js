document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const stickySidebar = document.getElementById('sticky-sidebar');
    const designSection = document.getElementById('design-outcomes');
    let lastScrollY = window.scrollY;
  
    function updateLayout() {
      const currentScrollY = window.scrollY;
      const navbarVisible = !(currentScrollY > lastScrollY && currentScrollY > 50);
  
      // Show/hide navbar
      navbar.classList.toggle('-translate-y-full', !navbarVisible);
  
      // Adjust padding for design section
      if (designSection) {
        designSection.style.paddingTop = navbarVisible ? `${navbar.offsetHeight}px` : '0px';
      }
  
      // Adjust sticky sidebar top (do NOT change position)
      if (stickySidebar) {
        stickySidebar.style.top = navbarVisible ? `${navbar.offsetHeight}px` : '0px';
      }
  
      // Navbar background logic
      if (navbarVisible && stickySidebar) {
        const sidebarRect = stickySidebar.getBoundingClientRect();
        const navbarRect = navbar.getBoundingClientRect();
  
        // Only switch background if sidebar is below navbar (i.e., visible)
        if (sidebarRect.top <= navbarRect.bottom) {
          navbar.classList.remove('bg-slate-2/40');
          navbar.classList.add('bg-slate-1/40');
        } else {
          navbar.classList.remove('bg-slate-1/40');
          navbar.classList.add('bg-slate-2/40');
        }
      } else {
        navbar.classList.remove('bg-slate-1/40');
        navbar.classList.add('bg-slate-2/40'); // default
      }
  
      lastScrollY = currentScrollY;
    }
  
    window.addEventListener('scroll', updateLayout);
    window.addEventListener('resize', updateLayout);
    updateLayout(); // initial call
  });