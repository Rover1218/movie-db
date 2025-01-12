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
let currentLanguage = 'en-US';
let isInfiniteScroll = false;
let isLoading = false;

let currentPage = 1;
let totalPages = 1;
let currentGenre = '';
let currentSort = 'popularity.desc';
let genres = [];

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', toggleTheme);

// Language Selection
const languageSelect = document.getElementById('language-select');
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    fetchMovies(1);
});

// Fetch genres and populate select
async function fetchGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();
        genres = data.genres;
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            genreSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching genres:', error);
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
            `${BASE_URL}/search/movie?api_key=${API_KEY}&language=${currentLanguage}&query=${query}&page=${currentPage}`
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
        const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=${currentLanguage}&page=${page}&sort_by=${currentSort}${currentGenre ? `&with_genres=${currentGenre}` : ''}`;
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
function displayMovies(movies, append = false) {
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

    movies.forEach((movie, index) => {
        if (!movie) return; // Skip invalid movies

        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card bg-light-card dark:bg-dark-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer';

        const posterPath = movie.poster_path
            ? `${IMAGE_BASE_URL}${movie.poster_path}`
            : 'https://via.placeholder.com/500x750?text=No+Image';

        const releaseYear = movie.release_date
            ? new Date(movie.release_date).getFullYear()
            : 'N/A';

        movieCard.innerHTML = `
            <div class="relative aspect-[2/3] overflow-hidden group">
                <img src="${posterPath}" 
                     alt="${movie.title || 'Movie poster'}"
                     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/500x750?text=Error'">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                    <h3 class="text-white text-lg font-semibold">${movie.title || 'Unknown Title'}</h3>
                    <div class="flex items-center gap-2 text-white/90 mt-2">
                        <span class="flex items-center">
                            <i class="fas fa-star text-yellow-400 mr-1"></i>
                            ${(movie.vote_average || 0).toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>${releaseYear}</span>
                    </div>
                </div>
            </div>
        `;

        movieCard.addEventListener('click', () => showMovieDetails(movie.id));
        movieContainer.appendChild(movieCard);
    });
}

// Updated Modal Functions
function showMovieDetails(movieId) {
    const modal = document.getElementById('movie-modal');

    // Reset modal state
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        modal.classList.add('active');
        fetchAndDisplayMovieDetails(movieId);
    }, 10);
}

function closeMovieModal() {
    const modal = document.getElementById('movie-modal');

    modal.classList.remove('active');
    document.body.style.overflow = '';

    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('modal-details').innerHTML = '';
    }, 300);
}

// Update event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('movie-modal');
    const closeBtn = modal.querySelector('.close');

    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMovieModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMovieModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeMovieModal();
        }
    });
});

async function fetchAndDisplayMovieDetails(movieId) {
    try {
        modalDetails.innerHTML = ''; // Clear previous content
        showLoading(); // Use global loading overlay

        const [movieDetails, credits, videos, similar] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=${currentLanguage}`).then(res => res.json()),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`).then(res => res.json()),
            fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`).then(res => res.json()),
            fetch(`${BASE_URL}/movie/${movieId}/similar?api_key=${API_KEY}&page=1`).then(res => res.json())
        ]);

        // Format data
        const director = credits.crew.find(person => person.job === 'Director')?.name || 'Unknown';
        const trailer = videos.results.find(video => video.type === 'Trailer') || videos.results[0];
        const runtime = formatRuntime(movieDetails.runtime);
        const revenue = formatCurrency(movieDetails.revenue);
        const budget = formatCurrency(movieDetails.budget);

        hideLoading(); // Hide global loading overlay

        // Render movie details with improved layout
        modalDetails.innerHTML = `
            <div class="movie-details">
                <!-- Movie poster and quick info -->
                <div class="movie-poster sticky top-0">
                    <img src="${IMAGE_BASE_URL}${movieDetails.poster_path}" 
                         alt="${movieDetails.title}"
                         class="w-full rounded-xl shadow-lg">
                    <div class="mt-4 p-4 bg-gray-100 dark:bg-dark-DEFAULT rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <span class="px-3 py-1 bg-primary/10 text-primary rounded-full">
                                <i class="fas fa-star text-primary"></i>
                                ${movieDetails.vote_average.toFixed(1)}
                            </span>
                            <span class="text-gray-600 dark:text-gray-400">${movieDetails.release_date}</span>
                        </div>
                        <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p><i class="fas fa-clock mr-2"></i>${runtime}</p>
                            <p><i class="fas fa-film mr-2"></i>${movieDetails.original_language.toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                <div class="movie-info space-y-6">
                    <div>
                        <h2 class="text-3xl font-bold">${movieDetails.title}</h2>
                        ${movieDetails.tagline ?
                `<p class="text-lg text-gray-600 dark:text-gray-400 italic mt-2">${movieDetails.tagline}</p>`
                : ''}
                    </div>

                    <div class="genre-tags">
                        ${movieDetails.genres.map(genre => `
                            <span class="genre-tag">${genre.name}</span>
                        `).join('')}
                    </div>

                    <div class="movie-overview">
                        <h3 class="text-xl font-semibold mb-2">Overview</h3>
                        <p class="text-gray-400">${movieDetails.overview}</p>
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        <div class="text-center p-4 bg-black/10 rounded-lg">
                            <p class="text-sm text-gray-400">Director</p>
                            <p class="font-semibold">${director}</p>
                        </div>
                        <div class="text-center p-4 bg-black/10 rounded-lg">
                            <p class="text-sm text-gray-400">Budget</p>
                            <p class="font-semibold">${budget}</p>
                        </div>
                        <div class="text-center p-4 bg-black/10 rounded-lg">
                            <p class="text-sm text-gray-400">Revenue</p>
                            <p class="font-semibold">${revenue}</p>
                        </div>
                    </div>

                    ${credits.cast.length > 0 ? `
                        <div class="cast-section">
                            <h3 class="text-xl font-semibold mb-4">Top Cast</h3>
                            <div class="cast-list">
                                ${credits.cast.slice(0, 6).map(actor => `
                                    <div class="cast-member">
                                        <img src="${actor.profile_path ? IMAGE_BASE_URL + actor.profile_path : 'https://via.placeholder.com/80x80'}"
                                             alt="${actor.name}">
                                        <p class="font-semibold">${actor.name}</p>
                                        <p class="text-sm text-gray-400">${actor.character}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${trailer ? `
                        <div class="trailer-section">
                            <h3 class="text-xl font-semibold mb-4">Trailer</h3>
                            <div class="trailer-container">
                                <iframe src="https://www.youtube.com/embed/${trailer.key}"
                                        frameborder="0"
                                        allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                    ` : ''}

                    ${similar.results.length > 0 ? `
                        <div class="similar-movies mt-8">
                            <h3 class="text-xl font-semibold mb-4">Similar Movies</h3>
                            <div class="similar-grid">
                                ${similar.results.slice(0, 4).map(movie => `
                                    <div class="cursor-pointer hover:scale-105 transition-transform"
                                         onclick="showMovieDetails(${movie.id})">
                                        <img src="${IMAGE_BASE_URL}${movie.poster_path}"
                                             alt="${movie.title}"
                                             class="rounded-lg shadow-lg">
                                        <p class="mt-2 text-center">${movie.title}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error fetching movie details:', error);
        hideLoading();
        modalDetails.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p class="text-lg mb-4">Sorry, something went wrong loading the movie details.</p>
                <button onclick="fetchAndDisplayMovieDetails(${movieId})">Try Again</button>
            </div>
        `;
    }
}

// Utility functions
function formatRuntime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function formatCurrency(amount) {
    return amount ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount) : 'N/A';
}

function getRatingClass(rating) {
    if (rating >= 8) return 'high';
    if (rating >= 6) return 'medium';
    return 'low';
}

function animateModalContent() {
    const elements = modalDetails.querySelectorAll('.movie-details > *, .cast-member');
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            el.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            el.style.transitionDelay = `${index * 50}ms`;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    });
}

