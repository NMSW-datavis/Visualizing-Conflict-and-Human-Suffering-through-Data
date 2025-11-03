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
//createPlaceholder("#bar-chart-container");

async function drawBarChart() {
  // Load CSV
  const data = await d3.csv("data/acled_conflict_index_fullyear2024_allcolumns-2.csv", d3.autoType);
  console.log("Data loaded:", data);

  // Filter and sort
  const extreme = data
    .filter(d => d["Index Level"] === "Extreme")
    .sort((a, b) => d3.descending(a["Total Score"], b["Total Score"]))
    .slice(0, 10);

  if (extreme.length === 0) {
    console.error("No data with Index Level = 'Extreme' found.");
    return;
  }

  // Dimensions
  const margin = { top: 40, right: 40, bottom: 40, left: 140 };
  const width = 824;
  const barHeight = 28;
  const height = extreme.length * barHeight + margin.top + margin.bottom;

  // Scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(extreme, d => d["Total Score"])])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(extreme.map(d => d.Country))
    .range([margin.top, height - margin.bottom])
    .padding(0.15);

  const color = d3.scaleSequential()
    .domain([0, d3.max(extreme, d => d["Total Score"])])
    .interpolator(d3.interpolateInferno);

  // SVG container
  const svg = d3.select("#bar-chart-container")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font-family", "sans-serif");

  // Tooltip
const tooltip = d3.select("body").append("div").attr("class", "tooltip-style");

  // Bars
  svg.selectAll("rect")
  .data(extreme)
  .join("rect")
    .attr("x", x(0))
    .attr("y", d => y(d.Country))
    .attr("width", 0)
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d["Total Score"]))
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
             .style("opacity", 1);
    })
    .on("mousemove", (event, d) => {
      tooltip.html(`<strong>${d.Country}</strong><br>
                    Total Score: ${d["Total Score"]}<br>
                    Deadliness: ${d["Deadliness Value Scaled"]}<br>
                    Danger: ${d["Danger Value Scaled"]}`)
             .style("left", (event.pageX + 15) + "px")
             .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })
    .transition()
      .duration(1200)
      .delay((_, i) => i * 80)
      .attr("width", d => x(d["Total Score"]) - x(0))
    .transition()
      .duration(1200)
      .delay((_, i) => i * 80)
      .attr("width", d => x(d["Total Score"]) - x(0));

  // Country labels
  svg.append("g")
    .selectAll("text")
    .data(extreme)
    .join("text")
      .attr("x", margin.left - 10)
      .attr("y", d => y(d.Country) + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#333")
      .attr("font-size", "12px")
      .text(d => d.Country);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x).ticks(6))
    .call(g => g.select(".domain").remove());
}

drawBarChart();

// --- 2. Grouped Bar Chart ---
// createPlaceholder("#grouped-bar-chart-container");

