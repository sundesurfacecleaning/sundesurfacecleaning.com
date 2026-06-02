        // Dynamic Multi-Project Scroll-Triggered Wipe Logic
        const tracks = document.querySelectorAll('.js-scroll-track');

        function updateAllWipes() {
            const windowHeight = window.innerHeight;

            tracks.forEach(track => {
                const afterImg = track.querySelector('.js-wipe-after');
                const badgeBefore = track.querySelector('.js-badge-before');
                const badgeAfter = track.querySelector('.js-badge-after');
                const scrollHint = track.querySelector('.js-scroll-hint');
                
                if (!afterImg) return;

                const trackRect = track.getBoundingClientRect();
                const trackHeight = track.offsetHeight;

                // Calculate progress through the track (0 to 1)
                let progress = -trackRect.top / (trackHeight - windowHeight);
                progress = Math.max(0, Math.min(1, progress));

                // Update clip-path (wipe from left to right)
                const revealPercent = (1 - progress) * 100;
                afterImg.style.clipPath = `inset(0 ${revealPercent}% 0 0)`;

                // Update badges and hints specifically for this track
                if (badgeBefore) badgeBefore.style.opacity = progress > 0.8 ? (1 - progress) * 5 : 1;
                if (badgeAfter) badgeAfter.style.opacity = progress > 0.2 ? progress : 0;
                if (scrollHint) {
                    scrollHint.style.opacity = progress > 0.1 ? 0 : 1;
                    scrollHint.style.pointerEvents = progress > 0.1 ? 'none' : 'auto';
                }
            });
        }

        window.addEventListener('scroll', () => {
            requestAnimationFrame(updateAllWipes);
        });

        // Initialize all positions
        updateAllWipes();

        // Price Calculator & Interactive Matrix Logic
        const sqftInput = document.getElementById('sqft-input');
        const sqftRange = document.getElementById('sqft-range');
        const goldDisplay = document.getElementById('calc-gold');
        const diamondDisplay = document.getElementById('calc-diamond');
        const goldMinBadge = document.getElementById('gold-min-badge');
        const diamondMinBadge = document.getElementById('diamond-min-badge');
        const materialButtons = document.querySelectorAll('.material-btn');
        const calcMaterialText = document.getElementById('calc-selected-material');
        const calcCTA = document.getElementById('calc-cta');

        // Dynamic Display IDs
        const goldRateDisplay = document.getElementById('gold-rate-display');
        const goldMinDisplay = document.getElementById('gold-min-display');
        const diamondRateDisplay = document.getElementById('diamond-rate-display');
        const diamondMinDisplay = document.getElementById('diamond-min-display');

        const pricingMatrix = {
            concrete:  { gold: { minRate: 0.35, maxRate: 0.50, min: 200 }, diamond: { minRate: 0.45, maxRate: 0.60, min: 200 } },
            wood:      { gold: { minRate: 0.45, maxRate: 0.65, min: 250 }, diamond: { minRate: 0.55, maxRate: 0.75, min: 250 } },
            synthetic: { gold: { minRate: 0.50, maxRate: 0.75, min: 275 }, diamond: { minRate: 0.60, maxRate: 0.85, min: 275 } }
        };

        let currentMaterial = 'concrete';

        function updatePricingDisplay() {
            const data = pricingMatrix[currentMaterial];
            
            // Update Pricing Cards with animation
            [goldRateDisplay, goldMinDisplay, diamondRateDisplay, diamondMinDisplay].forEach(el => {
                if (!el) return;
                el.classList.remove('price-update');
                void el.offsetWidth; // Trigger reflow
                el.classList.add('price-update');
            });

            if (goldRateDisplay) goldRateDisplay.innerText = `$${data.gold.minRate.toFixed(2)} - $${data.gold.maxRate.toFixed(2)}`;
            if (goldMinDisplay) goldMinDisplay.innerText = `$${data.gold.min} minimum`;
            
            if (diamondRateDisplay) diamondRateDisplay.innerText = `$${data.diamond.minRate.toFixed(2)} - $${data.diamond.maxRate.toFixed(2)}`;
            if (diamondMinDisplay) diamondMinDisplay.innerText = `$${data.diamond.min} minimum`;

            // Update Calculator Indicator
            if (calcMaterialText) calcMaterialText.innerText = currentMaterial.toUpperCase();

            // Update Final Prices
            updatePrices();
        }

        function updatePrices(e) {
            // Sync Input and Range
            let sqft = 0;
            if (e && e.target.id === 'sqft-range') {
                sqft = parseFloat(sqftRange.value);
                sqftInput.value = sqft;
            } else {
                sqft = parseFloat(sqftInput.value) || 0;
                sqftRange.value = sqft;
            }

            const data = pricingMatrix[currentMaterial];
            
            // Calculate Totals
            const goldBaseMin = sqft * data.gold.minRate;
            const goldBaseMax = sqft * data.gold.maxRate;
            const diamondBaseMin = sqft * data.diamond.minRate;
            const diamondBaseMax = sqft * data.diamond.maxRate;
            
            const goldTotalMin = Math.max(data.gold.min, goldBaseMin);
            const goldTotalMax = Math.max(data.gold.min, goldBaseMax);
            const diamondTotalMin = Math.max(data.diamond.min, diamondBaseMin);
            const diamondTotalMax = Math.max(data.diamond.min, diamondBaseMax);

            // Update Displays
            if (goldDisplay) {
                goldDisplay.innerText = (goldTotalMin === goldTotalMax) 
                    ? `$${goldTotalMin.toFixed(2)}` 
                    : `$${goldTotalMin.toFixed(2)} - $${goldTotalMax.toFixed(2)}`;
            }
            if (diamondDisplay) {
                diamondDisplay.innerText = (diamondTotalMin === diamondTotalMax) 
                    ? `$${diamondTotalMin.toFixed(2)}` 
                    : `$${diamondTotalMin.toFixed(2)} - $${diamondTotalMax.toFixed(2)}`;
            }

            // Update Minimum Badges
            if (goldMinBadge) goldMinBadge.classList.toggle('active', goldTotalMin === data.gold.min && sqft > 0);
            if (diamondMinBadge) diamondMinBadge.classList.toggle('active', diamondTotalMin === data.diamond.min && sqft > 0);

            // Dynamically update Calculator CTA link with specific quote notes
            const goldQuote = (goldTotalMin === goldTotalMax) ? `$${goldTotalMin.toFixed(2)}` : `$${goldTotalMin.toFixed(2)} - $${goldTotalMax.toFixed(2)}`;
            const diamondQuote = (diamondTotalMin === diamondTotalMax) ? `$${diamondTotalMin.toFixed(2)}` : `$${diamondTotalMin.toFixed(2)} - $${diamondTotalMax.toFixed(2)}`;
            
            const notes = `Quote Details:\n- Surface: ${currentMaterial.toUpperCase()}\n- Area: ${sqft} sqft\n- Gold Package Estimate: ${goldQuote}\n- Diamond Restoration & Long-Term Protection Estimate: ${diamondQuote}`;
            if (calcCTA) calcCTA.href = `https://cal.com/sundesurfacecleaning/free-quote?notes=${encodeURIComponent(notes)}`;
        }

        materialButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                materialButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                currentMaterial = btn.dataset.material;
                updatePricingDisplay();
            });
        });

        if (sqftInput) sqftInput.addEventListener('input', updatePrices);
        if (sqftRange) sqftRange.addEventListener('input', updatePrices);

        // Mobile Menu Toggle
        const menuToggle = document.getElementById('menu-toggle');
        const navLinks = document.getElementById('nav-links');

        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                menuToggle.classList.toggle('open');
            });

            // Close menu when a link is clicked
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    menuToggle.classList.remove('open');
                });
            });
        }

        // Fetch and Render Hero Carousel
        async function loadHeroCarousel() {
            const track = document.getElementById('hero-reviews-carousel');
            if (!track) return;

            try {
                const response = await fetch('reviews.json');
                const reviews = await response.json();

                track.innerHTML = reviews.map(review => `
                    <div class="hero-carousel-item">
                        <div class="stars" style="margin-bottom: 0.25rem;">
                            ${Array(review.stars).fill().map(() => `
                                <svg class="icon icon-fill" style="color: #FFD700; width: 0.8rem; height: 0.8rem;" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            `).join('')}
                        </div>
                        <p class="hero-carousel-text" style="max-width: 800px;">"${review.text}"</p>
                        <span class="hero-carousel-author">${review.name} — ${review.location}</span>
                    </div>
                `).join('');

                // Animation Logic
                let index = 0;
                const items = track.querySelectorAll('.hero-carousel-item');
                if (items.length <= 1) return;

                setInterval(() => {
                    index = (index + 1) % items.length;
                    track.style.transform = `translateX(-${index * 100}%)`;
                }, 5000); // Switch every 5 seconds
            } catch (error) {
                console.error('Error loading hero carousel:', error);
            }
        }

        // Fetch and Render Testimonials
        async function loadTestimonials() {
            const container = document.getElementById('testimonials-container');
            if (!container) return;

            try {
                const response = await fetch('reviews.json');
                const reviews = await response.json();

                container.innerHTML = reviews.map(review => `
                    <div class="testimonial-card">
                        ${review.googleLink ? `
                        <a href="${review.googleLink}" target="_blank" class="google-link" aria-label="View this review on Google">
                            <svg class="icon icon-fill" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/></svg>
                        </a>` : ''}
                        
                        ${review.verified ? `
                        <div class="verified-badge">
                            <svg class="icon" style="width: 0.9rem; height: 0.9rem;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            Verified Customer
                        </div>` : ''}

                        <div class="stars" aria-label="${review.stars} stars">
                            ${Array(review.stars).fill().map(() => `
                                <svg class="icon icon-fill" style="color: #FFD700;" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            `).join('')}
                        </div>
                        <p>"${review.text}"</p>
                        <strong>— ${review.name}${review.location ? `, ${review.location}` : ''}</strong>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading testimonials:', error);
                container.innerHTML = '<p class="text-center">Unable to load testimonials at this time.</p>';
            }
        }

        // Initial setup
        updatePricingDisplay();
        loadTestimonials();
        loadHeroCarousel();
