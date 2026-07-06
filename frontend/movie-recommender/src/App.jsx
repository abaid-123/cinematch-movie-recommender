import { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const API_URL = `${BACKEND_URL}/recommend`;
const MOVIES_URL = `${BACKEND_URL}/movies`;

const MOCK_DB = {
  avatar: [
    "Aliens",
    "Guardians of the Galaxy",
    "Star Trek",
    "John Carter",
    "Titan A.E.",
  ],
  "the dark knight": [
    "Batman Begins",
    "The Dark Knight Rises",
    "Man of Steel",
    "Iron Man",
    "V for Vendetta",
  ],
  inception: [
    "Interstellar",
    "The Matrix",
    "Shutter Island",
    "Source Code",
    "Predestination",
  ],
  titanic: [
    "The Notebook",
    "Pearl Harbor",
    "Romeo + Juliet",
    "A Walk to Remember",
    "Titan A.E.",
  ],
};

const KNOWN_TITLES = Object.keys(MOCK_DB).map((key) =>
  key.replace(/\b\w/g, (c) => c.toUpperCase()),
);

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function getCloseMatches(input, titles, maxResults = 3) {
  return titles
    .map((title) => ({
      title,
      distance: levenshtein(input.toLowerCase(), title.toLowerCase()),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults)
    .map((item) => item.title);
}

function mockRecommend(movieName) {
  const key = movieName.trim().toLowerCase();

  if (MOCK_DB[key]) {
    return {
      status: "success",
      movie: movieName,
      recommendations: MOCK_DB[key],
    };
  }

  return {
    status: "not_found",
    message: "Movie not found",
    suggestions: getCloseMatches(movieName, KNOWN_TITLES),
  };
}

export default function App() {
  const [query, setQuery] = useState("");
  const [searchedMovie, setSearchedMovie] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  const [allMovies, setAllMovies] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moviesLoading, setMoviesLoading] = useState(false);

  useEffect(() => {
    async function fetchMovies() {
      try {
        setMoviesLoading(true);
        const response = await fetch(MOVIES_URL);
        const data = await response.json();

        setAllMovies(data.movies || []);
      } catch (error) {
        console.log("Could not load movie list:", error);
      } finally {
        setMoviesLoading(false);
      }
    }

    fetchMovies();
  }, []);

  const filteredMovies = allMovies
    .filter((movie) => movie.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 80);

  async function handleRecommend(movieNameOverride) {
    const movieName = (movieNameOverride ?? query).trim();

    if (!movieName) {
      setError("Please enter or select a movie title.");
      setRecommendations([]);
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError("");
    setRecommendations([]);
    setSuggestions([]);
    setSearchedMovie(movieName);
    setDropdownOpen(false);

    let data;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ movie: movieName }),
      });

      if (!response.ok) {
        throw new Error("Backend responded with an error");
      }

      data = await response.json();
      setUsingMock(false);
    } catch (err) {
      data = mockRecommend(movieName);
      setUsingMock(true);
    }

    if (data.status === "success") {
      setRecommendations(data.recommendations);
    } else {
      setError(data.message || "Movie not found");
      setSuggestions(data.suggestions || []);
    }

    setLoading(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    handleRecommend();
  }

  function handleMovieSelect(movie) {
    setQuery(movie);
    setDropdownOpen(false);
  }

  function handleSuggestionClick(title) {
    setQuery(title);
    handleRecommend(title);
  }

  return (
    <div className="page">
      <header className="marquee">
        <div className="marquee__bulbs" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="bulb"
              style={{ animationDelay: `${i * 0.09}s` }}
            />
          ))}
        </div>

        <div className="marquee__content">
          <p className="eyebrow">NOW SHOWING · CONTENT-BASED RECOMMENDER</p>
          <h1 className="title">CineMatch</h1>
          <p className="subtitle">
            Tell us one movie you love. Our engine reads its plot, genres, cast
            and crew, then finds five more just like it.
          </p>
        </div>
      </header>

      <main className="content">
        <section className="search-counter" aria-label="Search for a movie">
          <form className="search-form" onSubmit={handleSubmit}>
            <label htmlFor="movie-input" className="search-label">
              Enter a movie title
            </label>

            <div className="search-row">
              <div
                className="movie-dropdown"
                onBlur={() => {
                  setTimeout(() => setDropdownOpen(false), 150);
                }}
              >
                <input
                  id="movie-input"
                  type="text"
                  placeholder={
                    moviesLoading
                      ? "Loading movies..."
                      : "Type or select a movie..."
                  }
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  autoComplete="off"
                />

                {dropdownOpen && (
                  <div className="movie-dropdown-menu">
                    {moviesLoading && (
                      <div className="movie-dropdown-item disabled">
                        Loading movies...
                      </div>
                    )}

                    {!moviesLoading &&
                      query.trim() === "" &&
                      allMovies.slice(0, 80).map((movie, index) => (
                        <button
                          type="button"
                          key={`${movie}-${index}`}
                          className="movie-dropdown-item"
                          onMouseDown={() => handleMovieSelect(movie)}
                        >
                          {movie}
                        </button>
                      ))}

                    {!moviesLoading &&
                      query.trim() !== "" &&
                      filteredMovies.map((movie, index) => (
                        <button
                          type="button"
                          key={`${movie}-${index}`}
                          className="movie-dropdown-item"
                          onMouseDown={() => handleMovieSelect(movie)}
                        >
                          {movie}
                        </button>
                      ))}

                    {!moviesLoading &&
                      query.trim() !== "" &&
                      filteredMovies.length === 0 && (
                        <div className="movie-dropdown-item disabled">
                          No matching movie found
                        </div>
                      )}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Recommend"}
              </button>
            </div>

            <p className="movie-count">
              {allMovies.length > 0
                ? `${allMovies.length} movies loaded`
                : "Movie list not loaded yet"}
            </p>
          </form>
        </section>

        {loading && (
          <div className="status-block loading" role="status">
            <span className="reel" aria-hidden="true" />
            <p>Rolling the film reel, finding your matches...</p>
          </div>
        )}

        {!loading && error && (
          <div className="status-block error" role="alert">
            <p className="error-title">🎬 {error}</p>

            {suggestions.length > 0 && (
              <div className="suggestions">
                <p className="suggestions-label">Did you mean:</p>

                <div className="chip-row">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      className="chip"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && recommendations.length > 0 && (
          <section className="results" aria-label="Recommended movies">
            <div className="results-header">
              <h2>Because you liked "{searchedMovie}"</h2>

              {usingMock && (
                <span className="mock-badge">
                  Preview data · backend offline
                </span>
              )}
            </div>

            <div className="ticket-grid">
              {recommendations.map((movie, index) => {
                const movieTitle =
                  typeof movie === "string" ? movie : movie.title;

                const moviePoster =
                  typeof movie === "string" ? "" : movie.poster;

                return (
                  <article
                    className="ticket movie-card"
                    key={`${movieTitle}-${index}`}
                  >
                    {moviePoster && (
                      <img
                        src={moviePoster}
                        alt={`${movieTitle} poster`}
                        className="movie-poster"
                      />
                    )}

                    <div className="ticket__main">
                      <p className="ticket__eyebrow">Recommended Movie</p>
                      <h3 className="ticket__title">{movieTitle}</h3>
                      <p className="ticket__seat">
                        Pick No. {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          CineMatch — a content-based movie recommender built with TMDB 5000
          data, scikit-learn cosine similarity, React &amp; FastAPI/Flask.
        </p>
      </footer>
    </div>
  );
}
