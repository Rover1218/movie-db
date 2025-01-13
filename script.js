const API_KEY = 'e75af94c83d2b05d27764346f7782440'; // Add your API key here
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const movieContainer = document.getElementById('movie-container');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const genreSelect = document.getElementById('genre-select');
const sortSelect = document.getElementById('sort-select');
const paginationContainer = document.getElementById('pagination');
const modal = document.getElementById('movie-modal');
const modalDetails = document.getElementById('modal-details');
const closeModal = document.querySelector('.close');

// New state variables
let isInfiniteScroll = false;
let isLoading = false;

let currentPage = 1;
let totalPages = 1;
let currentGenre = '';
let currentSort = 'popularity.desc';
let genres = [];

// Update the fetchGenres function
async function fetchGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch genres');

        const data = await response.json();
        const genreOptions = document.querySelector('#genre-select .custom-select-options');

        // Sort genres alphabetically
        data.genres.sort((a, b) => a.name.localeCompare(b.name));

        // Keep the first "All Genres" option and add new ones
        genreOptions.innerHTML = '<div class="custom-select-option" data-value="">All Genres</div>';

        data.genres.forEach(genre => {
            const option = document.createElement('div');
            option.className = 'custom-select-option';
            option.dataset.value = genre.id;
            option.textContent = genre.name;
            genreOptions.appendChild(option);
        });

    } catch (error) {
        console.error('Error fetching genres:', error);
        const genreSelect = document.getElementById('genre-select');
        const selectedOption = genreSelect.querySelector('.selected-option');
        selectedOption.textContent = 'Error loading genres';
        genreSelect.classList.add('disabled');
    }
}

// Add loading state management
const loadingOverlay = document.getElementById('loading-overlay');

