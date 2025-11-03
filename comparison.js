

(() => {
  "use strict";

  const DATA_FILE_1 = "./data/acled_conflict_index_fullyear2024_allcolumns-2.csv";
  const DATA_FILE_3 = "./data/cumulative-deaths-in-armed-conflicts-by-country-region-and-type.csv";
  const HEATMAP_CANDIDATES = [
    "./data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv"
  ];

  const DEFAULT_COLORS = {
    primary: "#003a70",
    accent: "#f5b7a3",
    secondary: "#6b6b6b",
    bg: "#fcfbf8",
    softBlue: "rgba(0,58,112,0.4)",
    softCoral: "rgba(245,183,163,0.6)"
  };

  const animation = {
    duration: 900,
    easing: d3.easeCubicOut  // dynamic & smooth
  };

  function getThemeColors() {
    try {
      const root = getComputedStyle(document.documentElement);
      const get = (name, fallback) => {
        const v = root.getPropertyValue(name);
        return (v && v.trim()) ? v.trim() : fallback;
      };
      return {
        primary: get("--color-primary", DEFAULT_COLORS.primary),
        accent: get("--color-accent", DEFAULT_COLORS.accent),
        secondary: get("--color-secondary", DEFAULT_COLORS.secondary),
        bg: get("--color-bg", DEFAULT_COLORS.bg),
        softBlue: DEFAULT_COLORS.softBlue,
        softCoral: DEFAULT_COLORS.softCoral
      };
    } catch (e) {
      return DEFAULT_COLORS;
    }
  }

  const theme = getThemeColors();

  // -----------------------
  // Globals
  // -----------------------
  let A1 = []; // ACLED (index)
  let A3 = []; // cumulative deaths
  let heatmapData = [];

  // -----------------------
  // Shared helpers
  // -----------------------
  const fmtInt = d3.format(",");
  const fmtShort = d3.format(".2s");
  const fmtPct = d3.format(".1%");

  function createSVG(containerSelector, viewW = 900, viewH = 520) {
    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();
    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${viewW} ${viewH}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");
    return svg;
  }

  // Unified tooltip appended to body (one per class)
  function makeTooltip(className = "viz-tooltip") {
    let tip = d3.select("body").select("." + className);
    if (tip.empty()) {
      tip = d3.select("body").append("div")
        .attr("class", className)
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "rgba(10,10,10,0.85)")
        .style("color", "#fff")
        .style("padding", "8px 10px")
        .style("border-radius", "8px")
        .style("font-size", "13px")
        .style("box-shadow", "0 6px 22px rgba(0,0,0,0.25)")
        .style("opacity", 0)
        .style("z-index", 9999);
    }
    return tip;
  }

  function showTip(tip, event, html) {
    tip.html(html)
      .style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 28) + "px")
      .transition().duration(140).style("opacity", 1).style("transform", "translateY(0)");
  }

  function hideTip(tip) {
    tip.transition().duration(160).style("opacity", 0);
  }

  // Contrast color for circle packing labels
  function getContrastColor(hexColor) {
    try {
      const c = d3.color(hexColor);
      const luminance = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
      return luminance > 128 ? "#000" : "#fff";
    } catch {
      return "#000";
    }
  }

  // -----------------------
  // Chart 1 — Horizontal Bar (Top 'Extreme' countries)
  // -----------------------
  async function drawBarChart() {
    const target = "#bar-chart-container";
    const svgW = 920;
    if (!A1.length) {
      try {
        const raw = await d3.csv(DATA_FILE_1, d3.autoType);
        A1 = raw.map(d => ({
          Country: (d.Country || d.Entity || "").toString().trim(),
          IndexLevel: d["Index Level"] || d.IndexLevel || "",
          TotalScore: +d["Total Score"] || 0,
          Deadliness: +d["Deadliness Value Scaled"] || +d.Deadliness || 0,
          Danger: +d["Danger Value Scaled"] || +d.Danger || 0
        }));
      } catch (e) {
        console.error("Bar chart data load failed:", e);
      }
    }

    const extreme = (A1 || []).filter(d => (d.IndexLevel || "").toString().toLowerCase() === "extreme")
      .sort((a, b) => d3.descending(a.TotalScore, b.TotalScore)).slice(0, 10);

    if (!extreme.length) {
      createPlaceholder(target, "Bar chart — no data found");
      return;
    }

    const margin = { top: 44, right: 36, bottom: 40, left: 180 };
    const barH = 36;
    const height = margin.top + margin.bottom + extreme.length * (barH + 8);
    const svg = createSVG(target, svgW, height);
    const g = svg.append("g");

    const x = d3.scaleLinear().domain([0, d3.max(extreme, d => d.TotalScore) || 1])
      .range([margin.left, svgW - margin.right]).nice();
    const y = d3.scaleBand().domain(extreme.map(d => d.Country))
      .range([margin.top, height - margin.bottom]).padding(0.18);

    const color = d3.scaleLinear().domain([0, d3.max(extreme, d => d.TotalScore) || 1])
      .range([theme.accent, theme.primary]);

    // bars group
    const bars = g.selectAll(".bar")
      .data(extreme, d => d.Country)
      .join("rect")
      .attr("class", "bar")
      .attr("x", x(0))
      .attr("y", d => y(d.Country))
      .attr("height", y.bandwidth())
      .attr("rx", 6)
      .style("fill", d => color(d.TotalScore))
      .style("opacity", 0.98);

    bars.transition().duration(animation.duration).ease(animation.easing)
      .attr("width", d => Math.max(2, x(d.TotalScore) - x(0)));

    // labels left
    g.append("g").selectAll("text")
      .data(extreme)
      .join("text")
      .attr("x", margin.left - 12).attr("y", d => y(d.Country) + y.bandwidth() / 2)
      .attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .style("fill", theme.secondary).style("font-size", "13px")
      .text(d => d.Country);

    // axis top
    const axisTop = d3.axisTop(x).ticks(5).tickFormat(d3.format(".2s"));
    g.append("g").attr("transform", `translate(0,${margin.top})`).call(axisTop).call(g => g.select(".domain").remove());

    // tooltip
    const tip = makeTooltip("bar-tip");
    bars.on("mouseenter", (ev, d) => showTip(tip, ev, `<strong>${d.Country}</strong><br>Total Score: ${d.TotalScore}<br>Deadliness: ${d.Deadliness}<br>Danger: ${d.Danger}`))
      .on("mousemove", ev => showTip(tip, ev, tip.html()))
      .on("mouseleave", () => hideTip(tip));
  }

  // -----------------------
  // Chart 2 — Grouped Bar (top 3 countries across 4 metrics)
  // -----------------------
  function drawGroupedBar() {
    const target = "#grouped-bar-chart-container";
    const svgW = 760, svgH = 420;
    if (!A1.length) { createPlaceholder(target, "Grouped bar — data not ready"); return; }

    const top3 = A1.filter(d => (d.IndexLevel || "").toLowerCase() === "extreme")
      .sort((a, b) => d3.descending(a.TotalScore, b.TotalScore)).slice(0, 5).map(d => d.Country);

    if (!top3.length) { createPlaceholder(target, "Grouped bar — no top 5"); return; }

    const metrics = ["Deadliness", "Diffusion", "Danger", "Fragmentation"];
    const melted = [];
    A1.filter(d => top3.includes(d.Country)).forEach(row => {
      metrics.forEach(m => melted.push({ Country: row.Country, Metric: m, Value: row[m] || 0 }));
    });

    const svg = createSVG(target, svgW, svgH);
    const m = { t: 48, r: 20, b: 70, l: 80 }, w = svgW - m.l - m.r, h = svgH - m.t - m.b;
    const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);

    const x0 = d3.scaleBand().domain(top3).range([0, w]).padding(0.18);
    const x1 = d3.scaleBand().domain(metrics).range([0, x0.bandwidth()]).padding(0.06);
    const y = d3.scaleLinear().domain([0, d3.max(melted, d => +d.Value) || 1]).nice().range([h, 0]);

    const metricColors = d3.scaleOrdinal().domain(metrics)
      .range([theme.primary, theme.accent, "#7b6ce0", "#4caf50"]);

    // axes
    g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x0));
    g.append("g").call(d3.axisLeft(y).ticks(4));

    // groups1 and bars
    // group per country
    const groups1Sel = g.selectAll("g.group").data(top3).join("g").attr("transform", d => `translate(${x0(d)},0)`);

    // We'll compute bars by re-binding: (clear previous selection and create rects)
    groups1Sel.selectAll("rect").remove();
    groups1Sel.selectAll("rect")
      .data(d => metrics.map(mk => {
        // find row for country across A1
        const row = A1.find(r => r.Country === d);
        return { Country: d, Metric: mk, Value: row ? (row[mk] || 0) : 0 };
      }))
      .join("rect")
      .attr("x", d => x1(d.Metric))
      .attr("y", y(0))
      .attr("width", x1.bandwidth())
      .attr("height", 0)
      .attr("rx", 4)
      .style("fill", d => metricColors(d.Metric))
      .on("mouseenter", function (ev, d) {
        d3.select(this).transition().duration(160).attr("opacity", 0.9).attr("transform", "translate(0,-3)");
        const tip = makeTooltip("grouped-tip");
        showTip(tip, ev, `<b>${d.Country}</b><br>${d.Metric}: ${d.Value}`);
      })
      .on("mousemove", ev => {
        const tip = makeTooltip("grouped-tip");
        showTip(tip, ev, tip.html());
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(160).attr("opacity", 1).attr("transform", "");
        const tip = makeTooltip("grouped-tip"); hideTip(tip);
      })
      .transition().duration(animation.duration).ease(animation.easing)
      .attr("y", d => y(d.Value))
      .attr("height", d => Math.max(1, h - y(d.Value)));

    // legend
    addDiscreteLegend(svg, metrics, metricColors, m.l, 14, true, 20);
  }

  // small helper (unused stray attempt avoided in final code) - keep code consistent
  function countryName(x) { return x; }


