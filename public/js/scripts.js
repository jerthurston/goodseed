/* ==========================================================================
   Unified Scripts for goodseed
   ========================================================================== */

// --- Mock Data Store (for demonstration purposes) ---
// In a real application, this data would come from a server/backend.
let userLists = [
    { id: 'favorites', name: 'Favorites' },
    { id: 'list-123', name: 'Weekend Strains' },
    { id: 'list-456', name: 'Creative Boosters' }
];

let productListMemberships = {
    // 'productId': ['listId1', 'listId2', ...]
    'P004': ['favorites', 'list-123'],
    'P008': ['favorites']
};
// --- End Mock Data Store ---


let performRedirectSearch;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing scripts.");

    // --- Global Initializers ---
    initAgeVerification();
    initLoginModal();
    initAccountDropdown(); 
    initFilterModal();
    initSearch();
    initAddToListModal();
    initUnfavoriteConfirmModal(); 

    // --- Page-Specific Initializers ---
    if (document.querySelector('.account-page-main')) {
        console.log("Account page detected. Initializing account page scripts.");
        initAccountPage(); // <-- ADDED: Initialize the new account page scripts
    }
    if (document.getElementById('plantCardGrid')) {
        console.log("Results or Favorites page detected. Initializing results-specific scripts.");
        initResultsPage();
    }
    if (document.getElementById('favoriteListSelect')) {
        console.log("Favorites page detected. Initializing favorites-specific scripts.");
        initFavoritesPage();
    }
    if (document.getElementById('goodseedContactForm')) {
        console.log("Contact page detected. Initializing contact form script.");
        initContactForm();
    }
    if (document.querySelector('.faq-page-main')) {
        console.log("FAQ page detected. Initializing FAQ accordion.");
        initFaqAccordion();
    }
});


/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}


/* ==========================================================================
   GLOBAL MODULES (used across multiple pages)
   ========================================================================== */

function initAgeVerification() {
    const ageModal = document.getElementById('ageVerification');
    if (!ageModal) {
        return;
    }

    const confirmBtn = document.getElementById('confirmAge');
    const denyBtn = document.getElementById('denyAge');

    if (!confirmBtn || !denyBtn) {
        console.error("Age verification buttons not found! Please ensure your HTML has elements with id='confirmAge' and id='denyAge'.");
        return;
    }

    try {
        if (localStorage.getItem('ageVerified') === 'true') {
            ageModal.classList.add('hidden');
            return;
        }
    } catch (e) {
        console.warn("Could not access localStorage. Age verification will appear on every visit.", e);
    }

    ageModal.classList.remove('hidden');

    confirmBtn.addEventListener('click', () => {
        try {
            localStorage.setItem('ageVerified', 'true');
        } catch (e) {
            console.warn("Could not set 'ageVerified' in localStorage.", e);
        }
        ageModal.classList.add('hidden');
    });

    denyBtn.addEventListener('click', () => {
        const modalContent = ageModal.querySelector('.age-modal');
        if (modalContent) {
            modalContent.innerHTML = '<p>You must be of legal age to view this content. Redirecting...</p>';
        }
        setTimeout(() => { window.location.href = 'https://www.google.com'; }, 2000);
    });
}


function initLoginModal() {
    const loginModal = document.getElementById('loginModal');
    const openLoginModalBtns = document.querySelectorAll('.login-btn');
    const closeLoginModalBtn = document.getElementById('closeLoginModal');

    if (!loginModal || openLoginModalBtns.length === 0 || !closeLoginModalBtn) return;

    const openModal = (e) => {
        e.preventDefault();
        loginModal.classList.add('active');
    };
    const closeModal = () => loginModal.classList.remove('active');

    openLoginModalBtns.forEach(btn => btn.addEventListener('click', openModal));
    closeLoginModalBtn.addEventListener('click', closeModal);
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && loginModal.classList.contains('active')) closeModal();
    });
}

function initAccountDropdown() {
    const accountBtn = document.getElementById('accountBtn');
    const dropdownMenu = document.getElementById('accountDropdownMenu');
    const logoutBtn = document.getElementById('logout-btn');

    if (!accountBtn || !dropdownMenu) {
        return;
    }

    accountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isActive = dropdownMenu.classList.toggle('active');
        accountBtn.setAttribute('aria-expanded', isActive);
    });

    document.addEventListener('click', (e) => {
        if (!accountBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            if (dropdownMenu.classList.contains('active')) {
                dropdownMenu.classList.remove('active');
                accountBtn.setAttribute('aria-expanded', 'false');
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdownMenu.classList.contains('active')) {
            dropdownMenu.classList.remove('active');
            accountBtn.setAttribute('aria-expanded', 'false');
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('User logging out...');
            alert('You have been logged out.');
            window.location.href = 'index.html'; 
        });
    }
}

function initSearch() {
    const homeSearchInput = document.getElementById('searchInput');
    if (homeSearchInput) {
        const homeSearchBtn = homeSearchInput.nextElementSibling;
        // REPLACE WITH THIS in initSearch()
performRedirectSearch = () => {
    const params = new URLSearchParams();
    const query = homeSearchInput.value.trim();
    if (query) {
        params.set('q', query);
    }

    // This is the key change: We get the filters fresh every time.
    // It no longer depends on a separate variable being set.
    const filters = getFilterValues();
    if (filters.minPrice > 0) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice < 100) params.set('maxPrice', filters.maxPrice);
    if (filters.minTHC > 0) params.set('minTHC', filters.minTHC);
    if (filters.maxTHC < 40) params.set('maxTHC', filters.maxTHC);
    if (filters.minCBD > 0) params.set('minCBD', filters.minCBD);
    if (filters.maxCBD < 25) params.set('maxCBD', filters.maxCBD);
    filters.seedTypes.forEach(val => params.append('type', val));
    filters.cannabisTypes.forEach(val => params.append('category', val));
    
    window.location.href = `results.html?${params.toString()}`;
};
        if (homeSearchBtn) homeSearchBtn.addEventListener('click', performRedirectSearch);
        homeSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performRedirectSearch();
        });
    }
}