// Update pagination display
function displayPagination() {
    if (totalPages <= 1) return;

    paginationContainer.innerHTML = `
        <div class="flex gap-2 flex-wrap justify-center">
            ${currentPage > 1 ? `
                <button onclick="changePage(${currentPage - 1})" 
                        class="px-4 py-2 rounded-lg bg-light-card dark:bg-dark-card hover:bg-primary hover:text-white transition-colors">
                    Previous
                </button>
            ` : ''}
            ${generatePageNumbers()}
            ${currentPage < totalPages ? `
                <button onclick="changePage(${currentPage + 1})"
                        class="px-4 py-2 rounded-lg bg-light-card dark:bg-dark-card hover:bg-primary hover:text-white transition-colors">
                    Next
                </button>
            ` : ''}
        </div>
    `;
}

function generatePageNumbers() {
    const maxButtons = 5;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxButtons - 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
        .map(num => `
            <button onclick="changePage(${num})"
                    class="px-4 py-2 rounded-lg ${num === currentPage
                ? 'bg-primary text-white'
                : 'bg-light-card dark:bg-dark-card hover:bg-primary hover:text-white'} 
                    transition-colors">
                ${num}
            </button>
        `).join('');
}

function changePage(page) {
    currentPage = page;
    fetchMovies(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Infinite Scroll
const infiniteScrollToggle = document.getElementById('infinite-scroll');
if (infiniteScrollToggle) {
    infiniteScrollToggle.addEventListener('change', (e) => {
        isInfiniteScroll = e.target.checked;
    });
}

window.addEventListener('scroll', () => {
    if (!isInfiniteScroll || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
        if (currentPage < totalPages) {
            isLoading = true;
            currentPage++;
            fetchMovies(currentPage, true);
        }
    }
});

// View Mode Toggle
const viewModeSelect = document.getElementById('view-mode');
viewModeSelect.addEventListener('change', (e) => {
    movieContainer.className = `movie-container ${e.target.value}-view`;
});

// Event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        searchMovies(searchTerm);
    }
});

