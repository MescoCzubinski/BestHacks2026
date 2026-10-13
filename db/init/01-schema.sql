-- Schema of the database. Applied by Postgres on the first start of an empty volume;
-- a change here means editing the backend entity too and resetting the pgdata volume.

CREATE TYPE style_tag AS ENUM (
  'romanesque',
  'gothic',
  'medieval',
  'renaissance',
  'mannerism',
  'baroque',
  'rococo',
  'neoclassicism',
  'historicism',
  'neogothic',
  'neorenaissance',
  'neobaroque',
  'eclecticism',
  'art_nouveau',
  'secession',
  'expressionism',
  'art_deco',
  'modernism',
  'bauhaus',
  'brutalism',
  'postmodernism',
  'contemporary',
  'vernacular',
  'industrial',
  'communist',
  'jewish_heritage',
  'german_heritage',
  'polish_heritage',
  'habsburg',
  'church',
  'cathedral',
  'synagogue',
  'castle',
  'palace',
  'tenement',
  'villa',
  'town_hall',
  'museum',
  'theatre',
  'opera',
  'library',
  'university',
  'school',
  'hospital',
  'train_station',
  'bridge',
  'tower',
  'fortification',
  'monument',
  'fountain',
  'cemetery',
  'factory',
  'warehouse',
  'brewery',
  'stadium',
  'hotel',
  'sculpture',
  'shrine',
  'bunker',
  'ruins',
  'park',
  'garden',
  'zoo',
  'square',
  'viewpoint',
  'street_art',
  'mural',
  'unesco',
  'free_entry',
  'accessible'
);

CREATE TABLE supported_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  region text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  bbox jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  description text,
  address jsonb NOT NULL,
  position_quality text NOT NULL DEFAULT 'point',
  year smallint,
  date_text text,
  significance smallint NOT NULL DEFAULT 0,
  facts jsonb NOT NULL DEFAULT '{}',
  links jsonb NOT NULL DEFAULT '{}',
  sources text[] NOT NULL DEFAULT '{}',
  main_image_url text,
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX places_significance_idx ON places (significance);
CREATE INDEX places_position_idx ON places (latitude, longitude);

CREATE TABLE place_tags (
  place_id uuid NOT NULL REFERENCES places (id) ON DELETE CASCADE,
  tag style_tag NOT NULL,
  percent smallint NOT NULL CHECK (percent BETWEEN 0 AND 100),
  PRIMARY KEY (place_id, tag)
);

CREATE INDEX place_tags_tag_percent_idx ON place_tags (tag, percent);