function initFilterModal() {
    const filterModal = document.getElementById('filterModal');
    if (!filterModal) return;

    const openFilterBtns = document.querySelectorAll('#openFilter, .filter-btn, .advanced-filter-btn');
    const closeFilterBtn = document.getElementById('closeFilter');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');

    initRangeSliders(filterModal);

    // --- STEP 1: Define the key handler function separately ---
    // We need a named function so we can add AND remove it later.
    const handleEnterKey = (e) => {
        if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'button') {
            e.preventDefault();
            if (applyFiltersBtn) {
                applyFiltersBtn.click();
            }
        }
    };

    const openModal = () => {
        filterModal.classList.add('active');
        // --- STEP 2: ADD the listener when the modal opens ---
        document.addEventListener('keydown', handleEnterKey);
    };

    const closeModal = () => {
        filterModal.classList.remove('active');
        // --- STEP 3: REMOVE the listener when the modal closes ---
        document.removeEventListener('keydown', handleEnterKey);
    };

    openFilterBtns.forEach(btn => btn.addEventListener('click', openModal));
    if (closeFilterBtn) closeFilterBtn.addEventListener('click', closeModal);
    
    // Also close and remove listener if user clicks the background overlay
    filterModal.addEventListener('click', (e) => {
        if (e.target === filterModal) {
            closeModal();
        }
    });
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            if (typeof applyAllFiltersAndSearch === 'function') {
                applyAllFiltersAndSearch();
                closeModal(); // This will also remove the key listener automatically
            } else if (typeof performRedirectSearch === 'function') {
                performRedirectSearch();
                // No need to call closeModal() here, the page is navigating away.
            }
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            const form = filterModal.querySelector('.filter-container');
            if (!form) return;
            form.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
            form.querySelectorAll('.range-slider-container').forEach(container => {
                const minRange = container.querySelector('.range-slider-min');
                const maxRange = container.querySelector('.range-slider-max');
                if (minRange) { minRange.value = minRange.min; minRange.dispatchEvent(new Event('input', { bubbles: true })); }
                if (maxRange) { maxRange.value = maxRange.max; maxRange.dispatchEvent(new Event('input', { bubbles: true })); }
                const inputsDiv = container.nextElementSibling;
                if (inputsDiv) {
                    const minInput = inputsDiv.querySelector('input[id^="min"]');
                    const maxInput = inputsDiv.querySelector('input[id^="max"]');
                    if (minInput) { minInput.value = minInput.min; minInput.dispatchEvent(new Event('blur')); }
                    if (maxInput) { maxInput.value = maxInput.max; maxInput.dispatchEvent(new Event('blur')); }
                }
            });
            
            if (typeof applyAllFiltersAndSearch === 'function') {
                applyAllFiltersAndSearch();
            }

            // --- THIS IS THE FIX ---
            // After resetting, immediately remove focus from the "Reset" button.
            resetFiltersBtn.blur();
        });
    }
}

function getFilterValues() {
    const values = {};
    const minPriceEl = document.getElementById('minPrice');
    const maxPriceEl = document.getElementById('maxPrice');
    const minTHCEl = document.getElementById('minTHC');
    const maxTHCEl = document.getElementById('maxTHC');
    const minCBDEl = document.getElementById('minCBD');
    const maxCBDEl = document.getElementById('maxCBD');

    values.minPrice = minPriceEl ? parseFloat(minPriceEl.value) : 0;
    values.maxPrice = maxPriceEl ? parseFloat(maxPriceEl.value) : 100;
    values.seedTypes = Array.from(document.querySelectorAll('#filterModal input[name="seedType"]:checked')).map(el => el.value);
    values.cannabisTypes = Array.from(document.querySelectorAll('#filterModal input[name="cannabisType"]:checked')).map(el => el.value);
    values.minTHC = minTHCEl ? parseFloat(minTHCEl.value) : 0;
    values.maxTHC = maxTHCEl ? parseFloat(maxTHCEl.value) : 40;
    values.minCBD = minCBDEl ? parseFloat(minCBDEl.value) : 0;
    values.maxCBD = maxCBDEl ? parseFloat(maxCBDEl.value) : 25;
    
    return values;
}

function initRangeSliders(container) {
    const sliders = [
        { minR: 'minPriceRange', maxR: 'maxPriceRange', minI: 'minPrice', maxI: 'maxPrice' },
        { minR: 'minTHCRange', maxR: 'maxTHCRange', minI: 'minTHC', maxI: 'maxTHC' },
        { minR: 'minCBDRange', maxR: 'maxCBDRange', minI: 'minCBD', maxI: 'maxCBD' }
    ];
    sliders.forEach(s => {
        if (document.getElementById(s.minR)) {
            setupRangeSlider(s.minR, s.maxR, s.minI, s.maxI);
        }
    });
}

