// =============================
// distribution.js (Enhanced & User-Friendly)
// =============================

// ---------------------------------
// 1. Load and prepare both datasets
// ---------------------------------
const dataFileIndex = "data/acled_conflict_index_fullyear2024_allcolumns-2.csv";
const dataFileFatalities = "data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv";

Promise.all([
  d3.csv(dataFileIndex),
  d3.csv(dataFileFatalities, d => ({
    country: d.Country,
    year: +d.Year,
    fatalities: +d.Fatalities
  }))
]).then(([indexData, fatalityData]) => {

  // =============================
  // Global setup & helpers
  // =============================
  const root = getComputedStyle(document.documentElement);
  const COLOR_PRIMARY = root.getPropertyValue('--color-primary').trim() || '#003a70';
  const COLOR_ACCENT = root.getPropertyValue('--color-accent').trim() || '#f5b7a3';
  const COLOR_SECONDARY = root.getPropertyValue('--color-secondary').trim() || '#6b6b6b';
  const COLOR_TEXT = root.getPropertyValue('--color-text').trim() || '#1f1f1f';
  const COLOR_BORDER = root.getPropertyValue('--color-border').trim() || 'rgba(0, 58, 112, 0.15)';
  const COLOR_BG = root.getPropertyValue('--color-bg').trim() || '#fcfbf8';

  const colorPalette = [
    COLOR_ACCENT, "#87bba2", "#a6d9f7", "#f0d582", "#c3aed6", "#e09a9a", "#a0a0a0"
  ];

  // Utility: SVG creator with title/desc for accessibility
  function createSVG(container, height, title, desc) {
    d3.select(container).html("");
    const id = container.replace("#", "");
    return d3.select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 900 ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "graphics-document")
      .attr("aria-labelledby", `${id}-title ${id}-desc`)
      .call(svg => {
        svg.append("title").attr("id", `${id}-title`).text(title);
        svg.append("desc").attr("id", `${id}-desc`).text(desc);
      });
  }

  const styleAxis = axis => {
    axis.selectAll("line").attr("stroke", COLOR_BORDER);
    axis.selectAll("text").style("fill", COLOR_TEXT);
    axis.select(".domain").attr("stroke", COLOR_BORDER);
  };

  // Tooltip handlers
  const tooltip = d3.select(".viz-tooltip");
  const showTip = (html, event, element) => {
    let x, y;
    if (event) {
      x = event.clientX + 15;
      y = event.clientY + 10;
    } else if (element) {
      const r = element.getBoundingClientRect();
      x = r.right + 15 + window.scrollX;
      y = r.top + r.height / 2 + window.scrollY - 15;
    }
    tooltip.html(html).style("opacity", 1).style("transform", `translate(${x}px, ${y}px)`);
  };
  const hideTip = () => tooltip.style("opacity", 0).style("transform", "translate(-9999px,-9999px)");

  const slugify = str => str.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

  // ============================================================
  // PART 1: HISTOGRAM — Global Conflict Distribution
  // ============================================================
  const histInfoBox = d3.select("#histogram-info");
  const histSVG = createSVG("#histogram", 400, "Global Conflict Score Distribution",
    "Histogram showing distribution of global conflict scores; sliders adjust range."
  );

  const scores = indexData.map(d => ({ country: d.Country, score: +d["Total Score"] }));
  const maxScore = d3.max(scores, d => d.score);
  const minScore = 0;

  const margin = { top: 50, right: 40, bottom: 50, left: 80 };
  const width = 900 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleSqrt().range([height, 0]);

  const g = histSVG.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const barsG = g.append("g");
  const xAxisG = g.append("g").attr("transform", `translate(0,${height})`);
  const yAxisG = g.append("g");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("fill", COLOR_TEXT)
    .text("Total Conflict Score");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .style("fill", COLOR_TEXT)
    .text("Number of Countries (√ scale)");

  const updateHistogram = ([min, max]) => {
    x.domain([min, max]);
    const bins = d3.bin()
      .domain(x.domain())
      .thresholds(20)
      .value(d => d.score)(scores.filter(d => d.score >= min && d.score <= max));

    bins.forEach(b => b.countries = b.map(d => d.country).sort());
    y.domain([0, d3.max(bins, d => d.length)]);

    // Axes
    xAxisG.transition().duration(300).call(d3.axisBottom(x)).call(styleAxis);
    yAxisG.transition().duration(300).call(d3.axisLeft(y).ticks(5)).call(styleAxis);

    const bars = barsG.selectAll("rect").data(bins, d => d.x0);

    bars.exit().transition().duration(200).attr("height", 0).remove();

    const enterBars = bars.enter().append("rect")
      .attr("x", d => x(d.x0))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("y", y(0)).attr("height", 0)
      .attr("fill", COLOR_ACCENT)
      .attr("stroke", COLOR_PRIMARY)
      .attr("opacity", 0.85)
      .style("cursor", "pointer")
      .on("mouseover focus", function (e, d) {
        d3.select(this).attr("fill", COLOR_PRIMARY);
        const countries = d.countries.length
          ? `<ul>${d.countries.map(c => `<li>${c}</li>`).join("")}</ul>`
          : `<p>No countries in this range.</p>`;
        histInfoBox.html(`<h4>${d.length} countries (Score ${d.x0.toFixed(1)}–${d.x1.toFixed(1)})</h4>${countries}`);
        showTip(`<b>Score:</b> ${d.x0.toFixed(1)}–${d.x1.toFixed(1)}<br>${d.length} countries`, e, this);
      })
      .on("mouseout blur", function () {
        d3.select(this).attr("fill", COLOR_ACCENT);
        histInfoBox.html(``);
        hideTip();
      });

    enterBars.merge(bars)
      .transition().duration(400)
      .attr("x", d => x(d.x0))
      .attr("y", d => y(d.length))
      .attr("height", d => y(0) - y(d.length));
  };

  // Initialize sliders
  const sMin = d3.select("#histogram-range-min").attr("min", minScore).attr("max", maxScore).attr("value", minScore);
  const sMax = d3.select("#histogram-range-max").attr("min", minScore).attr("max", maxScore).attr("value", maxScore);
  const vMin = d3.select("#histogram-range-value-min");
  const vMax = d3.select("#histogram-range-value-max");
  const handleSlider = () => {
    const min = +sMin.property("value"), max = +sMax.property("value");
    vMin.text(min.toFixed(1)); vMax.text(max.toFixed(1));
    updateHistogram([Math.min(min, max), Math.max(min, max)]);
  };
  sMin.on("input", handleSlider);
  sMax.on("input", handleSlider);
  updateHistogram([minScore, maxScore]);

  // ============================================================
// PART 2: BOXPLOT — Volatility & Risk 
// ============================================================
const boxSVG = createSVG("#boxplot", 460,
  "Civilian Fatality Distribution for Top 7 'Extreme' Countries",
  "Box plot showing typical fatalities (median) and volatility over time."
);

const extremes = indexData.filter(d => d["Index Level"] === "Extreme")
  .sort((a, b) => +b["Total Score"] - +a["Total Score"])
  .slice(0, 7);

const countries = extremes.map(d => d.Country);
const fatalFiltered = fatalityData.filter(d => countries.includes(d.country) && d.fatalities > 0);

// Compute summary stats per country
const stats = countries.map(c => {
  const vals = fatalFiltered.filter(d => d.country === c).map(d => d.fatalities).sort(d3.ascending);
  return {
    country: c,
    q1: d3.quantile(vals, 0.25),
    median: d3.quantile(vals, 0.5),
    q3: d3.quantile(vals, 0.75),
    min: d3.min(vals),
    max: d3.max(vals),
    mean: d3.mean(vals)
  };
});

const xB = d3.scaleLinear().domain([0, d3.max(stats, d => d.max)]).range([150, 860]);
const yB = d3.scaleBand().domain(countries).range([70, 420]).padding(0.45);
const cScale = d3.scaleOrdinal().domain(countries).range(colorPalette);

// X and Y axes
boxSVG.append("g").attr("transform", `translate(0,420)`)
  .call(d3.axisBottom(xB).ticks(6)).call(styleAxis);
boxSVG.append("text").attr("x", 490).attr("y", 455).attr("text-anchor", "middle")
  .style("fill", COLOR_TEXT).text("Annual Civilian Fatalities");

boxSVG.append("g").attr("transform", "translate(150,0)")
  .call(d3.axisLeft(yB)).call(styleAxis);

// Draw box plot groups
const boxGroups = boxSVG.selectAll(".box").data(stats).enter().append("g")
  .attr("class", d => `box ${slugify(d.country)}`)
  .attr("transform", d => `translate(0,${yB(d.country)})`)
  .style("cursor", "pointer");

// Draw boxes and whiskers
boxGroups.append("rect")
  .attr("x", d => xB(d.q1))
  .attr("width", d => xB(d.q3) - xB(d.q1))
  .attr("height", yB.bandwidth())
  .attr("fill", d => cScale(d.country))
  .attr("stroke", COLOR_PRIMARY)
  .attr("opacity", 0.82);

boxGroups.append("line")
  .attr("x1", d => xB(d.median)).attr("x2", d => xB(d.median))
  .attr("y1", 0).attr("y2", yB.bandwidth())
  .attr("stroke", COLOR_PRIMARY).attr("stroke-width", 2);

boxGroups.append("line")
  .attr("x1", d => xB(d.min)).attr("x2", d => xB(d.max))
  .attr("y1", yB.bandwidth() / 2).attr("y2", yB.bandwidth() / 2)
  .attr("stroke", COLOR_PRIMARY).attr("stroke-width", 1.4);

// Hover interaction
boxGroups.on("mouseover focus", function (e, d) {
  d3.select(this).select("rect").attr("fill", COLOR_PRIMARY);
  const tip = `
    <b>${d.country}</b><br>
    Median: ${d3.format(",")(d.median)}<br>
    Mean: ${d3.format(",")(d.mean)}<br>
    Range: ${d3.format(",")(d.min)} – ${d3.format(",")(d.max)}
  `;
  showTip(tip, e, this);
}).on("mouseout blur", function (e, d) {
  d3.select(this).select("rect").attr("fill", cScale(d.country));
  hideTip();
});

// Story buttons (highlight feature preserved)
const buttons = d3.selectAll(".story-button");
buttons.on("click", function () {
  const story = d3.select(this).attr("data-story");
  buttons.classed("is-active", false);
  d3.select(this).classed("is-active", true);

  let hero;
  if (story === "median") hero = d3.greatest(stats, d => d.median);
  else if (story === "volatile") hero = d3.greatest(stats, d => d.max - d.min);
  else if (story === "outliers") hero = d3.greatest(stats, d => Math.abs(d.mean - d.median));

  boxGroups.transition().duration(300)
    .attr("opacity", d => !story || story === "reset" || d === hero ? 1 : 0.25);
});
// ============================================================
// PART 3: VIOLIN — Shape of Violence (Gradient by Time)
// ============================================================
const violinSVG = createSVG("#violin", 480,
  "Shape of Violence for Top 7 Countries by Fatalities",
  "Violin plot showing how civilian fatalities are distributed and how they shift over time."
);

// Prepare data
const totals = d3.rollups(
  fatalityData.filter(d => d.fatalities > 0),
  v => d3.sum(v, d => d.fatalities),
  d => d.country
).sort((a, b) => d3.descending(a[1], b[1]))
 .slice(0, 7);

const top7 = totals.map(d => d[0]);
const xV = d3.scaleLinear()
  .domain([0, d3.max(fatalityData, d => d.fatalities)])
  .range([150, 860]);
const yV = d3.scaleBand().domain(top7).range([70, 420]).padding(0.45);

// Define color gradient for time
const yearExtent = d3.extent(fatalityData, d => d.year);
const colorTime = d3.scaleSequential()
  .domain(yearExtent)
  .interpolator(d3.interpolateLab(COLOR_ACCENT, COLOR_PRIMARY));

// Add legend for time gradient
const legendWidth = 220, legendHeight = 10;
const defs = violinSVG.append("defs");

const globalGradient = defs.append("linearGradient")
  .attr("id", "time-gradient-global")
  .attr("x1", "0%").attr("x2", "100%");
globalGradient.append("stop").attr("offset", "0%").attr("stop-color", colorTime(yearExtent[0]));
globalGradient.append("stop").attr("offset", "100%").attr("stop-color", colorTime(yearExtent[1]));

violinSVG.append("rect")
  .attr("x", 860 - legendWidth)
  .attr("y", 30)
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("fill", "url(#time-gradient-global)");
violinSVG.append("text")
  .attr("x", 860 - legendWidth)
  .attr("y", 25)
  .style("fill", COLOR_TEXT)
  .style("font-size", "12px")
  .text(`Earlier (${yearExtent[0]})`);
violinSVG.append("text")
  .attr("x", 860)
  .attr("y", 25)
  .attr("text-anchor", "end")
  .style("fill", COLOR_TEXT)
  .style("font-size", "12px")
  .text(`Recent (${yearExtent[1]})`);

// Axes
violinSVG.append("g")
  .attr("transform", `translate(0,420)`)
  .call(d3.axisBottom(xV).ticks(6))
  .call(styleAxis);
violinSVG.append("text")
  .attr("x", 490)
  .attr("y", 465)
  .attr("text-anchor", "middle")
  .style("fill", COLOR_TEXT)
  .text("Annual Civilian Fatalities");

violinSVG.append("g")
  .attr("transform", "translate(150,0)")
  .call(d3.axisLeft(yV))
  .call(styleAxis);

// Create per-country gradients
top7.forEach(country => {
  const vals = fatalityData.filter(d => d.country === country && d.fatalities > 0);
  const years = vals.map(d => d.year);
  const localExtent = d3.extent(years);

  const grad = defs.append("linearGradient")
    .attr("id", `grad-${slugify(country)}`)
    .attr("x1", "0%").attr("x2", "100%");
  grad.append("stop").attr("offset", "0%").attr("stop-color", colorTime(localExtent[0]));
  grad.append("stop").attr("offset", "100%").attr("stop-color", colorTime(localExtent[1]));

  const data = vals.map(d => d.fatalities).sort(d3.ascending);
  const bins = d3.bin().thresholds(25)(data);
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .range([0, yV.bandwidth() / 2]);

  const g = violinSVG.append("g")
    .attr("transform", `translate(0,${yV(country) + yV.bandwidth() / 2})`)
    .style("cursor", "pointer");

  const area = d3.area()
    .x(d => xV(d.x0))
    .y0(d => yScale(-d.length))
    .y1(d => yScale(d.length))
    .curve(d3.curveCatmullRom);

  g.append("path")
    .datum(bins)
    .attr("fill", `url(#grad-${slugify(country)})`)
    .attr("stroke", COLOR_PRIMARY)
    .attr("stroke-width", 1.2)
    .attr("opacity", 0.9)
    .attr("d", area)
    .on("mouseover", (e, d) => {
  const valsSorted = vals.map(d => d.fatalities).sort(d3.ascending);
  const mean = d3.mean(valsSorted);
  const median = d3.median(valsSorted);
  const min = d3.min(valsSorted);
  const max = d3.max(valsSorted);
  const mostCommonBin = bins.reduce((a, b) => a.length > b.length ? a : b);
  const commonRange = `${d3.format(",")(mostCommonBin.x0)}–${d3.format(",")(mostCommonBin.x1)}`;
  const earliestYear = localExtent[0];
  const latestYear = localExtent[1];

  const tooltipHTML = `
    <b>${country}</b><br>    <b>Years:</b> ${earliestYear} → ${latestYear}<br>    <b>Mean:</b> ${d3.format(",.0f")(mean)}  <b>Median:</b> ${d3.format(",.0f")(median)}<br>    <b>Most Common Range:</b> ${commonRange}<br>    <b>Min:</b> ${d3.format(",")(min)}  <b>Max:</b> ${d3.format(",")(max)}
  `;
console.log(tooltipHTML, valsSorted, vals);
  showTip(tooltipHTML, e, e.currentTarget);
})

    .on("mouseout", hideTip);
});
})