// -----------------------
  // Chart 3 — Heatmap (detailed implementation)
  // -----------------------
  async function drawHeatmap() {
    const target = "#heatmap-container";
    const svgW = 960, svgH = 680;

    // attempt to fetch heatmap CSV from candidate names
    let raw = null;
    for (let path of HEATMAP_CANDIDATES) {
      try {
        raw = await d3.csv(path, d3.autoType);
        if (raw && raw.length) {
          console.info("Loaded heatmap CSV:", path);
          break;
        }
      } catch (e) {
        // try next
      }
    }
    if (!raw || !raw.length) {
      createPlaceholder(target, "Heatmap — data not found");
      return;
    }

    // normalize
    heatmapData = raw.filter(d => (d.Country || d.country) && (d.Year || d.year))
      .map(d => ({
        Country: (d.Country || d.country || "").toString().trim(),
        Year: + (d.Year || d.year || 0),
        Fatalities: + (d.Fatalities || d.fatalities || 0)
      }));

    const margin = { top: 50, right: 30, bottom: 110, left: Math.min(220, svgW * 0.18) };
    const innerW = svgW - margin.left - margin.right;
    const innerH = svgH - margin.top - margin.bottom;

    const svg = createSVG(target, svgW, svgH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const tip = makeTooltip("heatmap-tip");

    // aggregates
    const years = Array.from(new Set(heatmapData.map(d => d.Year))).sort(d3.ascending);
    const maxYear = d3.max(years);
    const cutoff = maxYear - 4; // <-- Defines "last 5 years" (e.g., 2024-4 = 2020)

    const totalsAll = Array.from(d3.rollup(heatmapData, v => d3.sum(v, d => d.Fatalities), d => d.Country), ([Country, total]) => ({ Country, total }));
    const totalsRecent = Array.from(d3.rollup(heatmapData.filter(d => d.Year >= cutoff), v => d3.sum(v, d => d.Fatalities), d => d.Country), ([Country, total]) => ({ Country, total }));

    const nonZeroAll = totalsAll.filter(d => d.total > 0);
    const nonZeroRecent = totalsRecent.filter(d => d.total > 0);

    const sortedHighAll = [...totalsAll].sort((a, b) => d3.descending(a.total, b.total));
    const sortedLowAll = [...nonZeroAll].sort((a, b) => d3.ascending(a.total, b.total));
    const sortedHigh5 = [...totalsRecent].sort((a, b) => d3.descending(a.total, b.total));
    const sortedLow5 = [...nonZeroRecent].sort((a, b) => d3.ascending(a.total, b.total));

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
      highest5: sortedHigh5.slice(0, N).map(d => d.Country),
      lowestOverall: pickLowest(sortedLowAll, sortedHighAll, N),
      lowest5: pickLowest(sortedLow5, sortedHigh5, N)
    };

    // dynamic render function
    function renderHeatmap(mode = "highestOverall") {
      const countries = modeCountries[mode];
      if (!countries || !countries.length) {
        d3.select("#heatmap-legend").html("");
        d3.select("#heatmap-summary").html("");
        createPlaceholder(target, "Heatmap — no countries for selected mode");
        return;
      }

      // --- START: MODIFIED FOR 5 YEARS ---
      // Filter years to only the last 5
      const yearsInView = Array.from(new Set(heatmapData.map(d => d.Year)))
        .filter(y => y >= cutoff) // <-- Only years >= cutoff
        .sort(d3.ascending);
      
      // Filter data to selected countries AND last 5 years
      const filtered = heatmapData.filter(d => 
        countries.includes(d.Country) && d.Year >= cutoff // <-- Added year filter
      );
      // --- END: MODIFIED FOR 5 YEARS ---

      const x = d3.scaleBand().domain(yearsInView).range([0, innerW]).padding(0);
      const y = d3.scaleBand().domain(countries).range([0, innerH]).padding(0); // <-- This was fixed in previous step

      const maxFatal = d3.max(heatmapData, d => d.Fatalities) || 1;
      const colorScale = d3.scalePow().exponent(0.5).domain([1, maxFatal]).range(["#f9ddddff", "#7a0206"]);
      function cellColor(d) { return d.Fatalities === 0 ? "#f9f8f8d7" : colorScale(Math.max(d.Fatalities, 1)); }

      g.selectAll("*").remove();

      // axes
      // Auto-calculate ticks based on available width
      const tickEvery = Math.max(1, Math.ceil(yearsInView.length / (innerW / 80)));
      const xTicks = yearsInView.filter((d, i) => i % tickEvery === 0);
      g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues(xTicks))
        .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").style("font-size", "11px");

      g.append("g").call(d3.axisLeft(y).tickSize(0)).selectAll("text").style("font-size", "11px");

      // cells
      g.selectAll(".heatmap-cell").data(filtered, d => d.Country + "::" + d.Year)
        .join(
          enter => enter.append("rect").attr("class", "heatmap-cell")
            .attr("x", d => x(d.Year)).attr("y", d => y(d.Country))
            .attr("width", x.bandwidth()).attr("height", y.bandwidth())
            .style("fill", cellColor)
            .on("mouseenter", (ev, d) => showTip(tip, ev, `<strong>${d.Country}</strong><br>${d.Year}<br>${fmtInt(d.Fatalities)} fatalities`))
            .on("mousemove", ev => showTip(tip, ev, tip.html()))
            .on("mouseleave", () => hideTip(tip)),
          update => update.transition().duration(350).style("fill", cellColor),
          exit => exit.transition().duration(200).style("opacity", 0).remove()
        );

      // legend (gradient)
      const legendW = Math.min(420, innerW - 120);
      const legendH = 12;
      const legendWrap = d3.select("#heatmap-legend");
      legendWrap.html("");
      const legendSvg = legendWrap.append("svg").attr("width", legendW).attr("height", 48);
      const defs = legendSvg.append("defs");
      const gradId = "hm-grad-" + mode;
      const lg = defs.append("linearGradient").attr("id", gradId);
      const nStops = 40;
      const stops = d3.range(0, 1.0001, 1 / nStops);
      lg.selectAll("stop").data(stops).join("stop")
        .attr("offset", d => (d * 100) + "%")
        .attr("stop-color", d => colorScale(Math.max(1, d * maxFatal)));

      legendSvg.append("rect").attr("width", legendW).attr("height", legendH).attr("y", 8).attr("rx", 3).style("fill", `url(#${gradId})`);
      const legendScale = d3.scaleLinear().domain([0, maxFatal]).range([0, legendW]);
      legendSvg.append("g").attr("transform", `translate(0, ${8 + legendH})`).call(d3.axisBottom(legendScale).ticks(5).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-size", "10px").style("fill", theme.secondary);

      // summary
      // Recalculate totals based on the *selected countries* (not all heatmapData)
      const totalAll = d3.sum(heatmapData.filter(d => countries.includes(d.Country)), d => d.Fatalities);
      const total5 = d3.sum(heatmapData.filter(d => countries.includes(d.Country) && d.Year >= cutoff), d => d.Fatalities);
      const avgAll = totalAll / countries.length;
      const avg5 = total5 / countries.length;

      // --- START: MODIFIED LABELS ---
      const labelMap = {
//         highestOverall: `Top 20 countries (by all-time fatalities) shown for ${cutoff}–${maxYear}`,
        highest5: `Top 20 countries by civilian fatalities in the last 5 years (${cutoff}–${maxYear})`,
//         lowestOverall: `20 countries (by all-time non-zero fatalities) shown for ${cutoff}–${maxYear}`,
        lowest5: `20 countries with smallest non-zero civilian fatalities in the last 5 years (${cutoff}–${maxYear})`
      };
      // --- END: MODIFIED LABELS ---

//       let summaryHTML = `<div><strong>${labelMap[mode]}</strong></div>`;
      // Show both stats for all modes now, as it's relevant context
      summaryHTML += `<div style="margin-top:8px;">
        <span style="color:${theme.primary}; font-weight:600;">Reported Fatalities (Last 5 Years): ${fmtInt(total5)}</span>
        <span style="color:${theme.secondary}; font-weight:400;">(avg ${fmtShort(avg5)} per country)</span><br>
      </div>`;
      
      d3.select("#heatmap-summary").html(summaryHTML);
    }

    // hook buttons
    d3.selectAll(".mode-btn").on("click", function () {
      d3.selectAll(".mode-btn").classed("active", false);
      d3.select(this).classed("active", true);
      renderHeatmap(this.dataset.mode);
    });

    renderHeatmap("highest5"); // default mode
  }

  // -----------------------
  // Chart 4 — Stacked (Absolute / by region)
  // -----------------------
  function drawStackedBar() {
    const target = "#stacked-bar-chart-container";
    if (!A3.length) { createPlaceholder(target, "Stacked bar — data not ready"); return; }

    // pick regional rows expected (the dataset may have different entity naming)
    const regions = ["Africa", "Americas", "Asia and Oceania", "Europe", "Middle East"];
    const keys = ["Intrastate", "One-sided", "Non-state", "Interstate"];
    // map input to expected keys from A3 loaded format
    const data = A3.filter(d => regions.includes(d.Entity)).map(d => ({
      region: d.Entity,
      Intrastate: +d.deaths_intrastate || 0,
      "One-sided": +d.deaths_onesided || 0,
      "Non-state": +d.deaths_nonstate || 0,
      Interstate: +d.deaths_interstate || 0
    })).map(d => ({ ...d, total: d.Intrastate + d["One-sided"] + d["Non-state"] + d.Interstate }))
      .sort((a, b) => d3.descending(a.total, b.total));

    if (!data.length) { createPlaceholder(target, "Stacked bar — insufficient regional data"); return; }

    const svgW = 960, marginTop = 80, marginRight = 200, marginBottom = 40, marginLeft = 120;
    const height = data.length * 56 + marginTop + marginBottom;
    const svg = createSVG(target, svgW, height);

    const series = d3.stack().keys(keys)(data);

    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.total) || 1]).range([marginLeft, svgW - marginRight]).nice();
    const y = d3.scaleBand().domain(data.map(d => d.region)).range([marginTop, height - marginBottom]).padding(0.14);

    const color = d3.scaleOrdinal().domain(keys).range([theme.primary, theme.accent, "#9ccae2", "#b7dfc2"]);

    svg.append("g").selectAll("g")
      .data(series)
      .join("g")
      .attr("fill", d => color(d.key))
      .selectAll("rect")
      .data(d => d)
      .join("rect")
      .attr("x", d => x(d[0]))
      .attr("y", d => y(d.data.region))
      .attr("height", y.bandwidth())
      .attr("width", 0)
      .on("mouseenter", (ev, d) => {
        const key = d3.select(ev.target.parentNode).datum().key;
        const value = d[1] - d[0];
        const total = d.data.total;
        const tip = makeTooltip("stack-tip");
        showTip(tip, ev, `<b>${d.data.region}</b><br>${key}: ${fmtInt(value)}<br>Total: ${fmtInt(total)}`);
      })
      .on("mousemove", ev => showTip(makeTooltip("stack-tip"), ev, makeTooltip("stack-tip").html()))
      .on("mouseleave", () => hideTip(makeTooltip("stack-tip")))
      .transition().duration(animation.duration).ease(animation.easing)
      .attr("width", d => Math.max(1, x(d[1]) - x(d[0])));

    svg.append("g").attr("transform", `translate(0,${marginTop})`).call(d3.axisTop(x).ticks(6, "s")).call(g => g.select(".domain").remove());
    svg.append("g").attr("transform", `translate(${marginLeft},0)`).call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());

    // legend
    addDiscreteLegend(svg, keys, color, svgW - marginRight + 12, marginTop, false, 22);
  }

  // -----------------------
  // Chart 5 — Waffle (percentage by region)
  // -----------------------
  function drawWaffle() {
    const target = "#waffle-chart-container";
    if (!A3.length) { createPlaceholder(target, "Waffle — data not ready"); return; }

   

    const data = A3;
     console.log('drawWaffle called, data length:', data.length);
    console.log('Available regions in data:', data.map(d => d.Entity));
    console.log('Selected region:', data);
    const regions = ["World", "Africa", "Asia and Oceania", "Middle East", "Europe", "Americas"];
    const controlsWrap = d3.select("#waffle-controls");
    const chartContainer = d3.select("#waffle-chart-container");
    const legendWrap = d3.select("#waffle-legend");
    const summaryWrap = d3.select("#waffle-summary");

    controlsWrap.selectAll("*").remove(); chartContainer.selectAll("*").remove(); legendWrap.selectAll("*").remove(); summaryWrap.selectAll("*").remove();

    controlsWrap.style("text-align", "center").append("label").attr("for", "waffleRegion").style("margin-right", "8px").text("Select Region: ");
    const select = controlsWrap.append("select").attr("id", "waffleRegion").style("padding", "6px 12px").style("border-radius", "6px");
    select.selectAll("option").data(regions).join("option").attr("value", d => d).text(d => d);

    const svgSize = 160; const gridCols = 10, totalSquares = 100;
    const svg = chartContainer.append("svg").attr("viewBox", `0 0 ${svgSize + 10} ${svgSize + 10}`).style("width", "80%").style("max-width", "500px").style("margin", "0 auto").style("display", "block");
    const cell = Math.floor(svgSize / gridCols);
    const g = svg.append("g").attr("transform", `translate(5,5)`);

    const color = d3.scaleOrdinal().domain(["Intrastate", "One-sided", "Non-state", "Interstate"])
      .range([theme.primary, theme.accent, "#9ccae2", "#b7dfc2"]);

    const tt = makeTooltip("waffle-tip");

    function getRow(region) {
      const lower = region.toLowerCase();
      return data.find(d => (d.Entity || "").toString().trim().toLowerCase().includes(lower));
    }
    


    function extractCategories(row) {
      const cols = Object.keys(row);
      const findCol = (pattern) => cols.find(c => c.toLowerCase().includes(pattern.toLowerCase())) || null;
      return [
        { key: "Intrastate", col: findCol("deaths_intrastate") },
        { key: "One-sided", col: findCol("deaths_onesided") },
        { key: "Non-state", col: findCol("deaths_nonstate") },
        { key: "Interstate", col: findCol("deaths_interstate") }
      ].map(d => ({ key: d.key, value: d.col ? (+row[d.col] || 0) : 0 }));
    }
  
  
    function computeSquares(categories) {
      const total = d3.sum(categories, d => d.value) || 1;
      categories.forEach(d => { const raw = (d.value / total) * 100; d.floor = Math.floor(raw); d.frac = raw - d.floor; });
      let allocated = d3.sum(categories, d => d.floor);
      let remaining = totalSquares - allocated;
      const byFrac = [...categories].sort((a, b) => d3.descending(a.frac, b.frac));
      for (let i = 0; i < remaining; i++) byFrac[i % byFrac.length].floor += 1;
      const squares = [];
      categories.forEach(cat => { for (let i = 0; i < cat.floor; i++) squares.push({ category: cat.key }); });
      return squares.slice(0, totalSquares);
    }

    function draw(region = "World") {
      const row = getRow(region);
      if (!row) { summaryWrap.html(`<em>No data available for ${region}.</em>`); g.selectAll(".waffle-square").remove(); legendWrap.html(""); return; }
      const cats = extractCategories(row);
      const total = d3.sum(cats, d => d.value) || 1;
      cats.forEach(c => { c.percent = (c.value / total) * 100; c.displayValue = fmtInt(Math.round(c.value)); });

      const squares = computeSquares(cats);
      const rects = g.selectAll(".waffle-square").data(squares, (d, i) => d.category + "::" + i);

      rects.join(
        enter => enter.append("rect").attr("class", d => `waffle-square cat-${d.category.replace(/\s+/g, '')}`)
          .attr("width", cell - 2).attr("height", cell - 2).attr("rx", 4)
          .attr("x", (d, i) => (i % gridCols) * cell + 1).attr("y", (d, i) => Math.floor(i / gridCols) * cell + 1)
          .style("opacity", 0).attr("fill", d => color(d.category))
          .transition().delay((d, i) => i * 6).duration(320).style("opacity", 1),
        update => update.transition().duration(280).attr("fill", d => color(d.category)),
        exit => exit.transition().duration(220).style("opacity", 0).remove()
      );

      g.selectAll(".waffle-square")
        .on("mouseenter", function (ev, d) {
          const cat = cats.find(c => c.key === d.category);
          showTip(tt, ev, `<strong>${cat.key}</strong><br>${Math.round(cat.percent)}%<br>${cat.displayValue} deaths`);
          g.selectAll(".waffle-square").transition().duration(120).style("opacity", s => s.category === d.category ? 1 : 0.18);
        })
        .on("mousemove", ev => showTip(tt, ev, tt.html()))
        .on("mouseleave", () => { hideTip(tt); g.selectAll(".waffle-square").transition().duration(120).style("opacity", 1); });

      // legend
      legendWrap.html("");
      const legendDiv = legendWrap.append("div").attr("class", "waffle-legend-inner").style("text-align", "center");
      const li = legendDiv.selectAll(".legend-item").data(cats).join("div").attr("class", "legend-item").style("display", "inline-flex").style("align-items", "center").style("gap", "8px").style("margin", "6px 12px");
      li.append("span").style("width", "18px").style("height", "18px").style("border-radius", "4px").style("display", "inline-block").style("background", d => color(d.key));
      li.append("span").style("font-size", "0.95rem").style("color", theme.secondary).html(d => `${d.key} — ${Math.round(d.percent)}% (${d.displayValue})`);

      summaryWrap.html(`<strong>${region}</strong> — ${fmtInt(Math.round(total))} total deaths across all recorded conflicts.`);
    }

    draw("World");
    select.on("change", e => draw(e.target.value));
  }

  // -----------------------
  // Chart 6 — Circle packing (interactive)
  // -----------------------

