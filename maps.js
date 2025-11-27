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
  // 8. INITIALIZATION
  // -------------------------------------------
  initChoropleth();
  initSymbolMap();
  initDensityMap();

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      initChoropleth();
      initSymbolMap();
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