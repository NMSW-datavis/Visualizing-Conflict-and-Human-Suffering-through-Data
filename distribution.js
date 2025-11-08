// =============================
// distribution.js (Violin Focus)
// =============================

// 1. Define file paths for BOTH datasets
const dataFileIndex = "data/acled_conflict_index_fullyear2024_allcolumns-2.csv";
const dataFileFatalities = "data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv";

// 2. Load BOTH files
Promise.all([
  d3.csv(dataFileIndex), // Data for histogram (placeholder)
  d3.csv(dataFileFatalities, d => ({ // Data for violin
    country: d.Country,
    year: +d.Year,
    fatalities: +d.Fatalities
  }))
]).then(([indexData, fatalityData]) => {

  // =============================
  // REUSABLE DIMENSIONS & HELPERS
  // =============================
  function createSVG(container, height = 400) {
    // Clear the container first in case of re-runs
    d3.select(container).html(""); 
    
    return d3.select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 900 ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
  }

  // Helper function to style axes using your CSS variables
  const styleAxis = (axis) => {
    axis.selectAll("line").attr("stroke", "var(--color-border)");
    axis.selectAll("text").style("fill", "var(--color-text)");
    axis.select(".domain").attr("stroke", "var(--color-text)");
  };

  // Tooltip functions that match your CSS
  const hideTip = () => {
    d3.select(".viz-tooltip")
      .style("opacity", 0)
      .style("transform", `translate(-9999px, -9999px)`);
  };
  const showTip = (content, event) => {
    d3.select(".viz-tooltip")
      .style("opacity", 1)
      .style("transform", `translate(${event.clientX + 15}px, ${event.clientY + 10}px)`)
      .html(content);
  };
  
  // Helper for placeholder text
  const drawPlaceholder = (svg, text) => {
    svg.append("text")
      .attr("x", "50%")
      .attr("y", "50%")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text(text)
      .style("font-size", "24px")
      .style("font-family", "var(--font-heading)")
      .style("fill", "var(--color-secondary)")
      .style("opacity", 0.6);
  };

  // =============================
  // 1) HISTOGRAM (Placeholder)
  // =============================
  const histSVG = createSVG("#histogram");
  drawPlaceholder(histSVG, "Histogram: Coming Soon");


  // =============================
  // 2) BOXPLOT (Placeholder)
  // =============================
  const extreme = indexData.filter(d => d['Index Level'] === 'Extreme');
  extreme.sort((a, b) => +b['Total Score'] - +a['Total Score']);
  const top7Extreme = extreme.slice(0, 7).map(d => d.Country);
  
  // Prepare data using fatalityData
  const filtered_box = fatalityData.filter(d => d.fatalities > 0);
  const top = d3.max(filtered_box.filter(d => top7Extreme.includes(d.country)), d => d.fatalities);

  // Create SVG
  const boxSVG = createSVG("#boxplot",450);

  // Scales
  const xBoxFatalities = d3.scaleLinear().domain([0, top]).range([120, 860]);
  const yBandws = d3.scaleBand().domain(top7Extreme).range([70, 420]).padding(0.45);

  top7Extreme.forEach(country => {
    // Get all fatality values for the country
    const vals = filtered_box.filter(d => d.country === country).map(d => d.fatalities).sort(d3.ascending);
    
    if (vals.length === 0) return; 
    
    // Calculate stats for the box plot and tooltip
    const min = d3.min(vals);
    const q1 = d3.quantile(vals, 0.25);
    const median = d3.quantile(vals, 0.5);
    const q3 = d3.quantile(vals, 0.75);
    const max = d3.max(vals);
    const mean = d3.mean(vals);
    
    const tooltipContent = `
      <b>${country}</b><br>
      Median: ${d3.format(",")(median)} fatalities<br>
      Mean: ${d3.format(".0f")(mean)} fatalities<br>
      Min: ${d3.format(",")(min)} | Q1: ${d3.format(",")(q1)}<br>
      Q3: ${d3.format(",")(q3)} | Max: ${d3.format(",")(max)}
    `;
    
    const boxGroup = boxSVG.append("g")
      .attr("transform", `translate(0, ${yBandws(country)})`);
    
    // Whiskers (horizontal lines from min to q1 and q3 to max)
    boxGroup.append("line")
      .attr("x1", xBoxFatalities(min))
      .attr("x2", xBoxFatalities(q1))
      .attr("y1", yBandws.bandwidth() / 2)
      .attr("y2", yBandws.bandwidth() / 2)
      .attr("stroke", "var(--color-primary)")
      .attr("stroke-width", 1.4);
    
    boxGroup.append("line")
      .attr("x1", xBoxFatalities(q3))
      .attr("x2", xBoxFatalities(max))
      .attr("y1", yBandws.bandwidth() / 2)
      .attr("y2", yBandws.bandwidth() / 2)
      .attr("stroke", "var(--color-primary)")
      .attr("stroke-width", 1.4);
    
    // Box
    boxGroup.append("rect")
      .attr("x", xBoxFatalities(q1))
      .attr("y", 0)
      .attr("width", xBoxFatalities(q3) - xBoxFatalities(q1))
      .attr("height", yBandws.bandwidth())
      .attr("fill", "var(--color-accent)")
      .attr("opacity", 0.82)
      .attr("stroke", "var(--color-primary)")
      .attr("stroke-width", 1.4);
    
    // Median line
    boxGroup.append("line")
      .attr("x1", xBoxFatalities(median))
      .attr("x2", xBoxFatalities(median))
      .attr("y1", 0)
      .attr("y2", yBandws.bandwidth())
      .attr("stroke", "var(--color-primary)")
      .attr("stroke-width", 2);
    
    // Vertical ticks for min and max
    const tickLength = yBandws.bandwidth() / 4;
    boxGroup.append("line")
      .attr("x1", xBoxFatalities(min))
      .attr("x2", xBoxFatalities(min))
      .attr("y1", yBandws.bandwidth() / 2 - tickLength / 2)
      .attr("y2", yBandws.bandwidth() / 2 + tickLength / 2)
      .attr("stroke", "var(--color-primary)")
      .attr("stroke-width", 1.4);
    
    boxGroup.append("line")
      .attr("x1", xBoxFatalities(max))
      .attr("x2", xBoxFatalities(max))
      .attr("y1", yBandws.bandwidth() / 2 - tickLength / 2)
      .attr("y2", yBandws.bandwidth() / 2 + tickLength / 2)
      .attr("stroke", "var(--color-primary)")
      .attr("stroke-width", 1.4);
    
    // Interactions
    boxGroup
      .style("cursor", "pointer")
      .on("mouseover", function(e) {
        d3.select(this).select("rect")
          .transition().duration(150)
          .attr("fill", "var(--color-primary)")
          .attr("opacity", 1);
        showTip(tooltipContent, e);
      })
      .on("mouseout", function(e) {
        d3.select(this).select("rect")
          .transition().duration(150)
          .attr("fill", "var(--color-accent)")
          .attr("opacity", 0.82);
        hideTip();
      });
 
    // Add country labels
    boxSVG.append("text")
      .attr("x", 110) 
      .attr("y", yBandws(country) + yBandws.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .text(country)
      .style("fill", "var(--color-text)")
      .style("font-size", "13px");
  });

  // Add X-axis
  boxSVG.append("g")
    .attr("transform", `translate(0,420)`)
    .call(d3.axisBottom(xBoxFatalities).ticks(8))
    .call(styleAxis);

  // =============================
  // 3) VIOLIN PLOT (Interactive)
  // =============================
  
  // Prepare data
  const filtered = fatalityData.filter(d => d.fatalities > 0);
  const totals = d3.rollups(
    filtered,
    v => d3.sum(v, d => d.fatalities),
    d => d.country
  ).sort((a, b) => d3.descending(a[1], b[1]));

  const top7 = totals.slice(0, 7).map(d => d[0]);
  const maxFatal = d3.max(filtered, d => d.fatalities);

  // Create SVG
  const violinSVG = createSVG("#violin", 450);

  // Scales
  const xViolinFatalities = d3.scaleLinear().domain([0, maxFatal]).range([120, 860]);
  const yBands = d3.scaleBand().domain(top7).range([70, 420]).padding(0.45);

  top7.forEach(country => {
    // Get all fatality values for the country
    const vals = filtered.filter(d => d.country === country).map(d => d.fatalities).sort(d3.ascending);
    
    // Bin these fatality values for the shape
    const arranged = d3.bin().thresholds(Math.min(vals.length, 20))(vals);

    // --- Calculate stats for the tooltip ---
    const [min, q1, median, q3, max] = [0, 0.25, 0.5, 0.75, 1].map(p => d3.quantile(vals, p));
    const mean = d3.mean(vals);
    
    const tooltipContent = `
      <b>${country}</b>
      Median: ${d3.format(",")(median)} fatalities<br>
      Mean: ${d3.format(".0f")(mean)} fatalities<br>
      Min: ${d3.format(",")(min)} | Max: ${d3.format(",")(max)}
    `;
    // --- End stats ---

    // Scale for the violin width
    const densityScale = d3.scaleLinear()
      .domain([0, d3.max(arranged, d => d.length)])
      .range([0, (yBands.bandwidth() / 2) - 4]);

    const violinGroup = violinSVG.append("g").attr("transform", `translate(0, ${yBands(country) + yBands.bandwidth() / 2})`);

    // Area generator
    const area = d3.area()
      .y0(d => -densityScale(d.length)) // plot up
      .y1(d => densityScale(d.length))  // plot down
      .x(d => xViolinFatalities(d.x0))   // position along the fatality axis
      .curve(d3.curveCatmullRom);
    
    // Draw the path
    violinGroup.append("path")
      .datum(arranged)
      .attr("fill", "var(--color-accent)") // Styled
      .attr("opacity", 0.82)
      .attr("stroke", "var(--color-primary)") // Styled
      .attr("stroke-width", 1.4)
      .attr("d", area)
      .style("cursor", "pointer")
      // --- New Interactions ---
      .on("mouseover", function(e) {
        d3.select(this)
          .transition().duration(150)
          .attr("fill", "var(--color-primary)") // Highlight color
          .attr("opacity", 1);
        showTip(tooltipContent, e);
      })
      .on("mouseout", function(e) {
        d3.select(this)
          .transition().duration(150)
          .attr("fill", "var(--color-accent)") // Original color
          .attr("opacity", 0.82);
        hideTip();
      });

    // Add country labels
    violinSVG.append("text")
      .attr("x", 110) 
      .attr("y", yBands(country) + yBands.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .text(country)
      .style("fill", "var(--color-text)") // Styled
      .style("font-size", "13px");
  });
  
  // Add X-axis
  violinSVG.append("g")
    .attr("transform", `translate(0,420)`)
    .call(d3.axisBottom(xViolinFatalities).ticks(8))
    .call(styleAxis); // Styled

});