function setupRangeSlider(minRangeId, maxRangeId, minInputId, maxInputId) {
    const minRange = document.getElementById(minRangeId);
    const maxRange = document.getElementById(maxRangeId);
    const minInput = document.getElementById(minInputId);
    const maxInput = document.getElementById(maxInputId);
    const sliderContainer = minRange ? minRange.parentElement : null;
    if (!minRange || !maxRange || !minInput || !maxInput || !sliderContainer) {
        console.error("Range slider setup failed for:", minRangeId, "One or more elements not found.");
        return;
    }
    const absMin = parseFloat(minRange.min);
    const absMax = parseFloat(maxRange.max);
    const step = parseFloat(minRange.step) || 1;
    const decimals = (String(step).split('.')[1] || '').length;
    let minAnimationId = null; let maxAnimationId = null;
    const animationDuration = 150;
    function easeOutQuad(t) { return t * (2 - t); }
    function formatValue(value) { const num = parseFloat(value); if (isNaN(num)) return ""; return num.toFixed(decimals); }
    function updateInputsFromSliders() { if (minInput) minInput.value = formatValue(minRange.value); if (maxInput) maxInput.value = formatValue(maxRange.value); }
    function handleMinRangeInput() { if (minAnimationId) cancelAnimationFrame(minAnimationId); minAnimationId = null; let newMinValue = parseFloat(minRange.value); let currentMaxValue = parseFloat(maxRange.value); if (newMinValue > currentMaxValue) { newMinValue = Math.max(absMin, currentMaxValue - step); minRange.value = formatValue(newMinValue); } else if (newMinValue < absMin) { minRange.value = formatValue(absMin); } if (minInput) minInput.value = formatValue(minRange.value); }
    function handleMaxRangeInput() { if (maxAnimationId) cancelAnimationFrame(maxAnimationId); maxAnimationId = null; let newMaxValue = parseFloat(maxRange.value); let currentMinValue = parseFloat(minRange.value); if (newMaxValue < currentMinValue) { newMaxValue = Math.min(absMax, currentMinValue + step); maxRange.value = formatValue(newMaxValue); } else if (newMaxValue > absMax) { maxRange.value = formatValue(absMax); } if (maxInput) maxInput.value = formatValue(maxRange.value); }
    function handleMinNumberInput() { const valStr = minInput.value.trim(); const val = parseFloat(valStr); if (!isNaN(val)) { minRange.value = formatValue(Math.max(absMin, Math.min(val, absMax))); } }
    function handleMaxNumberInput() { const valStr = maxInput.value.trim(); const val = parseFloat(valStr); if (!isNaN(val)) { maxRange.value = formatValue(Math.max(absMin, Math.min(val, absMax))); } }
    function validateAndSyncOnBlur(blurredElement) { let minValStr = minInput.value.trim(); let maxValStr = maxInput.value.trim(); let minVal = parseFloat(minValStr); let maxVal = parseFloat(maxValStr); if (minValStr === "" || isNaN(minVal)) minVal = parseFloat(minRange.value) || absMin; if (maxValStr === "" || isNaN(maxVal)) maxVal = parseFloat(maxRange.value) || absMax; minVal = Math.max(absMin, Math.min(minVal, absMax)); maxVal = Math.max(absMin, Math.min(maxVal, absMax)); minVal = Math.round(minVal / step) * step; maxVal = Math.round(maxVal / step) * step; minVal = Math.max(absMin, Math.min(minVal, absMax)); maxVal = Math.max(absMin, Math.min(maxVal, absMax)); if (minVal > maxVal) { if (blurredElement === minInput) { minVal = maxVal; } else if (blurredElement === maxInput) { maxVal = minVal; } else { minVal = maxVal; } } minInput.value = formatValue(minVal); maxInput.value = formatValue(maxVal); minRange.value = formatValue(minVal); maxRange.value = formatValue(maxVal); }
    minRange.addEventListener('input', handleMinRangeInput); maxRange.addEventListener('input', handleMaxRangeInput); minInput.addEventListener('input', handleMinNumberInput); maxInput.addEventListener('input', handleMaxNumberInput); minInput.addEventListener('blur', () => validateAndSyncOnBlur(minInput)); maxInput.addEventListener('blur', () => validateAndSyncOnBlur(maxInput));
    sliderContainer.addEventListener('click', (event) => { if (event.target === minRange || event.target === maxRange || event.target === minInput || event.target === maxInput) return; const rect = sliderContainer.getBoundingClientRect(); const clickX = event.clientX - rect.left; const width = sliderContainer.offsetWidth; if (width === 0) return; const proportion = Math.max(0, Math.min(1, clickX / width)); const rangeDiff = absMax - absMin; let clickedValue = absMin + proportion * rangeDiff; clickedValue = Math.round(clickedValue / step) * step; clickedValue = parseFloat(formatValue(clickedValue)); const currentMinValue = parseFloat(minRange.value); const currentMaxValue = parseFloat(maxRange.value); const distToMinThumb = Math.abs(clickedValue - currentMinValue); const distToMaxThumb = Math.abs(clickedValue - currentMaxValue); let targetSlider, startValue, finalEndValue, currentAnimationIdKey; if (distToMinThumb <= distToMaxThumb) { targetSlider = minRange; startValue = currentMinValue; finalEndValue = Math.min(clickedValue, currentMaxValue - step); finalEndValue = Math.max(absMin, finalEndValue); if (minAnimationId) cancelAnimationFrame(minAnimationId); currentAnimationIdKey = 'min'; } else { targetSlider = maxRange; startValue = currentMaxValue; finalEndValue = Math.max(clickedValue, currentMinValue + step); finalEndValue = Math.min(absMax, finalEndValue); if (maxAnimationId) cancelAnimationFrame(maxAnimationId); currentAnimationIdKey = 'max'; } finalEndValue = parseFloat(formatValue(Math.max(absMin, Math.min(absMax, finalEndValue)))); if (startValue === finalEndValue && targetSlider.value === formatValue(finalEndValue)) return; let startTime = null; function animate(timestamp) { if (!startTime) startTime = timestamp; const elapsedTime = timestamp - startTime; const progress = Math.min(1, elapsedTime / animationDuration); const easedProgress = easeOutQuad(progress); const currentValue = startValue + (finalEndValue - startValue) * easedProgress; targetSlider.value = formatValue(currentValue); updateInputsFromSliders(); if (progress < 1) { if (currentAnimationIdKey === 'min') minAnimationId = requestAnimationFrame(animate); else maxAnimationId = requestAnimationFrame(animate); } else { targetSlider.value = formatValue(finalEndValue); updateInputsFromSliders(); let m1 = parseFloat(minRange.value); let m2 = parseFloat(maxRange.value); if (m1 > m2) { if (targetSlider === minRange) minRange.value = formatValue(m2); else maxRange.value = formatValue(m1); updateInputsFromSliders(); } if (currentAnimationIdKey === 'min') minAnimationId = null; else maxAnimationId = null; } } if (currentAnimationIdKey === 'min') minAnimationId = requestAnimationFrame(animate); else maxAnimationId = requestAnimationFrame(animate); });
    updateInputsFromSliders(); validateAndSyncOnBlur(null); 
}


/* ==========================================================================
   PAGE-SPECIFIC MODULES
   ========================================================================== */

/* START: New function for Account Page */
function initAccountPage() {
    // --- Element Selections ---
    const signOutBtn = document.getElementById('sign-out-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const modal = document.getElementById('delete-confirm-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // --- Event Listeners ---

    // 1. Sign Out Button on the page
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            console.log('Signing out from account page...');
            // In a real application, you would clear the user's session/token here.
            alert('You have been signed out.');
            // Redirect to the logged-out homepage
            window.location.href = 'index.html';
        });
    }

    // 2. Delete Account Button (Opens the Modal)
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            if (modal) modal.classList.remove('hidden');
        });
    }

    // 3. Cancel Deletion (Closes the Modal)
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            if (modal) modal.classList.add('hidden');
        });
    }
    
    // 4. Close modal if user clicks on the overlay background
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

    // 5. Confirm Deletion Button
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            console.log('PERMANENTLY DELETING ACCOUNT...');
            // In a real application, make an API call to your backend here.
            
            alert('Your account has been permanently deleted. You will be redirected to the homepage.');
            
            if (modal) modal.classList.add('hidden');
            window.location.href = 'index.html';
        });
    }

    // 6. Notification Toggles
    const toggles = document.querySelectorAll('.toggle-switch input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', (event) => {
            const preference = event.target.id;
            const enabled = event.target.checked;
            console.log(`Notification preference '${preference}' is now ${enabled ? 'ON' : 'OFF'}.`);
            // In a real app, you'd send this preference to your server to save it.
        });
    });
}
/* END: New function for Account Page */

function initFaqAccordion() {
    const accordionButtons = document.querySelectorAll('.accordion-button');
    if (accordionButtons.length === 0) return;

    accordionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const item = button.parentElement;
            const content = button.nextElementSibling;
            const isActive = button.classList.contains('active');

            button.classList.toggle('active');
            item.classList.toggle('active');
            button.setAttribute('aria-expanded', String(!isActive));

            if (!isActive) {
                content.style.maxHeight = (content.scrollHeight + 20) + "px";
            } else {
                content.style.maxHeight = null;
            }
        });
    });
}