//   function drawCirclePacking() {
//     const target = "#circle-packing-container";
//     // Use A1 (ACLED data) instead of A3
//     if (!A1.length) { createPlaceholder(target, "Circle packing — data not ready"); return; }

//     // --- MODIFIED: Prepare items from A1 data ---
//     const allItems = A1.map(d => {
//       return {
//         name: d.Country,
//         value: d.TotalScore, // Default sort/size metric
        
//         // --- New Story Metrics ---
//         indexLevel: d.IndexLevel || "Low/Inactive", // This is our new category
//         totalScore: d.TotalScore,
//         deadlinessValue: d.Deadliness, // Use the name from A1 loading
//         dangerValue: d.Danger,
//         diffusionValue: d.Diffusion,
//         fragmentationValue: d.Fragmentation,
//       };
//     }).filter(d => d.value > 0); // Only show countries with a conflict score


//     if (!allItems.length) { createPlaceholder(target, "Circle packing — no data"); return; }

//     const W = 980, H = 560, legendW = 260;
//     const svg = createSVG(target, W, H);
//     svg.append("rect").attr("class", "svg-background").attr("width", W - legendW).attr("height", H).style("fill", "none");
//     const g = svg.append("g");
//     const legG = svg.append("g").attr("transform", `translate(${W - legendW + 8}, 32)`);

