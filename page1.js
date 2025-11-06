/* page1.js
  D3.js plots for Data Distributions page
  - Histogram
  - Box Plot
  - Violin Plot
*/

document.addEventListener("DOMContentLoaded", () => {
  // Define file paths (update as needed)
  const ACLED_INDEX_PATH = 'data/acled_conflict_index_fullyear2024_allcolumns-2.csv';
  const FATALITIES_PATH = 'data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv';
  const CUMULATIVE_DEATHS_PATH = 'data/cumulative-deaths-in-armed-conflicts-by-country-region-and-type.csv';

  Promise.all([
    d3.csv(ACLED_INDEX_PATH, d3.autoType),
    d3.csv(FATALITIES_PATH, d3.autoType),
    d3.csv(CUMULATIVE_DEATHS_PATH, d3.autoType)
  ]).then(([acledData, fatalitiesData, cumulativeData]) => {
    console.log("All data loaded.");

    drawHistogram(acledData, "#histogram-container");
    drawBoxplot(fatalitiesData, "#boxplot-container");
    drawViolinplot(cumulativeData, "#violin-container");

  }).catch(error => {
    console.error("Error loading data:", error);
    d3.select("#histogram-container").html('<div class="chart-error">Failed to load data.</div>');
    d3.select("#boxplot-container").html('<div class="chart-error">Failed to load data.</div>');
    d3.select("#violin-container").html('<div class="chart-error">Failed to load data.</div>');
  });
});

// -------------------------------
// Tooltip helpers (position using left/top for consistent cross-browser behavior)
// -------------------------------
const tooltip = d3.select(".viz-tooltip");

const showTooltip = (event, content) => {
  tooltip
    .html(content)
    .style("display", "block")
    .style("opacity", 1);

  moveTooltip(event);
};

const moveTooltip = (event) => {
  // Keep tooltip inside viewport if near edges
  const padding = 12;
  const tooltipNode = tooltip.node();
  const tooltipRect = tooltipNode ? tooltipNode.getBoundingClientRect() : { width: 200, height: 40 };
  const pageWidth = window.innerWidth;
  const pageHeight = window.innerHeight;

  let left = event.pageX + 12;
  let top = event.pageY - tooltipRect.height - 10;

  if (left + tooltipRect.width + padding > pageWidth) left = event.pageX - tooltipRect.width - 12;
  if (top < padding) top = event.pageY + 12;

  tooltip
    .style("left", `${left}px`)
    .style("top", `${top}px`);
};

const hideTooltip = () => {
  tooltip.style("opacity", 0).style("display", "none");
};

