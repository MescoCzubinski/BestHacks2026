# Fetcher

Builds the `places` and `place_tags` tables for one **region**: it fetches public heritage data, merges it,
cleans it, grades each place against the tag vocabulary and writes the result to Postgres.

## Run it for a region

Set the region in `fetcher/.env` (copy `.env.example`):

| Variable              | Meaning                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `REGION_ID`           | stable key, prefix of every `external_id` (`[a-z0-9_-]`)            |
| `REGION_NAME`         | city name written to `address.city`                                 |
| `REGION_BBOX`         | `south,west,north,east`; every source is queried with it            |
| `REGION_MUNICIPALITY` | locality filter for the national register (NID); empty skips NID    |
| `REGION_GERMAN_UNTIL` | year before which buildings get `german_heritage` (Wrocław: 1945)   |
| `SOURCES`             | `osm,wikidata,nid,commons,wroclaw_gis`                              |
| `RUN_ONCE`            | `1` runs once and exits; otherwise repeats every `INTERVAL_SECONDS` |
| `EXPORT_SEED_PATH`    | also writes the documents (and a `.report.json`) to a file          |

```
docker compose up -d db backend      # schema is created by the backend
docker compose run --rm -e RUN_ONCE=1 fetcher
```

Downloads, geocoding results and the embedding model live in the `fetchercache` volume, so a restart or a
rate-limited source resumes instead of starting over. Delete a file under `/cache/<region>/` to refetch it.

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