//     const tip = makeTooltip("pack-tip");

//     let activeCategory = null;
//     let circlesSel, labelsSel, legendItemsSel, getCategoryFn, importantNames = new Set();
    
//     // --- MODIFIED: Categorical color scale based on Index Level ---
//     const color = d3.scaleOrdinal()
//       .domain(["Extreme", "High", "Medium", "Low/Inactive"]) // Categories from the CSV
//       .range([theme.primary, theme.accent, "#7b6ce0", "#b7dfc2"]) // Using theme colors
//       .unknown("#ccc"); // Fallback color

//     function updatePack(metricKey) {
//       // metricKey is one of: totalScore, deadlinessValue, dangerValue, etc.
//       const items = allItems.filter(d => (d[metricKey] || 0) > 0);
//       if (!items.length) { g.selectAll("*").remove(); legG.selectAll("*").remove(); return; }
      
//       // --- MODIFIED: Category is now the indexLevel string ---
//       getCategoryFn = d => d.indexLevel;

//       // --- MODIFIED: Get color from the data object's category ---
//       const getColor = d => color(d.indexLevel);

//       // size scale (this logic is still valid)
//       const maxVal = d3.max(items, d => d[metricKey]) || 1;
//       const sizeScale = d3.scaleSqrt().domain([0, maxVal]).range([4, 70]);

