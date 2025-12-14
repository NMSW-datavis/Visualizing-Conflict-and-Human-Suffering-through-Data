/* Network.js — Analytical Network: Animated, Minimap, & Controlled Zoom */

(async function () {
  // ---------- CONFIG ----------
  const colors = {
    Africa: "#e67e22", Americas: "#c0392b", Asia: "#2980b9", Europe: "#27ae60",
    "Middle East": "#8e44ad", Unknown: "#95a5a6",
    "Intrastate War": "#fecf00", "Interstate War": "#f1c40f",
    "Non-state Conflict": "#00ff55", "One-sided Violence": "#00ddff"
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

  // Initialize
  const netControl = drawNetwork(JSON.parse(JSON.stringify(rawData.network)));
  drawSankey(JSON.parse(JSON.stringify(rawData.sankey)));

  // Hooks
  const searchInput = document.getElementById("network-search");
  if (searchInput) searchInput.addEventListener("input", e => netControl.search(e.target.value));

  // View tabs (restore original logic)
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
    container.style.position = "relative";

    // Annotation overlay
    const annotation = d3.select(container).append("div")
      .attr("class", "annotation-overlay")
      .style("position", "absolute").style("left", "12px").style("top", "12px")
      .style("pointer-events", "none").style("z-index", 50);

    // Controls CSS
    const style = document.createElement('style');
    style.innerHTML = `
      .net-controls { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 6px; z-index: 100; }
      .net-btn { width: 32px; height: 32px; background: white; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #555; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .net-btn:hover { background: #f4f4f4; color: #000; border-color: #bbb; }
    `;
    container.appendChild(style);

    // Controls HTML
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "net-controls";
    controlsDiv.innerHTML = `
      <button class="net-btn" id="zoom-in" title="Zoom In">+</button>
      <button class="net-btn" id="zoom-out" title="Zoom Out">−</button>
      <button class="net-btn" id="zoom-fit" title="Reset View">⛶</button>
    `;
    container.appendChild(controlsDiv);

    // Adjacency Map
    const linkedByIndex = {};
    networkData.links.forEach(d => {
      const s = typeof d.source === "object" ? d.source.id : d.source;
      const t = typeof d.target === "object" ? d.target.id : d.target;
      linkedByIndex[`${s},${t}`] = true; linkedByIndex[`${t},${s}`] = true;
    });
    function isConnected(a, b) {
      const aId = a.id || a; const bId = b.id || b;
      return linkedByIndex[`${aId},${bId}`] || aId === bId;
    }

    const svg = d3.select(container).append("svg")
      .attr("width", width).attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("display", "block").style("background", "#ffffff");

    const g = svg.append("g");
    const tooltip = d3.select("#viz-tooltip");

    // ---------- INITIAL POSITIONS (Buckets) ----------
    const regionBuckets = { Africa: 0, Americas: 1, Asia: 2, Europe: 3, "Middle East": 4, Unknown: 5 };
    const center = { x: width / 2, y: height / 2 };
    
    // Hash function for deterministic randomness
    function hashTo01(str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      return (h >>> 0) / 4294967295;
    }

    networkData.nodes.forEach((n) => {
      const reg = regionMap[n.id] || "Unknown";
      const bucket = regionBuckets[reg] != null ? regionBuckets[reg] : 5;
      const angle = (bucket / 6) * Math.PI * 2 + (hashTo01(n.id) - 0.5) * 0.6;
      const radius = 150 + (hashTo01(n.id + "_r")) * 100;
      n.x = center.x + Math.cos(angle) * radius;
      n.y = center.y + Math.sin(angle) * radius;
    });

    // ---------- LIVE SIMULATION (Animated) ----------
    const simulation = d3.forceSimulation(networkData.nodes)
      .force("link", d3.forceLink(networkData.links).id(d => d.id).distance(100).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-300)) 
      .force("center", d3.forceCenter(center.x, center.y))
      .force("collide", d3.forceCollide().radius(d => Math.sqrt(d.size) * 0.45 + 8).strength(0.9));

    // LINKS
    const link = g.append("g").attr("class", "links")
      .selectAll("line").data(networkData.links).enter().append("line")
      .attr("stroke", "#999").attr("stroke-opacity", 0.5)
      .style("cursor", "pointer").style("stroke-width", 1.5);

    // NODES
    const node = g.append("g").attr("class", "nodes")
      .selectAll("circle").data(networkData.nodes).enter().append("circle")
      .attr("r", d => Math.max(5, Math.sqrt(d.size) * 0.4))
      .attr("fill", d => getRegionColor(d.id))
      .attr("stroke", "#fff").attr("stroke-width", 1.5)
      .attr("class", "net-node")
      .call(d3.drag().on("start", dragStart).on("drag", drag).on("end", dragEnd));

    // LABELS
    const labels = g.append("g").attr("class", "net-labels")
      .selectAll("text").data(networkData.nodes).enter().append("text")
      .attr("font-size", d => d.level === "Extreme" ? "12px" : "10px")
      .attr("font-weight", d => d.level === "Extreme" ? "700" : "400")
      .attr("text-anchor", "middle")
      .attr("opacity", d => d.level === "Extreme" ? 0.8 : 0) // Analytical filter
      .attr("fill", "#2c3e50").style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)")
      .text(d => d.id);

    // ---------- SIMULATION TICK ----------
    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("cx", d => d.x).attr("cy", d => d.y);
      labels.attr("x", d => d.x).attr("y", d => d.y - (Math.sqrt(d.size) * 0.4) - 8);
    });

    // ---------- ZOOM WITH LIMITS ----------
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .translateExtent([[-width, -height], [2 * width, 2 * height]])
       .on("zoom", (e) => {
        g.attr("transform", e.transform);
        updateMinimapViewport(); // Link zoom to minimap
      });
    svg.call(zoom);

    function fitToBounds() {
      // Delay slightly to let simulation settle if called early
      setTimeout(() => {
        const bounds = g.node().getBBox();
        const parent = svg.node().parentElement;
        const fullW = parent.clientWidth || 900;
        const fullH = parent.clientHeight || 600;
        const midX = bounds.x + bounds.width / 2;
        const midY = bounds.y + bounds.height / 2;
        const scale = 0.85 / Math.max(bounds.width / fullW, bounds.height / fullH);
        const translate = [fullW / 2 - scale * midX, fullH / 2 - scale * midY];
        
        svg.transition().duration(800)
           .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      }, 100);
    }
    
    
    setTimeout(() => {
        const k = 0.3; // <--- Set your exact start scale here
        
        // Calculate the translation needed to keep the center in the middle
        // Formula: (ScreenCenter) * (1 - Scale)
        const tx = (width / 2) * (1 - k);
        const ty = (height / 2) * (1 - k);

        svg.transition().duration(750)
           .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));

        createMinimap();
    }, 500);

    // ---------- MINIMAP LOGIC (Restored) ----------
    const minimapNode = document.getElementById("minimap");
    let miniSvg, miniViewport;

    function createMinimap() {
      if(!minimapNode) return;
      minimapNode.innerHTML = "";
      const mw = minimapNode.clientWidth || 150;
      const mh = minimapNode.clientHeight || 100;

      // Create static copy of nodes/links for minimap
      miniSvg = d3.select(minimapNode).append("svg")
        .attr("width", mw).attr("height", mh)
        .style("background", "#fff").style("border", "1px solid #ddd");

      const miniG = miniSvg.append("g"); // We will scale this in updateMinimapViewport

      miniG.selectAll("line").data(networkData.links).enter().append("line")
        .attr("x1", d=>d.source.x).attr("y1", d=>d.source.y).attr("x2", d=>d.target.x).attr("y2", d=>d.target.y)
        .attr("stroke", "#e0e0e0").attr("stroke-width", 2);

      miniG.selectAll("circle").data(networkData.nodes).enter().append("circle")
        .attr("cx", d=>d.x).attr("cy", d=>d.y).attr("r", 4).attr("fill", d=>getRegionColor(d.id));

      miniViewport = miniSvg.append("rect")
        .attr("width", 10).attr("height", 10)
        .attr("fill", "rgba(255, 0, 0, 0.05)")
        .attr("stroke", "#e74c3c").attr("stroke-width", 1.5);
        
      updateMinimapViewport();
    }

    function updateMinimapViewport() {
      if (!miniSvg || !miniViewport) return;
      const mw = minimapNode.clientWidth || 150;
      const mh = minimapNode.clientHeight || 100;
      
      const bbox = g.node().getBBox();
      const contentW = bbox.width || width;
      const contentH = bbox.height || height;
      
      // Calculate minimap scale
      const sx = mw / contentW;
      const sy = mh / contentH;
      const s = Math.min(sx, sy) * 0.8; 

      // Center the mini content
      const tx = (mw - contentW * s) / 2 - bbox.x * s;
      const ty = (mh - contentH * s) / 2 - bbox.y * s;

      // Apply transform to mini content group
      miniSvg.select("g").attr("transform", `translate(${tx},${ty}) scale(${s})`);

      // Calculate Viewport rect
      const t = d3.zoomTransform(svg.node());
      // The viewport represents the visible area relative to the content
      const vx = (-t.x / t.k) * s + tx;
      const vy = (-t.y / t.k) * s + ty;
      const vw = (width / t.k) * s;
      const vh = (height / t.k) * s;

      miniViewport
        .attr("x", vx).attr("y", vy)
        .attr("width", vw).attr("height", vh);
    }

    // ---------- INTERACTIONS ----------
    function highlightNode(event, d) {
      node.style("opacity", 0.1); link.style("opacity", 0.05); labels.attr("opacity", 0);
      d3.select(event.currentTarget).style("opacity", 1).attr("stroke", "#333").attr("stroke-width", 2.5);
      
      const neighbors = networkData.nodes.filter(n => isConnected(d, n));
      node.filter(n => neighbors.includes(n)).style("opacity", 1).attr("stroke", "#555");
      link.filter(l => l.source.id === d.id || l.target.id === d.id).style("opacity", 1).attr("stroke", "#555");
      labels.filter(n => neighbors.includes(n) || n.id === d.id).attr("opacity", 1).style("font-weight", "700");

      tooltip.style("opacity", 1).style("display", "block")
        .html(`<strong>${d.id}</strong><br/>${d.level}`)
        .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
    }

    function resetVisuals() {
      node.style("opacity", 1).attr("stroke", "#fff");
      link.style("opacity", 0.5).attr("stroke", "#999");
      labels.attr("opacity", d => d.level === "Extreme" ? 0.8 : 0);
      tooltip.style("opacity", 0).style("display", "none");
    }

    node.on("mouseover", highlightNode).on("mouseout", resetVisuals);

    // Dragging
    function dragStart(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function drag(event, d) {
      d.fx = event.x; d.fy = event.y;
      updateMinimapViewport();
    }
    function dragEnd(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }

    // Buttons
    document.getElementById("zoom-in").onclick = () => svg.transition().call(zoom.scaleBy, 1.2);
    document.getElementById("zoom-out").onclick = () => svg.transition().call(zoom.scaleBy, 0.8);
    document.getElementById("zoom-fit").onclick = fitToBounds;

    return {
      search: (val) => {
        const found = networkData.nodes.find(n => n.id.toLowerCase().includes(val.toLowerCase()));
        if (found) {
          resetVisuals();
          const scale = 2.5;
          svg.transition().duration(750).call(
            zoom.transform, 
            d3.zoomIdentity.translate(width/2 - found.x*scale, height/2 - found.y*scale).scale(scale)
          );
          d3.selectAll(".net-node").filter(d => d.id === found.id).attr("stroke", "#000").attr("stroke-width", 3);
        }
      },
      // Restored Story View Logic
      setStoryView: (view) => {
        annotation.style("opacity", 0);
        node.interrupt(); link.interrupt();

        if (view === "global") {
          resetVisuals();
          fitToBounds();
        } else if (view === "clusters") {
          node.style("opacity", 1);
          link.transition().duration(600).style("opacity", l => {
            const c1 = getRegionColor(l.source.id); const c2 = getRegionColor(l.target.id);
            return c1 === c2 ? 0.85 : 0.06;
          });
          annotation.html("<strong>Regional Clustering</strong><br/>Highlighting internal conflicts.").style("opacity", 1);
          fitToBounds();
        } else if (view === "anomaly") {
          resetVisuals();
          node.style("opacity", 0.1); link.style("opacity", 0.02);
          const targets = ["Mexico", "Nigeria"];
          const targetNodes = node.filter(d => targets.includes(d.id));
          targetNodes.style("opacity", 1).attr("stroke", "#000");
          labels.filter(n => targets.includes(n.id)).attr("opacity", 1);
          
          link.filter(l => 
            (l.source.id === "Mexico" && l.target.id === "Nigeria") || 
            (l.source.id === "Nigeria" && l.target.id === "Mexico")
          ).style("opacity", 1).style("stroke", "#e74c3c").style("stroke-width", 3);

          annotation.html("<strong>Cross-Regional Link</strong><br/>Unusual high-intensity connection.").style("opacity", 1);
        }
      }
    };
  }

  // ---------- SANKEY CHART (EXACT ORIGINAL) ----------
  function drawSankey(sankeyData) {
    const container = document.getElementById("sankey-chart");
    const statusDiv = document.getElementById("sankey-status");
    const resetBtn = document.getElementById("sankey-reset");
    const width = container.clientWidth || 900;
    const height = 500;

    container.innerHTML = "";
    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);

    const sankey = d3.sankey().nodeWidth(20).nodePadding(14).extent([[1, 1], [width - 1, height - 6]]);
    const { nodes, links } = sankey(sankeyData);

    const globalTotal = d3.sum(nodes.filter(n => n.layer === 0 || n.sourceLinks).map(d => d.value || 0));

    const defs = svg.append("defs");
    links.forEach((d, i) => {
      const gid = `grad-${i}`;
      const grad = defs.append("linearGradient").attr("id", gid).attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d.source.x1).attr("x2", d.target.x0);
      grad.append("stop").attr("offset", "0%").attr("stop-color", colors[d.source.name] || "#999");
      grad.append("stop").attr("offset", "100%").attr("stop-color", colors[d.target.name] || "#999");
      d.gid = gid;
    });

    const link = svg.append("g")
      .selectAll("path")
      .data(links)
      .enter().append("path")
      .attr("class", "sankey-link")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", d => `url(#${d.gid})`)
      .attr("stroke-opacity", 0.4)
      .style("transition", "stroke-opacity 0.2s")
      .style("stroke-width", d => `${Math.max(1, d.width)}px `)
      .style("pointer-events", "auto");

    const node = svg.append("g")
      .selectAll("rect")
      .data(nodes)
      .enter().append("rect")
      .attr("x", d => d.x0).attr("y", d => d.y0)
      .attr("height", d => Math.max(2, d.y1 - d.y0)).attr("width", d => d.x1 - d.x0)
      .attr("fill", d => colors[d.name] || "#777")
      .attr("stroke", "#333")
      .style("cursor", "pointer");

    svg.append("g").style("font", "11px sans-serif").style("font-weight", "700").style("fill", "#444")
      .selectAll("text").data(nodes).enter().append("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
      .attr("y", d => (d.y1 + d.y0) / 2).attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);

    let locked = null;

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

    node.on("mouseover", (e, d) => {
      if (locked) return;
      link.style("stroke-opacity", l => (l.source === d || l.target === d) ? 0.85 : 0.08);
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
      link.style("stroke-opacity", l => (l.source === d || l.target === d) ? 0.9 : 0.05);
      node.style("opacity", n => (n === d || n.layer === d.layer) ? 1 : 0.45);
      updateStatus(d, false);
    });

    link.on("mouseover", function (e, d) {
      if (locked) return;
      const sel = d3.select(this);
      sel.style("stroke-opacity", 0.95)
        .style("filter", "drop-shadow(0 6px 10px rgba(0,0,0,0.18))")
        .style("stroke-width", `${Math.max(1, d.width) + 2}px`);
      updateStatus(d, true);
    }).on("mouseout", function (e, d) {
      if (locked) return;
      const sel = d3.select(this);
      sel.style("stroke-opacity", 0.4)
        .style("filter", null)
        .style("stroke-width", `${Math.max(1, d.width)}px`);
      statusDiv.innerHTML = "Hover over any stream to view fatality statistics.";
    });

    resetBtn.addEventListener("click", () => {
      locked = null;
      resetBtn.style.display = "none";
      link.style("stroke-opacity", 0.4).style("filter", null).style("stroke-width", d => `${Math.max(1, d.width)}px`);
      node.style("opacity", 1);
      statusDiv.innerHTML = "Hover over any stream to view fatality statistics.";
    });

    svg.on("click", () => {
      locked = null;
      resetBtn.style.display = "none";
      link.style("stroke-opacity", 0.4).style("filter", null).style("stroke-width", d => `${Math.max(1, d.width)}px`);
      node.style("opacity", 1);
      statusDiv.innerHTML = "Hover over any stream to view fatality statistics.";
    });
  }

})();