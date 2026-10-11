# Atlassian Marketplace Keywords Visualization

Interactive, browser-only dashboard for exploring Atlassian Marketplace search data. Turn monthly Excel exports into animated bar chart races, keyword trend lines, zero-result overviews, and heatmaps. Works entirely on the client with no build step or backend.

Site is live at https://rustem-shiriiazdanov.github.io/atlassian-marketplace-keywords/

## Overview

The app consumes two spreadsheets:

- **Popular Search Keywords** – top search queries with percentage share
- **Zero‑Result Keywords** – queries that returned no apps, with counts

With these inputs the site provides six linked pages:

- **This month** (`index.html`) – a monthly brief: a headline written from the numbers, four key figures, searches that found no apps, the top ten, the biggest climbers and the queries that most often found nothing. `index.html?month=YYYY-MM` opens any earlier issue as it looked then.
- **Month by month** (`month-by-month.html`) – every chart: the month-by-month race, searches that found no apps, the biggest queries over the years and the empty-search heatmap. A **Charts show** filter focuses all charts on picked queries.
- **Keyword Explorer** (`keyword-explorer.html`) – one query or a few, month by month: share of searches, top-500 rank and empty searches.
- **Archive** (`archive.html`) – every monthly issue with its #1 query and empty-search total.
- **Method** (`method.html`) – where the numbers come from, what they mean, breaks in the data and which queries count as meaningless.
- **About** (`about.html`) – who makes the site.

All pages follow the system light or dark theme. Shared styles live in `assets/site.css` and shared helpers (loading workbooks, cleaning queries, month labels) in `assets/common.js`.

Data handling: partial monthly reports (Dec 2021, Nov 2023) are shown as published and marked; months whose zero-result total is far below their neighbours (Oct and Dec 2023) are marked; visually identical query variants are folded together. Every query is shown as Atlassian reports it by default. A **Hide meaningless queries** checkbox (on This month, Month by month, Keyword Explorer, Archive and Method; remembered in the browser) leaves out bot noise: queries with no letters or digits, long digit strings such as `1234`, HTML tags, pasted links and e-mail addresses, and script or SQL injection attempts. Totals are always added up from the rows shown. In November 2024 broad queries such as "automation" lost most of their share in one month, as Atlassian rolled out its redesigned Marketplace with autocomplete; trend views mark that month and default to the period after it.

The **Keyword Explorer** keeps the API metrics distinct while placing them on synchronized monthly timelines:

- Search share as a percentage of all Marketplace searches
- Direct Marketplace top-500 rank from the report; missing popular rows are shown as `0%` and **Outside top 500**
- Raw zero-result counts, never presented as a rate
- Exact-query comparison or contains-any/contains-all aggregation
- Date presets, three-month averages, URL state, CSV export, PNG export, and fullscreen charts

## Quick Start

### 1. Use Demo Data
1. Open `month-by-month.html` in a browser.
2. Open `month-by-month.html?debug`, scroll to **Use your own data** and click **Load demo data** (demo and smoke-test buttons only show in debug mode).
3. Press **▶ Play** to start the race.

### 2. Upload Your Data
1. Open `month-by-month.html` and scroll to **Use your own data**.
2. For each file tile choose the proper spreadsheet:
   - **Popular Search Keywords**: `.xlsx` with `Raw` sheet containing `month`, `keyword`, `percentage`
   - **Zero‑Result Keywords**: `.xlsx` with `Raw` sheet containing `month`, `keyword`, `count`. Optional `Monthly_Summary` sheet with `month`, `sum_count`
3. Use the **Charts show** filter to narrow charts to particular terms (optional). Files are read in the browser and never uploaded.

To perform focused analysis, open `keyword-explorer.html` or select the **Keyword Explorer** tab. Its default workbooks load automatically; select exact queries or switch to the contains mode.

### 3. Load Default Files
If the files below exist they autoload on startup or via **Reload repository data**:
- `./data/source_search_keywords_marketplace.xlsx`
- `./data/zero_result_keywords_marketplace.xlsx`

