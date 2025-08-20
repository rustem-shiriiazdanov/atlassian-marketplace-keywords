# Atlassian Marketplace Keywords Visualization

Interactive dashboard for analyzing Atlassian Marketplace search keyword trends and zero-result patterns.

## Overview

This tool provides comprehensive visualization of:
- **Popular Search Keywords**: Bar chart race showing trending search terms over time
- **Zero-Result Analysis**: Keywords that return no marketplace results  
- **Keyword Trails**: Trend lines for top keywords across months
- **Heatmap**: Visual representation of zero-result patterns

## Quick Start

### Option 1: Use Demo Data
1. Open `index.html` in a web browser
2. Click **"Load demo"** to see the visualization with sample data
3. Click **"▶ Play"** to start the animated bar chart race

### Option 2: Upload Your Own Data
1. Open `index.html` in a web browser
2. Upload Excel files using the data input controls:
   - **Popular Search Keywords**: Upload `.xlsx` file with `Raw` sheet containing `month`, `keyword`, `percentage` columns
   - **Zero-Result Keywords**: Upload `.xlsx` file with `Raw` sheet containing `month`, `keyword`, `count` columns

### Option 3: Use Default Files (GitHub Pages)
If hosting on GitHub Pages or local server, place your data files in:
- `./data/source_search_keywords_marketplace.xlsx` (Popular keywords)
- `./data/zero_result_keywords_marketplace.xlsx` (Zero-result keywords)

The application will automatically load these files on startup.

## Data Format Requirements

### Popular Search Keywords File
**Sheet Name**: `Raw`
**Required Columns**:
- `month`: Date in format YYYY-MM-DD or Excel date
- `keyword`: Search term text
- `percentage`: Numeric percentage value

### Zero-Result Keywords File
**Sheet Name**: `Raw`  
**Required Columns**:
- `month`: Date in format YYYY-MM-DD or Excel date
- `keyword`: Search term text  
- `count`: Numeric count of zero-result searches

**Optional Sheet**: `Monthly_Summary`
- `month`: Date in format YYYY-MM-DD or Excel date
- `sum_count`: Total zero-result count for the month

## Controls & Features

### Bar Chart Race
- **Top N**: Adjust number of keywords shown (5-20)
- **Speed**: Control animation speed (0.3s - 3.0s per frame)
- **Play/Pause**: Start/stop the timeline animation

### Keyword Trails
- **Trails**: Number of top keywords to track (3-12)
- **Legend Pages**: Navigate through keyword legend (2 rows per page)

### Zero-Result Heatmap
- **Heatmap TopK**: Number of top zero-result keywords (8-30)
- **Heat Range**: Filter by month range using dual sliders

### Narrative Insights
- Summarizes top rising keywords and zero-result trends from the latest month

## Technical Features

- **Responsive Design**: Works on desktop and mobile devices
- **CDN Fallbacks**: Automatically tries multiple CDNs for libraries
- **Real-time Updates**: Charts update instantly when controls change
- **Data Validation**: Handles missing or malformed data gracefully
- **Export Ready**: Charts can be screenshot or printed

## Libraries Used

- **ECharts 5.5.0**: Advanced charting library
- **XLSX**: Excel file reading capability
- **Pure JavaScript**: No framework dependencies

## Browser Support

- Modern browsers with JavaScript enabled
- Chrome, Firefox, Safari, Edge
- Mobile browsers supported

## Troubleshooting

### Charts Not Loading
- Check browser console for errors
- Ensure JavaScript is enabled
- Try different CDN by refreshing the page

### Data Not Showing
- Verify Excel file format matches requirements
- Check that sheet names are exactly `Raw` (case-sensitive)
- Ensure date columns contain valid dates
- Verify numeric columns contain numbers, not text

### File Upload Issues
- Use `.xlsx` or `.xls` format only
- File size limit depends on browser memory
- Try smaller date ranges if performance is slow

### Demo Not Working
Click **"Run smoke tests"** to verify all components are functioning.

## File Structure

```
atlassian-marketplace-keywords/
├── index.html                    # Main application file
├── README.md                     # This documentation
└── data/                        # Default data directory
    ├── source_search_keywords_marketplace.xlsx
    └── zero_result_keywords_marketplace.xlsx
```

## Usage Tips

1. **Best Performance**: Use data sets with 6-24 months of data
2. **Keyword Limits**: For best readability, limit to top 20-30 keywords
3. **Date Consistency**: Ensure consistent date formats across your data
4. **File Naming**: Keep original column names for automatic detection
5. **Memory Usage**: Large files (>50MB) may cause browser slowdown
