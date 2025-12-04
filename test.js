/* test.js — Upgraded interaction & storytelling (Option B)
   - Pulsing anomaly nodes
   - Cluster halo on hover
   - Fade-in contextual labels
   - Improved Sankey hover + glow
   - Better status text & resets
   - Keeps visual style within your shared CSS
*/

(async function () {
  // ---------- CONFIG ----------
  const colors = {
    Africa: "#e67e22",
    Americas: "#c0392b",
    Asia: "#2980b9",
    Europe: "#27ae60",
    "Middle East": "#8e44ad",
    Unknown: "#95a5a6",
    // Sankey categories (map to sensible colours)
    "Intrastate War": "#ff9f43",
    "Interstate War": "#f1c40f",
    "Non-state Conflict": "#4400ffff",
    "One-sided Violence": "#95ff00ff",
    "Cumulative Human Loss": "#2d3436"
  };

  const regionMap = {
    "Mexico": "Americas", "Nigeria": "Africa", "Ukraine": "Europe",
    "Sudan": "Africa", "Myanmar": "Asia", "Palestine": "Middle East",
    "Brazil": "Americas", "Syria": "Middle East", "Yemen": "Middle East",
    "Ethiopia": "Africa", "Somalia": "Africa", "Russia": "Europe",
    "Democratic Republic of Congo": "Africa", "Colombia": "Americas",
    "Haiti": "Americas", "Pakistan": "Asia", "Afghanistan": "Asia",
    "India": "Asia", "Iraq": "Middle East", "Mali": "Africa",
    "Burkina Faso": "Africa", "South Sudan": "Africa", "Cameroon": "Africa",
    "Lebanon": "Middle East", "Israel": "Middle East", "Trinidad and Tobago": "Americas",
    "Puerto Rico": "Americas", "Kenya": "Africa", "Philippines": "Asia",
    "Central African Republic": "Africa", "Honduras": "Americas", "Guatemala": "Americas",
    "South Africa": "Africa", "Ecuador": "Americas", "Iran": "Middle East",
    "Chad": "Africa", "Mozambique": "Africa", "Indonesia": "Asia", "Peru": "Americas",
    "Turkey": "Middle East", "Libya": "Africa", "Uganda": "Africa", "Benin": "Africa",
    "Ghana": "Africa", "Madagascar": "Africa", "Jamaica": "Americas", "Burundi": "Africa",
    "Bangladesh": "Asia", "Venezuela": "Americas"
  };

  function getRegionColor(countryId) {
    if (regionMap[countryId]) return colors[regionMap[countryId]];
    return colors.Unknown;
  }

  // ---------- LOAD DATA ----------
  let rawData;
  try {
    rawData = await d3.json("./data/net_data.json");
    if (!rawData) throw new Error("Data not found");
  } catch (err) {
    console.error("Failed to load data:", err);
    return;
  }

  // Build visualizations
  const netControl = drawNetwork(JSON.parse(JSON.stringify(rawData.network)));
  drawSankey(JSON.parse(JSON.stringify(rawData.sankey)));

  // ---------- UI HOOKS ----------
  // Search
  const searchInput = document.getElementById("network-search");
  if (searchInput) {
    searchInput.addEventListener("input", e => netControl.search(e.target.value));
  }

  // View tabs
  const viewLinks = document.querySelectorAll(".view-link");
  viewLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      viewLinks.forEach(l => l.classList.remove("active"));
      e.target.classList.add("active");
      const viewName = e.target.getAttribute("data-view");
      netControl.setStoryView(viewName);
    });
  });

  // ---------- NETWORK GRAPH ----------
  function drawNetwork(networkData) {
    const container = document.getElementById("network-chart");
    const width = container.clientWidth || 900;
    const height = 600;

    container.innerHTML = "";

    // Annotation overlay
    const annotation = d3.select(container).append("div")
      .attr("class", "annotation-overlay");

    // Build link index for quick neighbor lookup
    const linkedByIndex = {};
    networkData.links.forEach(d => {
      const s = typeof d.source === "object" ? d.source.id : d.source;
      const t = typeof d.target === "object" ? d.target.id : d.target;
      linkedByIndex[`${s},${t}`] = true;
      linkedByIndex[`${t},${s}`] = true;
    });

    function isConnected(a, b) {
      const aId = a.id || a;
      const bId = b.id || b;
      return linkedByIndex[`${aId},${bId}`] || aId === bId;
    }

    const svg = d3.select(container).append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    // Tooltip
    const tooltip = d3.select("#viz-tooltip");

    // Simulation
    const simulation = d3.forceSimulation(networkData.nodes)
      .force("link", d3.forceLink(networkData.links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => Math.sqrt(d.size) * 0.6 + 6));

    // Links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(networkData.links)
      .enter().append("line")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer");

    // Nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(networkData.nodes)
      .enter().append("circle")
      .attr("r", d => Math.max(5, Math.sqrt(d.size) * 0.4))
      .attr("fill", d => getRegionColor(d.id))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("class", "net-node")
      .call(d3.drag().on("start", dragStart).on("drag", drag).on("end", dragEnd));

    // Labels (hidden by default — fade in on hover / search)
    const labels = g.append("g")
      .attr("class", "net-labels")
      .selectAll("text")
      .data(networkData.nodes)
      .enter().append("text")
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("opacity", 0)
      .attr("fill", "var(--color-text)")
      .text(d => d.id);

    // --- Interaction behaviors ---

    // Soft halo: draws attention to a node's region by dimming others
    function haloRegion(d) {
      const c = getRegionColor(d.id);
      node.transition().duration(250).style("opacity", n => getRegionColor(n.id) === c ? 1 : 0.25);
      link.transition().duration(250).style("opacity", l => {
        const c1 = getRegionColor(l.source.id || l.source);
        const c2 = getRegionColor(l.target.id || l.target);
        return (c1 === c && c2 === c) ? 0.9 : 0.08;
      });
    }

    function clearHalo() {
      node.transition().duration(250).style("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 1.5);
      link.transition().duration(250).style("opacity", 0.6).attr("stroke", "#ccc").attr("stroke-width", 1.5);
    }

    // Hover a node: highlight neighbors, show tooltip, fade labels selectively
    function highlightNode(event, d) {
      // Dim everything slightly
      node.style("opacity", 0.12).attr("stroke", "#fff").attr("stroke-width", 1.2);
      link.style("opacity", 0.06).attr("stroke", "#ddd").attr("stroke-width", 1);

      // Highlight the hovered node
      d3.select(event.currentTarget).style("opacity", 1).attr("stroke", "#333").attr("stroke-width", 3);

      // Highlight neighbors & their links
      node.filter(n => isConnected(d, n) && n.id !== d.id)
        .style("opacity", 1)
        .attr("stroke", "#555");

      link.filter(l => (l.source.id === d.id || l.target.id === d.id))
        .style("opacity", 1).attr("stroke", "#666").attr("stroke-width", 2);

      // Fade-in only connected labels
      labels.transition().duration(160).attr("opacity", n => (isConnected(d, n) ? 1 : 0));

      // Tooltip
      tooltip.style("opacity", 1).style("display", "block")
        .html(
          `<strong>${d.id}</strong><br/><span style="color:#ccc; font-size:0.85em">${d.level} intensity — ${d.size.toLocaleString()} estimated</span>`
        )
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 18) + "px");
    }

    // Link hover: show connection info
    function highlightLink(event, d) {
      d3.select(event.currentTarget)
        .attr("stroke", "#333")
        .attr("stroke-width", 3)
        .attr("stroke-opacity", 1);

      tooltip.style("opacity", 1).style("display", "block")
        .html(`<strong>Structural connection</strong><br/>${d.source.id} ↔ ${d.target.id}`)
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 18) + "px");
    }

    function resetView() {
      node.style("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 1.5);
      link.style("opacity", 0.6).attr("stroke", "#ccc").attr("stroke-width", 1.5);
      labels.attr("opacity", 0);
      tooltip.style("opacity", 0).style("display", "none");
    }

    node.on("mouseover", highlightNode).on("mouseout", resetView);
    link.on("mouseover", highlightLink).on("mouseout", resetView);

    // Simulation tick
    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("cx", d => d.x).attr("cy", d => d.y);
      labels.attr("x", d => d.x).attr("y", d => d.y - (Math.sqrt(d.size) * 0.4) - 6);
    });

    function dragStart(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function drag(event, d) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragEnd(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }

    // Public API for controls
    return {
      search: (val) => {
        if (!val) { resetView(); svg.transition().duration(800).call(zoom.transform, d3.zoomIdentity); return; }
        const found = networkData.nodes.find(n => n.id.toLowerCase().includes(val.toLowerCase()));
        if (found) {
          resetView();
          node.style("opacity", 0.12);
          link.style("opacity", 0.05);
          const targetNode = node.filter(d => d.id === found.id);
          targetNode.style("opacity", 1).attr("stroke", "#000").attr("stroke-width", 3);

          // show connected neighbourhood
          node.filter(n => isConnected(found, n)).style("opacity", 1).attr("stroke", "#555");
          link.filter(l => l.source.id === found.id || l.target.id === found.id).style("opacity", 1);

          // show labels for connected nodes
          labels.transition().duration(200).attr("opacity", n => isConnected(found, n) ? 1 : 0);

          // zoom to node
          svg.transition().duration(900).call(zoom.transform,
            d3.zoomIdentity.translate(width / 2, height / 2).scale(2).translate(-found.x, -found.y)
          );
        }
      },

      setStoryView: (view) => {
        annotation.style("opacity", 0);
        // Reset any running animations so we don't stack transitions
        node.interrupt(); link.interrupt();

        if (view === "global") {
          resetView();
          svg.transition().duration(900).call(zoom.transform, d3.zoomIdentity);

          // remove any ongoing pulsing
          node.transition().attr("r", d => Math.max(5, Math.sqrt(d.size) * 0.4));
        } else if (view === "clusters") {
          // regional gravity: dim cross-region links; emphasise intra-region
          node.style("opacity", 1).attr("stroke", "#fff");
          link.transition().duration(600).style("opacity", l => {
            const c1 = getRegionColor(l.source.id || l.source);
            const c2 = getRegionColor(l.target.id || l.target);
            return c1 === c2 ? 0.85 : 0.06;
          });

          annotation.html("<strong>Regional gravity</strong><br/>Violence tends to cluster within regional blocks; long-distance structural links are rarer.")
            .style("opacity", 1);
          svg.transition().duration(900).call(zoom.transform, d3.zoomIdentity);
        } else if (view === "anomaly") {
          // Focus on Mexico & Nigeria; pulse them
          resetView();
          node.style("opacity", 0.08);
          link.style("opacity", 0.02);

          const targets = ["Mexico", "Nigeria"];
          const targetNodes = node.filter(d => targets.includes(d.id));

          // Highlight nodes & labels
          targetNodes.style("opacity", 1).attr("stroke", "#000").attr("stroke-width", 2);
          labels.transition().duration(200).attr("opacity", n => targets.includes(n.id) ? 1 : 0);

          // Highlight link between them if it exists
          link.filter(l =>
            (l.source.id === "Mexico" && l.target.id === "Nigeria") ||
            (l.source.id === "Nigeria" && l.target.id === "Mexico")
          )
            .style("opacity", 1)
            .attr("stroke", "#e74c3c")
            .attr("stroke-width", 4);

          // Pulsing animation: heartbeat
          targetNodes.each(function (d) {
            const nodeEl = d3.select(this);
            (function repeatPulse() {
              nodeEl.transition().duration(700).attr("r", Math.max(8, Math.sqrt(d.size) * 0.46))
                .transition().duration(700).attr("r", Math.max(5, Math.sqrt(d.size) * 0.4))
                .on("end", repeatPulse);
            })();
          });

          // Zoom to midpoint of the two nodes (use current positions)
          const n1 = networkData.nodes.find(n => n.id === "Mexico");
          const n2 = networkData.nodes.find(n => n.id === "Nigeria");
          if (n1 && n2) {
            const mx = (n1.x + n2.x) / 2;
            const my = (n1.y + n2.y) / 2;
            svg.transition().duration(1100).call(
              zoom.transform,
              d3.zoomIdentity.translate(width / 2, height / 2).scale(2.2).translate(-mx, -my)
            );
          }

          annotation.html("<strong>The trans-Atlantic twins</strong><br/>Mexico and Nigeria share a near-identical fragmentation profile: many competing non-state actors and high civilian exposure.")
            .style("opacity", 1);
        }
      }
    };
  }

  // ---------- SANKEY DIAGRAM ----------
  function drawSankey(sankeyData) {
    const container = document.getElementById("sankey-chart");
    const statusDiv = document.getElementById("sankey-status");
    const resetBtn = document.getElementById("sankey-reset");
    const width = container.clientWidth || 900;
    const height = 500;

    container.innerHTML = "";
    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);

    // Basic sankey layout
    const sankey = d3.sankey().nodeWidth(20).nodePadding(14).extent([[1, 1], [width - 1, height - 6]]);
    const { nodes, links } = sankey(sankeyData);

    // Global total (for share calculations)
    const globalTotal = d3.sum(nodes.filter(n => n.layer === 0 || n.sourceLinks).map(d => d.value || 0));

    // Create gradients for links (source -> target)
    const defs = svg.append("defs");
    links.forEach((d, i) => {
      const gid = `grad-${i}`;
      const grad = defs.append("linearGradient").attr("id", gid).attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d.source.x1).attr("x2", d.target.x0);
      grad.append("stop").attr("offset", "0%").attr("stop-color", colors[d.source.name] || "#999");
      grad.append("stop").attr("offset", "100%").attr("stop-color", colors[d.target.name] || "#999");
      d.gid = gid;
    });

    // Links
    const link = svg.append("g")
      .selectAll("path")
      .data(links)
      .enter().append("path")
      .attr("class", "sankey-link")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke", d => `url(#${d.gid})`)
      .attr("fill", "none")
      .attr("stroke-opacity", 0.4)
      .style("transition", "stroke-opacity 0.2s");

    // Nodes
    const node = svg.append("g")
      .selectAll("rect")
      .data(nodes)
      .enter().append("rect")
      .attr("x", d => d.x0).attr("y", d => d.y0)
      .attr("height", d => Math.max(2, d.y1 - d.y0)).attr("width", d => d.x1 - d.x0)
      .attr("fill", d => colors[d.name] || "#777")
      .attr("stroke", "#333")
      .style("cursor", "pointer");

    // Labels
    svg.append("g").style("font", "11px sans-serif").style("font-weight", "700").style("fill", "#444")
      .selectAll("text").data(nodes).enter().append("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
      .attr("y", d => (d.y1 + d.y0) / 2).attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);

    let locked = null;

    // Status updater (node or link)
    function updateStatus(d, isLink = false) {
      if (isLink) {
        const sourceVal = d.source.value || 1;
        const shareOfSource = ((d.value / sourceVal) * 100).toFixed(1);
        const shareOfGlobal = ((d.value / (globalTotal || 1)) * 100).toFixed(1);
        statusDiv.innerHTML = `
          ${d.source.name} → ${d.target.name}:
          <strong>${d.value.toLocaleString()}</strong> fatalities
          <span style="color:var(--color-primary); margin-left:8px;">
            (${shareOfSource}% of ${d.source.name} • ${shareOfGlobal}% of global)
          </span>
        `;
      } else {
        const total = d.value || 0;
        const shareOfGlobal = ((total / (globalTotal || 1)) * 100).toFixed(1);
        statusDiv.innerHTML = `<strong>${d.name}</strong>: ${total.toLocaleString()} fatalities (${shareOfGlobal}% of global total)`;
      }
    }

    // Node hover / click interactions
    node.on("mouseover", (e, d) => {
      if (locked) return;
      link.style("stroke-opacity", l => (l.source === d || l.target === d) ? 0.85 : 0.08);
      // soft focus on nodes in same layer (makes it feel systemic)
      node.style("opacity", n => (n === d || n.layer === d.layer) ? 1 : 0.45);
      updateStatus(d, false);
    }).on("mouseout", () => {
      if (locked) return;
      link.style("stroke-opacity", 0.4);
      node.style("opacity", 1);
      statusDiv.innerHTML = "Hover over any stream to view fatality statistics.";
    }).on("click", (e, d) => {
      e.stopPropagation();
      locked = d;
      resetBtn.style.display = "inline-block";
      // Reduce noise & highlight all links touching the clicked node
      link.style("stroke-opacity", l => (l.source === d || l.target === d) ? 0.9 : 0.05);
      node.style("opacity", n => (n === d || n.layer === d.layer) ? 1 : 0.45);
      updateStatus(d, false);
    });

    // Link hover: add "glow" + use gradients; ensure width matches data
    link.on("mouseover", function (e, d) {
      if (locked) return;
      const sel = d3.select(this);
      // stronger visual emphasis
      sel.style("stroke-opacity", 0.95)
        .style("filter", "drop-shadow(0 6px 10px rgba(0,0,0,0.18))")
        // enforce stroke width inline to beat the global CSS
        .style("stroke-width", Math.max(1, d.width) + "px");

      updateStatus(d, true);
    }).on("mouseout", function (e, d) {
      if (locked) return;
      const sel = d3.select(this);
      sel.style("stroke-opacity", 0.4)
        .style("filter", null)
        .style("stroke-width", null);
      statusDiv.innerHTML = "Hover over any stream to view fatality statistics.";
    });

    // Reset button
    resetBtn.addEventListener("click", () => {
      locked = null;
      resetBtn.style.display = "none";
      link.style("stroke-opacity", 0.4).style("filter", null).style("stroke-width", null);
      node.style("opacity", 1);
      statusDiv.innerHTML = "Hover over any stream to view fatality statistics.";
    });

    // Click outside to clear lock (nice UX)
    svg.on("click", () => {
      locked = null;
      resetBtn.style.display = "none";
      link.style("stroke-opacity", 0.4).style("filter", null).style("stroke-width", null);
      node.style("opacity", 1);
      statusDiv.innerHTML = "Hover over any stream to view fatality statistics.";
    });

  } // drawSankey end

})(); // IIFE end