//       // --- MODIFIED: top N per *new* category for labels ---
//       importantNames.clear();
//       const topN = 5;
//       color.domain().forEach(level => { // Iterate over "Extreme", "High", etc.
//         items.filter(d => getCategoryFn(d) === level)
//           .sort((a, b) => d3.descending(a[metricKey], b[metricKey]))
//           .slice(0, topN)
//           .forEach(d => importantNames.add(d.name));
//       });

//       // create pack layout
//       const pack = d3.pack().size([W - legendW - 10, H]).padding(6);
//       const root = d3.hierarchy({ children: items }).sum(d => sizeScale(d[metricKey]));
//       const nodes = pack(root).leaves();

//       const node = g.selectAll("g.node").data(nodes, d => d.data.name);

//       // exit
//       node.exit().transition().duration(500).style("opacity", 0).remove();

//       // enter
//       const nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", d => `translate(${d.x},${d.y})`);
//       nodeEnter.append("circle").attr("r", 0).style("stroke", "rgba(0,0,0,0.06)").style("stroke-width", 0.6);
//       nodeEnter.append("text").attr("class", "pack-label").attr("text-anchor", "middle").attr("dy", ".35em").style("opacity", 0).style("pointer-events", "none").text(d => d.data.name);

//       // merge
//       const merged = nodeEnter.merge(node);
//       merged.transition().duration(750).attr("transform", d => `translate(${d.x},${d.y})`);

//       // circles
//       merged.select("circle").transition().duration(750)
//           .attr("r", d => d.r)
//           .attr("fill", d => getColor(d.data)) // MODIFIED
//           .style("opacity", 0.95);

//       // labels: only show if fits and is important
//       merged.select("text").transition().duration(750).style("opacity", function (d) {
//         const txtLen = this.getComputedTextLength();
//         const fits = txtLen < d.r * 1.6;
//         return (fits && importantNames.has(d.data.name)) ? 1 : 0;
//       }).style("font-size", d => Math.max(9, Math.min(14, d.r / 3.5)) + "px")
//         .style("fill", d => getContrastColor(getColor(d.data))) // MODIFIED
//         .text(d => d.data.name);

//       // listeners
//       merged.select("circle")
//         .on("mouseenter", function (ev, d) {
//           d3.select(this.parentNode).raise();
//           // --- MODIFIED: Tooltip content ---
//           const tipHtml = `<b>${d.data.name}</b>
//               <br>Index Level: <b style="color:${color(d.data.indexLevel)};">${d.data.indexLevel}</b>
//               <br>${metricKey}: ${d.data[metricKey].toFixed(3)}`; // Use metricKey
//           showTip(tip, ev, tipHtml);
//           // --- End modification ---
//           merged.select("circle").transition().duration(120).style("opacity", c => c === d ? 1 : 0.18);
//           merged.select("text").transition().duration(120).style("opacity", c => c === d ? 1 : 0.15);
//         })
//         .on("mousemove", ev => showTip(tip, ev, tip.html()))
//         .on("mouseleave", function () {
//   hideTip(tip);

//   // Reset circle opacity
//   merged.select("circle")
//     .transition().duration(120)
//     .style("opacity", 0.95);

//   // Correct label fade-back logic
//   merged.select("text").each(function (d) {
//     const txtLen = this.getComputedTextLength();
//     const fits = txtLen < d.r * 1.6;
//     const visible = (fits && importantNames.has(d.data.name)) ? 1 : 0;
//     d3.select(this)
//       .transition().duration(120)
//       .style("opacity", visible);
//   });
// });


//       // --- MODIFIED: Legend based on categories ---
//       const legendData = color.domain().map(level => ({
//         label: level,
//         cat: level,
//         color: color(level)
//       }));

//       legG.selectAll("*").remove();
//       legG.append("text").attr("class", "legend-title").attr("x", 0).attr("y", 0)
//           .style("font-weight", 700).text("Conflict Index Level");
          
//       legendItemsSel = legG.selectAll("g.legend-item").data(legendData)
//           .join("g").attr("transform", (d, i) => `translate(0, ${24 + i * 28})`)
//           .style("cursor", "pointer");
          
//       legendItemsSel.append("circle").attr("r", 8).attr("cx", 8).attr("cy", 0)
//           .attr("fill", d => d.color);
          
//       legendItemsSel.append("text").attr("x", 24).attr("y", 4)
//           .text(d => d.label).style("fill", theme.secondary);
//       // --- End modification ---


//       // legend interactivity (toggle category)
//       legendItemsSel.on("click", (ev, d) => {
//         if (activeCategory === d.cat) activeCategory = null; else activeCategory = d.cat;
//         applyLegendFilter();
//       });

//       function applyLegendFilter() {
//         if (!getCategoryFn) return;
        
//         // --- MODIFIED: Get category from d.data ---
//         const getCat = d => getCategoryFn(d.data);

//         if (!activeCategory) {
//           merged.select("circle").transition().duration(200).style("opacity", 0.95).style("pointer-events", "all");
//           legendItemsSel.transition().duration(200).attr("opacity", 1);
//           merged.select("text").transition().duration(200).style("opacity", d => (importantNames.has(d.data.name) ? 1 : 0)); // Re-apply importance filter
//         } else {
//           legendItemsSel.transition().duration(200).attr("opacity", item => (item.cat === activeCategory ? 1 : 0.3));
//           merged.select("circle").transition().duration(200)
//               .style("opacity", d => (getCat(d) === activeCategory ? 0.95 : 0)) // MODIFIED
//               .style("pointer-events", d => (getCat(d) === activeCategory ? "all" : "none")); // MODIFIED
//           merged.select("text").transition().duration(200)
//               .style("opacity", d => (getCat(d) === activeCategory && importantNames.has(d.data.name) ? 1 : 0)); // MODIFIED
//         }
//       }
//     } // updatePack

//     // bind metric toggle inputs if present (#chart-6-controls)
//     const inputs = d3.selectAll("#chart-6-controls input[name='metric-toggle']");
//     if (!inputs.empty()) {
//       inputs.on("change", function () {
//         updatePack(this.value);
//       });
//       // Ensure default is checked correctly
//       const defaultMetric = "totalScore";
//       inputs.property("checked", function() { return this.value === defaultMetric; });
//       updatePack(defaultMetric);

//     } else {
//       // fallback: create minimal control UI inside the container (useful if missing)
//       const controlWrap = d3.select("#chart-6-controls");
//       controlWrap.selectAll("*").remove();
      
//       // --- MODIFIED: New keys for A1 data ---
//       const keys = [
//           {v: "totalScore", label: "Total Score"}, 
//           {v: "deadlinessValue", label: "Deadliness"}, 
//           {v: "dangerValue", label: "Danger"}, 
//           {v: "diffusionValue", label: "Diffusion"},
//           {v: "fragmentationValue", label: "Fragmentation"}
//       ];
      