function initContactForm() {
    const contactForm = document.getElementById('goodseedContactForm');
    const formConfirmationMessage = document.getElementById('formConfirmationMessage');
    
    if (!contactForm || !formConfirmationMessage) {
        console.error("Contact form elements not found. Cannot initialize form.");
        return;
    }
    
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault(); 

        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const category = document.getElementById('contactCategory').value;
        const message = document.getElementById('contactMessage').value.trim();
        const turnstileResponse = contactForm.querySelector('[name="cf-turnstile-response"]');

        if (!name || !email || !category || !message) {
            alert('Please fill out all required fields.');
            return;
        }
        if (turnstileResponse && !turnstileResponse.value) {
            alert('Please complete the CAPTCHA verification.');
            return; 
        }

        console.log('Form submitted (simulated):', { name, email, category, message });

        contactForm.classList.add('hidden');
        formConfirmationMessage.classList.remove('hidden');
        formConfirmationMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}


/* ==========================================================================
   RESULTS PAGE SPECIFIC LOGIC
   ========================================================================== */
let allPlantCards = [];
let applyAllFiltersAndSearch;

function initResultsPage() {
    const plantCardGrid = document.getElementById('plantCardGrid');
    if (!plantCardGrid) return;
    allPlantCards = Array.from(plantCardGrid.querySelectorAll('.plant-card'));

    const mainSearchInput = document.getElementById('mainSearchInput');
    const mainSearchBtnIcon = document.getElementById('mainSearchButtonIcon');
    const inlineFilterType = document.getElementById('inlineFilterType');
    const inlineFilterCategory = document.getElementById('inlineFilterCategory');
    const inlineSortBy = document.getElementById('inlineSortBy');

    if (mainSearchBtnIcon) mainSearchBtnIcon.addEventListener('click', () => applyAllFiltersAndSearch());
    if (mainSearchInput) mainSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyAllFiltersAndSearch(); });
    if (inlineFilterType) inlineFilterType.addEventListener('change', applyInlineFiltersAndSort);
    if (inlineFilterCategory) inlineFilterCategory.addEventListener('change', applyInlineFiltersAndSort);
    if (inlineSortBy) inlineSortBy.addEventListener('change', applyInlineFiltersAndSort);

    initCardOverlays();
    initCardDetails();
    initMobileFilterToggle();
    initListIconHooks();
    initFavoriteStates();

    applyAllFiltersAndSearch = function() {
        closeAllPackDealsOverlays();
        const keyword = mainSearchInput ? mainSearchInput.value.trim().toLowerCase() : "";
        const filters = getFilterValues();
        allPlantCards.forEach(card => {
            const cardName = (card.dataset.name || '').toLowerCase();
            const cardType = card.dataset.type;
            const cardCategory = card.dataset.category;
            const cardPrice = parseFloat(card.dataset.price);
            const cardTHC = parseFloat(card.dataset.thc);
            const cardCBD = parseFloat(card.dataset.cbd);
            let showCard = true;
            if (keyword && !cardName.includes(keyword)) showCard = false;
            if (filters.seedTypes.length > 0 && !filters.seedTypes.includes(cardType)) showCard = false;
            if (filters.cannabisTypes.length > 0 && !filters.cannabisTypes.includes(cardCategory)) showCard = false;
            if (cardPrice < filters.minPrice || cardPrice > filters.maxPrice) showCard = false;
            if (!isNaN(filters.minTHC) && (isNaN(cardTHC) || cardTHC < filters.minTHC)) showCard = false;
            if (!isNaN(filters.maxTHC) && (isNaN(cardTHC) || cardTHC > filters.maxTHC)) showCard = false;
            if (!isNaN(filters.minCBD) && (isNaN(cardCBD) || cardCBD < filters.minCBD)) showCard = false;
            if (!isNaN(filters.maxCBD) && (isNaN(cardCBD) || cardCBD > filters.maxCBD)) showCard = false;
            card.classList.toggle('hidden-by-filter', !showCard);
        });
        if (inlineFilterType) inlineFilterType.value = 'all';
        if (inlineFilterCategory) inlineFilterCategory.value = 'all';
        if (inlineSortBy) inlineSortBy.value = 'popularity';
        applyInlineFiltersAndSort();
    }

    function applyInlineFiltersAndSort() {
        closeAllPackDealsOverlays();
        const selectedType = inlineFilterType ? inlineFilterType.value : 'all';
        const selectedCategory = inlineFilterCategory ? inlineFilterCategory.value : 'all';
        const sortBy = inlineSortBy ? inlineSortBy.value : 'popularity';
        let cardsToDisplay = allPlantCards.filter(card => !card.classList.contains('hidden-by-filter'));
        if (selectedType !== 'all') cardsToDisplay = cardsToDisplay.filter(card => card.dataset.type === selectedType);
        if (selectedCategory !== 'all') cardsToDisplay = cardsToDisplay.filter(card => card.dataset.category === selectedCategory);
        cardsToDisplay.sort((a, b) => {
            const priceA = parseFloat(a.dataset.price), priceB = parseFloat(b.dataset.price);
            const popA = parseInt(a.dataset.popularity) || 0, popB = parseInt(b.dataset.popularity) || 0;
            const dateA = new Date(a.dataset.date), dateB = new Date(b.dataset.date);
            switch (sortBy) {
                case 'priceLowToHigh': return priceA - priceB;
                case 'priceHighToLow': return priceB - priceA;
                case 'newest': return dateB - dateA;
                default: return popB - popA;
            }
        });
        allPlantCards.forEach(card => card.style.display = 'none');
        cardsToDisplay.forEach(card => {
            plantCardGrid.appendChild(card);
            card.style.display = '';
        });
    }

    applyFiltersFromURL();
    if (typeof applyAllFiltersAndSearch === 'function') {
        applyAllFiltersAndSearch();
    }
}

function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const mainSearchInput = document.getElementById('mainSearchInput');
    if (query && mainSearchInput) mainSearchInput.value = query;
    const setNumeric = (id, param) => { 
        const el = document.getElementById(id);
        if (params.has(param) && el) el.value = params.get(param); 
    };
    const setCheckbox = (name, param) => {
        const values = params.getAll(param);
        if (values.length > 0) {
            document.querySelectorAll(`#filterModal input[name="${name}"]`).forEach(cb => {
                if (values.includes(cb.value)) cb.checked = true;
            });
        }
    };
    setNumeric('minPrice', 'minPrice'); setNumeric('maxPrice', 'maxPrice');
    setNumeric('minTHC', 'minTHC'); setNumeric('maxTHC', 'maxTHC');
    setNumeric('minCBD', 'minCBD'); setNumeric('maxCBD', 'maxCBD');
    setCheckbox('seedType', 'type'); setCheckbox('cannabisType', 'category');
    document.querySelectorAll('.range-inputs input[type="number"]').forEach(input => {
        input.dispatchEvent(new Event('blur', { bubbles: true }));
    });
}