// --- 4. 100% Stacked Bar Chart ---
//createPlaceholder("#stacked-bar-chart-container");
function createStackedBarChart() {
  const containerId = "#stacked-bar-chart-container";
  d3.select(containerId).selectAll("*").remove();

  // Provided data
  let data = [{"region": "Africa", "interstate": 4.873744458230269, "intrastate": 37.15396043907412, "non-state": 6.5125672717502106, "one-sided": 51.459727830945404}, 
    {"region": "Americas", "interstate": 0.40905123562132795, "intrastate": 17.35037279244775, "non-state": 71.21790445917955, "one-sided": 11.022671512751367}, 
    {"region": "Asia and Oceania", "interstate": 0.8125299227139047, "intrastate": 86.70713357499487, "non-state": 3.5454141303604407, "one-sided": 8.934922371930783}, 
    {"region": "Czechoslovakia", "interstate": NaN, "intrastate": NaN, "non-state": NaN, "one-sided": NaN}, 
    {"region": "Europe", "interstate": 65.09756523374026, "intrastate": 28.568013644360285, "non-state": 0.7281468648859165, "one-sided": 5.606274257013551},
    {"region": "Kosovo", "interstate": 0.0, "intrastate": 63.87665198237885, "non-state": 0.0, "one-sided": 36.12334801762114},
    {"region": "Middle East", "interstate": 4.53215009647467, "intrastate": 80.81735290225062, "non-state": 8.707239431321877, "one-sided": 5.943257569952842}, 
    {"region": "World", "interstate": 9.650922561619677, "intrastate": 50.52977538968817, "non-state": 9.715555693530046, "one-sided": 30.103746355162116}, 
    {"region": "Yemen People's Republic", "interstate": NaN, "intrastate": NaN, "non-state": NaN, "one-sided": NaN}, 
    {"region": "Yugoslavia", "interstate": NaN, "intrastate": NaN, "non-state": NaN, "one-sided": NaN}];

  // Filter valid regions (remove those with NaN and 'World', 'Kosovo' as it's country-specific)
  data = data.filter(d => !isNaN(d.interstate) && d.region !== 'World' && d.region !== 'Kosovo');

  // Flatten the data: {region, type, value}
  const flatData = [];
  data.forEach(d => {
    Object.keys(d).forEach(k => {
      if (k !== 'region') {
        flatData.push({region: d.region, type: k, value: d[k]});
      }
    });
  });

  // Determine the series that need to be stacked.
  const series = d3.stack()
    .keys(d3.union(flatData.map(d => d.type))) 
    .value(([, D], key) => D.get(key)?.value || 0) 
    .offset(d3.stackOffsetExpand)
  (d3.index(flatData, d => d.region, d => d.type)); 

  // Specify the chart’s dimensions (except for the height).
  const width = 928;
  const marginTop = 80;
  const marginRight = 200;
  const marginBottom = 0;
  const marginLeft = 100; 

  // Compute the height from the number of stacks.
  const height = series[0].length * 40 + marginTop + marginBottom;

  // Prepare the scales for positional and color encodings.
  const x = d3.scaleLinear()
    .domain([0, 1]) 
    .range([marginLeft, width - marginRight]);

  const y = d3.scaleBand()
    .domain(d3.groupSort(flatData, (D) => -D.find(d => d.type === "one-sided")?.value / d3.sum(D, d => d.value), d => d.region))
    .range([marginTop, height - marginBottom])
    .padding(0.08);

  const color = d3.scaleOrdinal()
    .domain(['interstate', 'intrastate', 'non-state', 'one-sided'])
    .range(['#084C61', '#DB504A', '#E3B505', '#56A3A6' ]);

  // Create the SVG container.
  const svg = d3.select(containerId)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("max-width", "100%")
    .style("height", "auto");

  
  svg.append("g")
    .selectAll()
    .data(series)
    .join("g")
      .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(D => D.map(d => (d.key = D.key, d)))
    .join("rect")
      .attr("x", marginLeft)
      .attr("y", d => y(d.data[0]))
      .attr("height", y.bandwidth())
      .attr("width", 0)
      .transition()
      .duration(1000)
      .attr("x", d => x(d[0]))
      .attr("width", d => x(d[1]) - x(d[0]));

  //  tooltip
  const tooltipStacked = d3.select("body").append("div").attr("class", "stacked-tooltip").style("opacity", 0);
  svg.selectAll("rect")
    .on("mouseover", (event, d) => {
      tooltipStacked.transition().duration(200).style("opacity", 0.9);
      tooltipStacked.html(`${d.data[0]}<br>${d.key}: ${((d[1] - d[0]) * 100).toFixed(1)}%`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltipStacked.transition().duration(300).style("opacity", 0));

  // Append the horizontal axis.
  svg.append("g")
    .attr("transform", `translate(0,${marginTop})`)
    .call(d3.axisTop(x).ticks(width / 100, "%"))
    .call(g => g.selectAll(".domain").remove());

  // Append the vertical axis.
  svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).tickSizeOuter(0))
    .call(g => g.selectAll(".domain").remove());

  // Add legend to the right
  const legend = svg.append("g")
    .attr("transform", `translate(${width - marginRight + 10}, ${marginTop})`);

  legend.selectAll("rect")
    .data(series.map(d => d.key))
    .enter().append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(series.map(d => d.key))
    .enter().append("text")
    .attr("x", 24)
    .attr("y", (d, i) => i * 20 + 9)
    .attr("dy", "0.35em")
    .text(d => d);
}

createStackedBarChart();
// --- 6. Circle Packing ---
// createPlaceholder("#circle-packing-container");

// --- 7. Dumbbell Plot ---
createPlaceholder("#dumbbell-plot-container");

