// Story of Global Conflict — Interactive Visualizations
// Author: MNSW Group — Università di Genova

// ------------------------------------------------------
// GLOBAL SETTINGS
// ------------------------------------------------------

const colors = {
  primary: "#003a70",
  accent: "#f5b7a3",
  secondary: "#6b6b6b",
  bg: "#fcfbf8",
  softBlue: "rgba(0,58,112,0.4)",
  softCoral: "rgba(245,183,163,0.6)",
};

const transitionDuration = 1000;
const svgWidth = 800;
const svgHeight = 500;

// Helper for SVG creation
function createSVG(containerId) {
  return d3
    .select(containerId)
    .append("svg")
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .style("width", "100%")
    .style("height", "auto");
}

// Helper for tooltip
function createTooltip() {
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("border-radius", "6px")
    .style("font-size", "0.85rem")
    .style("pointer-events", "none")
    .style("opacity", 0);
  return tooltip;
}

const tooltip = createTooltip();


// ------------------------------------------------------
// 3. HEATMAP — Shifting Focus of Civilian Suffering
// ------------------------------------------------------


function norm(s) {
  return !s ? "" : String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

const svgW = 960, svgH = 680;
const margin = { top: 50, right: 30, bottom: 100, left: Math.min(160, svgW * 0.15) };
const innerW = svgW - margin.left - margin.right;
const innerH = svgH - margin.top - margin.bottom;

const container = d3.select("#heatmap-container");
container.selectAll("*").remove();

const rootSvg = container.append("svg").
  attr("viewBox", `0 0 ${svgW} ${svgH}`)
  .attr("width", "100%")
  .attr("height",`auto`);

const svg = rootSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip1 = d3.select("body").append("div")
  .attr("class", "heatmap-tooltip")
  .style("opacity", 0);

// Load the dataset
// --- Assuming file is in root, removed "data/" ---
d3.csv("data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv").then(raw => {

  // Clean and parse
  const data = raw
    .filter(d => d.Country && d.Year)
    .map(d => ({
      Country: d.Country.trim(),
      Year: +d.Year,
      Fatalities: +d.Fatalities || 0
    }));

  const years = Array.from(new Set(data.map(d => d.Year))).sort(d3.ascending);
  const maxYear = d3.max(years);
  const cutoff = maxYear - 4; // last 5 years inclusive

  // Compute totals
  const totalsAll = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.Fatalities), d => d.Country),
    ([Country, total]) => ({ Country, total })
  );

  const totalsRecent = Array.from(
    d3.rollup(
      data.filter(d => d.Year >= cutoff),
      v => d3.sum(v, d => d.Fatalities),
      d => d.Country
    ),
    ([Country, total]) => ({ Country, total })
  );

  // Separate non-zero subsets
  const nonZeroAll = totalsAll.filter(d => d.total > 0);
  const nonZeroRecent = totalsRecent.filter(d => d.total > 0);

  // Sorts
  const sortedHighAll = [...totalsAll].sort((a,b)=>d3.descending(a.total,b.total));
  const sortedLowAll  = [...nonZeroAll].sort((a,b)=>d3.ascending(a.total,b.total));
  const sortedHigh5   = [...totalsRecent].sort((a,b)=>d3.descending(a.total,b.total));
  const sortedLow5    = [...nonZeroRecent].sort((a,b)=>d3.ascending(a.total,b.total));

  // Pick lowest (exclude zero, fill if needed)
  function pickLowest(nonZeroArr, allArr, N) {
    const out = nonZeroArr.slice(0, N).map(d => d.Country);
    if (out.length < N) {
      const zeros = allArr.filter(d => d.total === 0).map(d => d.Country);
      out.push(...zeros.slice(0, N - out.length));
    }
    return out;
  }

  const N = 20;
  const modeCountries = {
    highestOverall: sortedHighAll.slice(0, N).map(d => d.Country),
    highest5:       sortedHigh5.slice(0, N).map(d => d.Country),
    lowestOverall:  pickLowest(sortedLowAll, sortedHighAll, N),
    lowest5:        pickLowest(sortedLow5, sortedHigh5, N)
  };

  let currentMode = "highestOverall";

  function renderHeatmap(mode) {
    d3.select("#heatmap-legend").selectAll("*").remove();
    currentMode = mode;
    const countries = modeCountries[mode];
    console.log("Rendering heatmap for mode:", mode, "with countries:", countries);
    if (!countries || !countries.length) return;
    // console.log("Countries to display:", data);
    // For 5-year modes, rank by 5 years but show full timeline
    const filtered = data.filter(d => countries.includes(d.Country));
    // console.log("Filtered data count:", filtered.length, filtered);
    const yearsInView = Array.from(new Set(data.map(d => d.Year))).sort(d3.ascending);
    console.log("Years in view:", yearsInView);
    const x = d3.scaleBand().domain(yearsInView).range([0, innerW]).padding(0.03);
    const y = d3.scaleBand().domain(countries).range([0, innerH]).padding(0.03);

    // Compute maxFatal
const maxFatal = d3.max(data, d => d.Fatalities) || 1;

// Power scale for perceptual contrast
const colorScale = d3.scalePow()
    .exponent(0.5)           // tweak exponent: <1 boosts small values
    .domain([1, maxFatal])   // 1 to max, 0 handled separately
    .range(["#ffd4d4ff", "#9b0c04ff"]); // faint → strong red

// Function to get color, handle zero separately
function getColor(d) {
    return d.Fatalities === 0 ? "#ffffff" : colorScale(d.Fatalities);
}


  
    svg.selectAll("*").remove();

    // Axes
    const tickEvery = Math.max(1, Math.ceil(yearsInView.length / (innerW / 80)));
    const xTicks = yearsInView.filter((d,i)=>i%tickEvery===0);
    svg.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(xTicks))
      .selectAll("text")
      .attr("transform","rotate(-40)")
      .style("text-anchor","end")
      .style("font-size","11px");

    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll("text")
      .style("font-size","11px");

    // Draw heatmap cells
    svg.selectAll(".heatmap-cell")
      .data(filtered, d => d.Country + "::" + d.Year)
      .join(
        enter => enter.append("rect")
          .attr("class","heatmap-cell")
          .attr("x", d => x(d.Year))
          .attr("y", d => y(d.Country))
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .attr("rx", 3)
          .style("fill", getColor)
          .on("mousemove", (event,d)=>{
            tooltip1.transition().duration(100).style("opacity",1);
            tooltip1.html(`<strong>${d.Country}</strong><br>Year: ${d.Year}<br>Fatalities: ${d.Fatalities.toLocaleString()}`)
              .style("left",(event.pageX+12)+"px")
              .style("top",(event.pageY-28)+"px");
          })
          .on("mouseout",()=>tooltip1.transition().duration(200).style("opacity",0)),
        update => update.transition().duration(300)
          .style("fill", d => getColor(d)),
        exit => exit.transition().duration(200).style("opacity",0).remove()
      );

