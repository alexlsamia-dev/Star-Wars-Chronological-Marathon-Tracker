# Star Wars Chronological Marathon Tracker

A static, mobile-friendly tracker generated from the unified Google Sheet. It includes 1,042 chronological entries spanning films, television, animation, games, shorts, Legends, fan films, and bonus material.

## Features

- Progress stored in the browser with `localStorage`
- Search and continuity/format filters
- Collapsible eras and watch-through exclusions that recalculate progress
- Era navigation
- Direct watch and episode-guide links
- Downloadable PDF and Excel editions
- No account or backend required

## Local preview

Serve this directory with any static file server, for example:

```bash
python3 -m http.server 4173 --directory .
```

Then open `http://localhost:4173`.
