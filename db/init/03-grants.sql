-- backend_ro only reads; fetcher_rw writes data but cannot change the schema (no DDL, not the owner).

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO backend_ro, fetcher_rw;

GRANT SELECT ON supported_cities, places, place_tags TO backend_ro;

GRANT SELECT, INSERT, UPDATE, DELETE ON supported_cities, places, place_tags TO fetcher_rw;