function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Add search movies function that was missing
async function searchMovies(query) {
    try {
        showLoading();
        const response = await fetch(
            `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&page=${currentPage}`
        );
        const data = await response.json();
        totalPages = data.total_pages;
        displayMovies(data.results);
        displayPagination();
    } catch (error) {
        console.error('Error searching movies:', error);
        movieContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-exclamation-circle text-4xl text-primary mb-4"></i>
                <p class="text-lg">No results found for "${query}"</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Update fetchMovies function with better error handling and logging
async function fetchMovies(page = 1, append = false) {
    if (!append) showLoading();

    try {
        // Verify API key
        if (!API_KEY) {
            throw new Error('API key is missing');
        }

        // Test API connection first
        const testUrl = `${BASE_URL}/configuration?api_key=${API_KEY}`;
        console.log('Testing API connection...'); // Debug log
        const testResponse = await fetch(testUrl);

        if (!testResponse.ok) {
            console.error('API Test Response:', await testResponse.text());
            throw new Error(`API connection failed: ${testResponse.status}`);
        }

        // Construct and log the movie fetch URL
        const filterParams = new URLSearchParams({
            api_key: API_KEY,
            page: page,
            sort_by: currentSort
        });

        if (currentGenre) {
            filterParams.append('with_genres', currentGenre);
        }

        const url = `${BASE_URL}/discover/movie?${filterParams}`;
        console.log('Fetching movies from:', url); // Debug log

        const response = await fetch(url);
        if (!response.ok) {
            console.error('Movie Fetch Response:', await response.text());
            throw new Error(`Movie fetch failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // Debug log

        if (!data.results || data.results.length === 0) {
            throw new Error('No movies found in response');
        }

        totalPages = data.total_pages;
        displayMovies(data.results, append);
        displayPagination();

    } catch (error) {
        console.error('Detailed error:', error);
        movieContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p class="text-lg mb-4">Error: ${error.message}</p>
                <p class="text-sm text-gray-500 mb-4">Please verify:</p>
                <ul class="text-sm text-gray-500 mb-4 list-disc list-inside">
                    <li>Your internet connection is working</li>
                    <li>The API key is correct</li>
                    <li>The TMDB API service is available</li>
                </ul>
                <button onclick="retryFetch()" class="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors">
                    Retry
                </button>
            </div>
        `;
    } finally {
        hideLoading();
        isLoading = false;
    }
}

// Add retry function
function retryFetch() {
    currentPage = 1;
    fetchMovies();
}

// Update displayMovies function to be more resilient
async function displayMovies(movies, append = false) {
    if (!append) {
        movieContainer.innerHTML = '';
    }

    if (!movies || movies.length === 0) {
        movieContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-lg">No movies found</p>
            </div>
        `;
        return;
    }

    // Fetch all watch providers in parallel
    const watchProvidersPromises = movies.map(movie =>
        fetch(`${BASE_URL}/movie/${movie.id}/watch/providers?api_key=${API_KEY}`)
            .then(res => res.json())
            .catch(() => ({ results: {} }))
    );

    const watchProviders = await Promise.all(watchProvidersPromises);

    movies.forEach((movie, index) => {
        const providers = watchProviders[index].results?.US || {};
        const allProviders = {
            stream: providers.flatrate || [],
            rent: providers.rent || [],
            buy: providers.buy || [],
            free: providers.free || [],
            ads: providers.ads || []
        };

        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card rounded-xl overflow-hidden shadow-lg transition-all duration-300';

        movieCard.innerHTML = `
            <div class="relative aspect-[2/3] overflow-hidden">
                <img src="${movie.poster_path ? IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'}" 
                     alt="${movie.title}"
                     class="w-full h-full object-cover"
                     loading="lazy">
                
                <div class="movie-card-overlay">
                    <div class="movie-card-content space-y-2">
                        <h3 class="text-lg font-semibold text-white line-clamp-2">${movie.title}</h3>
                        <div class="flex items-center gap-2 text-sm">
                            <span class="flex items-center bg-black/30 px-2 py-1 rounded-md">
                                <i class="fas fa-star text-yellow-400 mr-1"></i>
                                ${(movie.vote_average || 0).toFixed(1)}
                            </span>
                            <span class="bg-black/30 px-2 py-1 rounded-md">
                                ${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                            </span>
                        </div>
                        
                        <div class="watch-info">
                            <p class="text-sm font-medium text-white/90 mb-2">Available on:</p>
                            ${Object.entries(allProviders).map(([type, platforms]) =>
            platforms.length ? `
                                    <div class="streaming-section">
                                        <div class="watch-info-header">
                                            ${type.charAt(0).toUpperCase() + type.slice(1)}
                                            ${type === 'free' ? ' (Free)' : type === 'ads' ? ' (With Ads)' : ''}
                                        </div>
                                        <div class="streaming-services">
                                            ${platforms.slice(0, 4).map(platform => `
                                                <img src="${IMAGE_BASE_URL}${platform.logo_path}"
                                                     alt="${platform.provider_name}"
                                                     title="${platform.provider_name}"
                                                     class="platform-logo">
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''
        ).join('')}
                            ${!Object.values(allProviders).some(arr => arr.length) ?
                '<p class="text-sm text-white/70">No streaming information available</p>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const streamingCorner = document.createElement('div');
        streamingCorner.className = 'streaming-corner';
        const orderedProviders = [
            ...(allProviders.stream || []),
            ...(allProviders.free || []),
            ...(allProviders.ads || []),
            ...(allProviders.rent || []),
            ...(allProviders.buy || [])
        ];

        streamingCorner.innerHTML = orderedProviders.slice(0, 4).map(provider => `
            <img 
                src="${IMAGE_BASE_URL}${provider.logo_path}" 
                alt="${provider.provider_name}" 
                title="${provider.provider_name}" />
        `).join('');

        movieCard
            .querySelector('.relative.aspect-\\[2\\/3\\]')
            .appendChild(streamingCorner);

        movieCard.addEventListener('click', () => showMovieDetails(movie.id));
        movieContainer.appendChild(movieCard);
    });
}

// Updated Modal Functions
// Add modal state management
let isModalOpen = false;

function showMovieDetails(movieId) {
    if (isModalOpen) return; // Prevent multiple modals

    const modal = document.getElementById('movie-modal');
    isModalOpen = true;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        modal.classList.add('active');
        fetchAndDisplayMovieDetails(movieId);
    }, 10);
}

function closeMovieModal() {
    const modal = document.getElementById('movie-modal');
    isModalOpen = false;
    modal.classList.remove('active');
    document.body.style.overflow = '';

    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('modal-details').innerHTML = '';
    }, 300);
}

// Update modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('movie-modal');
    const closeBtn = document.querySelector('.modal-close');

    // Close on button click
    closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        closeMovieModal();
    });

    // Close on outside click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMovieModal();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeMovieModal();
        }
    });
});