// --- 8. Stacked Bar (Small Multiples) ---
createPlaceholder("#small-multiples-container");



/* ===================Start CHART 2,6 –  =================== */
/* =================== CONFIG + HELPERS =================== */


const DATA_FILE_1 = "./data/acled_conflict_index_fullyear2024_allcolumns-2.csv";
const DATA_FILE_3 = "./data/cumulative-deaths-in-armed-conflicts-by-country-region-and-type.csv";

// robust parsers
const num = v => {
  if (v == null) return 0;
  const n = +v.toString().trim().replace(/,/g, "");
  return Number.isFinite(n) ? n : 0;
};
const str = v => (v == null ? "" : v.toString().trim());

/* Colors for ACLED metrics (consistent across charts) */
const metricColors = d3.scaleOrdinal()
  .domain(["Deadliness", "Diffusion", "Danger", "Fragmentation"])
  .range(["#2a76b9", "#f08e39", "#7b6ce0", "#4caf50"]);

const fmtInt = d3.format(","), fmtPct = d3.format(".0%"), fmt12 = d3.format(".2f");

// ===== Robust tooltip helpers (final) =====
function makeTooltip() {
  let tip = d3.select("body").select("#cp-tooltip");
  if (tip.empty()) {
    tip = d3.select("body")
      .append("div")
      .attr("id", "cp-tooltip")
      .attr("class", "viz-tooltip");
  }
  return tip;
}

function showTooltip(tip, event, html) {

  tip.style("display", "block");

  tip.html(html)
    .style("opacity", 1)
    .style("transform", "translate(0,0)");

  const r = tip.node().getBoundingClientRect();
  const offset = 14;

  let x = event.clientX + offset;
  let y = event.clientY - r.height - offset;

  if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - offset;
  if (x < 8) x = 8;
  if (y < 8) y = event.clientY + offset;

  tip.style("transform", `translate(${x}px, ${y}px)`)
    .style("opacity", 1);
}

function hideTooltip(tip) {
  tip.style("opacity", 0)
    .style("transform", "translate(-9999px,-9999px)")
    .style("display", "block");
}


// *** HELPER FUNCTION for font contrast ***
function getContrastColor(hexColor) {
  if (!hexColor) return "#000000";
  const color = d3.color(hexColor);
  if (!color) return "#000000";

  const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
  return luminance > 128 ? "#000000" : "#FFFFFF";
}

/* ---------- Legend helpers (Chart 2 only) ---------- */
function addDiscreteLegend(svg, items, color, x, y, horizontal = false, itemGap = 20) {
  const g = svg.append("g").attr("transform", `translate(${x},${y})`).attr("class", "legend");

  const row = g.selectAll("g.l").data(items).join("g")
    .attr("class", "l");

  row.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", d => color(d));
  row.append("text").attr("x", 16).attr("y", 10).text(d => d);

  if (horizontal) {
    let cumulativeWidth = 0;
    row.attr("transform", function (d, i) {
      const currentWidth = this.getBBox().width;
      const xPos = cumulativeWidth;
      cumulativeWidth += currentWidth + itemGap;
      return `translate(${xPos}, 0)`;
    });
  } else {
    row.attr("transform", (d, i) => `translate(0,${i * itemGap})`);
  }

  return g;
}

// Global data variables
let ACLED_DATA = [], CUMULATIVE_DEATHS_DATA = [];