function initCardDetails() {
    document.querySelectorAll('.plant-card').forEach(card => {
        const vendorName = card.dataset.vendorName || "Vendor";
        const vendorUrl = card.dataset.vendorUrl || "#";
        const seedType = card.dataset.type || 'N/A';
        const strainCategory = card.dataset.category || 'N/A';
        const thc = card.dataset.thc || 'N/A';
        const cbd = card.dataset.cbd || 'N/A';
        const vendorContextEl = card.querySelector('.smallest-pack-vendor-context');
        if (vendorContextEl) {
            vendorContextEl.innerHTML = `<a href="${vendorUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(vendorName)}</a>`;
        }
        const seedTypePillEl = card.querySelector('.seed-type-pill-on-image');
        if (seedTypePillEl) {
            seedTypePillEl.textContent = seedType;
            seedTypePillEl.className = 'seed-type-pill-on-image';
            if (['feminized', 'autoflower', 'regular'].includes(seedType.toLowerCase())) {
                seedTypePillEl.classList.add(seedType.toLowerCase());
            }
        }
        const strainCategoryTextEl = card.querySelector('.strain-category-text');
        if (strainCategoryTextEl) strainCategoryTextEl.textContent = strainCategory;
        const thcValueTextEl = card.querySelector('.thc-value-text');
        if (thcValueTextEl) thcValueTextEl.textContent = `THC ${thc}%`;
        const cbdValueTextEl = card.querySelector('.cbd-value-text');
        if (cbdValueTextEl) cbdValueTextEl.textContent = `CBD ${cbd}%`;
    });
}

function initCardOverlays() {
    document.querySelectorAll('.pack-deals-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            openPackDealsOverlay(button);
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAllPackDealsOverlays();
    });
}

function openPackDealsOverlay(buttonEl) {
    const card = buttonEl.closest('.plant-card');
    const overlay = card.querySelector('.plant-card-overlay');
    if (!card || !overlay) return;

    const strainName = card.dataset.name || "Unknown Strain";
    const vendorName = card.dataset.vendorName || "Unknown Vendor";
    const description = card.dataset.strainDescription || "No description available.";
    const vendorUrl = card.dataset.vendorUrl || '#';
    const packsData = JSON.parse(card.dataset.packs || '[]');
    const isFavorite = card.querySelector('.favorite-btn-new').classList.contains('active');

    let pricingTableHtml = packsData.length > 0 ?
        packsData.map(pack => `
            <tr>
                <td>${parseInt(pack.size) || 'N/A'} Seeds</td>
                <td>$${(parseFloat(pack.totalPrice) || 0).toFixed(2)}</td>
                <td>$${(parseFloat(pack.pricePerSeed) || 0).toFixed(2)}</td>
            </tr>`).join('') :
        '<tr><td colspan="3" style="text-align:center; padding: 1rem;">No pack deals available.</td></tr>';

    overlay.innerHTML = `
        <div class="overlay-header">
            <button type="button" class="overlay-close-btn" aria-label="Close">&times;</button>
            <h3 class="overlay-strain-name-header">${escapeHtml(strainName)}</h3>
            <button class="favorite-btn-new overlay-favorite-btn ${isFavorite ? 'active' : ''}" 
                    data-strain-name="${escapeHtml(strainName)}" 
                    onclick="toggleFavorite(this)" 
                    aria-label="Toggle Favorite">
                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </div>
        <div class="overlay-scroll-content">
            <div class="overlay-strain-description"></div>
            <a href="${vendorUrl}" target="_blank" rel="noopener noreferrer" class="overlay-buy-on-vendor-btn">
                Buy on ${escapeHtml(vendorName)}
            </a>
            <table class="overlay-pricing-table">
                <thead><tr><th>Pack Size</th><th>Total Price</th><th>Price / Seed</th></tr></thead>
                <tbody>${pricingTableHtml}</tbody>
            </table>
        </div>
    `;

    const descriptionContainer = overlay.querySelector('.overlay-strain-description');
    if (descriptionContainer) {
        renderDescriptionWithLineLimit(descriptionContainer, description, 3);
    }

    overlay.querySelector('.overlay-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        closePackDealsOverlay(overlay);
    });

    overlay.classList.add('active');
}

function closePackDealsOverlay(overlayEl) {
    overlayEl.classList.remove('active');
}

function closeAllPackDealsOverlays() {
    document.querySelectorAll('.plant-card-overlay.active').forEach(closePackDealsOverlay);
}

function renderDescriptionWithLineLimit(containerElement, fullText, maxVisibleLines = 3) {
    if (!containerElement) return;
    containerElement.innerHTML = '';
    if (typeof fullText !== 'string' || fullText.trim() === '') {
        containerElement.innerHTML = `<p>${escapeHtml("No description available.")}</p>`;
        return;
    }
    const tempP = document.createElement('p');
    tempP.style.visibility = 'hidden';
    tempP.style.position = 'absolute';
    tempP.innerHTML = 'X';
    containerElement.appendChild(tempP);
    const lineHeight = tempP.offsetHeight;
    containerElement.removeChild(tempP);
    if (lineHeight <= 0) {
        containerElement.innerHTML = `<p>${escapeHtml(fullText)}</p>`;
        return;
    }
    const maxAllowedHeight = lineHeight * maxVisibleLines;
    const textParagraph = document.createElement('p');
    textParagraph.innerHTML = escapeHtml(fullText);
    containerElement.appendChild(textParagraph);
    const actualContentHeight = textParagraph.scrollHeight;

    if (actualContentHeight > maxAllowedHeight) {
        textParagraph.style.maxHeight = maxAllowedHeight + 'px';
        textParagraph.style.overflow = 'hidden';
        const toggleLink = document.createElement('a');
        toggleLink.href = '#';
        toggleLink.textContent = 'read more...';
        toggleLink.style.cssText = 'font-weight: bold; text-decoration: underline; color: var(--brand-primary); display: block; text-align: right; margin-top: 0.25rem;';
        containerElement.appendChild(toggleLink);
        toggleLink.onclick = (e) => {
            e.preventDefault();
            const isExpanded = textParagraph.style.maxHeight === '';
            if (isExpanded) {
                textParagraph.style.maxHeight = maxAllowedHeight + 'px';
                toggleLink.textContent = 'read more...';
            } else {
                textParagraph.style.maxHeight = '';
                toggleLink.textContent = 'read less...';
            }
        };
    }
}

