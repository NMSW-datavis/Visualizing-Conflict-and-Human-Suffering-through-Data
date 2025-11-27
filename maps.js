(async function(){
  const csvPath = "data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv";
  const geoJsonUrl = "data/countries.geojson";

  // --- CONFIG ---
  const regionColors = {
    "Africa": "#e67e22", "Middle East": "#8e44ad", "Americas": "#c0392b",
    "Asia": "#2980b9", "Europe": "#27ae60", "Oceania": "#16a085", "Other": "#95a5a6"
  };

  const tooltip = d3.select("#tooltip");
  const countryList = d3.select("#country-list");

  // Name Reconciliation
  const nameMapping = {
    "United States": "United States of America", "Democratic Republic of Congo": "Democratic Republic of the Congo",
    "Republic of Congo": "Republic of the Congo", "Tanzania": "United Republic of Tanzania",
    "Serbia": "Republic of Serbia", "Guinea-Bissau": "Guinea Bissau", "Cote d'Ivoire": "Ivory Coast",
    "UK": "United Kingdom", "Russia": "Russian Federation"
  };

  // --- DATA LOADING ---
  const [geoData, rawData] = await Promise.all([
    d3.json(geoJsonUrl),
    d3.csv(csvPath, d => ({
      Country: (d.Country || "").trim(),
      Year: +d.Year,
      Fatalities: +d.Fatalities,
      Region: d.Region || "Other" 
    }))
  ]);

  // Fallback Region Map
  const regionMapFallback = {
    "Algeria": "Africa", "Angola": "Africa", "Benin": "Africa", "Botswana": "Africa", "Burkina Faso": "Africa", "Burundi": "Africa", "Cameroon": "Africa", "Cape Verde": "Africa", "Central African Republic": "Africa", "Chad": "Africa", "Comoros": "Africa", "Democratic Republic of Congo": "Africa", "Republic of Congo": "Africa", "Djibouti": "Africa", "Egypt": "Africa", "Equatorial Guinea": "Africa", "Eritrea": "Africa", "eSwatini": "Africa", "Ethiopia": "Africa", "Gabon": "Africa", "Gambia": "Africa", "Ghana": "Africa", "Guinea": "Africa", "Guinea-Bissau": "Africa", "Ivory Coast": "Africa", "Kenya": "Africa", "Lesotho": "Africa", "Liberia": "Africa", "Libya": "Africa", "Madagascar": "Africa", "Malawi": "Africa", "Mali": "Africa", "Mauritania": "Africa", "Mauritius": "Africa", "Mayotte": "Africa", "Morocco": "Africa", "Mozambique": "Africa", "Namibia": "Africa", "Niger": "Africa", "Nigeria": "Africa", "Reunion": "Africa", "Rwanda": "Africa", "Saint Helena, Ascension and Tristan da Cunha": "Africa", "Sao Tome and Principe": "Africa", "Senegal": "Africa", "Seychelles": "Africa", "Sierra Leone": "Africa", "Somalia": "Africa", "South Africa": "Africa", "South Sudan": "Africa", "Sudan": "Africa", "Tanzania": "Africa", "Togo": "Africa", "Tunisia": "Africa", "Uganda": "Africa", "Zambia": "Africa", "Zimbabwe": "Africa",
    "Anguilla": "Americas", "Antigua and Barbuda": "Americas", "Argentina": "Americas", "Aruba": "Americas", "Bahamas": "Americas", "Barbados": "Americas", "Belize": "Americas", "Bermuda": "Americas", "Bolivia": "Americas", "Brazil": "Americas", "British Virgin Islands": "Americas", "Canada": "Americas", "Caribbean Netherlands": "Americas", "Cayman Islands": "Americas", "Chile": "Americas", "Colombia": "Americas", "Costa Rica": "Americas", "Cuba": "Americas", "Curacao": "Americas", "Dominica": "Americas", "Dominican Republic": "Americas", "Ecuador": "Americas", "El Salvador": "Americas", "Falkland Islands": "Americas", "French Guiana": "Americas", "Greenland": "Americas", "Grenada": "Americas", "Guadeloupe": "Americas", "Guatemala": "Americas", "Guyana": "Americas", "Haiti": "Americas", "Honduras": "Americas", "Jamaica": "Americas", "Martinique": "Americas", "Mexico": "Americas", "Montserrat": "Americas", "Nicaragua": "Americas", "Panama": "Americas", "Paraguay": "Americas", "Peru": "Americas", "Puerto Rico": "Americas", "Saint Kitts and Nevis": "Americas", "Saint Lucia": "Americas", "Saint Pierre and Miquelon": "Americas", "Saint Vincent and the Grenadines": "Americas", "Saint-Barthelemy": "Americas", "Saint-Martin": "Americas", "Sint Maarten": "Americas", "Suriname": "Americas", "Trinidad and Tobago": "Americas", "Turks and Caicos Islands": "Americas", "United States": "Americas", "United States Minor Outlying Islands": "Americas", "Uruguay": "Americas", "Venezuela": "Americas", "Virgin Islands, U.S.": "Americas",
    "Afghanistan": "Asia", "Bangladesh": "Asia", "Bhutan": "Asia", "British Indian Ocean Territory": "Asia", "Brunei": "Asia", "Cambodia": "Asia", "China": "Asia", "East Timor": "Asia", "Hong Kong": "Asia", "India": "Asia", "Indonesia": "Asia", "Japan": "Asia", "Kazakhstan": "Asia", "Kyrgyzstan": "Asia", "Laos": "Asia", "Macau": "Asia", "Malaysia": "Asia", "Maldives": "Asia", "Mongolia": "Asia", "Myanmar": "Asia", "Nepal": "Asia", "North Korea": "Asia", "Pakistan": "Asia", "Philippines": "Asia", "Singapore": "Asia", "South Korea": "Asia", "Sri Lanka": "Asia", "Taiwan": "Asia", "Tajikistan": "Asia", "Thailand": "Asia", "Turkmenistan": "Asia", "Uzbekistan": "Asia", "Vietnam": "Asia",
    "Akrotiri and Dhekelia": "Europe", "Albania": "Europe", "Andorra": "Europe", "Austria": "Europe", "Belarus": "Europe", "Belgium": "Europe", "Bosnia and Herzegovina": "Europe", "Bulgaria": "Europe", "Croatia": "Europe", "Cyprus": "Europe", "Czech Republic": "Europe", "Denmark": "Europe", "Estonia": "Europe", "Faroe Islands": "Europe", "Finland": "Europe", "France": "Europe", "Germany": "Europe", "Gibraltar": "Europe", "Greece": "Europe", "Bailiwick of Guernsey": "Europe", "Hungary": "Europe", "Iceland": "Europe", "Ireland": "Europe", "Isle of Man": "Europe", "Italy": "Europe", "Bailiwick of Jersey": "Europe", "Kosovo": "Europe", "Latvia": "Europe", "Liechtenstein": "Europe", "Lithuania": "Europe", "Luxembourg": "Europe", "Malta": "Europe", "Moldova": "Europe", "Monaco": "Europe", "Montenegro": "Europe", "Netherlands": "Europe", "North Macedonia": "Europe", "Norway": "Europe", "Poland": "Europe", "Portugal": "Europe", "Romania": "Europe", "Russia": "Europe", "San Marino": "Europe", "Serbia": "Europe", "Slovakia": "Europe", "Slovenia": "Europe", "Spain": "Europe", "Sweden": "Europe", "Switzerland": "Europe", "Ukraine": "Europe", "United Kingdom": "Europe", "Vatican City": "Europe",
    "Armenia": "Middle East", "Azerbaijan": "Middle East", "Bahrain": "Middle East", "Georgia": "Middle East", "Iran": "Middle East", "Iraq": "Middle East", "Israel": "Middle East", "Jordan": "Middle East", "Kuwait": "Middle East", "Lebanon": "Middle East", "Oman": "Middle East", "Palestine": "Middle East", "Qatar": "Middle East", "Saudi Arabia": "Middle East", "Syria": "Middle East", "Turkey": "Middle East", "United Arab Emirates": "Middle East", "Yemen": "Middle East",
    "American Samoa": "Oceania", "Australia": "Oceania", "Christmas Island": "Oceania", "Cocos (Keeling) Islands": "Oceania", "Cook Islands": "Oceania", "Fiji": "Oceania", "French Polynesia": "Oceania", "Guam": "Oceania", "Heard Island and McDonald Islands": "Oceania", "Kiribati": "Oceania", "Marshall Islands": "Oceania", "Micronesia": "Oceania", "Nauru": "Oceania", "New Caledonia": "Oceania", "New Zealand": "Oceania", "Niue": "Oceania", "Norfolk Island": "Oceania", "Northern Mariana Islands": "Oceania", "Palau": "Oceania", "Papua New Guinea": "Oceania", "Pitcairn": "Oceania", "Samoa": "Oceania", "Solomon Islands": "Oceania", "Tokelau": "Oceania", "Tonga": "Oceania", "Tuvalu": "Oceania", "Vanuatu": "Oceania", "Wallis and Futuna": "Oceania"
  };

  // Pre-process Data & Populate Search Datalist
  const countryStats = {};
  rawData.forEach(d => {
    const reg = d.Region === "Other" || !d.Region ? (regionMapFallback[d.Country] || "Other") : d.Region;
    if(!countryStats[d.Country]) {
      countryStats[d.Country] = { name: d.Country, region: reg, totalFatalities: 0, peakFatalities: 0 };
    }
    countryStats[d.Country].totalFatalities += d.Fatalities;
    if(d.Fatalities > countryStats[d.Country].peakFatalities) countryStats[d.Country].peakFatalities = d.Fatalities;
  });

  // Populate Datalist for Search Autocomplete
  Object.keys(countryStats).sort().forEach(name => {
      countryList.append("option").attr("value", name);
  });

  const statsArray = Object.values(countryStats);
  const maxTotal = d3.max(statsArray, d => d.totalFatalities);

  // --- HELPER: ZOOM & SEARCH LOGIC ---
  function setupMapInteractions(svg, g, width, height, projection, pathGenerator, prefix) {
      // 1. Define Zoom
      const zoom = d3.zoom()
          .scaleExtent([1, 8])
          .translateExtent([[-100, -100], [width + 100, height + 100]])
          .on("zoom", (event) => g.attr("transform", event.transform));

      svg.call(zoom);

      // 2. Button Listeners
      d3.select(`#zoom-in-${prefix}`).on("click", () => svg.transition().duration(500).call(zoom.scaleBy, 1.5));
      d3.select(`#zoom-out-${prefix}`).on("click", () => svg.transition().duration(500).call(zoom.scaleBy, 0.6));
      d3.select(`#zoom-reset-${prefix}`).on("click", () => {
          svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      });

      // 3. Search Logic
      const handleSearch = () => {
          const query = d3.select(`#search-${prefix}`).property("value");
          if(!query) return;

          // Find data name
          const statData = statsArray.find(s => s.name.toLowerCase() === query.toLowerCase());
          if(!statData) { alert("Country not found in dataset"); return; }

          // Find geo feature
          const geoName = nameMapping[statData.name] || Object.keys(nameMapping).find(k => nameMapping[k] === statData.name) || statData.name;
          const feature = geoData.features.find(f => f.properties.name === geoName || f.properties.name === statData.name);

          if (feature) {
              // Calculate bounds
              const [[x0, y0], [x1, y1]] = pathGenerator.bounds(feature);
              const dx = x1 - x0, dy = y1 - y0;
              const x = (x0 + x1) / 2, y = (y0 + y1) / 2;
              
              // Determine scale (max 4x zoom)
              const scale = Math.max(1, Math.min(4, 0.9 / Math.max(dx / width, dy / height)));
              const translate = [width / 2 - scale * x, height / 2 - scale * y];

              svg.transition().duration(1200).call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
              
              // Highlight effect (Temporary stroke)
              // This depends on the map type, but generically:
              g.selectAll("path, circle")
               .filter(d => d === feature || (d.name && d.name === statData.name))
               .attr("stroke", "#000").attr("stroke-width", 2)
               .transition().delay(2000).attr("stroke", "#fff").attr("stroke-width", 0.5); // Reset
          }
      };

      d3.select(`#search-${prefix}`).on("change", handleSearch); // Trigger on Enter or Selection
      d3.select(`#search-${prefix} + button`).on("click", handleSearch);
  }

  // --- HELPER: TOOLTIP ---
  const showTooltip = (e, content) => {
      tooltip.style("display", "block").style("opacity", 1).html(content)
             .style("left", e.clientX + "px").style("top", e.clientY + "px");
  };
  const hideTooltip = () => tooltip.style("display", "none").style("opacity", 0);


  // --- 1. CHOROPLETH (Total Fatalities - Log Scale) ---
  const initChoropleth = () => {
    const container = d3.select("#choropleth-map");
    container.html("");
    const width = container.node().clientWidth;
    const height = 650;
    
    const svg = container.append("svg").attr("width", width).attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

    const projection = d3.geoEqualEarth().fitSize([width, height], geoData);
    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleSequentialLog(d3.interpolateReds).domain([50, maxTotal]); 

    const g = svg.append("g");
    
    // Draw Map
    g.selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const name = d.properties.name;
        const key = Object.keys(nameMapping).find(k => nameMapping[k] === name) || name;
        const stat = countryStats[key] || countryStats[name];
        return (stat && stat.totalFatalities > 0) ? colorScale(stat.totalFatalities) : "#eef0f2";
      })
      .attr("stroke", "#fff").attr("stroke-width", 0.5)
      .on("mouseenter", (e, d) => {
        const name = d.properties.name;
        const key = Object.keys(nameMapping).find(k => nameMapping[k] === name) || name;
        const stat = countryStats[key] || countryStats[name];
        let content = `<strong>${name}</strong><br>No fatalities`;
        if(stat && stat.totalFatalities > 0) {
            content = `<strong>${stat.name}</strong><br>Total Fatalities: ${stat.totalFatalities.toLocaleString()}`;
        }
        showTooltip(e, content);
      })
      .on("mouseleave", hideTooltip);

    // Setup Search & Zoom
    setupMapInteractions(svg, g, width, height, projection, path, "choro");

    // GRADIENT LEGEND
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", "linear-gradient");
    linearGradient.selectAll("stop")
      .data(d3.range(0, 1.1, 0.1)) // 10 steps
      .enter().append("stop")
      .attr("offset", d => d*100 + "%")
      .attr("stop-color", d => colorScale(Math.pow(10, d * Math.log10(maxTotal))));

    const legend = container.append("div").attr("class", "map-legend");
    legend.html(`
        <div class="legend-title">Total Fatalities (Log Scale)</div>
        <div class="legend-gradient" style="background: linear-gradient(to right, #ffe5e5, #67000d);"></div>
        <div class="legend-labels">
            <span>Low</span><span>10k</span><span>100k</span><span>${d3.format(".1s")(maxTotal)}</span>
        </div>
    `);
  };


  // --- 2. PROPORTIONAL SYMBOL MAP ---
  const initSymbolMap = () => {
    const container = d3.select("#symbol-map");
    container.select("svg").remove();
    const width = container.node().clientWidth;
    const height = 650;
    
    const svg = container.append("svg").attr("width", width).attr("height", height);
    const projection = d3.geoMercator().scale(width / 6.5).translate([width / 2, height / 1.5]);
    const path = d3.geoPath().projection(projection);

    const gMap = svg.append("g");
    const gBubbles = svg.append("g");

    // Base Map
    gMap.selectAll("path").data(geoData.features).join("path")
      .attr("d", path).attr("fill", "#f8f9fa").attr("stroke", "#e9ecef");

    const rScale = d3.scaleSqrt().domain([0, maxTotal]).range([0, 55]);

    let currentMode = "total"; 

    const render = () => {
        const nodes = statsArray.map(d => {
            const name = d.name;
            const geoName = nameMapping[name] || Object.keys(nameMapping).find(k => nameMapping[k] === name) || name;
            const feature = geoData.features.find(f => f.properties.name === geoName || f.properties.name === name);
            if(!feature) return null;
            const c = path.centroid(feature);
            return { ...d, x: c[0], y: c[1] };
        }).filter(d => d && !isNaN(d.x));

        nodes.sort((a,b) => b.totalFatalities - a.totalFatalities);

        const circles = gBubbles.selectAll("circle").data(nodes, d => d.name);
        circles.exit().remove();
        circles.enter().append("circle")
            .attr("cx", d=>d.x).attr("cy", d=>d.y).attr("r", 0)
            .merge(circles)
            .transition().duration(800)
            .attr("cx", d=>d.x).attr("cy", d=>d.y)
            .attr("r", d => rScale(currentMode === 'total' ? d.totalFatalities : d.peakFatalities))
            .attr("fill", d => regionColors[d.region]).attr("fill-opacity", 0.6)
            .attr("stroke", "#fff").attr("stroke-width", 0.5);
            
        // Tooltip
        gBubbles.selectAll("circle")
            .on("mouseenter", (e,d) => showTooltip(e, `<strong>${d.name}</strong><br>${currentMode}: ${d[currentMode==='total'?'totalFatalities':'peakFatalities'].toLocaleString()}`))
            .on("mouseleave", hideTooltip);
    };

    render();
    d3.selectAll("input[name='propMode']").on("change", function(){ currentMode = this.value; render(); });

    // Setup Interaction (Note: we target 'gMap' and 'gBubbles' for zoom)
    const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", e => {
        gMap.attr("transform", e.transform);
        gBubbles.attr("transform", e.transform);
    });
    svg.call(zoom);
    
    // Custom wrapper for setup to handle multiple Groups
    d3.select("#zoom-in-symbol").on("click", () => svg.transition().call(zoom.scaleBy, 1.5));
    d3.select("#zoom-out-symbol").on("click", () => svg.transition().call(zoom.scaleBy, 0.6));
    d3.select("#zoom-reset-symbol").on("click", () => svg.transition().call(zoom.transform, d3.zoomIdentity));
    // Search is slightly harder with two groups, sticking to simple zoom on base map logic for now, or custom implementation
    
    // CIRCLE LEGEND
    const legend = container.append("div").attr("class", "map-legend");
    legend.html(`
        <div class="legend-title">Fatalities Magnitude</div>
        <svg width="100" height="80" style="display:block; margin:auto;">
             <circle cx="50" cy="75" r="${rScale(1000000)}" fill="none" stroke="#999" stroke-dasharray="2,2"></circle>
             <text x="50" y="${75 - rScale(1000000) - 2}" text-anchor="middle" font-size="9" fill="#666">1M</text>
             
             <circle cx="50" cy="75" r="${rScale(100000)}" fill="none" stroke="#999" stroke-dasharray="2,2"></circle>
             <text x="50" y="${75 - rScale(100000) - 2}" text-anchor="middle" font-size="9" fill="#666">100k</text>
             
             <circle cx="50" cy="75" r="${rScale(10000)}" fill="none" stroke="#999" stroke-dasharray="2,2"></circle>
        </svg>
    `);
  };


  // --- 3. CARTOGRAM ---
  const initCartogram = () => {
    const container = d3.select("#cartogram-map");
    container.html("");
    const width = container.node().clientWidth;
    const height = 800;
    const svg = container.append("svg").attr("width", width).attr("height", height);

    const projection = d3.geoEqualEarth().fitSize([width, height], geoData);
    const pathGenerator = d3.geoPath().projection(projection);
    const scaleScale = d3.scalePow().exponent(0.5).domain([0, maxTotal]).range([0.15, 3.5]); 

    const g = svg.append("g");

    g.selectAll("path").data(geoData.features).join("path")
     .attr("d", pathGenerator)
     .attr("fill", d => {
         const key = Object.keys(nameMapping).find(k => nameMapping[k] === d.properties.name) || d.properties.name;
         const stat = countryStats[key] || countryStats[d.properties.name];
         return stat ? regionColors[stat.region] : "#ccc";
     })
     .attr("transform", function(d) {
         const key = Object.keys(nameMapping).find(k => nameMapping[k] === d.properties.name) || d.properties.name;
         const stat = countryStats[key] || countryStats[d.properties.name];
         let scale = 0.1; 
         if (stat) scale = scaleScale(stat.totalFatalities);
         const [x,y] = pathGenerator.centroid(d);
         if (isNaN(x)) return null; 
         return `translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`;
     })
     .attr("stroke", "#fff").attr("stroke-width", 0.5)
     .on("mouseenter", (e, d) => {
         const key = Object.keys(nameMapping).find(k => nameMapping[k] === d.properties.name) || d.properties.name;
         const stat = countryStats[key] || countryStats[d.properties.name];
         if(stat) showTooltip(e, `<strong>${stat.name}</strong><br>Fatalities: ${stat.totalFatalities.toLocaleString()}<br>Size: ${scaleScale(stat.totalFatalities).toFixed(1)}x`);
     })
     .on("mouseleave", hideTooltip);

    setupMapInteractions(svg, g, width, height, projection, pathGenerator, "carto");

    // SCALE LEGEND
    const legend = container.append("div").attr("class", "map-legend");
    legend.html(`
        <div class="legend-title">Size Distortion</div>
        <div style="font-size:0.75rem; color:#666; margin-bottom:5px;">
           Countries are scaled by total fatalities.
        </div>
        <div style="display:flex; align-items:end; gap:10px;">
           <div style="text-align:center">
              <div style="width:15px; height:15px; background:#999; margin:0 auto; opacity:0.5"></div>
              <span style="font-size:9px">Peaceful</span>
           </div>
           <div style="text-align:center">
              <div style="width:30px; height:30px; background:#999; margin:0 auto; opacity:0.5"></div>
              <span style="font-size:9px">Conflict</span>
           </div>
           <div style="text-align:center">
              <div style="width:50px; height:50px; background:#999; margin:0 auto; opacity:0.5"></div>
              <span style="font-size:9px">War</span>
           </div>
        </div>
    `);
  };

  initChoropleth();
  initSymbolMap();
  initCartogram();

})();