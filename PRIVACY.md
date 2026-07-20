# Privacy

Asteroid Map has no user accounts, advertising, first-party analytics, or first-party cookies. The application does not intentionally collect or sell personal information.

## Information in scenario URLs

The selected latitude, longitude, location label, asteroid inputs, and optional WorldPop ring totals are encoded in the page URL. This makes scenarios bookmarkable and shareable. The URL stays in the browser unless you share it, navigate through software that records URLs, or make a request that includes it as a referrer. Avoid selecting or sharing a precise private location if that is sensitive.

## Third-party services

- The browser requests map styles, tiles, fonts, and attribution from CARTO. CARTO can receive standard request metadata, including IP address, user agent, and requested tile coordinates.
- Location search text and map-selected coordinates are sent to this application's server and proxied to OpenStreetMap Nominatim.
- NASA/JPL close-approach data is requested by the server from the public SBDB CAD API.
- If you choose the WorldPop estimate, the selected coordinates and modeled effect radii are sent to this application's server and then to WorldPop.
- Hosting and network providers may retain ordinary access and error logs under their own policies.

Browser geolocation is used only after you activate the map's location control and grant permission. The result is used to select a simulation point; the app has no database in which to store it.

For privacy questions, contact `go@ziplyne.agency`.