//      keys.forEach(k => {
//   const label = controlWrap.append("label")
//     .style("margin-right", "12px")
//     .style("cursor", "pointer");

//   label.append("input")
//     .attr("type", "radio")
//     .attr("name", "metric-toggle")
//     .attr("value", k.v)
//     .property("checked", k.v === "totalScore");

//   label.append("span").text(" " + k.label);
// });
//       d3.selectAll("#chart-6-controls input[name='metric-toggle']").on("change", function () {
//         updatePack(this.value);
//       });
//     }

//     // initial
//     updatePack("totalScore"); // MODIFIED
//   }
function drawCirclePacking() {

    const target = "#circle-packing-container";

    if (!A3.length) { createPlaceholder(target, "Circle packing — data not ready"); return; }



    // prepare aggregated country totals and components

    const allItems = A3.filter(d => d.Code && d.Entity && d.Entity !== "World").map(d => {

      const intr = +d.deaths_intrastate || 0;

      const one = +d.deaths_onesided || 0;

      const nonst = +d.deaths_nonstate || 0;

      const inter = +d.deaths_interstate || 0;

      const tot = intr + one + nonst + inter;

      return {

        name: d.Entity,

        value: tot,

        deaths_intrastate: intr,

        deaths_onesided: one,

        deaths_nonstate: nonst,

        deaths_interstate: inter,

        total_deaths: tot

      };

    }).filter(d => d.value > 0);



    if (!allItems.length) { createPlaceholder(target, "Circle packing — no data"); return; }



    const W = 980, H = 560, legendW = 260;

    const svg = createSVG(target, W, H);

    svg.append("rect").attr("class", "svg-background").attr("width", W - legendW).attr("height", H).style("fill", "none");

    const g = svg.append("g");

    const legG = svg.append("g").attr("transform", `translate(${W - legendW + 8}, 32)`);



    const tip = makeTooltip("pack-tip");



    let activeCategory = null;

    let circlesSel, labelsSel, legendItemsSel, getCategoryFn, importantNames = new Set();



    function updatePack(metricKey) {

      // metricKey is one of: total_deaths, deaths_intrastate, deaths_onesided, deaths_nonstate, deaths_interstate

      // filter items with non-zero metric

      const items = allItems.filter(d => (d[metricKey] || 0) > 0);

      if (!items.length) { g.selectAll("*").remove(); legG.selectAll("*").remove(); return; }



      const values = items.map(d => d[metricKey]).sort(d3.ascending);

      const thresholdMed = d3.quantile(values, 0.33) || 0;

      const thresholdHigh = d3.quantile(values, 0.66) || 0;



      getCategoryFn = v => (v >= thresholdHigh ? "high" : (v >= thresholdMed ? "medium" : "low"));



      // color interpolators per group

      const interpHigh = d3.interpolateRgb("#d6a15f", "#7a3b00");

      const interpMed = d3.interpolateRgb("#ffbf80", "#ff7a00");

      const interpLow = d3.interpolateRgb("#9ccae2", "#0d47a1");



      const colorHigh = d3.scaleSequential(interpHigh).domain([d3.min(items, d => d[metricKey]) || thresholdHigh, d3.max(items, d => d[metricKey]) || thresholdHigh]);

      const colorMed = d3.scaleSequential(interpMed).domain([d3.min(items, d => d[metricKey]) || thresholdMed, d3.max(items, d => d[metricKey]) || thresholdHigh]);

      const colorLow = d3.scaleSequential(interpLow).domain([d3.min(items, d => d[metricKey]) || 1, d3.max(items, d => d[metricKey]) || thresholdMed]);



      const getColor = v => (v >= thresholdHigh ? colorHigh(v) : (v >= thresholdMed ? colorMed(v) : colorLow(v)));



      // size scale

      const maxVal = d3.max(items, d => d[metricKey]) || 1;

      const sizeScale = d3.scaleSqrt().domain([0, maxVal]).range([4, 70]);



      // top N per category for labels

      importantNames.clear();

      const topN = 5;

      items.filter(d => getCategoryFn(d[metricKey]) === "high").sort((a, b) => d3.descending(a[metricKey], b[metricKey])).slice(0, topN).forEach(d => importantNames.add(d.name));

      items.filter(d => getCategoryFn(d[metricKey]) === "medium").sort((a, b) => d3.descending(a[metricKey], b[metricKey])).slice(0, topN).forEach(d => importantNames.add(d.name));

      items.filter(d => getCategoryFn(d[metricKey]) === "low").sort((a, b) => d3.descending(a[metricKey], b[metricKey])).slice(0, topN).forEach(d => importantNames.add(d.name));



      // create pack layout

      const pack = d3.pack().size([W - legendW - 10, H]).padding(6);

      const root = d3.hierarchy({ children: items }).sum(d => sizeScale(d[metricKey]));

      const nodes = pack(root).leaves();



      const node = g.selectAll("g.node").data(nodes, d => d.data.name);



      // exit

      node.exit().transition().duration(500).style("opacity", 0).remove();



      // enter

      const nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", d => `translate(${d.x},${d.y})`);

      nodeEnter.append("circle").attr("r", 0).style("stroke", "rgba(0,0,0,0.06)").style("stroke-width", 0.6);

      nodeEnter.append("text").attr("class", "pack-label").attr("text-anchor", "middle").attr("dy", ".35em").style("opacity", 0).style("pointer-events", "none").text(d => d.data.name);



      // merge

      const merged = nodeEnter.merge(node);

      merged.transition().duration(750).attr("transform", d => `translate(${d.x},${d.y})`);



      // circles

      merged.select("circle").transition().duration(750).attr("r", d => d.r).attr("fill", d => getColor(d.data[metricKey])).style("opacity", 0.95);



      // labels: only show if fits and is important

      merged.select("text").transition().duration(750).style("opacity", function (d) {

        const txtLen = this.getComputedTextLength();

        const fits = txtLen < d.r * 1.6;

        return (fits && importantNames.has(d.data.name)) ? 1 : 0;

      }).style("font-size", d => Math.max(9, Math.min(14, d.r / 3.5)) + "px")

        .style("fill", d => getContrastColor(getColor(d.data[metricKey])))

        .text(d => d.data.name);



      // listeners

      merged.select("circle")

        .on("mouseenter", function (ev, d) {

          d3.select(this.parentNode).raise();

          showTip(tip, ev, `<b>${d.data.name}</b><br>Total: ${fmtInt(d.data.total_deaths)}<br>${metricKey}: ${fmtInt(d.data[metricKey])}`);

          merged.select("circle").transition().duration(120).style("opacity", c => c === d ? 1 : 0.18);

          merged.select("text").transition().duration(120).style("opacity", c => c === d ? 1 : 0.15);

        })

        .on("mousemove", ev => showTip(tip, ev, tip.html()))

        .on("mouseleave", function () {

          hideTip(tip);

          merged.select("circle").transition().duration(120).style("opacity", 0.95);

          merged.select("text").transition().duration(120).style("opacity", 1).each(function (d) {

            // re-evaluate display based on fit + importance

            const txtLen = this.getComputedTextLength();

            const fits = txtLen < d.r * 1.6;

            d3.select(this).style("display", (fits && importantNames.has(d.data.name)) ? "block" : "none");

          });

        });



      // legend

      const legendData = [

        { label: `High (≥ ${fmtInt(thresholdHigh)})`, cat: "high", color: interpHigh(1) },

        { label: `Medium (${fmtInt(thresholdMed)}–${fmtInt(thresholdHigh)})`, cat: "medium", color: interpMed(1) },

        { label: `Low (< ${fmtInt(thresholdMed)})`, cat: "low", color: interpLow(1) }

      ];



      legG.selectAll("*").remove();

      legG.append("text").attr("class", "legend-title").attr("x", 0).attr("y", 0).style("font-weight", 700).text("Death Toll Categories");

      legendItemsSel = legG.selectAll("g.legend-item").data(legendData).join("g").attr("transform", (d, i) => `translate(0, ${24 + i * 28})`).style("cursor", "pointer");

      legendItemsSel.append("circle").attr("r", 8).attr("cx", 8).attr("cy", 0).attr("fill", d => d.color);

      legendItemsSel.append("text").attr("x", 24).attr("y", 4).text(d => d.label).style("fill", theme.secondary);



      // legend interactivity (toggle category)

      legendItemsSel.on("click", (ev, d) => {

        if (activeCategory === d.cat) activeCategory = null; else activeCategory = d.cat;

        applyLegendFilter();

      });



      function applyLegendFilter() {

        if (!getCategoryFn) return;

        if (!activeCategory) {

          merged.select("circle").transition().duration(200).style("opacity", 0.95).style("pointer-events", "all");

          legendItemsSel.transition().duration(200).attr("opacity", 1);

          merged.select("text").transition().duration(200).style("opacity", 1);

        } else {

          legendItemsSel.transition().duration(200).attr("opacity", item => (item.cat === activeCategory ? 1 : 0.3));

          merged.select("circle").transition().duration(200).style("opacity", d => (getCategoryFn(d.data[metricKey]) === activeCategory ? 0.95 : 0)).style("pointer-events", d => (getCategoryFn(d.data[metricKey]) === activeCategory ? "all" : "none"));

          merged.select("text").transition().duration(200).style("opacity", d => (getCategoryFn(d.data[metricKey]) === activeCategory && importantNames.has(d.data.name) ? 1 : 0));

        }

      }

    } // updatePack



    // bind metric toggle inputs if present (#chart-6-controls)

    const inputs = d3.selectAll("#chart-6-controls input[name='metric-toggle']");

    if (!inputs.empty()) {

      inputs.on("change", function () {

        updatePack(this.value);

      });

    } else {

      // fallback: create minimal control UI inside the container (useful if missing)

      const controlWrap = d3.select("#chart-6-controls");

      controlWrap.selectAll("*").remove();

      const keys = [{v:"value", label:"Total deaths"}, {v:"deaths_intrastate", label:"Intrastate"}, {v:"deaths_onesided", label:"One-sided"}, {v:"deaths_nonstate", label:"Non-state"}, {v:"deaths_interstate", label:"Interstate"}];

     keys.forEach(k => {
  const label = controlWrap.append("label")
    .style("margin-right", "12px")
    .style("cursor", "pointer");

  label.append("input")
    .attr("type", "radio")
    .attr("name", "metric-toggle")
    .attr("value", k.v)
    .property("checked", k.v === "totalScore");

  label.append("span").text(" " + k.label);
});

      d3.selectAll("#chart-6-controls input[name='metric-toggle']").on("change", function () {

        updatePack(this.value);

      });

    }



    // initial

    updatePack("total_deaths" in allItems[0] ? "total_deaths" : "value");

  }

  // -----------------------
  // Chart 7 — Dumbbell plot
  // -----------------------
  function drawDumbbellPlot() {
    const target = "#dumbbell-plot-container";
    if (!A1.length) { createPlaceholder(target, "Dumbbell plot — data not ready"); return; }

    const data = A1.filter(d => (d.IndexLevel || "").toLowerCase() === "extreme")
      .sort((a, b) => d3.descending(a.TotalScore, b.TotalScore)).slice(0, 20); // top 20 for readability

    if (!data.length) { createPlaceholder(target, "Dumbbell — no 'Extreme' data"); return; }

    const W = 820, H = Math.max(360, data.length * 28 + 120);
    const m = { t: 36, r: 28, b: 60, l: 160 };
    const svg = createSVG(target, W, H);
    const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);
    const w = W - m.l - m.r, h = H - m.t - m.b;

    const x = d3.scaleLinear().domain([0, 1]).range([0, w]).nice();
    const y = d3.scaleBand().domain(data.map(d => d.Country)).range([0, h]).padding(0.3);

    // axis
    g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6, "%"));
    g.append("g").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();

    // lines
    g.selectAll("line.dumbbell")
      .data(data).join("line").attr("class", "dumbbell")
      .attr("x1", d => x(d.Deadliness || 0)).attr("x2", d => x(d.Danger || 0))
      .attr("y1", d => y(d.Country) + y.bandwidth() / 2).attr("y2", d => y(d.Country) + y.bandwidth() / 2)
      .style("stroke", "#2a1549ff").style("stroke-width", 2).style("opacity", 0.5)
      .transition().duration(animation.duration).ease(animation.easing).attr("opacity", 1);

    // circles
    const melted = data.flatMap(d => [
      { Country: d.Country, metric: "Deadliness", value: d.Deadliness || 0, total: d.TotalScore },
      { Country: d.Country, metric: "Danger", value: d.Danger || 0, total: d.TotalScore }
    ]);

    const metricColor = d3.scaleOrdinal().domain(["Deadliness", "Danger"]).range([theme.primary, theme.accent]);
    const tip = makeTooltip("dumb-tip");

    g.selectAll("circle.db")
      .data(melted).join("circle")
      .attr("class", "db")
      .attr("cx", d => x(d.value)).attr("cy", d => y(d.Country) + y.bandwidth() / 2)
      .attr("r", 0).attr("fill", d => metricColor(d.metric)).attr("stroke", "#222").attr("stroke-width", 0.6)
      .on("mouseenter", (ev, d) => { 
        // --- THIS IS THE FIX ---
        // Use fmtPct (e.g., "51.9%") instead of fmtShort (e.g., "520m")
        showTip(tip, ev, `<b>${d.Country}</b><br>${d.metric}: ${fmtPct(d.value)}`); 
        // --- END FIX ---
        d3.select(ev.target).transition().duration(120).attr("r", 10); 
      })
      .on("mousemove", ev => showTip(tip, ev, tip.html()))
      .on("mouseleave", (ev) => { hideTip(tip); d3.select(ev.target).transition().duration(120).attr("r", 7); })
      .transition().duration(animation.duration).delay((_, i) => i * 8).attr("r", 7);
  }

