# Rivergate Remastered

Launch the game with **Launch Rivergate.cmd**. Time starts paused; press Space or the normal-speed button to start the calendar.

The region now contains **152 × 152 tiles**, about ten times the previous map area. Begin with four parcels, buy bordering land from the Region menu, and plan districts around homes, workplaces, utilities and transport.

The remaster includes 138 Blender MCP assets: civic campuses, houses, shops, offices, apartments, industrial buildings, twelve skyscraper variants, sixteen car and vehicle variants, trees, streetlights and construction stages. Some buildings reuse components from Architecture Game. The editable asset workshop is `art/rivergate-remastered.blend`; its authoring script is `tools/create_remaster_kit.py`.

## Calendar and construction

One game day lasts **7.5 seconds at normal speed**. The calendar includes a day, month and year. Finances, household growth and developer decisions settle monthly. Construction advances daily, including upgrades and transport lines, while paused time stops construction.

| Construction | Days |
| --- | ---: |
| Roads / bus line | 1 |
| Avenues / water pipes | 2 |
| Power cables / park | 3 |
| Low-density zoning development | 5 |
| Railway track / civic upgrade | 7 |
| Recycling centre / police / fire station | 12 |
| School / medium-density development / tram line | 14 |
| Water treatment plant / freight terminal | 18 |
| Power plant | 20 |
| Apartment block / passenger rail line | 21 |
| High-density development / civic hall | 24 |
| Hospital / skyscraper / metro line | 30 |

Construction takes between one and thirty game days. Completed buildings need working connections and sufficient service capacity to function. Zoning permits development; eligible developers begin work at month-end.

## Larger buildings and progression

Power plants, water treatment plants and hospitals occupy **3 × 3 tiles**. Schools and most other civic facilities occupy **2 × 2**. A road can touch any edge of a building's footprint. Apartments occupy 2 × 2 tiles and initially hold up to 240 residents; they unlock at 250 residents.

Skyscrapers occupy **4 × 4 tiles**, with wider models retaining their previous vertical scale. They require at least 75,000 residents, 80 happiness, twelve consecutive profitable months before grants, and used public transport. Commissioned towers additionally require no city debt, valuable land, low pollution and strong local services. Redevelopment needs a clear sixteen-tile footprint and sustained healthy conditions.

City projects, residents' requests, regional contracts and five scenarios provide goals and rewards. Garden suburbs, university quarters and industrial ports unlock through projects. Difficulty affects starting capital, costs, upkeep and growth. Temporary financial support expires, so permanent services need sustainable income.

## Finance and controls

The Finance menu shows dollar receipts, expenses, operating budgets, loan payments and tax forecasts. Its sliders show expected monthly dollar amounts. Forecasts change with occupancy, production and the services in operation.

Use the minimap or Region menu to reach distant land. Right-drag pans, middle-drag or Q/E rotates, and the wheel zooms. Home returns to the neighbourhood; H hides the interface and F toggles full screen. Select any tile of a building to inspect or delete its whole footprint. Ctrl+Z undoes recent construction until month-end.

Saves use a compact version-two format and support migration from the previous map. Export city JSON from City & Saves to keep a backup.

Runtime, visual quality and long-term progression remain unverified following the request to stop testing.
