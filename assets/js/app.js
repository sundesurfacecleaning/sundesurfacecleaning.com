        // Interactive Comparison Slider Logic
        function initComparisonSliders() {
            const containers = document.querySelectorAll('.js-comparison');

            containers.forEach(container => {
                const beforeImg = container.querySelector('.js-before-img');
                const handle = container.querySelector('.js-handle');
                let isResizing = false;

                function updateSlider(x) {
                    const rect = container.getBoundingClientRect();
                    let position = ((x - rect.left) / rect.width) * 100;
                    
                    // Clamp position between 0 and 100
                    position = Math.max(0, Math.min(100, position));

                    beforeImg.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
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
            concrete:  { gold: { minRate: 0.35, maxRate: 0.50, min: 195 }, diamond: { minRate: 0.45, maxRate: 0.60, min: 245 } },
            wood:      { gold: { minRate: 0.45, maxRate: 0.65, min: 210 }, diamond: { minRate: 0.95, maxRate: 0.75, min: 260 } },
            synthetic: { gold: { minRate: 0.50, maxRate: 0.75, min: 230 }, diamond: { minRate: 1.00, maxRate: 0.85, min: 280 } }
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

        function initHeroCarousel() {
            const track = document.getElementById('hero-reviews-carousel');
            if (!track) return;
            const items = track.querySelectorAll('.hero-carousel-item');
            if (items.length <= 1) return;
            
            let index = 0;
            setInterval(() => {
                index = (index + 1) % items.length;
                track.style.transform = `translateX(-${index * 100}%)`;
            }, 5000);
        }

        // Initial setup
        updatePricingDisplay();
        initHeroCarousel();