// Update fetchAndDisplayMovieDetails function
async function fetchAndDisplayMovieDetails(movieId) {
    const modalDetails = document.getElementById('modal-details');
    modalDetails.innerHTML = `<div class="loading-spinner">...</div>`;

    try {
        // Fetch all movie data in parallel
        const [movieDetails, credits, videos, watchProviders] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`).then(res => res.json()),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`).then(res => res.json()),
            fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`).then(res => res.json()),
            fetch(`${BASE_URL}/movie/${movieId}/watch/providers?api_key=${API_KEY}`).then(res => res.json())
        ]);

        const trailer = videos.results.find(video => video.type === 'Trailer') || videos.results[0];
        const director = credits.crew.find(person => person.job === 'Director')?.name || 'Unknown';
        const providers = watchProviders.results?.US || {};

        modalDetails.innerHTML = `
            <div class="space-y-8">
                <!-- Movie Header -->
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="w-full md:w-1/3">
                        <img src="${movieDetails.poster_path ? IMAGE_BASE_URL + movieDetails.poster_path : 'placeholder.jpg'}"
                             class="w-full rounded-xl shadow-2xl" alt="${movieDetails.title}">
                    </div>
                    <div class="flex-1 space-y-4">
                        <h2 class="text-3xl font-bold text-white">${movieDetails.title}</h2>
                        ${movieDetails.tagline ? `<p class="text-lg text-white/60 italic">${movieDetails.tagline}</p>` : ''}
                        
                        <div class="flex flex-wrap gap-3">
                            <span class="px-3 py-1 bg-white/10 rounded-full text-sm">${movieDetails.release_date.split('-')[0]}</span>
                            <span class="px-3 py-1 bg-white/10 rounded-full text-sm">${movieDetails.runtime} mins</span>
                            <span class="px-3 py-1 bg-white/10 rounded-full text-sm">
                                <i class="fas fa-star text-yellow-500 mr-1"></i>${movieDetails.vote_average.toFixed(1)}
                            </span>
                        </div>

                        <p class="text-white/80 text-lg leading-relaxed">${movieDetails.overview}</p>
                        
                        <!-- Streaming Availability -->
                        <div class="space-y-3">
                            <h3 class="text-lg font-semibold text-white">Where to Watch</h3>
                            ${renderStreamingServices(providers)}
                        </div>
                    </div>
                </div>

                <!-- Trailer Section -->
                ${trailer ? `
                    <div class="space-y-4">
                        <h3 class="text-xl font-semibold text-white">Trailer</h3>
                        <div class="aspect-video rounded-xl overflow-hidden bg-black/50">
                            <iframe src="https://www.youtube.com/embed/${trailer.key}"
                                    class="w-full h-full" frameborder="0" allowfullscreen>
                            </iframe>
                        </div>
                    </div>
                ` : ''}

                <!-- Cast Section -->
                <div class="space-y-4">
                    <h3 class="text-xl font-semibold text-white">Top Cast</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        ${credits.cast.slice(0, 5).map(actor => `
                            <div class="text-center space-y-2">
                                <div class="aspect-[3/4] rounded-lg overflow-hidden bg-black/50">
                                    <img src="${actor.profile_path ? IMAGE_BASE_URL + actor.profile_path : 'placeholder.jpg'}"
                                         class="w-full h-full object-cover" alt="${actor.name}">
                                </div>
                                <p class="font-medium text-white">${actor.name}</p>
                                <p class="text-sm text-white/60">${actor.character}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error:', error);
        modalDetails.innerHTML = `<div class="text-center py-8">Error loading movie details</div>`;
    }
}

// Add helper function to render streaming services
function renderStreamingServices(providers) {
    if (!providers || Object.keys(providers).length === 0) {
        return '<p class="text-white/60">No streaming information available</p>';
    }

    const sections = [];

    if (providers.flatrate?.length) {
        sections.push(`
            <div class="space-y-2">
                <h4 class="text-white/80 font-medium">Stream</h4>
                <div class="flex flex-wrap gap-2">
                    ${renderProviderLogos(providers.flatrate)}
                </div>
            </div>
        `);
    }

    if (providers.rent?.length) {
        sections.push(`
            <div class="space-y-2">
                <h4 class="text-white/80 font-medium">Rent</h4>
                <div class="flex flex-wrap gap-2">
                    ${renderProviderLogos(providers.rent)}
                </div>
            </div>
        `);
    }

    if (providers.buy?.length) {
        sections.push(`
            <div class="space-y-2">
                <h4 class="text-white/80 font-medium">Buy</h4>
                <div class="flex flex-wrap gap-2">
                    ${renderProviderLogos(providers.buy)}
                </div>
            </div>
        `);
    }

    return sections.length ? `<div class="space-y-4">${sections.join('')}</div>`
        : '<p class="text-white/60">No streaming information available</p>';
}

function renderProviderLogos(providers) {
    return providers.map(provider => `
        <div class="w-10 h-10 rounded-lg overflow-hidden bg-white/5 tooltip" title="${provider.provider_name}">
            <img src="${IMAGE_BASE_URL}${provider.logo_path}" 
                 class="w-full h-full object-cover"
                 alt="${provider.provider_name}">
        </div>
    `).join('');
}

// Add debounce function
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Simplified search functionality
const handleSearchInput = debounce(async (event) => {
    const query = event.target.value.trim();
    setLoadingState(true);

    try {
        if (query.length === 0) {
            currentPage = 1;
            await fetchMovies(1);
            return;
        }

        if (query.length >= 2) {
            const response = await fetch(
                `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&page=1`
            );
            const data = await response.json();

            if (data.results.length > 0) {
                totalPages = data.total_pages;
                await displayMovies(data.results);
                displayPagination();
            } else {
                movieContainer.innerHTML = `
                    <div class="col-span-full text-center py-10">
                        <p class="text-lg">No results found for "${query}"</p>
                    </div>
                `;
                paginationContainer.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('Error searching movies:', error);
    } finally {
        setLoadingState(false);
    }
}, 500);

// Remove suggestion-related event listeners and keep only the search input listener
searchInput.addEventListener('input', handleSearchInput);

// Remove handleSuggestionClick function as it's no longer needed

// Update the remaining event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent form submission as we're handling search dynamically
});

// Update pagination functions
function displayPagination() {
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const paginationHTML = `
        <div class="inline-flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
            ${generatePaginationButtons()}
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

function generatePaginationButtons() {
    const maxVisibleButtons = 5;
    let buttons = [];

    // Always show first page button
    if (currentPage > 1) {
        buttons.push(`
            <button onclick="changePage(1)" 
                    class="w-10 h-10 flex items-center justify-center rounded-lg
                           text-white/70 hover:text-primary hover:bg-white/5 transition-colors">
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button onclick="changePage(${currentPage - 1})" 
                    class="w-10 h-10 flex items-center justify-center rounded-lg
                           text-white/70 hover:text-primary hover:bg-white/5 transition-colors">
                <i class="fas fa-angle-left"></i>
            </button>
        `);
    }

    // Calculate visible page range
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    // Adjust start if we're near the end
    if (endPage - startPage + 1 < maxVisibleButtons) {
        startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        buttons.push(`
            <button onclick="changePage(${i})" 
                    class="w-10 h-10 flex items-center justify-center rounded-lg
                           ${i === currentPage
                ? 'bg-primary text-white'
                : 'text-white/70 hover:text-primary hover:bg-white/5'} 
                           transition-colors">
                ${i}
            </button>
        `);
    }

    // Always show last page button
    if (currentPage < totalPages) {
        buttons.push(`
            <button onclick="changePage(${currentPage + 1})" 
                    class="w-10 h-10 flex items-center justify-center rounded-lg
                           text-white/70 hover:text-primary hover:bg-white/5 transition-colors">
                <i class="fas fa-angle-right"></i>
            </button>
            <button onclick="changePage(${totalPages})" 
                    class="w-10 h-10 flex items-center justify-center rounded-lg
                           text-white/70 hover:text-primary hover:bg-white/5 transition-colors">
                <i class="fas fa-angle-double-right"></i>
            </button>
        `);
    }

    return buttons.join('');
}

async function changePage(page) {
    if (page === currentPage) return;

    setLoadingState(true);
    currentPage = page;

    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const searchQuery = searchInput.value.trim();

        if (searchQuery.length >= 2) {
            await searchMovies(searchQuery);
        } else {
            await fetchMovies(page);
        }
    } catch (error) {
        console.error('Error changing page:', error);
    } finally {
        setLoadingState(false);
    }
}

// Update event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent form submission as we're handling search dynamically
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        searchMovies(searchTerm);
    }
});

