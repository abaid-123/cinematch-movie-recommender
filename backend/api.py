import os
import pickle
from difflib import get_close_matches

import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ==============================
# Load environment variables
# ==============================

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")


# ==============================
# TMDB poster configuration
# ==============================

IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
PLACEHOLDER_POSTER = "https://via.placeholder.com/500x750?text=No+Poster"


# ==============================
# FastAPI app
# ==============================

app = FastAPI()


# ==============================
# CORS setup
# This allows localhost and Vercel frontend
# ==============================

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://cinematch-movie-recommender-hazel.vercel.app",
]

if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# Load movies.pkl safely
# ==============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIES_PATH = os.path.join(BASE_DIR, "movies.pkl")

movies = pickle.load(open(MOVIES_PATH, "rb"))

movies["title_lower"] = movies["title"].str.lower().str.strip()


# ==============================
# Create vectors from tags
# No similarity.pkl needed
# ==============================

cv = CountVectorizer(
    max_features=5000,
    stop_words="english"
)

vectors = cv.fit_transform(movies["tags"])


# ==============================
# Cache posters
# ==============================

poster_cache = {}


class MovieRequest(BaseModel):
    movie: str


def fetch_poster(movie_id):
    """
    Fetch poster image URL from TMDB using movie_id.
    """

    if movie_id in poster_cache:
        return poster_cache[movie_id]

    if not TMDB_API_KEY:
        return PLACEHOLDER_POSTER

    url = f"https://api.themoviedb.org/3/movie/{movie_id}"

    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        poster_path = data.get("poster_path")

        if poster_path:
            poster_url = IMAGE_BASE_URL + poster_path
        else:
            poster_url = PLACEHOLDER_POSTER

    except Exception:
        poster_url = PLACEHOLDER_POSTER

    poster_cache[movie_id] = poster_url
    return poster_url


def movie_object(row):
    return {
        "id": int(row["movie_id"]),
        "title": row["title"],
        "poster": fetch_poster(int(row["movie_id"])),
    }


@app.get("/")
def home():
    return {
        "message": "CineMatch backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.get("/movies")
def get_movies():
    return {
        "movies": movies["title"].dropna().sort_values().tolist()
    }


@app.post("/recommend")
def recommend_movie(request: MovieRequest):
    movie_name = request.movie.lower().strip()

    matched_movies = movies[movies["title_lower"] == movie_name]

    if matched_movies.empty:
        close_matches = get_close_matches(
            movie_name,
            movies["title_lower"].tolist(),
            n=5,
            cutoff=0.5,
        )

        suggestions = []

        for match in close_matches:
            original_title = movies[movies["title_lower"] == match]["title"].values[0]
            suggestions.append(original_title)

        return {
            "status": "not_found",
            "message": "Movie not found",
            "suggestions": suggestions,
        }

    movie_index = matched_movies.index[0]

    distances = cosine_similarity(
        vectors[movie_index],
        vectors
    ).flatten()

    movie_list = sorted(
        list(enumerate(distances)),
        reverse=True,
        key=lambda x: x[1],
    )[1:6]

    recommendations = []

    for item in movie_list:
        movie_row = movies.iloc[item[0]]
        recommendations.append(movie_object(movie_row))

    return {
        "status": "success",
        "movie": matched_movies.iloc[0]["title"],
        "recommendations": recommendations,
    }