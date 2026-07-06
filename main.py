import ast
import numpy as np
import pandas as pd

from difflib import get_close_matches

from sklearn.feature_extraction.text import CountVectorizer
from nltk.stem.porter import PorterStemmer

from sklearn.metrics.pairwise import cosine_similarity
import pickle


# ==============================
# Load the datasets
# ==============================

movies = pd.read_csv('tmdb_5000_movies.csv')
credits = pd.read_csv('tmdb_5000_credits.csv')


# ==============================
# Merge both datasets on title
# ==============================

movies = movies.merge(credits, on='title')


# ==============================
# Keep only useful columns
# ==============================

movies = movies[
    [
        'movie_id',
        'title',
        'overview',
        'genres',
        'keywords',
        'cast',
        'crew'
    ]
]


# ==============================
# Remove rows with missing values
# ==============================

movies.dropna(inplace=True)


# ==============================
# Convert genres and keywords
# from string format to Python list
# ==============================

def convert(obj):
    """
    Converts a string representation of a list of dictionaries
    into a list of names.

    Example:
    '[{"id": 28, "name": "Action"}]'
    becomes:
    ['Action']
    """

    L = []

    for i in ast.literal_eval(obj):
        L.append(i['name'])

    return L


# ==============================
# Get top 3 cast members
# ==============================

def convert_cast(obj):
    """
    Extracts only the first 3 cast members from the cast column.
    """

    L = []
    counter = 0

    for i in ast.literal_eval(obj):
        if counter < 3:
            L.append(i['name'])
            counter += 1
        else:
            break

    return L


# ==============================
# Get director name from crew
# ==============================

def fetch_director(obj):
    """
    Extracts the director name from the crew column.
    """

    L = []

    for i in ast.literal_eval(obj):
        if i['job'] == 'Director':
            L.append(i['name'])
            break

    return L


# ==============================
# Apply conversion functions
# ==============================

movies['genres'] = movies['genres'].apply(convert)
movies['keywords'] = movies['keywords'].apply(convert)
movies['cast'] = movies['cast'].apply(convert_cast)
movies['crew'] = movies['crew'].apply(fetch_director)


# ==============================
# Convert overview text into list of words
# ==============================

movies['overview'] = movies['overview'].apply(lambda x: x.split())


# ==============================
# Remove spaces inside names
# Example: "Sam Worthington" becomes "SamWorthington"
# This keeps names as one word
# ==============================

movies['genres'] = movies['genres'].apply(
    lambda x: [i.replace(" ", "") for i in x]
)

movies['keywords'] = movies['keywords'].apply(
    lambda x: [i.replace(" ", "") for i in x]
)

movies['cast'] = movies['cast'].apply(
    lambda x: [i.replace(" ", "") for i in x]
)

movies['crew'] = movies['crew'].apply(
    lambda x: [i.replace(" ", "") for i in x]
)


# ==============================
# Create tags column
# Combine overview, genres, keywords, cast, and crew
# ==============================

movies['tags'] = (
    movies['overview']
    + movies['genres']
    + movies['keywords']
    + movies['cast']
    + movies['crew']
)


# ==============================
# Create new dataframe
# Use .copy() to avoid pandas warning
# ==============================

new_df = movies[['movie_id', 'title', 'tags']].copy()


# ==============================
# Convert tags list into a single string
# ==============================

new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x))


# ==============================
# Convert all tags to lowercase
# ==============================

new_df['tags'] = new_df['tags'].apply(lambda x: x.lower())


# ==============================
# Stemming
# Example:
# "loved", "loving", "love" become similar root words
# ==============================

ps = PorterStemmer()

def stem(text):
    """
    Applies stemming to every word in the tags string.
    """

    y = []

    for i in text.split():
        y.append(ps.stem(i))

    return " ".join(y)


# Apply stemming to tags column
new_df['tags'] = new_df['tags'].apply(stem)


# ==============================
# Convert text data into vectors
# CountVectorizer converts text into numerical form
# ==============================

cv = CountVectorizer(
    max_features=5000,
    stop_words='english'
)

vectors = cv.fit_transform(new_df['tags']).toarray()


# ==============================
# Print number of words/features
# ==============================

print(len(cv.get_feature_names_out()))

cosine_sim = cosine_similarity(vectors)

# Create a lowercase title column for searching
new_df['title_lower'] = new_df['title'].str.lower().str.strip()


def recommend(movie):
    """
    Recommends 5 similar movies based on the input movie title.
    Works even if user types lowercase or extra spaces.
    """

    # Convert user input to lowercase and remove extra spaces
    movie = movie.lower().strip()

    # Find movie by lowercase title
    matched_movies = new_df[new_df['title_lower'] == movie]

    # If movie is not found
    if matched_movies.empty:
        print("\nMovie not found!")

        # Suggest similar movie names
        close_matches = get_close_matches(
            movie,
            new_df['title_lower'].tolist(),
            n=5,
            cutoff=0.5
        )

        if close_matches:
            print("\nDid you mean:")

            for match in close_matches:
                original_title = new_df[new_df['title_lower'] == match]['title'].values[0]
                print(original_title)
        else:
            print("No similar movie found.")

        return

    # Get index of matched movie
    movie_index = matched_movies.index[0]

    # Get similarity scores
    distances = cosine_sim[movie_index]

    # Sort movies by similarity score
    movie_list = sorted(
        list(enumerate(distances)),
        reverse=True,
        key=lambda x: x[1]
    )[1:6]

    print("\nRecommended movies:\n")

    for i in movie_list:
        print(new_df.iloc[i[0]].title)




# Reset index so movie index matches similarity matrix index
new_df = new_df.reset_index(drop=True)

# Save processed movie dataframe
pickle.dump(new_df, open('movies.pkl', 'wb'))

# Save cosine similarity matrix
pickle.dump(cosine_sim, open('similarity.pkl', 'wb'))

print("movies.pkl and similarity.pkl saved successfully!")