const legendW = Math.min(360, innerW-100); // scale down on smaller screens
const legendH = 12;
const legendWrap = d3.select("#heatmap-legend");
legendWrap.selectAll("*").remove();
console.log("Creating legend with width:", legendW, innerW);
const legendContainer = legendWrap.append("div")
    .style("margin", "0 20px");  // horizontal margin 20px

const legendSvg = legendContainer.append("svg")
    .attr("width", legendW)
    .attr("height", 48);

const defs = legendSvg.append("defs");
const gradient = defs.append("linearGradient").attr("id", "hm-grad");

// Create gradient stops
const nStops = 100;
for (let i = 0; i <= nStops; i++) {
    const val = i / nStops * maxFatal;
    const offset = (i / nStops) * 100;
    gradient.append("stop")
        .attr("offset", offset + "%")
        .attr("stop-color", val === 0 ? "#ffffff" : colorScale(Math.max(val,1)));
}

legendSvg.append("rect")
    .attr("height", legendH)
    .attr("width", legendW )
    .attr("y", 8)
    .attr("rx", 3)
    .style("fill", "url(#hm-grad)");

const legendScale = d3.scaleLinear()
    .domain([0, maxFatal])
    .range([0, legendW]);

legendSvg.append("g")
    .attr("transform", `translate(0, ${8 + legendH})`)
    .call(d3.axisBottom(legendScale).ticks(6).tickFormat(d3.format(".2s")))
    .selectAll("text")
    .style("font-size","10px");

    // Summary

    // ---------- Summary and Totals ----------

    // Compute totals for selected countries (last 5 years and all years)
    let totalAll = d3.sum(
      data.filter(d => countries.includes(d.Country)),
      d => d.Fatalities
    );

    let total5 = d3.sum(
      data.filter(d => countries.includes(d.Country) && d.Year >= cutoff),
      d => d.Fatalities
    );

    const nCountries = countries.length;

    // Averages per country
    let avgAll = totalAll / nCountries;
    let avg5 = total5 / nCountries;

    // Format numbers
    const fmt = d3.format(","); // e.g. 1,234,567
    const fmtShort = d3.format(".2s"); // e.g. 1.2M

    // Summary label map
    const labelMap = {
      highestOverall: "Top 20 countries by total civilian fatalities (all years)",
      highest5:       `Top 20 countries by civilian fatalities in the last 5 years (${cutoff}–${maxYear}), full timeline shown`,
      lowestOverall:  "20 countries with smallest non-zero total civilian fatalities (all years)",
      lowest5:        `20 countries with smallest non-zero civilian fatalities in the last 5 years (${cutoff}–${maxYear}), full timeline shown`
    };

    // Build summary HTML
    let summaryHTML = `<div><strong>${labelMap[mode]}</strong></div>`;

    if (mode === "highest5" || mode === "lowest5") {
      summaryHTML += `
        <div style="margin-top:8px;">
          <span style="color:var(--color-primary); font-weight:600;">
            Reported Fatalities (Last 5 Years): ${fmt(total5)} 
            <span style="color:var(--color-secondary); font-weight:400;">(avg ${fmtShort(avg5)} per country)</span>
          </span><br>
          <span style="color:var(--color-secondary);">
            Reported Fatalities (All Years): ${fmt(totalAll)} 
            <span style="color:var(--color-secondary); font-weight:400;">(avg ${fmtShort(avgAll)} per country)</span>
          </span>
        </div>
      `;
    } else { // This block now correctly handles "highestOverall" and "lowestOverall"
      summaryHTML += `
        <div style="margin-top:8px;">
          <span style="color:var(--color-primary); font-weight:600;">
            Total Reported Fatalities: ${fmt(totalAll)} 
            <span style="color:var(--color-secondary); font-weight:400;">(avg ${fmtShort(avgAll)} per country)</span>
          </span>
        </div>
      `;
    }

    // Apply animated update
    const summaryEl = d3.select("#heatmap-summary");
    summaryEl.html(summaryHTML);
    summaryEl.classed("fade-in", false);
    setTimeout(() => summaryEl.classed("fade-in", true), 50);

    // --- BUG FIX ---
    // The commented-out block and the line below were overwriting the summary.
    // I have removed them.
    //
    //  // const labelMap = { ... };
    //  d3.select("#heatmap-summary").html(labelMap[mode]); // <--- THIS LINE WAS THE BUG
  }

  // Buttons
  d3.selectAll(".mode-btn").on("click", function() {
    d3.selectAll(".mode-btn").classed("active", false);
    d3.select(this).classed("active", true);
    renderHeatmap(this.dataset.mode);
  });

  // Initial render
  renderHeatmap(currentMode);
});


