// DÄCKAD - Dribbble-Inspired Revolutionary JavaScript

// Configuration
const CONFIG = {
    API_URL: "https://api.jsonbin.io/v3/b/66fd147ead19ca34f8b16ee2",
    API_KEY: "$2a$10$y4mPQYiiUu74u2sIyOEiWO85nKLstQ8LQ0ZhqDNGMzTofL.vJfCm6",
    STATIONS_PER_PAGE: 10,
    STORAGE_KEYS: {
        STATIONS: 'daeckad_stations',
        USER_LOCATION: 'daeckad_user_location',
        SELECTED_STATION: 'daeckad_selected_station',
        BOOKING_INFO: 'daeckad_booking_info'
    }
};

// Global State
const state = {
    stations: [],
    currentStationIndex: 0,
    sortOrder: 'distance',
    isLoading: false
};

// Utility Functions
const utils = {
    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Calculate distance between two coordinates
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('sv-SE', options);
    },

    // Show loading state with Dribbble-style animation
    showLoading(element) {
        if (element) {
            element.classList.add('loading');
            const spinner = element.querySelector('.spinner');
            if (!spinner) {
                element.insertAdjacentHTML('afterbegin', '<div class="spinner"></div>');
            }
        }
    },

    // Hide loading state
    hideLoading(element) {
        if (element) {
            element.classList.remove('loading');
            const spinner = element.querySelector('.spinner');
            if (spinner) spinner.remove();
        }
    },

    // Storage helpers
    storage: {
        set(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn('Storage not available:', e);
            }
        },
        
        get(key) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.warn('Storage not available:', e);
                return null;
            }
        },
        
        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (e) {
                console.warn('Storage not available:', e);
            }
        }
    }
};

// API Service
const apiService = {
    async fetchStations() {
        try {
            const response = await fetch(CONFIG.API_URL, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': CONFIG.API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.record.stations;
        } catch (error) {
            console.error('Error fetching stations:', error);
            throw error;
        }
    }
};

// Location Service
const locationService = {
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }),
                error => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    },

    async getAddressFromCoordinates(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();
            
            const city = data.address?.city || data.address?.town || data.address?.village || '';
            const street = data.address?.road || '';
            
            return `${city}${street ? ', ' + street : ''}`;
        } catch (error) {
            console.error('Error getting address:', error);
            return null;
        }
    }
};

// Station Service
const stationService = {
    async initializeStations() {
        // Check if stations are cached
        const cachedStations = utils.storage.get(CONFIG.STORAGE_KEYS.STATIONS);
        
        if (cachedStations && Array.isArray(cachedStations)) {
            state.stations = cachedStations;
            return cachedStations;
        }

        // Fetch from API
        try {
            const stations = await apiService.fetchStations();
            state.stations = stations;
            utils.storage.set(CONFIG.STORAGE_KEYS.STATIONS, stations);
            return stations;
        } catch (error) {
            console.error('Failed to initialize stations:', error);
            return [];
        }
    },

    getStationsWithDistance(userLocation) {
        if (!userLocation) return state.stations;

        return state.stations.map(station => ({
            ...station,
            distance: utils.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                station.latitude,
                station.longitude
            )
        }));
    },

    sortStations(stations, sortBy = 'distance') {
        const sorted = [...stations];
        
        if (sortBy === 'distance') {
            return sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        } else if (sortBy === 'price') {
            return sorted.sort((a, b) => a.price - b.price);
        }
        
        return sorted;
    }
};

// UI Components
const ui = {
    // Navigation
    initNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navDropdown = document.getElementById('nav-dropdown');
        
        if (navToggle && navDropdown) {
            navToggle.addEventListener('click', () => {
                navDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target) && !navDropdown.contains(e.target)) {
                    navDropdown.classList.remove('active');
                }
            });
        }

        // Logo click handler
        const logo = document.getElementById('logo');
        if (logo) {
            logo.addEventListener('click', () => {
                window.location.href = '/index.html';
            });
        }
    },

    // Dribbble-style animations
    initDribbbleAnimations() {
        // Stagger word animations
        const words = document.querySelectorAll('.word');
        words.forEach((word, index) => {
            word.style.animationDelay = `${0.2 + (index * 0.2)}s`;
        });

        // Floating elements interaction
        const floatingElements = document.querySelectorAll('.float-tire, .geometric-shape');
        floatingElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.animationPlayState = 'paused';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.animationPlayState = 'running';
            });
        });

        // Parallax effect for floating elements
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = scrolled * 0.5;
            
            floatingElements.forEach((element, index) => {
                const speed = 0.2 + (index * 0.1);
                element.style.transform = `translateY(${parallax * speed}px)`;
            });
        });
    },

    // Station Cards
    createStationCard(station, userLocation) {
        const distance = userLocation ? 
            utils.calculateDistance(
                userLocation.latitude, 
                userLocation.longitude, 
                station.latitude, 
                station.longitude
            ).toFixed(1) : '-';

        return `
            <div class="station-card" data-station-id="${station.id}">
                <img src="${station.image}" alt="${station.name}" class="station-image" loading="lazy">
                
                <div class="station-info">
                    <h3>${station.name}</h3>
                    <p class="station-address">${station.address.replace(', SE', '')}</p>
                    <div class="station-meta">
                        <span>
                            <i class="icon-location" aria-hidden="true"></i>
                            ${distance} km
                        </span>
                        <span>
                            <i class="icon-dollar" aria-hidden="true"></i>
                            ${station.price}:-
                        </span>
                    </div>
                </div>
                
                <div class="station-actions">
                    <button class="btn btn-primary" data-station-id="${station.id}">
                        Välj
                    </button>
                </div>
            </div>
        `;
    },

    // Modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Form validation
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    }
};