// Update genre select event listener
document.getElementById('genre-select').addEventListener('change', async (e) => {
    currentGenre = e.target.value;
    currentPage = 1;
    await fetchMovies(1);
});

sortSelect.addEventListener('change', async (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    setLoadingState(true);

    try {
        await fetchMovies(1);
        movieContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
        setLoadingState(false);
    }
});

closeModal.addEventListener('click', closeMovieModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeMovieModal();
    }
});

searchInput.addEventListener('input', handleSearchInput);
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
});

// Add animation when changing selections
function animateSelection(element) {
    element.classList.add('scale-105');
    setTimeout(() => element.classList.remove('scale-105'), 150);
}

// Add visual feedback for selections
[genreSelect, sortSelect].forEach(select => {
    select.addEventListener('change', () => animateSelection(select));

    // Add focus styles
    select.addEventListener('focus', () => {
        select.parentElement.classList.add('ring-2', 'ring-primary/50');
    });

    select.addEventListener('blur', () => {
        select.parentElement.classList.remove('ring-2', 'ring-primary/50');
    });
});

// Add reset filters function
function resetFilters() {
    currentGenre = '';
    currentSort = 'popularity.desc';
    currentPage = 1;

    // Reset select elements
    genreSelect.value = '';
    sortSelect.value = 'popularity.desc';

    // Fetch movies with reset filters
    fetchMovies(1);
}

