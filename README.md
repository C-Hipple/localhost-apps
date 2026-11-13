# localhost-apps

Chrome extension with a toolbar popup that lists every web app running on localhost (favicon, page title and port
for each) and links to them. It doesn't touch the new tab page, so it coexists with new-tab extensions like Glean's.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. **Load unpacked** and pick this folder.
3. Click the extension's toolbar icon (pin it from the puzzle-piece menu to keep it visible).

## How it works

An extension can't list your machine's listening sockets, so the popup probes a set of localhost ports with a plain
`GET /` each time it opens. Anything that answers with HTTP gets a row; the page title and favicon come from the
response. The extension's `http://localhost/*` host permission is what lets the popup read those cross-origin
responses.

- The previous result is shown immediately, then the ports are rescanned (at most once per 10 seconds). `↻` forces a
  rescan.
- Default ports: `80, 1234, 3000-9999`, minus common database ports. Change them with `⚙` (or the extension's
  Options). Closed ports fail instantly on localhost, so scanning thousands of ports is cheap.
- Probing a port that is open but isn't HTTP (a database, say) sends it a stray `GET /` request. That's why the default
  ignore list covers Postgres, MySQL, Redis and friends.
- Only plain `http://` is probed, so apps that serve only HTTPS won't show up. Ports Chrome blocks outright (for
  example 6000, 6665-6669) can't be probed either.
- If you inspect the popup in DevTools, the console will be full of `ERR_CONNECTION_REFUSED` lines, one per closed
  port. That's Chrome logging the failed probes and is expected.
- An app that takes longer than 1.5 seconds to answer `GET /` (a busy single-threaded dev server, say) is skipped
  until the next scan.
- Not linked: apps on a LAN-only address, since they aren't reachable as `localhost`.

## Why a popup and not a new tab page

Chrome lets only one extension override the new tab page, so an extension that did would fight with Glean (or any
other new-tab extension) over it. This one used to be a new tab page (`localhost-newtab`); it is now a popup.