// -----------------------
  // Chart 8 — Small multiples stacked bars (top 20 countries)
  // -----------------------
  function drawSmallMultiples() {
    const target = "#small-multiples-container";
    if (!A3.length) { createPlaceholder(target, "Small multiples — data not ready"); return; }

    // This part is correct
    const data = A3.filter(d => d.Code && d.Entity && d.Entity !== "World").map(d => {
      const intr = +d.deaths_intrastate || 0;
      const one = +d.deaths_onesided || 0;
      const nonst = +d.deaths_nonstate || 0;
      const inter = +d.deaths_interstate || 0;
      return { Entity: d.Entity, Intrastate: intr, "One-sided": one, "Non-state": nonst, Interstate: inter, total: intr + one + nonst + inter };
    }).filter(d => d.total > 0).sort((a, b) => d3.descending(a.total, b.total)).slice(0, 20); // Sliced to 20, not 30

    if (!data.length) { createPlaceholder(target, "Small multiples — no data"); return; }

    const keys = ["Intrastate", "One-sided", "Non-state", "Interstate"];
    const svgW = 928; const m = { t: 80, r: 160, b: 20, l: 150 };
    const barH = 26; const H = data.length * barH + m.t + m.b;
    const svg = createSVG(target, svgW, H);

    const x = d3.scaleLinear().domain([0, 1]).range([m.l, svgW - m.r]);

    // --- START FIX ---
    // The 'flat' and 'd3.index' steps were over-complicating the stack.
    // d3.stack() can take the 'data' array directly.
    const series = d3.stack()
        .keys(keys)
        .offset(d3.stackOffsetExpand) // This creates the 100% bar
        (data); // <-- FIX 1: Just pass 'data' directly
    // --- END FIX ---

    const y = d3.scaleBand().domain(data.map(d => d.Entity)).range([m.t, H - m.b]).padding(0.14);
    const color = d3.scaleOrdinal().domain(keys).range([theme.primary, theme.accent, "#9ccae2", "#b7dfc2"]);

    const group = svg.append("g");
    const rects = group.selectAll("g.layer").data(series).join("g").attr("fill", d => color(d.key))
      .selectAll("rect").data(d => d).join("rect")
      .attr("x", d => x(d[0]))
      .attr("y", d => y(d.data.Entity)) // <-- FIX 2: Access country name with d.data.Entity
      .attr("width", d => Math.max(0, x(d[1]) - x(d[0]))) // Use 0, not 1, for empty
      .attr("height", y.bandwidth());

    const tip = makeTooltip("small-tip");
    rects.on("mouseenter", (ev, d) => {
      // Get the key from the parent 'g' node, which represents the series
      const key = d3.select(ev.target.parentNode).datum().key; 
      const perc = (d[1] - d[0]) * 100;
      const tot = d.data.total; // <-- FIX 3: Get total directly from d.data
      showTip(tip, ev, `<b>${d.data.Entity}</b> (Total: ${fmtInt(tot)})<br><span style="color:${color(key)}">■</span> ${key}: ${perc.toFixed(1)}%`); // <-- FIX 4: Use d.data.Entity and the 'key' variable
    }).on("mousemove", ev => showTip(tip, ev, tip.html())).on("mouseleave", () => hideTip(tip));

    svg.append("g").attr("transform", `translate(0,${m.t})`).call(d3.axisTop(x).ticks(10, "%")).select(".domain").remove();
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();

    addDiscreteLegend(svg, keys, color, svgW - m.r + 12, m.t, false, 20);
  }
  // -----------------------
  // Utilities: placeholder & legend
  // -----------------------
  function createPlaceholder(containerId, text = "Chart coming soon") {
    const container = d3.select(containerId);
    container.selectAll("*").remove();
    const W = 760, H = 260;
    const svg = container.append("svg").attr("viewBox", `0 0 ${W} ${H}`).style("width", "100%").style("height", "auto");
    svg.append("rect").attr("x", 12).attr("y", 12).attr("width", W - 24).attr("height", H - 24).attr("rx", 10).style("fill", "none").style("stroke", "rgba(0,0,0,0.06)").style("stroke-dasharray", "6 6");
    svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle").attr("dominant-baseline", "middle").style("font-size", "18px").style("fill", theme.secondary).text(text);
  }

  // addDiscreteLegend (keeps API used earlier)
  function addDiscreteLegend(svgSel, items, colorScale, x, y, horizontal = false, itemGap = 20) {
    // svgSel: d3 selection of svg (not g)
    const g = svgSel.append("g").attr("transform", `translate(${x},${y})`).attr("class", "legend");
    const row = g.selectAll("g.l").data(items).join("g").attr("class", "l");
    row.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", d => colorScale(d));
    row.append("text").attr("x", 16).attr("y", 10).text(d => d).style("fill", theme.secondary).style("font-size", "12px");
    if (horizontal) {
      let cumulativeWidth = 0;
      row.attr("transform", function (d, i) {
        const w = this.getBBox().width || 70;
        const xPos = cumulativeWidth;
        cumulativeWidth += w + itemGap;
        return `translate(${xPos}, 0)`;
      });
    } else {
      row.attr("transform", (d, i) => `translate(0,${i * itemGap})`);
    }
    return g;
  }

  // -----------------------
  // Data loader and init
  // -----------------------
  function loadAndDrawAll() {
    // load main two files concurrently, then heatmap separately inside drawHeatmap
    Promise.all([
      d3.csv(DATA_FILE_1, d => ({
        Country: (d.Country || d.Entity || "").toString().trim(),
        IndexLevel: (d["Index Level"] || d.IndexLevel || "").toString().trim(),
        TotalScore: + (d["Total Score"] || d.TotalScore || 0),
        Deadliness: + (d["Deadliness Value Scaled"] || d.Deadliness || 0),
        Diffusion: + (d["Diffusion Value Scaled"] || d.Diffusion || 0),
        Danger: + (d["Danger Value Scaled"] || d.Danger || 0),
        Fragmentation: + (d["Fragmentation Value Scaled"] || d.Fragmentation || 0)
      })),
      d3.csv(DATA_FILE_3, d => ({
        Entity: (d.Entity || "").toString().trim(),
        Code: (d.Code || "").toString().trim(),
        deaths_intrastate: + (d["Cumulative deaths in intrastate conflicts"] || d.deaths_intrastate || 0),
        deaths_onesided: + (d["Cumulative deaths from one-sided violence"] || d.deaths_onesided || 0),
        deaths_nonstate: + (d["Cumulative deaths in non-state conflicts"] || d.deaths_nonstate || 0),
        deaths_interstate: + (d["Cumulative deaths in interstate conflicts"] || d.deaths_interstate || 0)
      }))
    ]).then(([acled, cum]) => {
      A1 = acled;
      A3 = cum;

      // Draw charts that rely on these datasets
      drawBarChart();
      drawGroupedBar();
      drawStackedBar();
      drawWaffle();
      drawCirclePacking();
      drawDumbbellPlot();
      drawSmallMultiples();

      // Heatmap uses a separate file; call it independently
      drawHeatmap();

    }).catch(err => {
      console.error("Data load error:", err);
      // still attempt to draw what we can
      drawBarChart();
      drawGroupedBar();
      drawHeatmap();
      drawStackedBar();
      drawWaffle();
      drawCirclePacking();
      drawDumbbellPlot();
      drawSmallMultiples();
    });
  }

  // redraw on resize for responsiveness (basic)
  let resizeTO;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => {
      // re-draw all to adapt to new container sizes
      // Clear containers and redraw quickly
      const containers = [
        "#bar-chart-container", "#grouped-bar-chart-container", "#heatmap-container",
        "#stacked-bar-chart-container", "#waffle-chart-container", "#circle-packing-container",
        "#dumbbell-plot-container", "#small-multiples-container"
      ];
      containers.forEach(sel => d3.select(sel).selectAll("*").remove());
      // call draw functions (they are robust to missing data)
      drawBarChart();
      drawGroupedBar();
      drawHeatmap();
      drawStackedBar();
      drawWaffle();
      drawCirclePacking();
      drawDumbbellPlot();
      drawSmallMultiples();
    }, 350);
  });

  // Start on DOM ready
  document.addEventListener("DOMContentLoaded", loadAndDrawAll);
})();