// Update initialization to prevent auto-opening modal
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();

        // Ensure modal is closed on page load
        const modal = document.getElementById('movie-modal');
        modal.style.display = 'none';
        modal.classList.remove('active');
        isModalOpen = false;

        // Initialize genres and fetch movies
        await fetchGenres();
        await fetchMovies();

        // Setup enhanced dropdown functionality
        setupDropdowns();
    } catch (error) {
        console.error('Initialization error:', error);
        movieContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p class="text-lg mb-4">Failed to initialize: ${error.message}</p>
                <p class="text-sm text-gray-500">Please check your API key and internet connection</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
});

// Update setupDropdowns function
function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.select-wrapper');

    dropdowns.forEach(dropdown => {
        const select = dropdown.querySelector('select');
        const icon = dropdown.querySelector('.select-icon');

        // Add focus and change handlers
        select.addEventListener('focus', () => {
            dropdown.classList.add('focused');
            icon.style.transform = 'translateY(-50%) rotate(180deg)';
        });

        select.addEventListener('blur', () => {
            dropdown.classList.remove('focused');
            icon.style.transform = 'translateY(-50%) rotate(0deg)';
        });

        select.addEventListener('change', () => {
            // Animate icon
            icon.style.transform = 'translateY(-50%) rotate(180deg)';
            setTimeout(() => {
                icon.style.transform = 'translateY(-50%) rotate(0deg)';
            }, 200);

            // Add visual feedback
            dropdown.classList.add('selected');
            select.blur(); // Remove focus to prevent default browser outline
        });
    });
}