function initListIconHooks() {
    const grid = document.getElementById('plantCardGrid');
    if (!grid) return;

    grid.addEventListener('click', (event) => {
        const listButton = event.target.closest('.js-add-to-list-btn');
        if (listButton) {
            event.preventDefault();
            event.stopPropagation();
            const card = listButton.closest('.plant-card');
            if (card) {
                openAddToListModal(card);
            }
        }
    });
}

function initFavoriteStates() {
    document.querySelectorAll('.plant-card').forEach(card => {
        const productId = card.dataset.id;
        if (!productId) return;
        
        const isFavorite = productListMemberships[productId] && productListMemberships[productId].includes('favorites');
        
        updateCardFavoriteState(card, isFavorite);
    });
}

function updateCardFavoriteState(card, isFavorite) {
    if (!card) return;
    
    const favButtons = card.querySelectorAll('.favorite-btn-new');
    favButtons.forEach(btn => {
        btn.classList.toggle('active', isFavorite);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fas', isFavorite);
            icon.classList.toggle('far', !isFavorite);
        }
    });

    const listButton = card.querySelector('.list-icon-btn');
    if (listButton) {
        listButton.classList.toggle('is-animating', isFavorite);
    }
}

function _unfavoriteProduct(card, productId) {
    // Remove from 'favorites' list
    if (productListMemberships[productId]) {
        productListMemberships[productId] = productListMemberships[productId].filter(listId => listId !== 'favorites');
        if (productListMemberships[productId].length === 0) {
            delete productListMemberships[productId];
        }
    }
    updateCardFavoriteState(card, false);
    console.log("Unfavorited. Memberships:", JSON.stringify(productListMemberships, null, 2));
}

function _unfavoriteProductFromAllLists(card, productId) {
    // Remove from ALL lists (including 'favorites')
    if (productListMemberships[productId]) {
        delete productListMemberships[productId];
    }
    updateCardFavoriteState(card, false);
    console.log("Unfavorited from all lists. Memberships:", JSON.stringify(productListMemberships, null, 2));
}

window.toggleFavorite = function(button) {
    const card = button.closest('.plant-card');
    if (!card) return;

    const productId = card.dataset.id;
    if (!productId) return;

    const isCurrentlyFavorite = button.classList.contains('active');

    if (isCurrentlyFavorite) {
        // --- LOGIC FOR UN-FAVORITING ---
        const memberships = productListMemberships[productId] || [];
        const customListCount = memberships.filter(id => id !== 'favorites').length;

        if (customListCount > 0) {
            // It's in custom lists, so we need to ask the user what to do.
            showUnfavoriteConfirmModal(card, productId);
        } else {
            // It's only in favorites, so we can remove it directly.
            _unfavoriteProduct(card, productId);
        }
    } else {
        // --- LOGIC FOR FAVORITING ---
        if (!productListMemberships[productId]) {
            productListMemberships[productId] = [];
        }
        if (!productListMemberships[productId].includes('favorites')) {
            productListMemberships[productId].push('favorites');
        }
        updateCardFavoriteState(card, true);
        console.log("Favorited. Memberships:", JSON.stringify(productListMemberships, null, 2));
    }
};

function initMobileFilterToggle() {
    const toggleBtn = document.getElementById('toggleInlineFiltersBtn');
    const collapsibleFilters = document.getElementById('collapsibleInlineFilters');
    const toggleIcon = document.getElementById('toggleInlineFiltersIcon');
    if (!toggleBtn || !collapsibleFilters || !toggleIcon) return;

    // Initially hide the filters on mobile viewports when the page loads.
    if (window.innerWidth < 768) {
        collapsibleFilters.classList.add('hidden');
    }

    // This function checks if filters are hidden and syncs the button's icon.
    const updateButtonState = () => {
        const isHidden = collapsibleFilters.classList.contains('hidden');
        toggleBtn.setAttribute('aria-expanded', String(!isHidden));
        toggleIcon.classList.toggle('fa-chevron-up', !isHidden);
        toggleIcon.classList.toggle('fa-chevron-down', isHidden);
    };

    // When the button is clicked, toggle the visibility of the filters.
    toggleBtn.addEventListener('click', () => {
        collapsibleFilters.classList.toggle('hidden');
        updateButtonState();
    });

    // Add a listener to handle browser window resizing.
    window.addEventListener('resize', () => {
        // If the screen becomes wide enough for desktop view, always show the filters.
        if (window.innerWidth >= 768) {
            collapsibleFilters.classList.remove('hidden');
        }
        // Update the button state to handle resizing across the mobile/desktop breakpoint.
        updateButtonState(); 
    });

    // Call this once on page load to set the correct initial icon.
    updateButtonState();
}


/* ==========================================================================
   MODAL LOGIC (Add to List & Unfavorite Confirmation)
   ========================================================================== */
let activeCardForModal = null;

function initAddToListModal() {
    const modal = document.getElementById('addToListModal');
    if (!modal) return;

    const closeModalBtn = document.getElementById('closeAddToListModal');
    const createBtn = document.getElementById('modalCreateNewListBtn');
    const createInput = document.getElementById('modalNewListNameInput');

    const closeModal = () => {
        modal.classList.remove('active');
        activeCardForModal = null;
    };

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

    createBtn.addEventListener('click', () => {
        const newName = createInput.value.trim();
        if (newName && activeCardForModal) {
            const newList = { id: `list-${Date.now()}`, name: newName };
            userLists.push(newList);
            const productId = activeCardForModal.dataset.id;
            if (!productListMemberships[productId]) {
                productListMemberships[productId] = [];
            }
            productListMemberships[productId].push(newList.id);
            populateAddToListModal(activeCardForModal);
            createInput.value = '';
            console.log("New list created. Data:", { userLists, productListMemberships });
        }
    });

    createInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createBtn.click();
        }
    });
}

function openAddToListModal(cardElement) {
    const modal = document.getElementById('addToListModal');
    if (!modal || !cardElement) return;

    activeCardForModal = cardElement;
    populateAddToListModal(cardElement);

    modal.classList.add('active');
}

function populateAddToListModal(cardElement) {
    const strainNameEl = document.getElementById('modalStrainName');
    const checkboxContainer = document.getElementById('listManagerCheckboxContainer');
    
    const strainName = cardElement.dataset.name;
    const productId = cardElement.dataset.id;
    const memberships = productListMemberships[productId] || [];

    strainNameEl.textContent = escapeHtml(strainName);
    checkboxContainer.innerHTML = '';

    userLists.forEach(list => {
        const isChecked = memberships.includes(list.id);
        const li = document.createElement('li');
        li.className = 'list-manager-item';
        const checkboxId = `list-check-${productId}-${list.id}`;
        li.innerHTML = `
            <input type="checkbox" id="${checkboxId}" data-list-id="${list.id}" ${isChecked ? 'checked' : ''}>
            <label for="${checkboxId}">${escapeHtml(list.name)}</label>
        `;
        checkboxContainer.appendChild(li);
        li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            handleListMembershipChange(productId, list.id, e.target.checked);
        });
    });
}