genreSelect.addEventListener('change', (e) => {
    currentGenre = e.target.value;
    currentPage = 1;
    fetchMovies();
});

sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    fetchMovies();
});

closeModal.addEventListener('click', closeMovieModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeMovieModal();
    }
});

// Update initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        console.log('Initializing with API key:', API_KEY ? 'Present' : 'Missing'); // Debug log

        // Verify API key and connection
        const testUrl = `${BASE_URL}/configuration?api_key=${API_KEY}`;
        const testResponse = await fetch(testUrl);
        if (!testResponse.ok) {
            throw new Error('Failed to connect to TMDB API');
        }

        // Set theme and continue initialization
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.body.classList.toggle('dark', savedTheme === 'dark');
        themeToggle.innerHTML = `<i class="fas fa-${savedTheme === 'dark' ? 'moon' : 'sun'}"></i>`;

        await fetchGenres();
        await fetchMovies();
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

// Update theme toggle function
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';

    // Add transition class to body
    document.body.classList.add('transitioning');

    // Toggle theme with enhanced animation
    requestAnimationFrame(() => {
        html.setAttribute('data-theme', newTheme);
        document.body.classList.toggle('dark', !isDark);
        localStorage.setItem('theme', newTheme);

        // Animate icon
        const icon = themeToggle.querySelector('i');
        icon.style.transform = 'scale(0) rotate(180deg)';

        setTimeout(() => {
            icon.className = `fas fa-${isDark ? 'sun' : 'moon'}`;
            icon.style.transform = 'scale(1) rotate(0)';
        }, 150);
    });

    // Remove transition class
    setTimeout(() => {
        document.body.classList.remove('transitioning');
    }, 300);
}

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Initialize animations on page load
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('animate-fadeIn');
});