// Add dropdown enhancement
function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.select-wrapper');

    dropdowns.forEach(dropdown => {
        const select = dropdown.querySelector('select');
        const icon = dropdown.querySelector('.select-icon');

        select.addEventListener('change', () => {
            icon.style.transform = 'translateY(-50%) rotate(180deg)';
            setTimeout(() => {
                icon.style.transform = 'translateY(-50%) rotate(0deg)';
            }, 200);
        });

        // Add focus effects
        select.addEventListener('focus', () => {
            dropdown.classList.add('focused');
        });

        select.addEventListener('blur', () => {
            dropdown.classList.remove('focused');
        });
    });
}

// Add loading state functions
function setLoadingState(loading = true) {
    const container = document.getElementById('movie-container');
    const pagination = document.getElementById('pagination');

    if (loading) {
        container.classList.add('opacity-50', 'pointer-events-none');
        pagination.classList.add('opacity-50', 'pointer-events-none');

        // Add loading overlay to container
        container.innerHTML = `
            <div class="col-span-full flex items-center justify-center min-h-[400px]">
                <div class="loading-spinner">
                    <div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p class="mt-4 text-white/80">Fetching movies...</p>
                </div>
            </div>
        `;
    } else {
        container.classList.remove('opacity-50', 'pointer-events-none');
        pagination.classList.remove('opacity-50', 'pointer-events-none');
    }
}

// Custom Select Implementation
function initializeCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        const options = select.querySelector('.custom-select-options');
        const selectedOption = select.querySelector('.selected-option');

        // Toggle options visibility
        select.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = select.classList.contains('active');

            // Close all other select dropdowns
            document.querySelectorAll('.custom-select.active').forEach(activeSelect => {
                if (activeSelect !== select) {
                    activeSelect.classList.remove('active');
                }
            });

            select.classList.toggle('active');
        });

        // Handle option selection
        options.querySelectorAll('.custom-select-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedOption.textContent = option.textContent;
                select.classList.remove('active');

                // Trigger change event
                const changeEvent = new CustomEvent('change', {
                    detail: { value: option.dataset.value }
                });
                select.dispatchEvent(changeEvent);
            });
        });
    });

    // Close all selects when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select.active').forEach(select => {
            select.classList.remove('active');
        });
    });
}

// Update your existing event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeCustomSelects();

    // Add change event listeners for the custom selects
    document.getElementById('genre-select').addEventListener('change', (e) => {
        currentGenre = e.detail.value;
        currentPage = 1;
        fetchMovies();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.detail.value;
        currentPage = 1;
        fetchMovies();
    });

    // ...rest of your existing DOMContentLoaded code...
});

// Update your populateGenres function to work with custom select
function populateGenres(genres) {
    const genreOptions = document.querySelector('#genre-select .custom-select-options');
    genres.forEach(genre => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = genre.id;
        option.textContent = genre.name;
        genreOptions.appendChild(option);
    });
}

// Initialize custom selects
function initializeCustomSelects() {
    const genreSelect = document.querySelector('#genre-select');
    const sortSelect = document.querySelector('#sort-select');

    if (genreSelect) {
        initializeSelect(genreSelect, async (value, text) => {
            currentGenre = value;
            currentPage = 1;
            await fetchAndDisplayMovies();
        });
    }

    if (sortSelect) {
        initializeSelect(sortSelect, async (value, text) => {
            currentSort = value;
            currentPage = 1;
            await fetchAndDisplayMovies();
        });
    }
}

function initializeSelect(selectElement, onChangeCallback) {
    const options = selectElement.querySelector('.custom-select-options');
    const selectedOption = selectElement.querySelector('.selected-option');

    // Toggle options
    selectElement.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = selectElement.classList.contains('active');

        // Close all other selects
        document.querySelectorAll('.custom-select.active').forEach(select => {
            if (select !== selectElement) {
                select.classList.remove('active');
            }
        });

        selectElement.classList.toggle('active');
    });

    // Handle option selection
    options.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        const text = option.textContent;

        selectedOption.textContent = text;
        selectElement.classList.remove('active');

        onChangeCallback(value, text);
    });
}

