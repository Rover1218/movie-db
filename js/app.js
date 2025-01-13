// Implement debouncing for search
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Implement intersection observer for lazy loading
const observerOptions = {
    root: null,
    rootMargin: '20px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadImage(entry.target);
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

function loadImage(imageElement) {
    const src = imageElement.getAttribute('data-src');
    if (src) {
        imageElement.src = src;
        imageElement.removeAttribute('data-src');
    }
}

// Cache DOM elements
const movieGrid = document.getElementById('movieGrid');
const searchBar = document.querySelector('.search-bar');

// Genre handling
const genres = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    53: 'Thriller'
};

// Update genre handling with proper event delegation
function initializeGenreSelect() {
    const genreSelect = document.querySelector('#genre-select');
    const genreOptions = genreSelect.querySelector('.custom-select-options');
    const selectedOption = genreSelect.querySelector('.selected-option');

    // Clear existing options except "All Genres"
    while (genreOptions.children.length > 1) {
        genreOptions.removeChild(genreOptions.lastChild);
    }

    // Add genre options
    Object.entries(genres).forEach(([id, name]) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = id;
        option.textContent = name;
        genreOptions.appendChild(option);
    });

    // Handle genre selection
    genreOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const genreId = option.dataset.value;
        selectedOption.textContent = option.textContent;
        genreSelect.classList.remove('active');

        // Fetch movies with selected genre
        currentGenre = genreId;
        currentPage = 1;
        fetchMovies().then(movies => {
            renderMovies(movies);
            displayPagination();
        });
    });

    // Toggle dropdown
    genreSelect.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-options')) {
            genreSelect.classList.toggle('active');
        }
    });
}

// Enhanced movie fetching with genre support
async function fetchMovies(searchTerm = '') {
    try {
        showLoading();
        const baseUrl = 'https://api.themoviedb.org/3';
        const endpoint = searchTerm ? '/search/movie' : '/discover/movie';

        const params = new URLSearchParams({
            api_key: API_KEY,
            language: 'en-US',
            page: currentPage,
            sort_by: currentSort
        });

        if (searchTerm) {
            params.append('query', searchTerm);
        }

        if (currentGenre) {
            params.append('with_genres', currentGenre);
        }

        const response = await fetch(`${baseUrl}${endpoint}?${params}`);
        const data = await response.json();
        totalPages = data.total_pages;
        return data.results;
    } catch (error) {
        console.error('Error fetching movies:', error);
        return [];
    } finally {
        hideLoading();
    }
}

// Enhanced rendering with animations
function renderMovies(movies) {
    movieGrid.innerHTML = '';
    movies.forEach((movie, index) => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.style.animation = `fadeIn 0.3s ease forwards ${index * 0.1}s`;

        movieCard.innerHTML = `
            <div class="movie-card-inner">
                <img 
                    data-src="https://image.tmdb.org/t/p/w500${movie.poster_path}" 
                    alt="${movie.title}"
                    class="movie-poster"
                    loading="lazy"
                >
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <div class="movie-meta">
                        <span class="rating">
                            <i class="fas fa-star text-yellow-400"></i>
                            ${movie.vote_average.toFixed(1)}
                        </span>
                        <span class="year">${movie.release_date?.split('-')[0] || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;

        movieGrid.appendChild(movieCard);
        observeImage(movieCard.querySelector('img'));
    });
}

// Initialize the app
const init = () => {
    // Add event listeners with debouncing
    searchBar.addEventListener('input', debounce((e) => {
        fetchMovies(e.target.value).then(renderMovies);
    }, 300));

    // Initial load
    fetchMovies().then(renderMovies);
};

document.addEventListener('DOMContentLoaded', () => {
    initializeGenreSelect();

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select').forEach(select => {
                select.classList.remove('active');
            });
        }
    });

    // Initial movie fetch
    fetchMovies().then(movies => {
        renderMovies(movies);
        displayPagination();
    });
});
