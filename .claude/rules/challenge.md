# Challenge rules (BEST Hacks 2026 — "Code For Culture")

Event: BEST Hacks 2026, Politechnika Wrocławska. Every feature must trace back to this challenge.

## Task

Build a solution that joins technology with culture, to preserve and spread cultural heritage. The app must fit one category: **Sztuka**, **Historia** or **Tradycja**. Any form is allowed (web, mobile, desktop, AI, AR, IoT…); originality and innovation count most. A working implementation is required, not a mockup.

Useful public data for our category (Historia): rejestr zabytków and other datasets on dane.gov.pl, Narodowe Archiwum Cyfrowe, Europeana, OpenStreetMap/Wikidata for heritage objects.

## Our project: interest-based trip planner on a map

A map app that plans a sightseeing route around **the user's interest**, unlike Google Maps, which lists generic places.

- The user picks an interest, e.g. **secesja (Art Nouveau)**, and we know their **location** and **available time**.
- The app shows all matching objects (e.g. every Art Nouveau building) on the map and **builds a walking route** from the user's location that fits the time budget (which objects, in what order, how long at each).
- Each object has a short story/description (what, when, architect, why it matters), a photo if available, and its place in the route.
- Interests are data-driven (style, era, theme), so adding a new one (e.g. modernizm, Wrocław legends, industrial heritage) means adding data, not code.

Working assumption: category **Historia** (heritage objects on an interactive map). Confirm before the OnePager.

## Working rules

- Build one complete flow first: pick interest → location + time → map with objects → generated route. Polish after it works end to end.
- Keep a demo-ready state on `main` and the app running before the presentation.
- Seed data comes from public sources or is fictional; no real personal data. UI language: Polish.
- Treat interests, objects and routes as separate vertical slices in the backend (e.g. `interest/`, `place/`, `route/`), so the story is easy to explain to the jury.
