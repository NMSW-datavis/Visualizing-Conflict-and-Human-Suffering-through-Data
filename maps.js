/**
 * maps.js
 * Visualizing Global Conflict Data
 * * This script renders three types of maps using D3.js v7:
 * 1. Choropleth Map (Intensity by color)
 * 2. Proportional Symbol Map (Magnitude by size)
 * 3. Contour/Density Map (Zones of intensity)
 */

(async function() {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION & SETUP
  // ==========================================
  
  const DATA_PATH = "data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv";
  const GEO_PATH  = "data/countries.geojson";

  // Region colors for the Symbol Map
  const REGION_COLORS = {
    "Africa": "#e67e22",      // Orange
    "Middle East": "#8e44ad", // Purple
    "Americas": "#c0392b",    // Red
    "Asia": "#2980b9",        // Blue
    "Europe": "#27ae60",      // Green
    "Oceania": "#16a085",     // Teal
    "Other": "#95a5a6"        // Grey
  };

  // Tooltip selection
  const tooltip = d3.select("#tooltip");

  // Helper: Show Tooltip
  function showTooltip(event, htmlContent) {
    tooltip
      .style("opacity", 1)
      .html(htmlContent)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 15) + "px");
  }

  // Helper: Hide Tooltip
  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  // ==========================================
  // 2. DATA LOADING & PREPARATION
  // ==========================================

  // Mapping countries to regions (since CSV lacks this column)
  const regionLookup = {
    "Algeria": "Africa", "Angola": "Africa", "Burkina Faso": "Africa", "Democratic Republic of Congo": "Africa",
    "Egypt": "Africa", "Ethiopia": "Africa", "Kenya": "Africa", "Nigeria": "Africa", "Somalia": "Africa", "Sudan": "Africa",
    "Libya": "Africa", "Mali": "Africa", "Mozambique": "Africa", "South Sudan": "Africa",
    "Afghanistan": "Asia", "Myanmar": "Asia", "Pakistan": "Asia", "India": "Asia", "Philippines": "Asia",
    "Ukraine": "Europe", "Russia": "Europe",
    "Colombia": "Americas", "Mexico": "Americas", "Brazil": "Americas", "Venezuela": "Americas", "Haiti": "Americas",
    "Iraq": "Middle East", "Syria": "Middle East", "Yemen": "Middle East", "Palestine": "Middle East", "Israel": "Middle East"
  };

  // Fixing name mismatches between CSV and GeoJSON
  const nameCorrections = {
    "United States": "United States of America",
    "Democratic Republic of Congo": "Democratic Republic of the Congo",
    "Tanzania": "United Republic of Tanzania",
    "Russia": "Russian Federation",
    "Cote d'Ivoire": "Ivory Coast"
  };

  try {
    // Load files concurrently
    const [geoJson, csvData] = await Promise.all([
      d3.json(GEO_PATH),
      d3.csv(DATA_PATH, d => ({
        country: (d.Country || "").trim(),
        fatalities: +d.Fatalities
      }))
    ]);

    // Aggregate Data: Sum fatalities per country
    const countryStats = {};
    
    csvData.forEach(row => {
      const originalName = row.country;
      const cleanName = nameCorrections[originalName] || originalName;
      const region = regionLookup[originalName] || "Other";

      if (!countryStats[cleanName]) {
        countryStats[cleanName] = { name: cleanName, region: region, total: 0 };
      }
      countryStats[cleanName].total += row.fatalities;
    });

    const statsArray = Object.values(countryStats);
    const maxFatalities = d3.max(statsArray, d => d.total) || 1000;


    // ==========================================
    // 3. MAP I: CHOROPLETH (Regional Impact)
    // ==========================================
    function initChoropleth() {
      const container = d3.select("#choropleth-map");
      const width = container.node().clientWidth;
      const height = 600;

      const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

      // Projection
      const projection = d3.geoEqualEarth().fitSize([width, height], geoJson);
      const pathGenerator = d3.geoPath().projection(projection);

      // Log Scale for color (handles skew in data)
      const colorScale = d3.scaleSequentialLog(d3.interpolateReds)
        .domain([10, maxFatalities]);

      const g = svg.append("g");

      // Draw Countries
      g.selectAll("path")
        .data(geoJson.features)
        .join("path")
        .attr("d", pathGenerator)
        .attr("fill", d => {
          const stat = countryStats[d.properties.name];
          return (stat && stat.total > 0) ? colorScale(stat.total) : "#ecf0f1";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseenter", (e, d) => {
          const stat = countryStats[d.properties.name];
          showTooltip(e, `<strong>${d.properties.name}</strong><br>Fatalities: ${stat ? stat.total.toLocaleString() : "No Data"}`);
          d3.select(e.target).attr("stroke", "#333").attr("stroke-width", 1.5);
        })
        .on("mouseleave", (e) => {
          hideTooltip();
          d3.select(e.target).attr("stroke", "#fff").attr("stroke-width", 0.5);
        });

      // Simple Zoom
      const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", e => g.attr("transform", e.transform));
      svg.call(zoom);
    }


    // ==========================================
    // 4. MAP II: PROPORTIONAL SYMBOL (Magnitude)
    // ==========================================
    function initSymbolMap() {
      const container = d3.select("#symbol-map");
      const width = container.node().clientWidth;
      const height = 600;

      const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

      // Mercator projection often looks better for point maps
      const projection = d3.geoMercator()
        .scale(130)
        .translate([width / 2, height / 1.5]);

      const pathGenerator = d3.geoPath().projection(projection);

      // Sqrt Scale for Circle Radius (Area accurate)
      const radiusScale = d3.scaleSqrt()
        .domain([0, maxFatalities])
        .range([2, 55]);

      const mapGroup = svg.append("g");
      const bubbleGroup = svg.append("g");

      // Draw Base Map (Grey)
      mapGroup.selectAll("path")
        .data(geoJson.features)
        .join("path")
        .attr("d", pathGenerator)
        .attr("fill", "#e2e6ea")
        .attr("stroke", "#fff");

      // Prepare Bubble Data
      const bubbles = statsArray.map(stat => {
        const feature = geoJson.features.find(f => f.properties.name === stat.name);
        if (!feature) return null;
        
        const centroid = pathGenerator.centroid(feature);
        if (isNaN(centroid[0])) return null; // Handle missing geometry

        return { ...stat, x: centroid[0], y: centroid[1] };
      }).filter(d => d);

      // Sort: Draw largest circles first so small ones sit on top
      bubbles.sort((a, b) => b.total - a.total);

      // Draw Circles
      bubbleGroup.selectAll("circle")
        .data(bubbles)
        .join("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => radiusScale(d.total))
        .attr("fill", d => REGION_COLORS[d.region] || REGION_COLORS["Other"])
        .attr("fill-opacity", 0.6)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseenter", (e, d) => {
          showTooltip(e, `
            <strong>${d.name}</strong><br>
            <span style="color:${REGION_COLORS[d.region]}">●</span> ${d.region}<br>
            Fatalities: <b>${d.total.toLocaleString()}</b>
          `);
          d3.select(e.target).attr("stroke", "#333").attr("fill-opacity", 0.85);
        })
        .on("mouseleave", (e) => {
          hideTooltip();
          d3.select(e.target).attr("stroke", "#fff").attr("fill-opacity", 0.6);
        });

      // Zoom
      const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", e => {
        mapGroup.attr("transform", e.transform);
        bubbleGroup.attr("transform", e.transform);
      });
      svg.call(zoom);
    }


    // ==========================================
    // 5. MAP III: CONTOUR/DENSITY (Zones of Intensity)
    // ==========================================
    function initContourMap() {
      // We reuse the #cartogram-map ID from HTML to avoid breaking layout
      const container = d3.select("#cartogram-map");
      container.html(""); // Clean up
      
      const width = container.node().clientWidth;
      const height = 700;

      const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

      const projection = d3.geoEqualEarth().fitSize([width, height], geoJson);
      const pathGenerator = d3.geoPath().projection(projection);

      // 1. Draw Base Map (Dark for contrast)
      // Colors adjusted to be visible on dark background
      svg.append("g")
        .selectAll("path")
        .data(geoJson.features)
        .join("path")
        .attr("d", pathGenerator)
        .attr("fill", "#34495e") // Dark Grey-Blue
        .attr("stroke", "#2c3e50") // Slightly darker border
        .attr("stroke-width", 0.5);

      // 2. Prepare Points for Density Calculation
      const points = [];
      statsArray.forEach(stat => {
        const feature = geoJson.features.find(f => f.properties.name === stat.name);
        if (feature && stat.total > 0) {
          const centroid = projection(d3.geoCentroid(feature));
          // d3.contourDensity requires a weight accessor. 
          // We create a point object for the centroid.
          points.push({ 
            x: centroid[0], 
            y: centroid[1], 
            weight: stat.total 
          });
        }
      });

      // 3. Compute Density Contours
      const densityData = d3.contourDensity()
        .x(d => d.x)
        .y(d => d.y)
        .weight(d => d.weight) // Key: weight by fatalities
        .size([width, height])
        .bandwidth(18)  // Smoothness (Higher = blurrier)
        .thresholds(20) // Detail (Higher = more rings)
        (points);

      // 4. Color Scale (Magma looks great on dark backgrounds)
      const colorScale = d3.scaleSequential(d3.interpolateMagma)
        .domain([0, d3.max(densityData, d => d.value)]);

      // 5. Draw Contours
      svg.append("g")
        .selectAll("path")
        .data(densityData)
        .join("path")
        .attr("d", d3.geoPath())
        .attr("fill", d => colorScale(d.value))
        .attr("fill-opacity", 0.6) // Transparency for glowing effect
        .attr("stroke", "none")
        .on("mouseenter", (e) => {
          showTooltip(e, "<strong>High Conflict Density Zone</strong><br>Aggregated impact area");
        })
        .on("mouseleave", hideTooltip);
      
      // Zoom
      const g = svg.selectAll("g");
      const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", e => g.attr("transform", e.transform));
      svg.call(zoom);
    }

    // ==========================================
    // 6. INITIALIZATION
    // ==========================================
    initChoropleth();
    initSymbolMap();
    initContourMap();

  } catch (error) {
    console.error("Error loading data:", error);
    d3.select("#choropleth-map").html(`<p style="color:red; text-align:center; padding:20px;">Error loading data. Please check console.</p>`);
  }

})();