/* =================== CHART 2 – Grouped Bar (Top3 Dimensions) =================== */
function drawChart2(acledData) {
  const top3 = acledData.filter(d => d.IndexLevel.toLowerCase() === "extreme")
    .sort((a, b) => b.TotalScore - a.TotalScore).slice(0, 3).map(d => d.Country);

  const melted = [];
  acledData.filter(d => top3.includes(d.Country)).forEach(row => {
    ["Deadliness", "Diffusion", "Danger", "Fragmentation"].forEach(m => {
      melted.push({ Country: row.Country, Metric: m, Value: row[m] });
    });
  });

  const el = d3.select("#grouped-bar-chart-container");
  el.selectAll("*").remove(); // Clear placeholder
  const tip = makeTooltip(el);

  const W = 720, H = 420;
  const m = { t: 46, r: 20, b: 60, l: 60 }, w = W - m.l - m.r, h = H - m.t - m.b;

  const svg = el.append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);

  const x0 = d3.scaleBand().domain(top3).range([0, w]).padding(0.2);
  const x1 = d3.scaleBand().domain(metricColors.domain()).range([0, x0.bandwidth()]).padding(0.05);
  const y = d3.scaleLinear().domain([0, 1]).range([h, 0]);

  g.append("g").attr("transform", `translate(0,${h})`).attr("class", "axis").call(d3.axisBottom(x0));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y));

  const rects = g.selectAll("rect").data(melted).join("rect")
    .attr("class", "grouped-bar-rect")
    .attr("x", d => x0(d.Country) + x1(d.Metric))
    .attr("y", d => y(d.Value))
    .attr("width", x1.bandwidth())
    .attr("height", d => h - y(d.Value))
    .attr("fill", d => metricColors(d.Metric));

  addDiscreteLegend(svg, metricColors.domain(), metricColors, m.l, 18, true, 24);

  // TOOLTIP HANDLERS
  rects.on("mouseenter", (event, d) => {
    rects.interrupt()
      .classed("fade", true)
      .classed("highlight", false);

    rects.filter(r => r.Country === d.Country)
      .interrupt()
      .classed("fade", false)
      .classed("highlight", true);

    const content = `<b>${d.Country}</b><br>${d.Metric} Score: ${fmt12(d.Value)}`;
    showTooltip(tip, event, content);
  })
    .on("mousemove", event => {
      showTooltip(tip, event, tip.html()); // Reuse content, update position
    })
    .on("mouseleave", () => {
      rects.interrupt()
        .classed("fade", false)
        .classed("highlight", false);
      hideTooltip(tip);
    });
}


