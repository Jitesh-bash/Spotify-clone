# Spotify Clone

A front-end clone of the Spotify web player, built with plain HTML, CSS, and
JavaScript. No frameworks, no build step — open `index.html` and it runs.

![Spotify clone UI](spotify%28UI%29.PNG)

## Features

- **Working audio player** — play/pause, next/previous, and a click-to-seek
  progress bar with live `mm:ss / mm:ss` time display
- **Multiple playlists** — click a playlist card to load that folder's tracks
  without a page reload
- **Readable track names** — filenames like
  `alexguz-funk-amp-breakbeat-541097 (1).mp3` are parsed into a clean artist
  and title, stripping download-site ID numbers and Windows' `(1)` duplicate
  markers
- **Responsive layout** — the sidebar collapses behind a hamburger menu on
  small screens
- **Spotify Mix fonts** bundled locally, so the type matches the real player

## Project structure

```
├── index.html          # markup
├── utility.css         # base rules (loaded first)
├── style.css           # layout + media queries (loaded last, wins cascade)
├── script.js           # player logic
├── font/               # Spotify Mix font files
├── spotify-playlist/   # playlist cover art
└── songs/
    ├── English/
    │   ├── info.json   # track list for this folder
    │   └── *.mp3
    ├── Hindi/
    └── tamil/
```

## How playlists work

Each song folder carries its own `info.json` — a plain array of filenames:

```json
["audiocopper-dark-571483.mp3", "grand_project-wonders-of-the-earth-550792.mp3"]
```

An earlier version fetched the folder itself and scraped `<a>` links out of the
directory listing. That only works on dev servers like Live Server — real static
hosts return 404 for a folder, so the list came back empty. Reading a JSON file
works everywhere.

To add a playlist:

1. Create `songs/YourFolder/` and drop the `.mp3` files in
2. Add `songs/YourFolder/info.json` listing those filenames
3. In `index.html`, give the playlist card `data-folder="YourFolder"`

## Running it

Because the player uses `fetch()` to read `info.json`, opening the file directly
via `file://` will be blocked by CORS. Serve it over HTTP instead:

```bash
# Python (already on most machines)
python -m http.server 5500
```

Then visit `http://localhost:5500`. In VS Code, the Live Server extension does
the same thing with one click.

## Notes on the code

A few things worth knowing if you read `script.js`:

- The track list is built as one string and assigned to `innerHTML` **once**.
  Appending inside the loop makes the browser re-parse the whole list on every
  iteration.
- Song click listeners are attached inside `renderSongList()`, not `main()`.
  Setting `innerHTML` destroys the old `<li>` elements, and their listeners die
  with them — so they have to be re-attached every render.
- `decodeURIComponent()` is needed on `currentSong.src` before looking a track
  up in the array, because the browser percent-encodes the URL.

## Disclaimer

This is a learning project built to practise layout and DOM work. The Spotify
name, logo, and Spotify Mix fonts are trademarks and property of Spotify AB —
they're used here for study only, and this project isn't affiliated with or
endorsed by Spotify.
