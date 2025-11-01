// comparison.js
// Story of Global Conflict — Interactive Visualizations
// Author: MNSW Group — Università di Genova
// Inspired by Federica Fragapane's human-centered data storytelling style

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
const margin = { top: 50, right: 30, bottom: 100, left: 160 };
const innerW = svgW - margin.left - margin.right;
const innerH = svgH - margin.top - margin.bottom;

const container = d3.select("#heatmap-container");
container.selectAll("*").remove();

const rootSvg = container.append("svg")
  .attr("width", svgW)
  .attr("height", svgH);

const svg = rootSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip1 = d3.select("body").append("div")
  .attr("class", "heatmap-tooltip")
  .style("opacity", 0);

// Load the dataset
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
    currentMode = mode;
    const countries = modeCountries[mode];
    if (!countries || !countries.length) return;

    // For 5-year modes, rank by 5 years but show full timeline
    const filtered = data.filter(d => countries.includes(d.Country));

    const yearsInView = Array.from(new Set(filtered.map(d => d.Year))).sort(d3.ascending);
    const x = d3.scaleBand().domain(yearsInView).range([0, innerW]).padding(0.03);
    const y = d3.scaleBand().domain(countries).range([0, innerH]).padding(0.03);

    const maxFatal = d3.max(filtered, d => d.Fatalities) || 1;
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxFatal]);

    svg.selectAll("*").remove();

    // Axes
    const tickEvery = Math.max(1, Math.ceil(yearsInView.length / 12));
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
          .style("fill", d => color(d.Fatalities))
          .on("mousemove", (event,d)=>{
            tooltip1.transition().duration(100).style("opacity",1);
            tooltip1.html(`<strong>${d.Country}</strong><br>Year: ${d.Year}<br>Fatalities: ${d.Fatalities.toLocaleString()}`)
              .style("left",(event.pageX+12)+"px")
              .style("top",(event.pageY-28)+"px");
          })
          .on("mouseout",()=>tooltip1.transition().duration(200).style("opacity",0)),
        update => update.transition().duration(300)
          .style("fill", d => color(d.Fatalities)),
        exit => exit.transition().duration(200).style("opacity",0).remove()
      );

    // Legend
    d3.select("#heatmap-legend").html("");
    const legendW = 320, legendH = 12;
    const legendSvg = d3.select("#heatmap-legend")
      .append("svg")
      .attr("width", legendW)
      .attr("height", 48);

    const defs = legendSvg.append("defs");
    const gradient = defs.append("linearGradient").attr("id", "hm-grad");
    d3.ticks(0,1,8).forEach(t => {
      gradient.append("stop").attr("offset", `${t*100}%`).attr("stop-color", d3.interpolateYlOrRd(t));
    });

    legendSvg.append("rect")
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("y", 8)
      .attr("rx", 3)
      .style("fill", "url(#hm-grad)");

    const legendScale = d3.scaleLinear().domain([0, maxFatal]).range([0, legendW]);
    legendSvg.append("g")
      .attr("transform", `translate(0, ${8 + legendH})`)
      .call(d3.axisBottom(legendScale).ticks(4).tickFormat(d3.format(".2s")))
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
} else {
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

    // const labelMap = {
    //   highestOverall: "Top 20 countries by total civilian fatalities (all years)",
    //   highest5:       `Top 20 countries by civilian fatalities in the last 5 years (${cutoff}–${maxYear}), full timeline shown`,
    //   lowestOverall:  "20 countries with smallest non-zero total civilian fatalities (all years)",
    //   lowest5:        `20 countries with smallest non-zero civilian fatalities in the last 5 years (${cutoff}–${maxYear}), full timeline shown`
    // };
    d3.select("#heatmap-summary").html(labelMap[mode]);
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

d3.csv("data/cumulative-deaths-in-armed-conflicts-by-country-region-and-type.csv").then((data) => {
  // Unique regions
  const regions = ["World", "Africa", "Asia and Oceania", "Middle East", "Europe", "Americas"];

  // Dropdown for region selection
  const container = d3.select("#waffle-chart-container");
  container.selectAll("*").remove();

  const controls = container.append("div")
    .attr("class", "waffle-controls");

  controls.append("label")
    .attr("for", "waffleRegion")
    .text("Select Region: ");

  const select = controls.append("select")
    .attr("id", "waffleRegion")
    .selectAll("option")
    .data(regions)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // Tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "heatmap-tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.75)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "6px");

  const svgSize = 400;
  const margin = { top: 40, right: 20, bottom: 80, left: 20 };
  const gridSize = 10;
  const cell = (svgSize - margin.left - margin.right) / gridSize;

  const svg = container.append("svg")
    .attr("width", svgSize)
    .attr("height", svgSize + 120)
    .attr("viewBox", `0 0 ${svgSize} ${svgSize + 120}`);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const color = d3.scaleOrdinal()
    .domain(["Battle-related deaths", "One-sided violence", "Non-state conflict", "Intrastate conflict"])
    .range(["#e85d04", "#ffba08", "#4361ee", "#4895ef"]);

  // Legend group
  const legend = svg.append("g")
    .attr("class", "waffle-legend")
    .attr("transform", `translate(${margin.left},${svgSize - 10})`);

  // Function to draw waffle
  function draw(region = "World") {
    const row = data.find(d => d.Entity === region);
    if (!row) return;

    const categories = [
      { key: "Battle-related deaths", value: +row["Battle-related deaths"] },
      { key: "One-sided violence", value: +row["One-sided violence"] },
      { key: "Non-state conflict", value: +row["Non-state conflict"] },
      { key: "Intrastate conflict", value: +row["Intrastate conflict"] },
    ];

    const total = d3.sum(categories, d => d.value);
    categories.forEach(d => {
      d.percentage = (d.value / total) * 100;
      d.displayValue = d3.format(",")(Math.round(d.value));
    });

    // Generate waffle squares
    let squares = [];
    let start = 0;
    categories.forEach(cat => {
      const count = Math.round(cat.percentage);
      for (let i = start; i < start + count; i++) {
        squares.push({ category: cat.key });
      }
      start += count;
    });

    // Bind data
    const rects = g.selectAll(".waffle-square").data(squares, (d, i) => i);

    // EXIT
    rects.exit()
      .transition().duration(300)
      .style("opacity", 0)
      .remove();

    // UPDATE + ENTER
    rects.enter()
      .append("rect")
      .attr("class", "waffle-square")
      .attr("rx", 4)
      .attr("width", cell - 3)
      .attr("height", cell - 3)
      .attr("x", (d, i) => (i % gridSize) * cell)
      .attr("y", (d, i) => Math.floor(i / gridSize) * cell)
      .attr("fill", d => color(d.category))
      .style("opacity", 0)
      .transition()
      .delay((d, i) => i * 10)
      .duration(600)
      .style("opacity", 1);

    // Tooltip interactivity
    g.selectAll(".waffle-square")
      .on("mousemove", (event, d) => {
        const c = categories.find(c => c.key === d.category);
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(
          `<strong>${c.key}</strong><br>${Math.round(c.percentage)}%<br>${c.displayValue} deaths`
        )
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

    // Legend update
    const legendItems = legend.selectAll(".legend-item")
      .data(categories, d => d.key);

    const legendEnter = legendItems.enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(${i * 120},0)`);

    legendEnter.append("rect")
      .attr("width", 16)
      .attr("height", 16)
      .attr("rx", 3)
      .attr("fill", d => color(d.key));

    legendEnter.append("text")
      .attr("x", 24)
      .attr("y", 13)
      .attr("fill", "#333")
      .attr("font-size", "13px")
      .text(d => d.key);

    legendItems.select("rect").transition().attr("fill", d => color(d.key));

    // Summary text
    d3.select("#waffle-summary").html(
      `<strong>${region}</strong> — ${d3.format(",")(Math.round(total))} total deaths across all recorded conflicts.`
    );
  }

  // Initial draw
  draw("World");

  // Update on dropdown change
  select.on("change", (event) => {
    const region = event.target.value;
    draw(region);
  });
});
