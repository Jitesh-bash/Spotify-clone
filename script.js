let currentSong = new Audio();
let songs;
// Remembers which folder is playing, e.g. "songs/English".
// playMusic() needs it to build the full path to the mp3 file.
let currFolder;

function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

// Reads the track list from a JSON file inside the folder.
//
// The old version fetched the folder itself and scraped the <a> links
// out of the directory listing. That only works on dev servers like
// Live Server — real static hosts (Netlify, GitHub Pages) return 404
// for a folder, so there'd be nothing to scrape and the list would be
// empty. A JSON file works everywhere.
async function getSongs(folder) {
  currFolder = folder;

  let a = await fetch(`${folder}/info.json`);
  if (!a.ok) {
    console.error(`Could not load ${folder}/info.json — status ${a.status}`);
    return [];
  }
  return await a.json();
}

// Turns a filename into a readable {artist, title}.
// One shared function so the sidebar and the playbar always agree.
function parseTrackName(filename) {
  let clean = decodeURIComponent(filename).replace(/\.mp3$/i, "");

  // "alexguz-funk-541097 (1)" → drop Windows' duplicate marker
  clean = clean.replace(/\s*\(\d+\)$/, "");
  // "...-541097" → drop the download site's trailing ID number
  clean = clean.replace(/[-_]\d{4,}$/, "");

  // Proper "Artist - Title.mp3" files: split on the LAST " - " so a
  // title containing " - " doesn't get chopped in the wrong place.
  let cut = clean.lastIndexOf(" - ");
  if (cut !== -1) {
    return {
      artist: clean.slice(0, cut).trim(),
      title: clean.slice(cut + 3).trim(),
    };
  }

  // No " - " at all (all your current files). These are
  // "uploader-some-description" style, so treat the first chunk as the
  // artist and turn the rest into words.
  let parts = clean.split(/[-_]+/).filter(Boolean);
  let toWords = (s) =>
    s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

  if (parts.length > 1) {
    return {
      artist: toWords(parts[0]),
      title: toWords(parts.slice(1).join(" ")),
    };
  }
  return { artist: "Unknown Artist", title: toWords(clean) };
}

const playMusic = (track, pause = false) => {
  currentSong.src = `${currFolder}/${track}`;
  if (!pause) {
    currentSong.play();
    play.src = "pause.svg";
  }

  document.querySelector(".songinfo").innerHTML = parseTrackName(track).title;
  document.querySelector(".songtime").innerHTML = "00:00";
  document.querySelector(".circle").style.left = "0%";
};

// Pulled out of main() so it can run again every time you switch
// playlists. Anything that must repeat cannot live inside main().
function renderSongList() {
  let songUL = document.querySelector(".songlist").getElementsByTagName("ul")[0];

  // Build the whole string first, assign ONCE at the end.
  // The old code did songUL.innerHTML += ... inside the loop, which
  // makes the browser re-parse the entire list on every iteration.
  let html = "";
  for (const song of songs) {
    const { artist, title } = parseTrackName(song);

    html += `<li data-track="${song}">
                <img class="invert" src="music.svg" alt="">
                <div class="info">
                    <div>${title}</div>
                    <div>${artist}</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="spoti_play.svg" alt="">
                </div>
            </li>`;
  }
  songUL.innerHTML = html;

  // Re-attach listeners HERE, not in main(). Setting innerHTML throws
  // away the old <li> elements and builds brand new ones — any
  // listeners attached to the old ones died with them.
  Array.from(songUL.getElementsByTagName("li")).forEach((li) => {
    li.addEventListener("click", () => {
      playMusic(li.dataset.track);
    });
  });
}

async function loadPlaylist(folder) {
  songs = await getSongs(folder);

  // Guard: an empty folder would make songs[0] undefined, and
  // playMusic would then crash on undefined.replace()
  if (songs.length === 0) {
    console.warn(`No mp3 files found in ${folder}`);
    return;
  }

  renderSongList();
  playMusic(songs[0], true);
}

async function main() {
  await loadPlaylist("songs/English");

  // Clicking a card loads that folder's playlist.
  // Three fixes vs the old version:
  //   "card" not ".card"  — getElementsByClassName takes a plain name
  //   Array.from(...)     — an HTMLCollection has no .forEach
  //   card.dataset        — use the ELEMENT, not the click event
  Array.from(document.getElementsByClassName("card")).forEach((card) => {
    card.addEventListener("click", () => {
      // the 3rd card has no data-folder yet, so ignore clicks on it
      // instead of fetching "songs/undefined"
      if (!card.dataset.folder) return;
      loadPlaylist(`songs/${card.dataset.folder}`);
    });
  });

  // ---- one-time handlers ----
  // These attach to elements that never get replaced, so unlike the
  // <li> listeners above they only need attaching once.

  play.addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play();
      play.src = "pause.svg";
    } else {
      currentSong.pause();
      play.src = "spoti_play.svg";
    }
  });

  currentSong.addEventListener("timeupdate", () => {
    document.querySelector(".songtime").innerHTML =
      `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
    document.querySelector(".circle").style.left =
      (currentSong.currentTime / currentSong.duration) * 100 + "%";
  });

  document.querySelector(".seekbar").addEventListener("click", (e) => {
    let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
    document.querySelector(".circle").style.left = percent + "%";
    currentSong.currentTime = (currentSong.duration * percent) / 100;
  });

  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
  });

  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-120%";
  });

  previous.addEventListener("click", () => {
    // decodeURIComponent because currentSong.src is percent-encoded by
    // the browser, but the songs array holds decoded-or-not filenames.
    // Without it indexOf returns -1 and nothing happens.
    let index = songs.indexOf(
      decodeURIComponent(currentSong.src.split("/").slice(-1)[0]),
    );
    if (index - 1 >= 0) {
      playMusic(songs[index - 1]);
    }
  });

  next.addEventListener("click", () => {
    let index = songs.indexOf(
      decodeURIComponent(currentSong.src.split("/").slice(-1)[0]),
    );
    // "< songs.length" not "< songs.length - 1", otherwise the last
    // song can never be reached
    if (index + 1 < songs.length) {
      playMusic(songs[index + 1]);
    }
  });
}

main();