function drawCirclePacking() {
  const allItems = CUMULATIVE_DEATHS_DATA
    .filter(d => d.Code !== "" && d.Entity !== "World")
    .map(d => ({
      name: d.Entity,
      value: num(d.deaths_intrastate) + num(d.deaths_onesided) + num(d.deaths_nonstate) + num(d.deaths_interstate),
      deaths_intrastate: num(d.deaths_intrastate),
      deaths_onesided: num(d.deaths_onesided),
      deaths_nonstate: num(d.deaths_nonstate),
      deaths_interstate: num(d.deaths_interstate),
      total_deaths: num(d.deaths_intrastate) + num(d.deaths_onesided) + num(d.deaths_nonstate) + num(d.deaths_interstate)
    }));

  const el = d3.select("#circle-packing-container");
  el.selectAll("*").remove();
  const tip = makeTooltip(el);

  const W = 980, H = 560, chartW = 700;
  const svg = el.append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g");
  const legG = svg.append("g").attr("transform", `translate(${chartW + 10}, 30)`);

  svg.append("rect")
    .attr("class", "svg-background")
    .attr("width", chartW).attr("height", H)
    .attr("fill", "none").style("pointer-events", "all")
    .on("click", () => { activeCategory = null; render(); });

  let currentMetricKey = "value";
  let activeCategory = null;
  let thresholds = { med: 0, high: 0 };
  const importantNames = new Set();

  const interpHigh = d3.interpolateRgb("#9B4E38", "#592E1E");
  const interpMedium = d3.interpolateRgb("#F0B873", "#D98E3A");
  const interpLow = d3.interpolateRgb("#ADD8E6", "#6495ED");

  function getCategory(val) {
    if (val >= thresholds.high) return "high";
    if (val >= thresholds.med) return "medium";
    return "low";
  }

  function render() {
    const items = allItems.filter(d => (d[currentMetricKey] || 0) > 0);

    const values = items.map(d => d[currentMetricKey]).sort(d3.ascending);
    thresholds.med = d3.quantile(values, 0.33) || 0;
    thresholds.high = d3.quantile(values, 0.66) || 0;

    const highItems = items.filter(d => getCategory(d[currentMetricKey]) === "high");
    const medItems = items.filter(d => getCategory(d[currentMetricKey]) === "medium");
    const lowItems = items.filter(d => getCategory(d[currentMetricKey]) === "low");

    const colorHigh = d3.scaleSequential(interpHigh)
      .domain([d3.min(highItems, d => d[currentMetricKey]) || thresholds.high,
      d3.max(highItems, d => d[currentMetricKey]) || thresholds.high]);

    const colorMedium = d3.scaleSequential(interpMedium)
      .domain([d3.min(medItems, d => d[currentMetricKey]) || thresholds.med,
      d3.max(medItems, d => d[currentMetricKey]) || thresholds.high]);

    const colorLow = d3.scaleSequential(interpLow)
      .domain([d3.min(lowItems, d => d[currentMetricKey]) || 1,
      d3.max(lowItems, d => d[currentMetricKey]) || thresholds.med]);

    const getColor = v =>
      (v >= thresholds.high) ? colorHigh(v) :
        (v >= thresholds.med) ? colorMedium(v) :
          colorLow(v);

    const itemsForLayout = activeCategory
      ? items.filter(d => getCategory(d[currentMetricKey]) === activeCategory)
      : items.slice();

    const maxVal = d3.max(itemsForLayout, d => d[currentMetricKey]) || 1;
    const sizeScale = d3.scaleSqrt().domain([0, maxVal]).range([0, 1000]);

    const pack = d3.pack().size([chartW, H]).padding(3);
    const root = d3.hierarchy({ children: itemsForLayout }).sum(d => sizeScale(d[currentMetricKey]));
    const nodes = pack(root).leaves();


    importantNames.clear();
    itemsForLayout
      .sort((a, b) => b[currentMetricKey] - a[currentMetricKey])
      .slice(0, 20)
      .forEach(d => importantNames.add(d.name));

    const node = g.selectAll("g.node").data(nodes, d => d.data.name);
    node.exit().transition().duration(300).style("opacity", 0).remove();

    const enter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("opacity", 0);

    enter.append("circle")
      .attr("r", 0)
      .attr("fill", d => getColor(d.data[currentMetricKey]));

    enter.append("text")
      .attr("class", "circle-pack-label")
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .text(d => d.data.name);

    const nodeMerge = enter.merge(node);

    nodeMerge.transition().duration(400)
      .style("opacity", 1)
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeMerge.select("circle").transition().duration(400)
      .attr("r", d => d.r)
      .attr("fill", d => getColor(d.data[currentMetricKey]));

    nodeMerge.select("text")
      .text(d => d.data.name)
      .style("fill", d => getContrastColor(getColor(d.data[currentMetricKey])))
      .style("font-size", d => Math.max(9, Math.min(13, d.r / 3.5)) + "px")
      .each(function (d) {
        const fits = this.getComputedTextLength() <= d.r * 1.8;
        const shouldShow = activeCategory ? fits : (fits && importantNames.has(d.data.name));
        d3.select(this).style("display", shouldShow ? "block" : "none").style("opacity", shouldShow ? 1 : 0);
      });


    const itemsForLayoutTotal = d3.sum(itemsForLayout, d => d[currentMetricKey]) || 1;
    const byVal = [...itemsForLayout].sort((a, b) => b[currentMetricKey] - a[currentMetricKey]);
    const rankMap = new Map(byVal.map((d, i) => [d.name, i + 1]));
    const bucketLabel = v => (v >= thresholds.high) ? "High" : (v >= thresholds.med) ? "Medium" : "Low";

    nodeMerge.select("circle")
      .style("pointer-events", "all")
      .on("mouseenter", function (event, d) {
        d3.select(this.parentNode).raise();

        let metricLabel = "Deaths";
        if (currentMetricKey === "value") metricLabel = "Total Deaths";
        if (currentMetricKey === "deaths_intrastate") metricLabel = "Intrastate Deaths";
        if (currentMetricKey === "deaths_onesided") metricLabel = "One-sided Deaths";
        if (currentMetricKey === "deaths_nonstate") metricLabel = "Non-state Deaths";

        const v = d.data[currentMetricKey] || 0;
        const pct = (v / itemsForLayoutTotal) * 100;
        const rank = rankMap.get(d.data.name);
        const cat = bucketLabel(v);

        const html = `
          <b>${d.data.name}</b>
          <div>${metricLabel}: ${fmtInt(v)}</div>
          <div>Share in view: ${pct.toFixed(1)}%</div>
          <div>Category: ${cat}</div>
          <div>Rank in view: #${rank}</div>
          <div style="margin-top:4px;color:#bbb">Total (all types): ${fmtInt(d.data.total_deaths)}</div>
        `;
        showTooltip(tip, event, html);
      })
      .on("mousemove", (event) => showTooltip(tip, event, tip.html()))
      .on("mouseleave", () => hideTooltip(tip));
    /* -------------------------------------------------- */

    // Legend
    legG.selectAll("*").remove();
    legG.append("text").attr("class", "legend-title").attr("x", 0).attr("y", 0).text("Death Toll Categories");

    const legendData = [
      { label: `High (≥${fmtInt(thresholds.high)})`, color: interpHigh(0), category: "high", y: 25 },
      { label: `Medium (${fmtInt(thresholds.med)}–${fmtInt(thresholds.high)})`, color: interpMedium(0), category: "medium", y: 50 },
      { label: `Low (<${fmtInt(thresholds.med)})`, color: interpLow(0), category: "low", y: 75 }
    ];

    const legendItems = legG.selectAll("g.l-item").data(legendData, d => d.category)
      .join(enter => {
        const lg = enter.append("g").attr("class", "legend-item-interactive l-item")
          .attr("transform", d => `translate(0,${d.y})`)
          .style("cursor", "pointer");
        lg.append("circle").attr("cx", 8).attr("cy", 0).attr("r", 8).attr("fill", d => d.color).style("opacity", 0.9);
        lg.append("text").attr("x", 24).attr("y", 4).text(d => d.label);
        return lg;
      });

    legendItems
      .classed("active", d => d.category === activeCategory)
      .style("opacity", d => (!activeCategory || d.category === activeCategory) ? 1 : 0.3)
      .on("click", (event, d) => {
        event.stopPropagation();
        activeCategory = (activeCategory === d.category) ? null : d.category;
        render();
      });
  }

  d3.selectAll("#chart-6-controls input[name='metric-toggle']")
    .on("change", function () {
      activeCategory = null;
      currentMetricKey = this.value;
      render();
    });

  render();
}


