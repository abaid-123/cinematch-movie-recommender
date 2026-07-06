# CineMatch Movie Recommender

CineMatch is a content-based movie recommendation system built with Python, FastAPI, React, Vite, and the TMDB 5000 movie dataset.

## Features

- Movie search with dropdown
- Content-based movie recommendations
- Recommendations based on overview, genres, keywords, cast, and crew
- Movie poster images using TMDB API
- React frontend
- FastAPI backend

## Tech Stack

### Frontend
- React
- Vite
- CSS

### Backend
- Python
- FastAPI
- pandas
- scikit-learn
- TMDB API

## Project Structure

```text
MovieRecommender/
├── backend/
│   ├── api.py
│   ├── movies.pkl
│   └── requirements.txt
├── frontend/
│   └── movie-recommender/
│       ├── src/
│       ├── package.json
│       └── vite.config.js
├── main.py
└── README.md