// ------------------------------------------------------
// 5. INTERACTIVE WAFFLE CHART — The Global Human Toll
// ------------------------------------------------------

// --- Assuming file is in root, removed "data/" ---
d3.csv("data/cumulative-deaths-in-armed-conflicts-by-country-region-and-type.csv").then((data) => {
  const regions = ["World", "Africa", "Asia and Oceania", "Middle East", "Europe", "Americas"];

  const controlsWrap = d3.select("#waffle-controls");
  const chartContainer = d3.select("#waffle-chart-container");
  const legendWrap = d3.select("#waffle-legend");
  const summaryWrap = d3.select("#waffle-summary");

  controlsWrap.selectAll("*").remove();
  chartContainer.selectAll("*").remove();
  legendWrap.selectAll("*").remove();
  summaryWrap.selectAll("*").remove();

  // --- Controls ---
  controlsWrap.style("text-align", "center");
  controlsWrap.append("label")
    .attr("for", "waffleRegion")
    .style("margin-right", "8px")
    .text("Select Region: ");

  const select = controlsWrap.append("select")
    .attr("id", "waffleRegion")
    .style("padding", "6px 12px")
    .style("border-radius", "6px")
    .style("border", "1px solid #ccc")
    .style("font-size", "0.95rem");

  select.selectAll("option")
    .data(regions)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  // --- SVG setup ---
  const svgSize = 160;
  const gridCols = 10, totalSquares = 100;
  const svg = chartContainer.append("svg")
    .attr("viewBox", `0 0 ${svgSize+10} ${svgSize + 10}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "80%")
    .style("max-width", "360px")
    .style("height", "auto")
    .style("display", "block")
    .style("margin", "0 auto");

  const cell = Math.floor(svgSize / gridCols);
  const g = svg.append("g").attr("transform", `translate(5,5)`);

  // This 'color' scale now correctly finds the 'colors' object
  const color = d3.scaleOrdinal()
    .domain(["Intrastate", "One-sided", "Non-state", "Interstate"])
    .range([
      colors.primary,  // deep blue
      colors.accent,   // coral
      "#9ccae2",      // soft blue
      "#b7dfc2"       // pastel mint
    ]);

  const tt = d3.select("body").append("div")
    .attr("class", "waffle-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.8)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "6px")
    .style("font-size", "13px")
    .style("opacity", 0);

  // --- Helper: Flexible region matching ---
  function getRow(region) {
    const lower = region.toLowerCase();
    return data.find(d => (d.Entity || "").trim().toLowerCase().includes(lower));
  }

  // --- Helper: Auto-detect column names ---
  function extractCategories(row) {
    const cols = Object.keys(row);
    const findCol = (pattern) =>
      cols.find(c => c.toLowerCase().includes(pattern.toLowerCase())) || null;

    return [
      { key: "Intrastate", col: findCol("intrastate") },
      { key: "One-sided", col: findCol("one-sided") },
      { key: "Non-state", col: findCol("non-state") },
      { key: "Interstate", col: findCol("interstate") }
    ].map(d => ({
      key: d.key,
      value: d.col ? +row[d.col] || 0 : 0
    }));
  }

  // --- Helper: Convert values into 100-grid representation ---
  function computeSquares(categories) {
    const total = d3.sum(categories, d => d.value) || 1;
    categories.forEach(d => {
      const raw = (d.value / total) * 100;
      d.floor = Math.floor(raw);
      d.frac = raw - d.floor;
    });

    let allocated = d3.sum(categories, d => d.floor);
    let remaining = totalSquares - allocated;
    const byFrac = [...categories].sort((a, b) => d3.descending(a.frac, b.frac));
    for (let i = 0; i < remaining; i++) byFrac[i % byFrac.length].floor += 1;

    const squares = [];
    categories.forEach(cat => {
      for (let i = 0; i < cat.floor; i++) squares.push({ category: cat.key });
    });
    return squares.slice(0, totalSquares);
  }

  // --- Draw function ---
  function draw(region = "World") {
    const row = getRow(region);
    if (!row) {
      summaryWrap.html(`<em>No data available for ${region}.</em>`);
      g.selectAll(".waffle-square").remove();
      legendWrap.html("");
      return;
    }

    const cats = extractCategories(row);
    const total = d3.sum(cats, d => d.value) || 1;
    cats.forEach(c => {
      c.percent = (c.value / total) * 100;
      c.displayValue = d3.format(",")(Math.round(c.value));
    });

    const squares = computeSquares(cats);
    const rects = g.selectAll(".waffle-square")
    .data(squares, (d, i) => d.category + "::" + i);

   rects.join(  enter => enter.append("rect")
      .attr("class", d => `waffle-square cat-${d.category.replace(/\s+/g, '')}`)
      .attr("width", cell - 2)
      .attr("height", cell - 2)
      .attr("rx", 3)
      .attr("x", (d, i) => (i % gridCols) * cell + 1)
      .attr("y", (d, i) => Math.floor(i / gridCols) * cell + 1)
      .style("opacity", 0)
      .attr("fill", d => color(d.category))
      .transition().delay((d, i) => i * 5).duration(300).style("opacity", 1),
  update => update.transition().duration(300).attr("fill", d => color(d.category)),
  exit => exit.transition().duration(200).style("opacity", 0).remove()
);

    rects.transition().duration(300).attr("fill", d => color(d.category));

    g.selectAll(".waffle-square")
      .on("mouseenter", function (event, d) {
        const cat = cats.find(c => c.key === d.category);
        tt.transition().duration(80).style("opacity", 1);
        tt.html(`<strong>${cat.key}</strong><br>${Math.round(cat.percent)}%<br>${cat.displayValue} deaths`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");

        g.selectAll(".waffle-square")
          .transition().duration(120)
          .style("opacity", s => s.category === d.category ? 1 : 0.2)
          .style("stroke", s => s.category === d.category ? "#000" : "none");
      })
      .on("mousemove", event => {
        tt.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => {
        tt.transition().duration(100).style("opacity", 0);
        g.selectAll(".waffle-square").transition().duration(120).style("opacity", 1).style("stroke", "none");
      });

    // --- Legend ---
    legendWrap.html("");
    const legendDiv = legendWrap.append("div").attr("class", "waffle-legend-inner")
      .style("text-align", "center");
    const li = legendDiv.selectAll(".legend-item").data(cats).join("div")
      .attr("class", "legend-item")
      .style("display", "inline-flex")
      .style("align-items", "center")
      .style("gap", "8px")
      .style("margin", "6px 12px");

    li.append("span")
      .style("width", "18px")
      .style("height", "18px")
      .style("border-radius", "4px")
      .style("display", "inline-block")
      .style("background", d => color(d.key));

    li.append("span")
      .style("font-size", "0.9rem")
      .style("color", colors.secondary) // Uses global colors object
      .html(d => `${d.key} — ${Math.round(d.percent)}% (${d.displayValue})`);

    summaryWrap.html(`<strong>${region}</strong> — ${d3.format(",")(Math.round(total))} total deaths across all recorded conflicts.`);
  }

  draw("World");
  select.on("change", e => draw(e.target.value));
});

// ------------------------------------------------------
// PLACEHOLDER GRAPHS (NEW CODE)
// ------------------------------------------------------

/**
 * Creates a placeholder "Coming Soon" message inside an SVG
 * in the specified container.
 * @param {string} containerId - The CSS selector for the chart container (e.g., "#bar-chart-container")
 * @param {string} [text="Chart Coming Soon..."] - The text to display
 */
function createPlaceholder(containerId, text = "Chart Coming Soon...") {
  // Use the global svgWidth and svgHeight constants
  const svg = d3.select(containerId)
    .append("svg")
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .style("width", "100%")
    .style("height", "auto")
    .style("background-color", "#f9f9f9")
    .style("border", "1px dashed #ccc");

  svg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", svgHeight / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-size", "24px")
    .style("fill", "#888")
    .style("font-family", "Fira Sans, sans-serif") // Match your site's font
    .style("font-weight", "500")
    .text(text);
}

// --- 1. Bar Chart ---
createPlaceholder("#bar-chart-container");

// --- 2. Grouped Bar Chart ---
createPlaceholder("#grouped-bar-chart-container");

// --- 4. 100% Stacked Bar Chart ---
createPlaceholder("#stacked-bar-chart-container");

// --- 6. Circle Packing ---
createPlaceholder("#circle-packing-container");

// --- 7. Dumbbell Plot ---
createPlaceholder("#dumbbell-plot-container");

// --- 8. Stacked Bar (Small Multiples) ---
createPlaceholder("#small-multiples-container");