Promise.all([
  d3.csv(DATA_FILE_1, d => ({
    Country: str(d.Country), IndexLevel: str(d["Index Level"]), TotalScore: num(d["Total Score"]),
    Deadliness: num(d["Deadliness Value Scaled"]), Diffusion: num(d["Diffusion Value Scaled"]),
    Danger: num(d["Danger Value Scaled"]), Fragmentation: num(d["Fragmentation Value Scaled"])
  })),
  d3.csv(DATA_FILE_3, d => ({
    Entity: str(d.Entity), Code: str(d.Code),
    deaths_intrastate: num(d["Cumulative deaths in intrastate conflicts"]),
    deaths_onesided: num(d["Cumulative deaths from one-sided violence"]),
    deaths_nonstate: num(d["Cumulative deaths in non-state conflicts"]),
    deaths_interstate: num(d["Cumulative deaths in interstate conflicts"])
  }))
]).then(([acled, cum]) => {
  ACLED_DATA = acled;
  CUMULATIVE_DEATHS_DATA = cum;

  drawChart2(ACLED_DATA);
  drawCirclePacking();

}).catch(e => console.error("Data load error:", e));



Promise.all([
  d3.csv(DATA_FILE_1, d => ({
    Country: str(d.Country), IndexLevel: str(d["Index Level"]), TotalScore: num(d["Total Score"]),
    Deadliness: num(d["Deadliness Value Scaled"]), Diffusion: num(d["Diffusion Value Scaled"]),
    Danger: num(d["Danger Value Scaled"]), Fragmentation: num(d["Fragmentation Value Scaled"])
  })),
  d3.csv(DATA_FILE_3, d => ({
    Entity: str(d.Entity), Code: str(d.Code),
    deaths_intrastate: num(d["Cumulative deaths in intrastate conflicts"]),
    deaths_onesided: num(d["Cumulative deaths from one-sided violence"]),
    deaths_nonstate: num(d["Cumulative deaths in non-state conflicts"]),
    deaths_interstate: num(d["Cumulative deaths in interstate conflicts"])
  }))
]).then(([acled, cum]) => {
  ACLED_DATA = acled;
  CUMULATIVE_DEATHS_DATA = cum;

  drawChart2(ACLED_DATA);
  drawCirclePacking();

}).catch(e => console.error("Data load error:", e));


/* =================== EndCHART 2,6 –  =================== */

/* =================== EndCHART 2,6 –  =================== */
