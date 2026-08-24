# Privacy

Asteroid Map has no user accounts, advertising, first-party analytics, or first-party cookies. The application does not intentionally collect or sell personal information.

## Information in scenario URLs

The selected latitude, longitude, location label, asteroid inputs, and optional WorldPop ring totals are encoded in the page URL. This makes scenarios bookmarkable and shareable. The URL stays in the browser unless you share it, navigate through software that records URLs, or make a request that includes it as a referrer. Avoid selecting or sharing a precise private location if that is sensitive.

## Third-party services

- The browser requests map styles, tiles, fonts, and attribution from OpenFreeMap. OpenFreeMap can receive standard request metadata, including IP address, user agent, and requested tile coordinates.
- Location search text, map-selected coordinates, and an allowed GPS fix are sent to this application's server and proxied to OpenStreetMap Nominatim for a place name.
- NASA/JPL close-approach data is requested by the server from the public SBDB CAD API.
- If you choose the WorldPop estimate, the selected coordinates and modeled effect radii are sent to this application's server and then to WorldPop.
- Hosting and network providers may retain ordinary access and error logs under their own policies.

On first visit, the app asks the browser for your location so the map can open on you. If you allow it, the coordinates are reverse-geocoded for a place name and written into the page URL. If you deny that permission, or the browser cannot provide a fix, the map uses a curated city matching your timezone (New York if the timezone is unknown). The app has no database in which to store the point. You can still pick a city, search, or tap the map. GPS does not replace a city, search, map tap, or running simulation you already chose.

For privacy questions, contact `go@ziplyne.agency`.
