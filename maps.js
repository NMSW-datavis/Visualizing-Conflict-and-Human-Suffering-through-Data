(async function () {
  // -------------------------------------------
  // 0. STYLE INJECTION (Updated for Button Group)
  // -------------------------------------------
  const styleId = "map-interactive-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      .map-controls {
        position: absolute; top: 20px; right: 20px;
        display: flex; gap: 4px;
        z-index: 10;
      }
      .ctrl-btn {
        background: white; border: 1px solid #ccc;
        border-radius: 4px; cursor: pointer; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        font-family: sans-serif; font-size: 14px; color: #333;
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s, color 0.2s;
      }
      .ctrl-btn:hover { background: #f8f9fa; color: #000; border-color: #999; }
      
      /* The Reset Button is wider and hidden by default */
      .ctrl-btn.reset-btn {
        width: auto; padding: 0 12px; font-size: 12px; font-weight: 500;
        display: none; /* Hidden by default */
      }
      .ctrl-btn.reset-btn.visible { display: flex; }
      
      .map-container { position: relative; overflow: hidden; }
    `;
    document.head.appendChild(style);
  }

  // -------------------------------------------
  // 1. CONFIGURATION & MAPPINGS
  // -------------------------------------------
  const csvPath = "data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv";
  const geoJsonUrl = "data/countries.geojson";
  const tooltip = d3.select("#tooltip");

  const nameMapping = {
    "United States": "United States of America",
    "Republic of Congo": "Republic of the Congo",
    "Democratic Republic of Congo": "Democratic Republic of the Congo",
    "Tanzania": "United Republic of Tanzania",
    "Cote d'Ivoire": "Ivory Coast",
    "Bolivia": "Bolivia (Plurinational State of)",
    "Venezuela": "Venezuela (Bolivarian Republic of)",
    "Syria": "Syrian Arab Republic",
    "Iran": "Iran (Islamic Republic of)",
    "Laos": "Lao People's Democratic Republic",
    "North Korea": "Democratic People's Republic of Korea",
    "South Korea": "Republic of Korea",
    "Russia": "Russian Federation",
    "Eswatini": "Swaziland",
    "Myanmar": "Myanmar",
    "UK": "United Kingdom"
  };
  const regionColors = {
    "Africa": "#e67e22", "Middle East": "#8e44ad", "Americas": "#c0392b",
    "Asia": "#2980b9", "Europe": "#27ae60", "Oceania": "#16a085", "Other": "#95a5a6"
  };

  const regionMap = {
    "Algeria": "Africa", "Angola": "Africa", "Benin": "Africa", "Botswana": "Africa", "Burkina Faso": "Africa", "Burundi": "Africa", "Cameroon": "Africa", "Cape Verde": "Africa", "Central African Republic": "Africa", "Chad": "Africa", "Comoros": "Africa", "Democratic Republic of Congo": "Africa", "Republic of Congo": "Africa", "Djibouti": "Africa", "Egypt": "Africa", "Equatorial Guinea": "Africa", "Eritrea": "Africa", "eSwatini": "Africa", "Ethiopia": "Africa", "Gabon": "Africa", "Gambia": "Africa", "Ghana": "Africa", "Guinea": "Africa", "Guinea-Bissau": "Africa", "Ivory Coast": "Africa", "Kenya": "Africa", "Lesotho": "Africa", "Liberia": "Africa", "Libya": "Africa", "Madagascar": "Africa", "Malawi": "Africa", "Mali": "Africa", "Mauritania": "Africa", "Mauritius": "Africa", "Mayotte": "Africa", "Morocco": "Africa", "Mozambique": "Africa", "Namibia": "Africa", "Niger": "Africa", "Nigeria": "Africa", "Reunion": "Africa", "Rwanda": "Africa", "Saint Helena, Ascension and Tristan da Cunha": "Africa", "Sao Tome and Principe": "Africa", "Senegal": "Africa", "Seychelles": "Africa", "Sierra Leone": "Africa", "Somalia": "Africa", "South Africa": "Africa", "South Sudan": "Africa", "Sudan": "Africa", "Tanzania": "Africa", "Togo": "Africa", "Tunisia": "Africa", "Uganda": "Africa", "Zambia": "Africa", "Zimbabwe": "Africa",
    "Anguilla": "Americas", "Antigua and Barbuda": "Americas", "Argentina": "Americas", "Aruba": "Americas", "Bahamas": "Americas", "Barbados": "Americas", "Belize": "Americas", "Bermuda": "Americas", "Bolivia": "Americas", "Brazil": "Americas", "British Virgin Islands": "Americas", "Canada": "Americas", "Caribbean Netherlands": "Americas", "Cayman Islands": "Americas", "Chile": "Americas", "Colombia": "Americas", "Costa Rica": "Americas", "Cuba": "Americas", "Curacao": "Americas", "Dominica": "Americas", "Dominican Republic": "Americas", "Ecuador": "Americas", "El Salvador": "Americas", "Falkland Islands": "Americas", "French Guiana": "Americas", "Greenland": "Americas", "Grenada": "Americas", "Guadeloupe": "Americas", "Guatemala": "Americas", "Guyana": "Americas", "Haiti": "Americas", "Honduras": "Americas", "Jamaica": "Americas", "Martinique": "Americas", "Mexico": "Americas", "Montserrat": "Americas", "Nicaragua": "Americas", "Panama": "Americas", "Paraguay": "Americas", "Peru": "Americas", "Puerto Rico": "Americas", "Saint Kitts and Nevis": "Americas", "Saint Lucia": "Americas", "Saint Pierre and Miquelon": "Americas", "Saint Vincent and the Grenadines": "Americas", "Saint-Barthelemy": "Americas", "Saint-Martin": "Americas", "Sint Maarten": "Americas", "Suriname": "Americas", "Trinidad and Tobago": "Americas", "Turks and Caicos Islands": "Americas", "United States": "Americas", "United States Minor Outlying Islands": "Americas", "Uruguay": "Americas", "Venezuela": "Americas", "Virgin Islands, U.S.": "Americas",
    "Afghanistan": "Asia", "Bangladesh": "Asia", "Bhutan": "Asia", "British Indian Ocean Territory": "Asia", "Brunei": "Asia", "Cambodia": "Asia", "China": "Asia", "East Timor": "Asia", "Hong Kong": "Asia", "India": "Asia", "Indonesia": "Asia", "Japan": "Asia", "Kazakhstan": "Asia", "Kyrgyzstan": "Asia", "Laos": "Asia", "Macau": "Asia", "Malaysia": "Asia", "Maldives": "Asia", "Mongolia": "Asia", "Myanmar": "Asia", "Nepal": "Asia", "North Korea": "Asia", "Pakistan": "Asia", "Philippines": "Asia", "Singapore": "Asia", "South Korea": "Asia", "Sri Lanka": "Asia", "Taiwan": "Asia", "Tajikistan": "Asia", "Thailand": "Asia", "Turkmenistan": "Asia", "Uzbekistan": "Asia", "Vietnam": "Asia",
    "Akrotiri and Dhekelia": "Europe", "Albania": "Europe", "Andorra": "Europe", "Austria": "Europe", "Belarus": "Europe", "Belgium": "Europe", "Bosnia and Herzegovina": "Europe", "Bulgaria": "Europe", "Croatia": "Europe", "Cyprus": "Europe", "Czech Republic": "Europe", "Denmark": "Europe", "Estonia": "Europe", "Faroe Islands": "Europe", "Finland": "Europe", "France": "Europe", "Germany": "Europe", "Gibraltar": "Europe", "Greece": "Europe", "Bailiwick of Guernsey": "Europe", "Hungary": "Europe", "Iceland": "Europe", "Ireland": "Europe", "Isle of Man": "Europe", "Italy": "Europe", "Bailiwick of Jersey": "Europe", "Kosovo": "Europe", "Latvia": "Europe", "Liechtenstein": "Europe", "Lithuania": "Europe", "Luxembourg": "Europe", "Malta": "Europe", "Moldova": "Europe", "Monaco": "Europe", "Montenegro": "Europe", "Netherlands": "Europe", "North Macedonia": "Europe", "Norway": "Europe", "Poland": "Europe", "Portugal": "Europe", "Romania": "Europe", "Russia": "Europe", "San Marino": "Europe", "Serbia": "Europe", "Slovakia": "Europe", "Slovenia": "Europe", "Spain": "Europe", "Sweden": "Europe", "Switzerland": "Europe", "Ukraine": "Europe", "United Kingdom": "Europe", "Vatican City": "Europe",
    "Armenia": "Middle East", "Azerbaijan": "Middle East", "Bahrain": "Middle East", "Georgia": "Middle East", "Iran": "Middle East", "Iraq": "Middle East", "Israel": "Middle East", "Jordan": "Middle East", "Kuwait": "Middle East", "Lebanon": "Middle East", "Oman": "Middle East", "Palestine": "Middle East", "Qatar": "Middle East", "Saudi Arabia": "Middle East", "Syria": "Middle East", "Turkey": "Middle East", "United Arab Emirates": "Middle East", "Yemen": "Middle East",
    "American Samoa": "Oceania", "Australia": "Oceania", "Christmas Island": "Oceania", "Cocos (Keeling) Islands": "Oceania", "Cook Islands": "Oceania", "Fiji": "Oceania", "French Polynesia": "Oceania", "Guam": "Oceania", "Heard Island and McDonald Islands": "Oceania", "Kiribati": "Oceania", "Marshall Islands": "Oceania", "Micronesia": "Oceania", "Nauru": "Oceania", "New Caledonia": "Oceania", "New Zealand": "Oceania", "Niue": "Oceania", "Norfolk Island": "Oceania", "Northern Mariana Islands": "Oceania", "Palau": "Oceania", "Papua New Guinea": "Oceania", "Pitcairn": "Oceania", "Samoa": "Oceania", "Solomon Islands": "Oceania", "Tokelau": "Oceania", "Tonga": "Oceania", "Tuvalu": "Oceania", "Vanuatu": "Oceania", "Wallis and Futuna": "Oceania"
  };

  // -------------------------------------------
  // 2. LOAD DATA
  // -------------------------------------------
  const [geoData, rawCsv] = await Promise.all([
    d3.json(geoJsonUrl),
    d3.csv(csvPath)
  ]);

  if (!geoData || !rawCsv) return;

  const geoClean = {
    type: "FeatureCollection",
    features: geoData.features.filter(f => f.properties.name !== "Antarctica")
  };

  // -------------------------------------------
  // 3. DATA PROCESSING
  // -------------------------------------------
  const resolveCountryName = (name) => nameMapping[name] || name;

  const grouped = d3.group(rawCsv, d => (d.Country || "").trim());
  const processedData = [];
const timeData = rawCsv.map(d => {
    const cName = (d.Country || "").trim();
    return {
      country: cName,
      year: +d.Year,
      fatalities: +d.Fatalities,
      region: regionMap[cName] || "Other" 
    };
  }).filter(d => d.fatalities > 0);

  for (const [country, records] of grouped) {
    const getVal = (year) => {
      const r = records.find(d => +d.Year === year);
      return r && !isNaN(+r.Fatalities) ? +r.Fatalities : 0;
    };

    const current = getVal(2024);
    const pastYears = [2019, 2020, 2021, 2022, 2023];
    const avg = d3.mean(pastYears, y => getVal(y));
    const shift = current - avg;

    let pct = avg > 0 ? ((current - avg) / (avg + 1e-6)) * 100 : 0;
    pct = Math.max(Math.min(pct, 300), -300);

    const cumulative = d3.sum(records, d => +d.Fatalities || 0);

    processedData.push({
      Country: country,
      Current: current,
      Shift: shift,
      Pct: pct,
      Cumulative: cumulative
    });
  }

  // -------------------------------------------
  // 4. SHARED UTILITIES
  // -------------------------------------------
  const showTooltip = (e, html) => {
    const tooltipWidth = 280; 
    const xOffset = 15;
    const yOffset = 15;
    let left = e.clientX + xOffset;
    if (left + tooltipWidth > window.innerWidth) {
      left = e.clientX - tooltipWidth - xOffset;
    }
    tooltip.style("opacity", 1)
           .html(html)
           .style("left", left + "px")
           .style("top", (e.clientY + yOffset) + "px");
  };

  const hideTooltip = () => tooltip.style("opacity", 0);

  /**
   * FACTORY: attachZoomControls
   * Adds [ - ] [ + ] [ Reset ] controls
   */
  function attachZoomControls({ svg, container, width, height, renderCallback }) {
    // 1. Define Behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [width, height]])
      .filter(function(event) {
         if (event.type === 'wheel' || event.type === 'dblclick') return true;
         return d3.zoomTransform(this).k > 1.001 || event.type === 'mousedown'; 
      })
      .on("zoom", (e) => {
        renderCallback(e.transform);
        // Show "Reset" only if zoomed in significantly
        container.select(".reset-btn").classed("visible", e.transform.k > 1.01);
      });

    svg.call(zoom).on("dblclick.zoom", null);

    // 2. Create Controls Container
    // Remove old to prevent duplicates on resize
    container.select(".map-controls").remove();
    
    const controls = container.append("div").attr("class", "map-controls");

    // Button: Zoom Out (-)
    controls.append("button")
      .attr("class", "ctrl-btn")
      .text("−") // Minus sign
      .attr("title", "Zoom Out")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      });

    // Button: Zoom In (+)
    controls.append("button")
      .attr("class", "ctrl-btn")
      .text("+")
      .attr("title", "Zoom In")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
      });

    // Button: Reset (Hidden by default)
    controls.append("button")
      .attr("class", "ctrl-btn reset-btn")
      .text("↺ Reset")
      .on("click", () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      });

    // 3. Click-to-Center API
    return function clickToCenter(feature, pathGenerator) {
      if (!feature) return;
      const bounds = pathGenerator.bounds(feature);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];

      svg.transition().duration(750)
         .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    };
  }

  // -------------------------------------------
  // 5. CHART 1: CHOROPLETH
  // -------------------------------------------
  function initChoropleth() {
    const container = d3.select("#choropleth-map");
    container.html("");
    const w = container.node().clientWidth;
    const h = container.node().clientHeight;

    const svg = container.append("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
    const g = svg.append("g");

    const projection = d3.geoNaturalEarth1().fitSize([w, h], geoClean);
    const path = d3.geoPath().projection(projection);

    const maxVal = d3.max(processedData, d => d.Current) || 100;
    const colorScale = d3.scaleSequentialLog(d3.interpolateReds).domain([10, maxVal]);

    g.selectAll("path")
      .data(geoClean.features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const row = processedData.find(r => resolveCountryName(r.Country) === d.properties.name);
        return row && row.Current > 0 ? colorScale(row.Current) : "#e0e0e0";
      })
      .attr("stroke", "#fff").attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => {
        const row = processedData.find(r => resolveCountryName(r.Country) === d.properties.name);
        showTooltip(e, `<b>${d.properties.name}</b><br>2024 Fatalities: ${row ? row.Current.toLocaleString() : 0}`);
        d3.select(e.target).attr("stroke", "#333");
      })
      .on("mouseleave", (e) => {
        hideTooltip();
        const k = d3.zoomTransform(svg.node()).k;
        d3.select(e.target).attr("stroke", "#fff").attr("stroke-width", 0.5 / k);
      })
      .on("click", (e, d) => {
        zoomManager(d, path);
        e.stopPropagation();
      });

    const zoomManager = attachZoomControls({
      svg, container, width: w, height: h,
      renderCallback: (t) => {
        g.attr("transform", t);
        g.selectAll("path").attr("stroke-width", 0.5 / t.k);
      }
    });
  }

  // -------------------------------------------
  // 6. CHART 2: SYMBOL MAP
  // -------------------------------------------
  function initSymbolMap() {
    const container = d3.select("#symbol-map");
    container.html("");
    const w = container.node().clientWidth;
    const h = container.node().clientHeight;

    const svg = container.append("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
    const gMap = svg.append("g");
    const gSymbols = svg.append("g");

    const projection = d3.geoNaturalEarth1().fitSize([w, h], geoClean);
    const path = d3.geoPath().projection(projection);

    gMap.selectAll("path")
      .data(geoClean.features).join("path")
      .attr("class", "map-path")
      .attr("d", path)
      .attr("fill", "#e9ecef").attr("stroke", "#fff").attr("stroke-width", 0.5);

    const nodes = processedData.filter(d => Math.abs(d.Shift) > 1).map(d => {
      const feature = geoClean.features.find(f => {
        const mapped = nameMapping[d.Country] || d.Country;
        return mapped === f.properties.name || d.Country === f.properties.name;
      });
      if (!feature) return null;
      const c = path.centroid(feature);
      if (isNaN(c[0])) return null;
      return { ...d, x: c[0], y: c[1], geoName: feature.properties.name };
    }).filter(Boolean);

    const groups = gSymbols.selectAll("g.symbol-group")
      .data(nodes).join("g")
      .attr("class", "symbol-group")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => {
        const dir = d.Shift > 0 ? "Increasing" : "Decreasing";
        showTooltip(e, `<b>${d.Country}</b><br>Shift: ${d.Shift>0?'+':''}${Math.round(d.Shift)}<br>${dir} (${Math.round(d.Pct)}%)`);
        gMap.selectAll(".map-path").filter(p => p.properties.name === d.geoName).attr("fill", "#dbeafe").attr("stroke", "#333");
      })
      .on("mouseleave", (e, d) => {
        hideTooltip();
        gMap.selectAll(".map-path").filter(p => p.properties.name === d.geoName).attr("fill", "#e9ecef").attr("stroke", "#fff");
      });

    groups.append("path")
      .attr("d", d => {
        const s = 5, h = 7;
        return d.Shift > 0 ? `M 0 ${-h} L ${s} ${h} L ${-s} ${h} Z` : `M 0 ${h} L ${s} ${-h} L ${-s} ${-h} Z`;
      })
      .attr("fill", d => d.Shift > 0 ? "#e74c3c" : "#3498db")
      .attr("stroke", "#fff").attr("stroke-width", 1);

    groups.append("text")
      .text(d => Math.round(Math.abs(d.Pct)) + "%")
      .attr("x", 8).attr("y", 4)
      .attr("font-family", "sans-serif").attr("font-size", "10px").attr("font-weight", "bold")
      .attr("fill", "#333").attr("stroke", "white").attr("stroke-width", 2).attr("paint-order", "stroke");

    attachZoomControls({
      svg, container, width: w, height: h,
      renderCallback: (t) => {
        gMap.attr("transform", t);
        gMap.selectAll("path").attr("stroke-width", 0.5 / t.k);
        gSymbols.attr("transform", t);
        gSymbols.selectAll("g.symbol-group").attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / t.k})`);
      }
    });
  }

  // -------------------------------------------
  // 7. CHART 3: DENSITY MAP
  // -------------------------------------------
  function initDensityMap() {
    const container = d3.select("#density-map");
    container.html("");
    const w = container.node().clientWidth;
    const h = container.node().clientHeight;

    const svg = container.append("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
    const g = svg.append("g");

    const projection = d3.geoNaturalEarth1().fitSize([w, h], geoClean);
    const path = d3.geoPath().projection(projection);

    g.selectAll("path.land")
      .data(geoClean.features).join("path")
      .attr("class", "land")
      .attr("d", path).attr("fill", "#dfe6e9").attr("stroke", "#fff").attr("stroke-width", 0.5);

    const points = [];
    processedData.forEach(d => {
      if (d.Cumulative > 50) {
        const feature = geoClean.features.find(f => {
            const mapped = nameMapping[d.Country] || d.Country;
            return mapped === f.properties.name || d.Country === f.properties.name;
        });
        if (feature) {
          const c = path.centroid(feature);
          if (!isNaN(c[0])) points.push({ x: c[0], y: c[1], weight: d.Cumulative });
        }
      }
    });

    const density = d3.contourDensity()
      .x(d => d.x).y(d => d.y).weight(d => d.weight)
      .size([w, h]).bandwidth(14).thresholds(25)(points);

    const maxD = d3.max(density, d => d.value);
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxD]);

    g.selectAll("path.contour")
      .data(density).join("path")
      .attr("class", "contour")
      .attr("d", d3.geoPath())
      .attr("fill", d => color(d.value)).attr("opacity", 0.7)
      .attr("stroke", "none").style("pointer-events", "all").style("cursor", "crosshair")
      .on("mouseenter", (e, d) => {
        const intensity = Math.round((d.value / maxD) * 100);
        showTooltip(e, `<b>High Density Zone</b><br>Intensity Level: ${intensity}/100<br><span style="font-size:11px; color:#666">Aggregate Impact Area</span>`);
        d3.select(e.target).transition().duration(100).attr("opacity", 1).attr("stroke", "#333").attr("stroke-width", 1);
      })
      .on("mouseleave", (e) => {
        hideTooltip();
        d3.select(e.target).transition().duration(100).attr("opacity", 0.7).attr("stroke", "none");
      });

    attachZoomControls({
      svg, container, width: w, height: h,
      renderCallback: (t) => {
        g.attr("transform", t);
        g.selectAll("path.land").attr("stroke-width", 0.5 / t.k);
        g.selectAll("path.contour[stroke!='none']").attr("stroke-width", 1 / t.k);
      }
    });
  }

  // -------------------------------------------
  //  CHART 2: TIME SLIDER BUBBLE MAP (NEW)
  // -------------------------------------------
  function initTimeSliderMap() {
    const container = d3.select("#bubble-map"); 
    if(container.empty()) return;

    container.html("");
    const w = container.node().clientWidth;
    const h = container.node().clientHeight;

    const svg = container.append("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
    const gMap = svg.append("g");
    const gBubbles = svg.append("g");

    const projection = d3.geoNaturalEarth1().fitSize([w, h], geoClean);
    const path = d3.geoPath().projection(projection);

    // 1. Draw Base Map
    gMap.selectAll("path")
      .data(geoClean.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 0.5);

    // 2. Bubble Scale
    const maxFatalitiesAllTime = d3.max(timeData, d => d.fatalities) || 10000;
    const radiusScale = d3.scaleSqrt().domain([0, maxFatalitiesAllTime]).range([0, 35]);

    // 3. Update Function
    function update(year) {
        d3.select("#current-year").text(year);
        
        const yearData = timeData.filter(d => d.year === year);
        
        const mapData = yearData.map(d => {
            const feature = geoClean.features.find(f => {
                const mapped = nameMapping[d.country] || d.country;
                return mapped === f.properties.name || d.country === f.properties.name;
            });
            if(feature) {
                const c = path.centroid(feature);
                return { ...d, x: c[0], y: c[1] };
            }
            return null;
        }).filter(d => d); 

        const circles = gBubbles.selectAll("circle")
            .data(mapData, d => d.country);

        // Exit
        circles.exit().transition().duration(300).attr("r", 0).remove();

        // Enter
        const enter = circles.enter().append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", 0)
            // 👇 هنا التغيير: استخدام الألوان حسب المنطقة 👇
            .attr("fill", d => regionColors[d.region] || "#95a5a6") 
            .attr("opacity", 0.7)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);

        // Update
        circles.merge(enter)
            .on("mouseenter", (e, d) => {
                showTooltip(e, `<b>${d.country}</b><br>Year: ${d.year}<br>Fatalities: ${d.fatalities.toLocaleString()}<br>Region: ${d.region}`);
                d3.select(e.target).attr("stroke", "#333").attr("opacity", 1);
            })
            .on("mouseleave", (e) => {
                hideTooltip();
                d3.select(e.target).attr("stroke", "#fff").attr("opacity", 0.7);
            })
            .transition().duration(500)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => radiusScale(d.fatalities));
    }

    // 4. Initialize Controls
    const slider = d3.select("#year-slider");
    const playBtn = d3.select("#play-button");
    let timer;
    let isPlaying = false;

    update(+slider.property("value"));

    slider.on("input", function() {
        update(+this.value);
        if(isPlaying) stopAnimation();
    });

    playBtn.on("click", () => {
        if(isPlaying) stopAnimation();
        else startAnimation();
    });

    function startAnimation() {
        isPlaying = true;
        playBtn.text("Pause");
        playBtn.style("background", "#c0392b");
        playBtn.style("color", "white");
        
        timer = setInterval(() => {
            let val = +slider.property("value");
            let max = +slider.attr("max");
            if(val >= max) val = +slider.attr("min");
            else val++;
            slider.property("value", val);
            update(val);
        }, 800);
    }

    function stopAnimation() {
        isPlaying = false;
        playBtn.text("Play Timeline");
        playBtn.style("background", "#1f3b64");
        clearInterval(timer);
    }

    attachZoomControls({
      svg, container, width: w, height: h,
      renderCallback: (t) => {
        gMap.attr("transform", t);
        gMap.selectAll("path").attr("stroke-width", 0.5 / t.k);
        gBubbles.attr("transform", t);
      }
    });
  }

  // -------------------------------------------
  // 8. INITIALIZATION
  // -------------------------------------------
  initChoropleth();
  initTimeSliderMap();
  initDensityMap();
 

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      initChoropleth();
      initTimeSliderMap();
      initDensityMap();
    }, 250);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.map-container').forEach(el => observer.observe(el));
})();