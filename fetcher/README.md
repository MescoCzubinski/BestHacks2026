# Fetcher

Builds the `places` and `place_tags` tables for one **region**: it fetches public heritage data, merges it,
cleans it, grades each place against the tag vocabulary and writes the result to Postgres.

## Run it

The region is a constant in `app/config.py` (`REGION`: id, name, bounding box, language, municipality, admin
area, German-until year). Everything else is configured in `fetcher/.env` (copy `.env.example`):

| Variable           | Meaning                                                    |
| ------------------ | ---------------------------------------------------------- |
| `DB_URL`           | Postgres connection string                                 |
| `SOURCES`          | `osm,wikidata,nid,commons,wroclaw_gis`                     |
| `INTERVAL_SECONDS` | seconds between runs (default one week, `604800`)          |
| `RUN_ONCE`         | `1` runs once and exits instead of repeating               |
| `EXPORT_SEED_PATH` | also writes the documents (and a `.report.json`) to a file |

To cover another city, change `REGION` (and use sources that exist there; `wroclaw_gis` is Wrocław only).

```
docker compose up -d db backend      # schema is created by the backend
docker compose run --rm -e RUN_ONCE=1 fetcher
```

Downloads and geocoding results live in the `fetchercache` volume, so a restart or a
rate-limited source resumes instead of starting over. Embeddings for the style classifier come from the backend
(`POST /api/embeddings`, internal, reachable only inside the Docker network); the fetcher waits for `/api/health` first. Delete a file under `/cache/<region>/` to refetch it.

## Pipeline

```
sources/*        osm, wikidata (+ Wikipedia intros, claims), nid (+ GUGiK geocoder), commons, wroclaw_gis
pipeline/merge   match by name + distance, fill gaps, union provenance
pipeline/clean   drop streets/stops/unnamed junk, merge cross-source duplicates
pipeline/tagging explicit labels -> embedding classifier for the rest -> neighbour spill -> graded tags
db.py            idempotent upsert on external_id, tags replaced per place, stale places of the region pruned
```

Tags are percentages, not booleans: an explicit NID or Wikidata style scores 80-100, a classifier inference at
most 70, an era prior at most 35, and neighbouring styles (neogothic → gothic) receive part of the score.

## Safety rails

- A run that produces less than half of the existing places for the region saves but **does not prune**.
- An empty result never overwrites the database.
- Only the tables defined by the backend are written; no DDL.

## Tests

```
pip install -r requirements-dev.txt
python -m pytest app
```