// Page Controllers
const pageControllers = {
    // Home Page - Dribbble Edition
    initHomePage() {
        const locationBlast = document.getElementById('location-blast');
        const locationInput = document.getElementById('location-input');
        const goButton = document.getElementById('go-button');

        // Initialize Dribbble animations
        ui.initDribbbleAnimations();

        // Revolutionary location blast button
        if (locationBlast) {
            locationBlast.addEventListener('click', async () => {
                utils.showLoading(locationBlast);
                
                try {
                    const location = await locationService.getCurrentPosition();
                    utils.storage.set(CONFIG.STORAGE_KEYS.USER_LOCATION, location);
                    
                    // Dribbble-style success feedback
                    locationBlast.style.transform = 'scale(1.05)';
                    const btnBg = locationBlast.querySelector('.btn-bg');
                    if (btnBg) {
                        btnBg.style.left = '0';
                    }
                    
                    setTimeout(() => {
                        locationBlast.style.transform = '';
                    }, 200);
                    
                    // Update input with address
                    const address = await locationService.getAddressFromCoordinates(
                        location.latitude, 
                        location.longitude
                    );
                    
                    if (locationInput && address) {
                        locationInput.placeholder = address;
                        locationInput.value = address;
                    }
                    
                    // Smooth redirect
                    setTimeout(() => {
                        window.location.href = '/Resultatsida.html';
                    }, 800);
                } catch (error) {
                    console.error('Location error:', error);
                    // Dribbble-style error feedback
                    locationBlast.style.borderColor = '#ef4444';
                    const btnMain = locationBlast.querySelector('.btn-main');
                    if (btnMain) {
                        btnMain.textContent = 'PLATS EJ TILLGÄNGLIG';
                    }
                    
                    setTimeout(() => {
                        locationBlast.style.borderColor = '';
                        if (btnMain) {
                            btnMain.textContent = 'HITTA VERKSTÄDER';
                        }
                    }, 3000);
                } finally {
                    utils.hideLoading(locationBlast);
                }
            });
        }

        // Manual search with Dribbble feedback
        if (goButton && locationInput) {
            const handleSearch = () => {
                const searchValue = locationInput.value.trim();
                if (searchValue) {
                    // Dribbble-style button feedback
                    goButton.style.transform = 'scale(1.1)';
                    
                    setTimeout(() => {
                        goButton.style.transform = '';
                        window.location.href = '/Resultatsida.html';
                    }, 300);
                }
            };

            goButton.addEventListener('click', handleSearch);
            
            locationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });

            // Dribbble-style input feedback
            locationInput.addEventListener('focus', () => {
                const container = locationInput.closest('.search-container');
                if (container) {
                    container.style.transform = 'scale(1.02)';
                }
            });

            locationInput.addEventListener('blur', () => {
                const container = locationInput.closest('.search-container');
                if (container) {
                    container.style.transform = '';
                }
            });
        }

        // Add interactive floating elements
        const floatTires = document.querySelectorAll('.float-tire');
        floatTires.forEach((tire, index) => {
            tire.addEventListener('click', () => {
                tire.style.animationDuration = '0.5s';
                setTimeout(() => {
                    tire.style.animationDuration = '';
                }, 2000);
            });
        });
    },

    // Results Page
    async initResultsPage() {
        await stationService.initializeStations();
        
        const userLocation = utils.storage.get(CONFIG.STORAGE_KEYS.USER_LOCATION);
        
        if (!userLocation) {
            // Redirect back to home if no location
            window.location.href = '/index.html';
            return;
        }

        this.displayStations();
        this.initSorting();
        this.initModal();
    },

    displayStations() {
        const stationList = document.getElementById('station-list');
        const loadMoreBtn = document.getElementById('load-more-btn');
        const resultsCount = document.getElementById('results-count');
        
        if (!stationList) return;

        const userLocation = utils.storage.get(CONFIG.STORAGE_KEYS.USER_LOCATION);
        const stationsWithDistance = stationService.getStationsWithDistance(userLocation);
        const sortedStations = stationService.sortStations(stationsWithDistance, state.sortOrder);
        
        // Update results count
        if (resultsCount) {
            resultsCount.textContent = sortedStations.length;
        }

        // Get stations to display
        const stationsToShow = sortedStations.slice(0, state.currentStationIndex + CONFIG.STATIONS_PER_PAGE);
        
        // Clear and populate station list
        stationList.innerHTML = stationsToShow
            .map(station => ui.createStationCard(station, userLocation))
            .join('');

        // Update current index
        state.currentStationIndex = stationsToShow.length;

        // Show/hide load more button
        if (loadMoreBtn) {
            loadMoreBtn.style.display = state.currentStationIndex >= sortedStations.length ? 'none' : 'block';
            
            // Add event listener for load more
            loadMoreBtn.onclick = () => this.displayStations();
        }

        // Add click handlers for station cards
        stationList.addEventListener('click', (e) => {
            const button = e.target.closest('[data-station-id]');
            if (button) {
                const stationId = button.dataset.stationId;
                const station = sortedStations.find(s => s.id === stationId);
                if (station) {
                    this.showStationModal(station, userLocation);
                }
            }
        });
    },

    initSorting() {
        const sortBtn = document.getElementById('sort-btn');
        const sortText = document.getElementById('sort-text');
        
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                // Toggle sort order
                state.sortOrder = state.sortOrder === 'distance' ? 'price' : 'distance';
                state.currentStationIndex = 0; // Reset pagination
                
                // Update button text
                if (sortText) {
                    sortText.textContent = state.sortOrder === 'distance' ? 
                        'Sortera efter pris' : 'Sortera efter avstånd';
                }
                
                // Re-display stations
                this.displayStations();
            });
        }
    },

    showStationModal(station, userLocation) {
        const modal = document.getElementById('booking-modal');
        if (!modal) return;

        // Populate modal with station data
        const elements = {
            name: document.getElementById('modal-station-name'),
            image: document.getElementById('modal-station-image'),
            address: document.getElementById('modal-station-address'),
            distance: document.getElementById('modal-station-distance'),
            price: document.getElementById('modal-station-price'),
            description: document.getElementById('modal-station-description')
        };

        if (elements.name) elements.name.textContent = station.name;
        if (elements.image) {
            elements.image.src = station.image;
            elements.image.alt = station.name;
        }
        if (elements.address) elements.address.textContent = station.address;
        if (elements.distance && userLocation) {
            const distance = utils.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                station.latitude,
                station.longitude
            ).toFixed(1);
            elements.distance.textContent = `${distance} km`;
        }
        if (elements.price) elements.price.textContent = `${station.price}:-`;
        if (elements.description) elements.description.textContent = station.description;

        // Store selected station
        utils.storage.set(CONFIG.STORAGE_KEYS.SELECTED_STATION, station);

        // Show modal
        ui.showModal('booking-modal');
    },

    initModal() {
        const modal = document.getElementById('booking-modal');
        const closeBtn = document.getElementById('modal-close');
        const backBtn = document.getElementById('modal-back');
        const form = document.getElementById('booking-form');
        const confirmBtn = document.getElementById('modal-confirm');

        // Close modal handlers
        [closeBtn, backBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    ui.hideModal('booking-modal');
                });
            }
        });

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    ui.hideModal('booking-modal');
                }
            });
        }

        // Form validation
        if (form) {
            const dateInput = document.getElementById('booking-date');
            const timeInputs = document.querySelectorAll('input[name="time"]');
            const validationMessage = document.getElementById('form-validation-message');

            const validateBookingForm = () => {
                const hasDate = dateInput && dateInput.value;
                const hasTime = Array.from(timeInputs).some(input => input.checked);
                const isValid = hasDate && hasTime;

                if (confirmBtn) {
                    confirmBtn.disabled = !isValid;
                }

                if (validationMessage) {
                    validationMessage.style.display = isValid ? 'none' : 'block';
                }
            };

            // Add event listeners
            if (dateInput) {
                dateInput.addEventListener('change', validateBookingForm);
            }

            timeInputs.forEach(input => {
                input.addEventListener('change', validateBookingForm);
            });

            // Form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const bookingData = {
                    date: formData.get('date') || dateInput.value,
                    time: formData.get('time'),
                    station: utils.storage.get(CONFIG.STORAGE_KEYS.SELECTED_STATION)
                };

                utils.storage.set(CONFIG.STORAGE_KEYS.BOOKING_INFO, bookingData);
                window.location.href = '/betalnings.html';
            });
        }
    },

    // Payment Page
    initPaymentPage() {
        const form = document.getElementById('payment-form');
        const confirmBtn = document.getElementById('confirm-booking-btn');
        const backBtn = document.getElementById('back-btn');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                history.back();
            });
        }

        if (form) {
            // Form validation
            const validatePaymentForm = utils.debounce(() => {
                const isValid = ui.validateForm('payment-form');
                if (confirmBtn) {
                    confirmBtn.disabled = !isValid;
                }
            }, 300);

            // Add event listeners to all form inputs
            form.addEventListener('input', validatePaymentForm);
            form.addEventListener('change', validatePaymentForm);

            // Form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                if (ui.validateForm('payment-form')) {
                    // Store customer data
                    const formData = new FormData(form);
                    const customerData = {
                        name: formData.get('customer-name') || document.getElementById('customer-name').value,
                        email: formData.get('customer-email') || document.getElementById('customer-email').value,
                        phone: formData.get('customer-phone') || document.getElementById('customer-phone').value,
                        payment: formData.get('payment') || 'on-site'
                    };

                    // Merge with existing booking data
                    const bookingData = utils.storage.get(CONFIG.STORAGE_KEYS.BOOKING_INFO) || {};
                    const completeBooking = { ...bookingData, customer: customerData };
                    
                    utils.storage.set(CONFIG.STORAGE_KEYS.BOOKING_INFO, completeBooking);
                    window.location.href = '/confirm.html';
                }
            });
        }
    },

    // Confirmation Page
    initConfirmPage() {
        const bookingData = utils.storage.get(CONFIG.STORAGE_KEYS.BOOKING_INFO);
        
        if (!bookingData || !bookingData.station) {
            window.location.href = '/index.html';
            return;
        }

        // Populate confirmation details
        const elements = {
            workshopName: document.getElementById('confirm-workshop-name'),
            workshopAddress: document.getElementById('confirm-workshop-address'),
            date: document.getElementById('confirm-date'),
            time: document.getElementById('confirm-time')
        };

        if (elements.workshopName) {
            elements.workshopName.textContent = bookingData.station.name;
        }
        if (elements.workshopAddress) {
            elements.workshopAddress.textContent = bookingData.station.address;
        }
        if (elements.date && bookingData.date) {
            elements.date.textContent = utils.formatDate(bookingData.date);
        }
        if (elements.time) {
            elements.time.textContent = `Klockan ${bookingData.time}`;
        }
    },

    // Login Page
    initLoginPage() {
        const form = document.getElementById('login-form');
        const loginBtn = document.getElementById('login-btn');
        const backBtn = document.getElementById('back-btn');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/index.html';
            });
        }

        if (form) {
            // Form validation
            const validateLoginForm = utils.debounce(() => {
                const isValid = ui.validateForm('login-form');
                if (loginBtn) {
                    loginBtn.disabled = !isValid;
                }
            }, 300);

            form.addEventListener('input', validateLoginForm);
            
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                if (ui.validateForm('login-form')) {
                    // Simulate login process
                    utils.showLoading(loginBtn);
                    
                    setTimeout(() => {
                        utils.hideLoading(loginBtn);
                        alert('Inloggning kommer snart!');
                    }, 1000);
                }
            });
        }
    }
};