function handleListMembershipChange(productId, listId, isChecked) {
    if (!productListMemberships[productId]) {
        productListMemberships[productId] = [];
    }
    
    const currentMemberships = productListMemberships[productId];
    
    if (isChecked && !currentMemberships.includes(listId)) {
        currentMemberships.push(listId);
    } else if (!isChecked && currentMemberships.includes(listId)) {
        productListMemberships[productId] = currentMemberships.filter(id => id !== listId);
    }

    if (listId === 'favorites' && !isChecked) {
        const card = document.querySelector(`.plant-card[data-id="${productId}"]`);
        if (card) {
            updateCardFavoriteState(card, false);
        }
    }
    console.log("Membership changed. Data:", JSON.stringify(productListMemberships, null, 2));
}

function initUnfavoriteConfirmModal() {
    const modal = document.getElementById('unfavoriteConfirmModal');
    if (!modal) return;

    const cancelBtn = document.getElementById('cancelUnfavoriteBtn');
    const confirmBtn = document.getElementById('confirmUnfavoriteBtn');

    const closeModal = () => modal.classList.add('hidden');

    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    confirmBtn.onclick = () => { // Use onclick to easily reassign it
        // This will be set by showUnfavoriteConfirmModal
    };
}

function showUnfavoriteConfirmModal(card, productId) {
    const modal = document.getElementById('unfavoriteConfirmModal');
    if (!modal) return;

    const confirmBtn = document.getElementById('confirmUnfavoriteBtn');
    
    // Set the action for the confirm button
    confirmBtn.onclick = () => {
        _unfavoriteProductFromAllLists(card, productId);
        modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
}


/* ==========================================================================
   FAVORITES PAGE SPECIFIC LOGIC
   ========================================================================== */
function initFavoritesPage() {
    const plantCardGrid = document.getElementById('plantCardGrid');
    const favoriteListSelect = document.getElementById('favoriteListSelect');
    const listOptionsBtn = document.getElementById('listOptionsBtn');
    const deleteCurrentListBtn = document.getElementById('deleteCurrentListBtn');
    const noFavoritesMessage = document.getElementById('noFavoritesMessage');
    const manageListModal = document.getElementById('manageListModal');
    let allFavoriteCards = [];

    const manageListModalTitle = document.getElementById('manageListModalTitle');
    const manageListModalActionsContainer = document.getElementById('manageListModalActionsContainer');
    const closeManageListModalBtn = document.getElementById('closeManageListModal');
    const renameListSection = document.getElementById('renameListSection');
    const manageListNewNameInput = document.getElementById('manageListNewNameInput');
    const saveRenameListBtn = document.getElementById('saveRenameList');
    const cancelRenameListBtn = document.getElementById('cancelRenameList');
    const clearListConfirmSection = document.getElementById('clearListConfirmSection');
    const clearListConfirmMessage = document.getElementById('clearListConfirmMessage');
    const confirmClearListBtn = document.getElementById('confirmClearList');
    const cancelClearListBtn = document.getElementById('cancelClearList');

    const deleteListConfirmModal = document.getElementById('deleteListConfirmModal');
    const deleteListConfirmMessage = document.getElementById('deleteListConfirmMessage');
    const cancelDeleteListBtn = document.getElementById('cancelDeleteListBtn');
    const confirmDeleteListBtn = document.getElementById('confirmDeleteListBtn');
    let listIdToDelete = null;

    // START: MODIFIED CODE BLOCK FOR ENTER KEY HANDLING

    // --- Event Handlers for Enter Key ---
    // These are defined once and reused to ensure they can be removed properly.

    // Handler for the "Manage List" modal (specifically for the "Clear" confirmation)
    function handleManageListEnterKey(event) {
        if (event.key === 'Enter') {
            // Check if the clear confirmation view is visible before acting
            if (!clearListConfirmSection.classList.contains('hidden')) {
                event.preventDefault();
                confirmClearListBtn.click();
            }
        }
    }

    // Handler for the "Delete List" confirmation modal
    function handleDeleteConfirmEnterKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmDeleteListBtn.click();
        }
    }

    // --- Specific handler for the rename input field ---
    if (manageListNewNameInput && saveRenameListBtn) {
        manageListNewNameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveRenameListBtn.click();
            }
        });
    }

    // --- Helper function to close the "Manage List" modal and clean up listeners ---
    function closeManageModal() {
        manageListModal.classList.add('hidden');
        document.removeEventListener('keydown', handleManageListEnterKey);
    }

    // END: MODIFIED CODE BLOCK FOR ENTER KEY HANDLING

    function showManageListSection(sectionToShow) {
        renameListSection.classList.add('hidden');
        clearListConfirmSection.classList.add('hidden');
        manageListModalActionsContainer.classList.add('hidden');
        const selectedOption = favoriteListSelect.options[favoriteListSelect.selectedIndex];
        if (!selectedOption) return;

        if (sectionToShow === 'rename') {
            manageListModalTitle.textContent = 'RENAME LIST';
            manageListNewNameInput.value = selectedOption.textContent;
            renameListSection.classList.remove('hidden');
            manageListNewNameInput.focus();
            manageListNewNameInput.select();
        } else if (sectionToShow === 'clearConfirm') {
            manageListModalTitle.textContent = 'CLEAR LIST';
            clearListConfirmMessage.innerHTML = `Are you sure you want to clear all seeds from "<strong>${selectedOption.textContent}</strong>"?`;
            clearListConfirmSection.classList.remove('hidden');
        } else {
            manageListModalTitle.textContent = `MANAGE "${selectedOption.textContent}"`;
            manageListModalActionsContainer.classList.remove('hidden');
        }
    }

    if (listOptionsBtn) listOptionsBtn.addEventListener('click', () => {
        const selectedOption = favoriteListSelect.options[favoriteListSelect.selectedIndex];
        if (selectedOption && !listOptionsBtn.classList.contains('disabled')) {
            showManageListSection('main');
            manageListModal.classList.remove('hidden');
            // START: MODIFIED CODE - Add listener when modal opens
            document.addEventListener('keydown', handleManageListEnterKey);
            // END: MODIFIED CODE
        }
    });

    if (manageListModalActionsContainer) manageListModalActionsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        if (action === 'showRename') showManageListSection('rename');
        if (action === 'showClearConfirm') showManageListSection('clearConfirm');
        if (action === 'duplicate') {
            const selectedIndex = favoriteListSelect.selectedIndex;
            const selectedOption = favoriteListSelect.options[selectedIndex];
            if (!selectedOption) return;

            const newName = `${selectedOption.textContent} (Copy)`;
            const newId = `list-${Date.now()}`;
            const newOption = new Option(newName, newId);

            const nextOption = favoriteListSelect.options[selectedIndex + 1];
            favoriteListSelect.add(newOption, nextOption);

            document.querySelectorAll(`.plant-card[data-list-id="${selectedOption.value}"]`).forEach(card => {
                const newCard = card.cloneNode(true);
                newCard.dataset.listId = newId;
                plantCardGrid.appendChild(newCard);
            });
            allFavoriteCards = Array.from(plantCardGrid.querySelectorAll('.plant-card'));
            favoriteListSelect.value = newId;
            loadAndDisplayFavoritesForList(newId);
            // START: MODIFIED CODE - Use helper to close modal
            closeManageModal();
            // END: MODIFIED CODE
        }
    });

    if (saveRenameListBtn) saveRenameListBtn.addEventListener('click', () => {
        const newName = manageListNewNameInput.value.trim();
        if (newName) {
            const selectedOption = favoriteListSelect.options[favoriteListSelect.selectedIndex];
            selectedOption.textContent = newName;
            // START: MODIFIED CODE - Use helper to close modal
            closeManageModal();
            // END: MODIFIED CODE
        }
    });
    if (confirmClearListBtn) confirmClearListBtn.addEventListener('click', () => {
        const selectedOption = favoriteListSelect.options[favoriteListSelect.selectedIndex];
        document.querySelectorAll(`.plant-card[data-list-id="${selectedOption.value}"]`).forEach(card => card.classList.add('hidden-by-list'));
        checkEmptyFavorites();
        // START: MODIFIED CODE - Use helper to close modal
        closeManageModal();
        // END: MODIFIED CODE
    });
    if (cancelRenameListBtn) cancelRenameListBtn.addEventListener('click', () => showManageListSection('main'));
    if (cancelClearListBtn) cancelClearListBtn.addEventListener('click', () => showManageListSection('main'));
    // START: MODIFIED CODE - Use helper to close modal
    if (closeManageListModalBtn) closeManageListModalBtn.addEventListener('click', closeManageModal);
    if (manageListModal) manageListModal.addEventListener('click', (e) => { if (e.target === manageListModal) closeManageModal(); });
    // END: MODIFIED CODE

    function updateListManagementButtons(listId) {
        if (deleteCurrentListBtn && listOptionsBtn) {
            const isCustomList = listId !== 'defaultFavorites';
            deleteCurrentListBtn.style.display = isCustomList ? 'inline-flex' : 'none';
            listOptionsBtn.style.display = 'inline-flex';
            listOptionsBtn.classList.toggle('disabled', !isCustomList);
        }
    }
    
    function checkEmptyFavorites() {
        if (!plantCardGrid || !noFavoritesMessage) return;
        const visibleCards = plantCardGrid.querySelectorAll('.plant-card:not(.hidden-by-list)').length;
        noFavoritesMessage.classList.toggle('visible', visibleCards === 0);
    }

    function loadAndDisplayFavoritesForList(listId) {
        if (!plantCardGrid) return;
        allFavoriteCards.forEach(card => {
            const shouldShow = card.dataset.listId === listId;
            card.classList.toggle('hidden-by-list', !shouldShow);
        });
        checkEmptyFavorites();
        updateListManagementButtons(listId);
    }

    const createNewListBtn = document.getElementById('createNewListBtn');
    const newListNameInput = document.getElementById('newListName');

    if (createNewListBtn) createNewListBtn.addEventListener('click', () => {
        const listName = newListNameInput.value.trim();
        const listId = `list-${Date.now()}`;
        if (listName) {
            const newOption = new Option(listName, listId);
            favoriteListSelect.add(newOption);
            favoriteListSelect.value = listId; 
            newListNameInput.value = '';
            loadAndDisplayFavoritesForList(listId);
        }
    });

    if (newListNameInput) {
        newListNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (createNewListBtn) {
                    createNewListBtn.click();
                }
            }
        });
    }

    if (favoriteListSelect) favoriteListSelect.addEventListener('change', (e) => loadAndDisplayFavoritesForList(e.target.value));

    if (deleteCurrentListBtn) {
        deleteCurrentListBtn.addEventListener('click', () => {
            const selectedOption = favoriteListSelect.options[favoriteListSelect.selectedIndex];
            if (selectedOption && selectedOption.value !== 'defaultFavorites') {
                listIdToDelete = selectedOption.value;
                deleteListConfirmMessage.innerHTML = `Are you sure you want to permanently delete the list "<strong>${selectedOption.textContent}</strong>"? This also removes all seeds from it. This action cannot be undone.`;
                deleteListConfirmModal.classList.remove('hidden');
                // START: MODIFIED CODE - Add listener when modal opens
                document.addEventListener('keydown', handleDeleteConfirmEnterKey);
                // END: MODIFIED CODE
            }
        });
    }
    
    // START: MODIFIED CODE - Use helper to close modal and clean up listener
    function closeDeleteModal() {
        if (deleteListConfirmModal) deleteListConfirmModal.classList.add('hidden');
        document.removeEventListener('keydown', handleDeleteConfirmEnterKey);
        listIdToDelete = null;
    }
    // END: MODIFIED CODE

    if (confirmDeleteListBtn) {
        confirmDeleteListBtn.addEventListener('click', () => {
            if (listIdToDelete) {
                const optionToRemove = favoriteListSelect.querySelector(`option[value="${listIdToDelete}"]`);
                if (optionToRemove) {
                    const deletedIndex = optionToRemove.index;
                    document.querySelectorAll(`.plant-card[data-list-id="${listIdToDelete}"]`).forEach(card => card.remove());
                    allFavoriteCards = Array.from(plantCardGrid.querySelectorAll('.plant-card'));
                    favoriteListSelect.remove(deletedIndex);
                    const newSelectedIndex = Math.max(0, deletedIndex - 1);
                    favoriteListSelect.selectedIndex = newSelectedIndex;
                    loadAndDisplayFavoritesForList(favoriteListSelect.value);
                    closeDeleteModal();
                }
            }
        });
    }

    if (cancelDeleteListBtn) cancelDeleteListBtn.addEventListener('click', closeDeleteModal);
    if (deleteListConfirmModal) deleteListConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteListConfirmModal) {
            closeDeleteModal();
        }
    });
    
    allFavoriteCards = Array.from(plantCardGrid.querySelectorAll('.plant-card'));
    loadAndDisplayFavoritesForList(favoriteListSelect.value);
}