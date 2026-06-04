        // Interactive Comparison Slider Logic
        function initComparisonSliders() {
            const containers = document.querySelectorAll('.js-comparison');

            containers.forEach(container => {
                const afterImg = container.querySelector('.js-after-img');
                const handle = container.querySelector('.js-handle');
                let isResizing = false;

                function updateSlider(x) {
                    const rect = container.getBoundingClientRect();
                    let position = ((x - rect.left) / rect.width) * 100;
                    
                    // Clamp position between 0 and 100
                    position = Math.max(0, Math.min(100, position));

                    afterImg.style.width = `${position}%`;
                    handle.style.left = `${position}%`;
                }

                container.addEventListener('mousedown', () => isResizing = true);
                window.addEventListener('mouseup', () => isResizing = false);
                
                container.addEventListener('mousemove', (e) => {
                    if (!isResizing) return;
                    updateSlider(e.clientX);
                });

                // Touch support
                container.addEventListener('touchstart', () => isResizing = true);
                window.addEventListener('touchend', () => isResizing = false);
                container.addEventListener('touchmove', (e) => {
                    if (!isResizing) return;
                    updateSlider(e.touches[0].clientX);
                });
            });
        }

        // Initialize positions
        initComparisonSliders();

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

        // Utility: Smart Truncate
        function truncateReview(text, maxLength) {
            if (text.length <= maxLength) return text;
            
            // Find positions of periods
            const periods = [];
            let pos = text.indexOf('.');
            while (pos !== -1 && periods.length < 3) {
                periods.push(pos);
                pos = text.indexOf('.', pos + 1);
            }

            // If we have at least 2 periods and the 2nd is within reasonable bounds
            if (periods.length >= 2 && periods[1] <= maxLength + 50) {
                return text.substring(0, periods[1] + 1);
            }
            
            // Fallback to first period if it's within bounds
            if (periods.length >= 1 && periods[0] <= maxLength) {
                return text.substring(0, periods[0] + 1);
            }

            // Absolute fallback: slice at maxLength
            return text.substring(0, maxLength).trim() + '...';
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
                        <p class="hero-carousel-text" style="max-width: 800px;">${truncateReview(review.text, 160)}</p>
                        <span class="hero-carousel-author">${review.name}</span>
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
                        
                        <div class="testimonial-meta">
                            ${review.verified ? `
                            <div class="verified-badge">
                                <svg class="icon" style="width: 0.9rem; height: 0.9rem;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                Verified Customer
                            </div>` : ''}

                            <div class="stars" aria-label="${review.stars} stars">
                                ${Array(review.stars).fill().map(() => `
                                    <svg class="icon icon-fill" style="color: #FFD700; width: 0.9rem; height: 0.9rem;" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                `).join('')}
                            </div>
                        </div>

                        <p>${truncateReview(review.text, 240)}</p>
                        <strong>— ${review.name}</strong>
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