// -------------------------------
// HISTOGRAM
// -------------------------------
function drawHistogram(data, containerId) {
  // Prepare container
  const container = d3.select(containerId);
  container.selectAll("*").remove();

  // --- 1. Data Processing ---
  const plotData = data
    .map(d => +d['Total Score']) // coerce
    .filter(d => d != null && isFinite(d));

  if (!plotData.length) {
    container.html('<div class="chart-error">No valid "Total Score" values to plot.</div>');
    return;
  }

  // --- Dimensions ---
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // SVG
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(plotData)).nice()
    .range([0, width]);

  const histogram = d3.histogram()
    .value(d => d)
    .domain(x.domain())
    .thresholds(x.ticks(40));

  const bins = histogram(plotData);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length) || 1]).nice()
    .range([height, 0]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(10).tickSizeOuter(0))
    .call(g => g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "middle")
        .text("ACLED Total Score"));

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
        .attr("class", "y-grid")
        .attr("x2", width))
    .call(g => g.append("text")
        .attr("class", "axis-label")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("transform", "rotate(-90)")
        .attr("fill", "currentColor")
        .attr("text-anchor", "middle")
        .text("Number of Countries"));

  // Bars
  svg.selectAll(".histogram-bar")
    .data(bins)
    .join("rect")
    .attr("class", "histogram-bar")
    .attr("x", d => x(d.x0) + 1)
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("y", height)
    .attr("height", 0)
    .on("mouseover", (event, d) => {
      showTooltip(event, `<b>Score Range:</b> ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}<br/><b>Count:</b> ${d.length}`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .transition()
    .duration(750)
    .attr("y", d => y(d.length))
    .attr("height", d => height - y(d.length));
}

// -------------------------------
// BOX PLOT
// -------------------------------
function drawBoxplot(data, containerId) {
  const container = d3.select(containerId);
  container.selectAll("*").remove();

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;

  // filter and coerce fatality numbers (expect column 'Fatalities' and 'Year')
  const plotData = data
    .map(d => ({ Year: d.Year, Fatalities: +d.Fatalities }))
    .filter(d => d.Year >= startYear && d.Year < currentYear && isFinite(d.Fatalities));

  if (!plotData.length) {
    container.html('<div class="chart-error">No valid fatality data for the last 10 years to plot.</div>');
    return;
  }

  const dataByYear = d3.group(plotData, d => d.Year);

  const summaryData = Array.from(dataByYear, ([year, values]) => {
    const vals = values.map(d => +d.Fatalities).filter(v => isFinite(v)).sort(d3.ascending);
    const n = vals.length;
    const q1 = n ? d3.quantile(vals, 0.25) : 0;
    const median = n ? d3.quantile(vals, 0.5) : 0;
    const q3 = n ? d3.quantile(vals, 0.75) : 0;
    const iqr = q3 - q1;
    const whiskerMin = n ? Math.max(0, q1 - 1.5 * iqr) : 0;
    const whiskerMax = n ? (q3 + 1.5 * iqr) : 0;
    const outliers = n ? vals.filter(v => v < whiskerMin || v > whiskerMax) : [];
    return {
      year: +year,
      q1, median, q3,
      min: whiskerMin,
      max: whiskerMax,
      outliers: outliers.map(o => ({ year: +year, value: o }))
    };
  });

  const years = summaryData.map(d => d.year).sort(d3.ascending);

  // y axis domain (log) — use only positive values
  const allValues = plotData.map(d => d.Fatalities).filter(v => v > 0);
  const yMin = d3.min(allValues) || 1;
  const yMax = d3.max(allValues) || 10;

  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleBand()
    .domain(years)
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLog()
    .domain([Math.max(0.1, yMin), yMax])
    .range([height, 0])
    .nice();

  // axes
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .call(g => g.append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", margin.bottom - 10)
      .attr("fill", "currentColor")
      .attr("text-anchor", "middle")
      .text("Year"));

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5, d3.format("~s")))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
      .attr("class", "y-grid")
      .attr("x2", width))
    .call(g => g.append("text")
        .attr("class", "axis-label")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("transform", "rotate(-90)")
        .attr("fill", "currentColor")
        .attr("text-anchor", "middle")
        .text("Fatalities (Log Scale)"));

  // groups for each year
  const boxWidth = x.bandwidth();

  const g = svg.selectAll(".boxplot-group")
    .data(summaryData)
    .join("g")
    .attr("class", "boxplot-group")
    .attr("transform", d => `translate(${x(d.year)}, 0)`)
    .on("mouseover", (event, d) => {
      showTooltip(event, `<b>Year: ${d.year}</b><br/>
        Median: ${Number(d.median).toLocaleString()}<br/>
        Q3: ${Number(d.q3).toLocaleString()}<br/>
        Q1: ${Number(d.q1).toLocaleString()}<br/>
        Min (whisker): ${Math.ceil(d.min).toLocaleString()}<br/>
        Max (whisker): ${Math.floor(d.max).toLocaleString()}`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  // whiskers (top and bottom)
  g.append("line")
    .attr("class", "whisker")
    .attr("x1", boxWidth / 2)
    .attr("x2", boxWidth / 2)
    .attr("y1", d => y(d.min > 0 ? d.min : Math.max(0.1, y.domain()[0])))
    .attr("y2", d => y(d.q1))
    .attr("stroke", "black");

  g.append("line")
    .attr("class", "whisker")
    .attr("x1", boxWidth / 2)
    .attr("x2", boxWidth / 2)
    .attr("y1", d => y(d.q3))
    .attr("y2", d => y(d.max > 0 ? d.max : d.q3))
    .attr("stroke", "black");

  // box (IQR)
  g.append("rect")
    .attr("class", "box")
    .attr("x", 0)
    .attr("width", boxWidth)
    .attr("y", height)
    .attr("height", 0)
    .transition()
    .duration(750)
    .attr("y", d => y(d.q3))
    .attr("height", d => Math.abs(y(d.q1) - y(d.q3)));

  // median line
  g.append("line")
    .attr("class", "center-line")
    .attr("x1", 0)
    .attr("x2", boxWidth)
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median))
    .attr("stroke", "black");

  // outliers
  svg.selectAll(".outlier")
    .data(summaryData.flatMap(d => d.outliers || []))
    .join("circle")
    .attr("class", "outlier")
    .attr("cx", d => x(d.year) + x.bandwidth() / 2 + (Math.random() - 0.5) * boxWidth * 0.6)
    .attr("cy", d => y(d.value > 0 ? d.value : Math.max(0.1, y.domain()[0])))
    .attr("r", 2)
    .style("fill-opacity", 0)
    .transition()
    .duration(750)
    .style("fill-opacity", 1);
}

