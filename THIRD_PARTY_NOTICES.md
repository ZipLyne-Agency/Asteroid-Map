# Third-party services and data

Asteroid Map uses the following public data and services. Their names do not imply endorsement of this project.

- NASA/JPL Solar System Dynamics, [SBDB Close-Approach Data API](https://ssd-api.jpl.nasa.gov/doc/cad.html): near-Earth close-approach fields and uncertainty values.
- NASA CNEOS, [Asteroid Size Estimator](https://cneos.jpl.nasa.gov/tools/ast_size_est.html): H-magnitude/albedo diameter-estimation method.
- OpenStreetMap contributors and [Nominatim](https://nominatim.org/): search and reverse geocoding. Data is available under the [Open Database License](https://www.openstreetmap.org/copyright).
- [OpenFreeMap](https://openfreemap.org): map style and tiles, with OpenMapTiles / OpenStreetMap attribution displayed by MapLibre.
- [WorldPop](https://www.worldpop.org/): optional 2020 `wpgppop` gridded residential-population totals.
- Collins, Melosh, and Marcus (2005), [Earth Impact Effects Program](https://doi.org/10.1111/j.1945-5100.2005.tb00157.x): first-order impact-effects reference.

JavaScript dependency licenses are recorded in `package-lock.json` and the respective packages distributed through npm.