### 4. Run Smoke Tests
Open `month-by-month.html?debug` and click **Run smoke tests** to verify required elements render. On the Keyword Explorer run `KeywordExplorer.runSmokeTests()` in the console.

## Data Format

### Popular Search Keywords
- **Sheet**: `Raw`
- **Columns**: `month` (YYYY-MM-DD or Excel date), `keyword`, `percentage`, `rank`
- `percentage` is the keyword's share of all Marketplace searches; `rank` is its direct position in the monthly top-500 report

### Zero‑Result Keywords
- **Sheet**: `Raw`
- **Columns**: `month`, `keyword`, `count`, `rank`
- **Optional Sheet**: `Monthly_Summary` with `month`, `sum_count`

## Features & Controls

### Data Inputs & Diagnostics
- Upload both spreadsheets
- Keyword filter to limit charts to selected terms
- Buttons: **Reload repository data**, **Load demo data**, **Run smoke tests**

### Search Dynamics — Bar Chart Race & Zero‑Result Overview
- **Top N** slider (5–20 keywords)
- **Speed** slider (0.3–3.0 s per frame)
- **▶ Play/⏸ Pause** animation
- Zero‑result chart toolbar includes **flip** between totals and top zero keywords

### Keyword Trails
- **Trails** slider (3–12 lines)
- Legend page controls to browse keywords

### Zero‑Result Heatmap
- **Heatmap TopK** slider (8–30 keywords)
- **Time Range** sliders to focus on specific months

### Keyword Explorer
- Searchable exact-query picker with removable selection chips
- Contains-any and contains-all aggregation with an inspectable matched-query list
- Separate comparison or combined share/count group mode
- Synchronized search-share, Marketplace-rank, and zero-result timelines
- 6-, 12-, and 24-month presets plus custom month selection
- Three-month average toggle for share and zero-result series
- Comparison table with current and best ranks, share changes, peaks, and zero-result totals
- Shareable URL state plus filtered CSV and chart PNG exports

### Chart Toolbars
Every chart exposes buttons for:
- **Full screen** view with a data table
- **Download** PNG snapshot
- **Share** image/link (Web Share API or share chooser)
- **Flip** (zero‑result chart only)

## Technical Notes
- Pure JavaScript with **ECharts 5.5.0** and **XLSX** libraries
- Newsreader (headlines and numbers) and Public Sans (text) from Google Fonts, with system-font fallbacks
- Light and dark themes from CSS custom properties; charts read the same tokens
- Responsive layout for desktop and mobile; respects reduced-motion settings
- Sequential CDN fallbacks for robust loading
- Automatic default file loading on GitHub Pages
- Built‑in smoke tests to confirm rendering
- No server or build step required

## Browser Support
Modern browsers such as Chrome, Firefox, Safari, Edge, and mobile equivalents with JavaScript enabled.

## Troubleshooting
- **Charts not loading**: check console, ensure JavaScript enabled, refresh to try next CDN
- **Data not showing**: confirm sheet names, date formats, and numeric fields
- **File upload issues**: use `.xlsx`/`.xls`; large files may exhaust memory
- **Demo not working**: click **Run smoke tests** for diagnostics

## File Structure
```
atlassian-marketplace-keywords/
├── index.html                    # This month (monthly brief; ?month=YYYY-MM for earlier issues)
├── month-by-month.html           # All charts
├── keyword-explorer.html         # Focused keyword analysis page
├── archive.html                  # Every monthly issue
├── method.html                   # Sources, definitions, data breaks, removed queries
├── about.html                    # About the author
├── assets/
│   ├── site.css                  # Shared design system (light and dark)
│   └── common.js                 # Shared data loading and helpers
├── README.md                     # Documentation
├── data/                         # Optional default spreadsheets
│   ├── source_search_keywords_marketplace.xlsx
│   └── zero_result_keywords_marketplace.xlsx
└── img/                          # Static assets
    └── actonic.svg
```

## Usage Tips
1. Use 6–24 months of data for smooth animations
2. Limit to top 20–30 keywords for clarity
3. Keep date formats consistent
4. Preserve original column names
5. Large (>50 MB) files can slow down the browser