// -------------------------------
// VIOLIN PLOT
// -------------------------------
function drawViolinplot(data, containerId) {
  const container = d3.select(containerId);
  container.selectAll("*").remove();

  // Regions expected (update if your CSV uses slightly different region strings)
  const regions = ['Africa', 'Americas', 'Asia and Oceania', 'Europe', 'Middle East'];
  const column = 'Cumulative deaths in intrastate conflicts';

  // coerce numeric and filter
  const plotData = data
    .map(d => ({
      Entity: d.Entity,
      value: (d[column] !== undefined && d[column] !== null) ? +d[column] : NaN
    }))
    .filter(d => regions.includes(d.Entity) && isFinite(d.value));

  if (!plotData.length) {
    container.html('<div class="chart-error">No valid cumulative deaths data to plot for the specified regions.</div>');
    return;
  }

  const allValues = plotData.map(d => d.value).filter(v => v > 0);
  const yMin = d3.min(allValues) || 1;
  const yMax = d3.max(allValues) || 10;

  const margin = { top: 20, right: 30, bottom: 50, left: 70 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleBand()
    .domain(regions)
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLog()
    .domain([Math.max(0.1, yMin), yMax])
    .range([height, 0])
    .nice();

  // axes
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5, d3.format("~s")))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
        .attr("class", "y-grid")
        .attr("x2", width))
    .call(g => g.append("text")
        .attr("class", "axis-label")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 20)
        .attr("transform", "rotate(-90)")
        .attr("fill", "currentColor")
        .attr("text-anchor", "middle")
        .text("Cumulative Deaths (Log Scale)"));

  // KDE helpers (work on log-values)
  function kernelDensityEstimator(kernel, X) {
    return function(V) {
      return X.map(function(x) {
        // if V is empty, density is 0
        const mean = V.length ? d3.mean(V, function(v) { return kernel(x - v); }) : 0;
        return [x, mean];
      });
    };
  }

  function epanechnikovKernel(bandwidth) {
    return function(u) {
      u = u / bandwidth;
      return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) / bandwidth : 0;
    };
  }

  // compute tick points for KDE in log-space
  const logTicks = d3.range(40).map(i => {
    const t = i / 39;
    return Math.log(yMin) * (1 - t) + Math.log(yMax) * t;
  });

  const kde = kernelDensityEstimator(epanechnikovKernel((Math.log(yMax) - Math.log(yMin)) * 0.2), logTicks);

  // compute densities per region
  const densities = regions.map(region => {
    const values = plotData
      .filter(d => d.Entity === region && d.value > 0)
      .map(d => Math.log(d.value));
    return kde(values);
  });

  // max density for scaling
  const maxDensity = d3.max(densities.flat(), d => d[1]) || 0.0001;

  const xNum = d3.scaleLinear()
    .domain([-maxDensity, maxDensity])
    .range([ -x.bandwidth() / 2, x.bandwidth() / 2 ]);

  // draw violin groups
  const g = svg.selectAll(".violin-group")
    .data(densities)
    .join("g")
    .attr("class", "violin-group")
    .attr("transform", (d,i) => `translate(${x(regions[i]) + x.bandwidth() / 2},0)`);

  // area generator expects datum to be array of [logY, density]
  const areaGen = d3.area()
    .x0(d => xNum(-d[1]))
    .x1(d => xNum(d[1]))
    .y(d => y(Math.exp(d[0])))
    .curve(d3.curveCatmullRom);

  g.append("path")
    .attr("class", "violin-path")
    .attr("d", d => areaGen(d))
    .attr("fill-opacity", 0)
    .attr("stroke-width", 0)
    .transition()
    .duration(900)
    .attr("fill-opacity", 0.35)
    .attr("stroke-width", 1.2)
    .attr("stroke", "currentColor");

  // box summaries inside violin
  const summaryData = regions.map(region => {
      const sortedValues = plotData
          .filter(d => d.Entity === region)
          .map(d => d.value)
          .filter(v => isFinite(v))
          .sort(d3.ascending);
      const q1 = sortedValues.length ? d3.quantile(sortedValues, 0.25) : 0;
      const median = sortedValues.length ? d3.quantile(sortedValues, 0.5) : 0;
      const q3 = sortedValues.length ? d3.quantile(sortedValues, 0.75) : 0;
      return {
          region,
          q1, median, q3
      };
  });

  const boxXOffset = 2;
  g.append("rect")
    .attr("class", "box")
    .attr("x", -boxXOffset)
    .attr("width", boxXOffset * 2)
    .attr("y", d => {
      // default 0 if no data
      const idx = densities.indexOf(d);
      const regionSummary = summaryData[idx] || { q3: 0 };
      return y(regionSummary.q3 || 0);
    })
    .attr("height", 0)
    .attr("fill-opacity", 0)
    .transition()
    .duration(900)
    .attr("y", (d, i) => y(summaryData[i].q3 || 0))
    .attr("height", (d,i) => Math.abs(y(summaryData[i].q1 || 0) - y(summaryData[i].q3 || 0)))
    .attr("fill-opacity", 0.8);

  g.append("line")
    .attr("class", "center-line")
    .attr("x1", -4)
    .attr("x2", 4)
    .attr("y1", (d,i) => y(summaryData[i].median || 0))
    .attr("y2", (d,i) => y(summaryData[i].median || 0))
    .attr("stroke-opacity", 0)
    .transition()
    .duration(900)
    .attr("stroke-opacity", 1);

  // transparent overlay for tooltips
  const overlayGroups = svg.selectAll(".violin-overlay")
    .data(summaryData)
    .join("g")
    .attr("class", "violin-overlay")
    .attr("transform", (d) => `translate(${x(d.region)},0)`);

  overlayGroups.append("rect")
    .attr("x", 0)
    .attr("width", x.bandwidth())
    .attr("y", 0)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("mouseover", (event, d) => {
      showTooltip(event, `<b>${d.region}</b><br/>Median: ${Number(d.median).toLocaleString()}<br/>Q3: ${Number(d.q3).toLocaleString()}<br/>Q1: ${Number(d.q1).toLocaleString()}`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);
}