// Fetch genres and populate select
async function fetchAndPopulateGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();

        const genreOptions = document.querySelector('#genre-select .custom-select-options');
        genreOptions.innerHTML = '<div class="custom-select-option" data-value="">All Genres</div>';

        data.genres.sort((a, b) => a.name.localeCompare(b.name)).forEach(genre => {
            genreOptions.innerHTML += `
                <div class="custom-select-option" data-value="${genre.id}">
                    ${genre.name}
                </div>
            `;
        });
    } catch (error) {
        console.error('Error fetching genres:', error);
    }
}

// Fetch and display movies
async function fetchAndDisplayMovies() {
    if (isLoading) return;
    showLoading();

    try {
        const params = new URLSearchParams({
            api_key: API_KEY,
            language: 'en-US',
            page: currentPage,
            sort_by: currentSort
        });

        if (currentGenre) {
            params.append('with_genres', currentGenre);
        }

        const endpoint = searchInput.value.trim()
            ? `/search/movie?query=${searchInput.value}&${params}`
            : `/discover/movie?${params}`;

        const response = await fetch(`${BASE_URL}${endpoint}`);
        const data = await response.json();

        totalPages = data.total_pages;
        await displayMovies(data.results);
        displayPagination();

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to fetch movies');
    } finally {
        hideLoading();
    }
}

// Update event listeners
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAndPopulateGenres();
    initializeCustomSelects();

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select.active').forEach(select => {
            select.classList.remove('active');
        });
    });

    // Initialize search
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentPage = 1;
        fetchAndDisplayMovies();
    });

    searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        fetchAndDisplayMovies();
    }, 500));

    // Initial load
    await fetchAndDisplayMovies();
});

// Update the custom select initialization
function initializeCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        const selectedOption = select.querySelector('.selected-option');
        const options = select.querySelector('.custom-select-options');
        const chevron = select.querySelector('.fa-chevron-down');

        // Toggle dropdown
        selectedOption.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasActive = select.classList.contains('active');

            // Close all other dropdowns
            document.querySelectorAll('.custom-select.active').forEach(activeSelect => {
                activeSelect.classList.remove('active');
                activeSelect.querySelector('.fa-chevron-down').style.transform = 'translateY(-50%) rotate(0deg)';
            });

            // Toggle current dropdown
            select.classList.toggle('active');
            if (chevron) {
                chevron.style.transform = wasActive
                    ? 'translateY(-50%) rotate(0deg)'
                    : 'translateY(-50%) rotate(180deg)';
            }
        });

        // Handle option selection
        options.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-select-option');
            if (!option) return;

            selectedOption.textContent = option.textContent;
            select.classList.remove('active');
            if (chevron) {
                chevron.style.transform = 'translateY(-50%) rotate(0deg)';
            }

            // Handle selection change
            const value = option.dataset.value;
            if (select.id === 'genre-select') {
                currentGenre = value;
            } else if (select.id === 'sort-select') {
                currentSort = value;
            }
            currentPage = 1;
            fetchMovies();
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select.active').forEach(select => {
                select.classList.remove('active');
                const chevron = select.querySelector('.fa-chevron-down');
                if (chevron) {
                    chevron.style.transform = 'translateY(-50%) rotate(0deg)';
                }
            });
        }
    });
}

// Update the fetchGenres function
async function fetchGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();
        const genreOptions = document.querySelector('#genre-select .custom-select-options');

        // Clear existing options
        genreOptions.innerHTML = '<div class="custom-select-option" data-value="">All Genres</div>';

        // Add genre options
        data.genres
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(genre => {
                genreOptions.innerHTML += `
                    <div class="custom-select-option" data-value="${genre.id}">
                        ${genre.name}
                    </div>
                `;
            });
    } catch (error) {
        console.error('Error fetching genres:', error);
    }
}

// Update DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
    await fetchGenres();
    initializeCustomSelects();
    await fetchMovies();
});