// Main Application - Dribbble Edition
class DaeckadApp {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }

    async init() {
        // Initialize common UI components
        ui.initNavigation();

        // Initialize page-specific functionality
        try {
            switch (this.currentPage) {
                case 'index':
                    pageControllers.initHomePage();
                    break;
                case 'Resultatsida':
                    await pageControllers.initResultsPage();
                    break;
                case 'betalnings':
                    pageControllers.initPaymentPage();
                    break;
                case 'confirm':
                    pageControllers.initConfirmPage();
                    break;
                case 'login':
                    pageControllers.initLoginPage();
                    break;
            }
        } catch (error) {
            console.error('Error initializing page:', error);
        }

        // Initialize Dribbble features
        this.initDribbbleFeatures();
    }

    initDribbbleFeatures() {
        // Smooth scroll behavior
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                
                // Check if href is just '#' or invalid
                if (href === '#' || href.length <= 1) {
                    return;
                }
                
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

        // Keyboard navigation improvements
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close any open modals
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });

        // Performance monitoring
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const loadTime = performance.now();
                console.log(`🚀 DÄCKAD Dribbble Edition loaded in ${loadTime.toFixed(2)}ms`);
            });
        }

        // Add Dribbble-style easter eggs
        let clickCount = 0;
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('float-tire')) {
                clickCount++;
                if (clickCount === 5) {
                    console.log('🎨 DRIBBBLE MASTER DISCOVERED! 🎨');
                    clickCount = 0;
                }
            }
        });
    }
}

// Initialize Dribbble app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DaeckadApp());
} else {
    new DaeckadApp();
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DaeckadApp, utils, stationService, locationService };
}