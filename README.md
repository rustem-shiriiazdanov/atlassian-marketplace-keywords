# Atlassian Marketplace Keywords Visualization

Interactive, browser-only dashboard for exploring Atlassian Marketplace search data. Turn monthly Excel exports into animated bar chart races, keyword trend lines, zero-result overviews, and heatmaps. Works entirely on the client with no build step or backend.

Site is live at https://rustem-shiriiazdanov.github.io/atlassian-marketplace-keywords/

## Overview

The app consumes two spreadsheets:

- **Popular Search Keywords** – top search queries with percentage share
- **Zero‑Result Keywords** – queries that returned no apps, with counts

With these inputs the site provides two linked pages:

- **Overview** (`index.html`) – broad Marketplace trends across every imported keyword
- **Keyword Explorer** (`keyword-explorer.html`) – focused analysis of one query or a user-selected set

The Overview provides:

- **Search Dynamics** – bar chart race of popular keywords plus a zero‑result overview that can flip between total counts and top zero keywords
- **Keyword Trails** – line chart tracking how top keywords change over time
- **Zero‑Result Heatmap** – matrix highlighting months and keywords that frequently return nothing

A global **keyword filter** lets you focus on specific terms across all charts. Chart toolbars offer fullscreen, download, and share actions; the zero‑result chart also has a flip button.

The **Keyword Explorer** keeps the API metrics distinct while placing them on synchronized monthly timelines:

- Search share as a percentage of all Marketplace searches
- Direct Marketplace top-500 rank from the report; missing popular rows are shown as `0%` and **Outside top 500**
- Raw zero-result counts, never presented as a rate
- Exact-query comparison or contains-any/contains-all aggregation
- Date presets, three-month averages, URL state, CSV export, PNG export, and fullscreen charts

## Quick Start

### 1. Use Demo Data
1. Open `index.html` in a browser.
2. Click **Load demo**.
3. Press **▶ Play** to start the race.

### 2. Upload Your Data
1. Open `index.html`.
2. For each file input select the proper spreadsheet:
   - **Popular Search Keywords**: `.xlsx` with `Raw` sheet containing `month`, `keyword`, `percentage`
   - **Zero‑Result Keywords**: `.xlsx` with `Raw` sheet containing `month`, `keyword`, `count`. Optional `Monthly_Summary` sheet with `month`, `sum_count`
3. Use the **Keyword Filter** chip to narrow charts to particular terms (optional).

To perform focused analysis, open `keyword-explorer.html` or select the **Keyword Explorer** tab. Its default workbooks load automatically; select exact queries or switch to the contains mode.

### 3. Load Default Files
If the files below exist they autoload on startup or via **Load default files**:
- `./data/source_search_keywords_marketplace.xlsx`
- `./data/zero_result_keywords_marketplace.xlsx`

### 4. Run Smoke Tests
Click **Run smoke tests** to verify required elements render.

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
- Buttons: **Load default files**, **Load demo**, **Run smoke tests**

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
- **Fullscreen** view
- **Download** PNG snapshot
- **Share** image/link (Web Share API or share chooser)
- **Flip** (zero‑result chart only)

## Technical Notes
- Pure JavaScript with **ECharts 5.5.0** and **XLSX** libraries
- Responsive layout for desktop and mobile
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
├── index.html                    # Main application
├── keyword-explorer.html         # Focused keyword analysis page
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

