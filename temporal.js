(async function(){
  const csvPath = "data/number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv";
  
  // --- 1. CONFIG ---
  const regionMap = {
    "Algeria": "Africa", "Angola": "Africa", "Benin": "Africa", "Botswana": "Africa", "Burkina Faso": "Africa", "Burundi": "Africa", "Cameroon": "Africa", "Cape Verde": "Africa", "Central African Republic": "Africa", "Chad": "Africa", "Comoros": "Africa", "Democratic Republic of Congo": "Africa", "Republic of Congo": "Africa", "Djibouti": "Africa", "Egypt": "Africa", "Equatorial Guinea": "Africa", "Eritrea": "Africa", "eSwatini": "Africa", "Ethiopia": "Africa", "Gabon": "Africa", "Gambia": "Africa", "Ghana": "Africa", "Guinea": "Africa", "Guinea-Bissau": "Africa", "Ivory Coast": "Africa", "Kenya": "Africa", "Lesotho": "Africa", "Liberia": "Africa", "Libya": "Africa", "Madagascar": "Africa", "Malawi": "Africa", "Mali": "Africa", "Mauritania": "Africa", "Mauritius": "Africa", "Mayotte": "Africa", "Morocco": "Africa", "Mozambique": "Africa", "Namibia": "Africa", "Niger": "Africa", "Nigeria": "Africa", "Reunion": "Africa", "Rwanda": "Africa", "Saint Helena, Ascension and Tristan da Cunha": "Africa", "Sao Tome and Principe": "Africa", "Senegal": "Africa", "Seychelles": "Africa", "Sierra Leone": "Africa", "Somalia": "Africa", "South Africa": "Africa", "South Sudan": "Africa", "Sudan": "Africa", "Tanzania": "Africa", "Togo": "Africa", "Tunisia": "Africa", "Uganda": "Africa", "Zambia": "Africa", "Zimbabwe": "Africa",
    "Anguilla": "Americas", "Antigua and Barbuda": "Americas", "Argentina": "Americas", "Aruba": "Americas", "Bahamas": "Americas", "Barbados": "Americas", "Belize": "Americas", "Bermuda": "Americas", "Bolivia": "Americas", "Brazil": "Americas", "British Virgin Islands": "Americas", "Canada": "Americas", "Caribbean Netherlands": "Americas", "Cayman Islands": "Americas", "Chile": "Americas", "Colombia": "Americas", "Costa Rica": "Americas", "Cuba": "Americas", "Curacao": "Americas", "Dominica": "Americas", "Dominican Republic": "Americas", "Ecuador": "Americas", "El Salvador": "Americas", "Falkland Islands": "Americas", "French Guiana": "Americas", "Greenland": "Americas", "Grenada": "Americas", "Guadeloupe": "Americas", "Guatemala": "Americas", "Guyana": "Americas", "Haiti": "Americas", "Honduras": "Americas", "Jamaica": "Americas", "Martinique": "Americas", "Mexico": "Americas", "Montserrat": "Americas", "Nicaragua": "Americas", "Panama": "Americas", "Paraguay": "Americas", "Peru": "Americas", "Puerto Rico": "Americas", "Saint Kitts and Nevis": "Americas", "Saint Lucia": "Americas", "Saint Pierre and Miquelon": "Americas", "Saint Vincent and the Grenadines": "Americas", "Saint-Barthelemy": "Americas", "Saint-Martin": "Americas", "Sint Maarten": "Americas", "Suriname": "Americas", "Trinidad and Tobago": "Americas", "Turks and Caicos Islands": "Americas", "United States": "Americas", "United States Minor Outlying Islands": "Americas", "Uruguay": "Americas", "Venezuela": "Americas", "Virgin Islands, U.S.": "Americas",
    "Afghanistan": "Asia", "Bangladesh": "Asia", "Bhutan": "Asia", "British Indian Ocean Territory": "Asia", "Brunei": "Asia", "Cambodia": "Asia", "China": "Asia", "East Timor": "Asia", "Hong Kong": "Asia", "India": "Asia", "Indonesia": "Asia", "Japan": "Asia", "Kazakhstan": "Asia", "Kyrgyzstan": "Asia", "Laos": "Asia", "Macau": "Asia", "Malaysia": "Asia", "Maldives": "Asia", "Mongolia": "Asia", "Myanmar": "Asia", "Nepal": "Asia", "North Korea": "Asia", "Pakistan": "Asia", "Philippines": "Asia", "Singapore": "Asia", "South Korea": "Asia", "Sri Lanka": "Asia", "Taiwan": "Asia", "Tajikistan": "Asia", "Thailand": "Asia", "Turkmenistan": "Asia", "Uzbekistan": "Asia", "Vietnam": "Asia",
    "Akrotiri and Dhekelia": "Europe", "Albania": "Europe", "Andorra": "Europe", "Austria": "Europe", "Belarus": "Europe", "Belgium": "Europe", "Bosnia and Herzegovina": "Europe", "Bulgaria": "Europe", "Croatia": "Europe", "Cyprus": "Europe", "Czech Republic": "Europe", "Denmark": "Europe", "Estonia": "Europe", "Faroe Islands": "Europe", "Finland": "Europe", "France": "Europe", "Germany": "Europe", "Gibraltar": "Europe", "Greece": "Europe", "Bailiwick of Guernsey": "Europe", "Hungary": "Europe", "Iceland": "Europe", "Ireland": "Europe", "Isle of Man": "Europe", "Italy": "Europe", "Bailiwick of Jersey": "Europe", "Kosovo": "Europe", "Latvia": "Europe", "Liechtenstein": "Europe", "Lithuania": "Europe", "Luxembourg": "Europe", "Malta": "Europe", "Moldova": "Europe", "Monaco": "Europe", "Montenegro": "Europe", "Netherlands": "Europe", "North Macedonia": "Europe", "Norway": "Europe", "Poland": "Europe", "Portugal": "Europe", "Romania": "Europe", "Russia": "Europe", "San Marino": "Europe", "Serbia": "Europe", "Slovakia": "Europe", "Slovenia": "Europe", "Spain": "Europe", "Sweden": "Europe", "Switzerland": "Europe", "Ukraine": "Europe", "United Kingdom": "Europe", "Vatican City": "Europe",
    "Armenia": "Middle East", "Azerbaijan": "Middle East", "Bahrain": "Middle East", "Georgia": "Middle East", "Iran": "Middle East", "Iraq": "Middle East", "Israel": "Middle East", "Jordan": "Middle East", "Kuwait": "Middle East", "Lebanon": "Middle East", "Oman": "Middle East", "Palestine": "Middle East", "Qatar": "Middle East", "Saudi Arabia": "Middle East", "Syria": "Middle East", "Turkey": "Middle East", "United Arab Emirates": "Middle East", "Yemen": "Middle East",
    "American Samoa": "Oceania", "Australia": "Oceania", "Christmas Island": "Oceania", "Cocos (Keeling) Islands": "Oceania", "Cook Islands": "Oceania", "Fiji": "Oceania", "French Polynesia": "Oceania", "Guam": "Oceania", "Heard Island and McDonald Islands": "Oceania", "Kiribati": "Oceania", "Marshall Islands": "Oceania", "Micronesia": "Oceania", "Nauru": "Oceania", "New Caledonia": "Oceania", "New Zealand": "Oceania", "Niue": "Oceania", "Norfolk Island": "Oceania", "Northern Mariana Islands": "Oceania", "Palau": "Oceania", "Papua New Guinea": "Oceania", "Pitcairn": "Oceania", "Samoa": "Oceania", "Solomon Islands": "Oceania", "Tokelau": "Oceania", "Tonga": "Oceania", "Tuvalu": "Oceania", "Vanuatu": "Oceania", "Wallis and Futuna": "Oceania"
  };

  const regionColors = {
    "Africa": "#e67e22", "Middle East": "#8e44ad", "Americas": "#c0392b",
    "Asia": "#2980b9", "Europe": "#27ae60", "Oceania": "#16a085", "Other": "#95a5a6"
  };

  // --- 2. DATA ---
  let raw = [];
  try {
    raw = await d3.csv(csvPath, d => ({
      Country: (d.Country || "").trim(),
      Year: +d.Year,
      Fatalities: +d.Fatalities
    }));
  } catch(e) {
    console.error("Data Error:", e);
    return;
  }
  raw.forEach(d => { d.Region = regionMap[d.Country] || "Other"; });

  
  const tooltip = d3.select("#tooltip")
    .style("position", "fixed")
    .style("z-index", "9999999")
    .style("pointer-events", "none");

  // --- 4. RADIAL CHART ---
  const initRadial = () => {
    const container = d3.select("#radial-chart");
    const infoPanel = d3.select("#infoPanel");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const svg = container.append("svg").attr("width", "100%").attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);
    const mainG = svg.append("g").attr("transform", `translate(${width/2}, ${height/2})`);

    const grouped = d3.group(raw, d=>d.Country);
    let allCountries = Array.from(grouped).map(([name, vals]) => {
      const total = d3.sum(vals, d=>d.Fatalities);
      const region = regionMap[name] || "Other";
      return { name, region, total, vals: vals.sort((a,b)=>a.Year-b.Year) };
    });
    allCountries.sort((a,b) => b.total - a.total);

    const uniqueRegions = Array.from(new Set(Object.values(regionMap))).sort();
    const regSel = d3.select("#regionSelect");
    uniqueRegions.forEach(r => regSel.append("option").attr("value", r).text(r));

    const years = Array.from(new Set(raw.map(d=>d.Year))).sort((a,b)=>a-b);
    const minYear = years[0], maxYear = years[years.length-1];
    let innerR = 40, outerR = Math.min(width, height)/2 - 30;
    
    const rScale = d3.scaleLinear().domain([minYear, maxYear]).range([innerR, outerR]);
    const sizeScale = d3.scaleSqrt().domain([0, d3.max(raw, d=>d.Fatalities)]).range([1.5, 6]);
    const colorScale = d => regionColors[d.region] || regionColors["Other"];

    // Grid
    const bgG = mainG.append("g").attr("class", "bg-grid");
    [1995,2000, 2005, 2010, 2015,2020,2025].forEach(y => {
      if(y > maxYear) return;
      const r = rScale(y);
      bgG.append("circle").attr("r", r).attr("fill","none").attr("stroke","#ddd").attr("stroke-dasharray","3 3");
      bgG.append("text").attr("y", -r - 4).attr("text-anchor","middle").attr("fill","#999").style("font-size","10px").text(y);
    });

    const beamsG = mainG.append("g");
    let isolated = null;

    function render(data) {
      const angleScale = d3.scaleBand().domain(data.map(d=>d.name)).range([0, Math.PI*2]);
      const groups = beamsG.selectAll(".c-group").data(data, d=>d.name);
      groups.exit().transition().style("opacity",0).remove();

      const enter = groups.enter().append("g").attr("class","c-group").style("opacity",0);
      enter.append("path").attr("class","ray");
      enter.append("g").attr("class","dots");

      const merged = enter.merge(groups);
      merged.transition().duration(700).style("opacity", d => isolated && isolated!==d.name ? 0.05 : 1)
        .attr("transform", d => `rotate(${(angleScale(d.name) + angleScale.bandwidth()/2) * 180/Math.PI - 180})`);

      merged.select(".ray")
        .attr("d", d => `M0,${rScale(d.vals[0].Year)} L0,${rScale(d.vals[d.vals.length-1].Year)}`)
        .attr("stroke", d=>colorScale(d)).attr("stroke-width",1).attr("opacity",0.4);

      merged.each(function(d){
        const dots = d3.select(this).select(".dots").selectAll("circle").data(d.vals, v=>v.Year);
        const enterDots = dots.enter().append("circle")
          .attr("cy", v=>rScale(v.Year))
          .attr("r", v => v.Fatalities === 0 ? 2 : sizeScale(v.Fatalities));

        enterDots.merge(dots)
          .attr("fill", v => v.Fatalities === 0 ? "none" : colorScale(d))
          .attr("stroke", v => v.Fatalities === 0 ? colorScale(d) : "none")
          .attr("stroke-width", v => v.Fatalities === 0 ? 1.2 : 0)
          .attr("fill-opacity", v => v.Fatalities === 0 ? 0 : 0.85)
          .on("mouseenter", (e,v) => {
             if(isolated) return;
             d3.select(e.target).attr("stroke", "#333").attr("stroke-width", 1.5);
             
             const valStr = v.Fatalities === 0 ? "0 fatalities (Peace)" : `<strong>${v.Fatalities.toLocaleString()}</strong> fatalities`;
             
             
             tooltip.style("display","block")
                    .style("opacity",1)
                    .style("transform", "none") 
                    .html(`<strong>${d.name}</strong> ${v.Year}<br>${valStr}`)
                    .style("left", (e.clientX + 15) + "px")
                    .style("top", (e.clientY + 15) + "px");
          })
          .on("mousemove", (e) => {
             
             tooltip.style("left", (e.clientX + 15) + "px")
                    .style("top", (e.clientY + 15) + "px");
          })
          .on("mouseleave", (e) => {
             d3.select(e.target).attr("stroke", d=>d.Fatalities===0 ? colorScale(d) : "none").attr("stroke-width", d=>d.Fatalities===0 ? 1.2 : 0);
             tooltip.style("display","none");
          })
          .on("click", (e) => { e.stopPropagation(); isolate(d); });
      });
    }

    function isolate(d) {
      isolated = d.name;
      render(currentList);
      showInfo(d);
    }
    
    function reset() {
      isolated = null;
      render(currentList);
      infoPanel.style("display","none");
      tooltip.style("display","none");
    }

    function showInfo(d) {
      infoPanel.style("display","block");
      d3.select("#infoTitle").text(d.name).style("color", colorScale(d));
      const peak = d.vals.reduce((p,c)=>p.Fatalities>c.Fatalities?p:c);
      
      d3.select("#infoStats").html(`
        <div class="info-stat"><span>Total Fatalities:</span> <strong>${d.total.toLocaleString()}</strong></div>
        <div class="info-stat"><span>Peak Year:</span> <span>${peak.Year} (${peak.Fatalities.toLocaleString()})</span></div>
        <div class="info-stat"><span>Region:</span> <span>${d.region}</span></div>
      `);
      
      // Sparkline
      const sp = d3.select("#sparkline"); sp.selectAll("*").remove();
      const margin = {top: 10, right: 15, bottom: 20, left: 35};
      const totalW = sp.node().clientWidth || 280;
      const totalH = 80;
      const w = totalW - margin.left - margin.right;
      const h = totalH - margin.top - margin.bottom;

      const g = sp.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
      const x = d3.scaleLinear().domain(d3.extent(d.vals, v=>v.Year)).range([0, w]);
      const y = d3.scaleLinear().domain([0, d3.max(d.vals, v=>v.Fatalities)]).nice().range([h, 0]);
      
      g.append("path").datum(d.vals)
        .attr("d", d3.area().x(v=>x(v.Year)).y0(h).y1(v=>y(v.Fatalities)))
        .attr("fill", colorScale(d)).attr("opacity", 0.2);
      
      g.append("path").datum(d.vals)
        .attr("d", d3.line().x(v=>x(v.Year)).y(v=>y(v.Fatalities)))
        .attr("fill","none").attr("stroke", colorScale(d)).attr("stroke-width",2);
      
      // Sparkline Axes
      g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")))
        .selectAll("text").style("font-size","9px").style("fill","#666");
      g.append("g").call(d3.axisLeft(y).ticks(3).tickFormat(d3.format(".2s")))
        .selectAll("text").style("font-size","9px").style("fill","#666");
      g.selectAll(".domain").style("display","block").style("stroke","#ddd");
    }

    let currentList = allCountries.slice(0, 25);
    const applyFilters = () => {
      const n = d3.select("#topN").property("value");
      const r = d3.select("#regionSelect").property("value");
      const q = d3.select("#searchBox").property("value").toLowerCase();
      let list = allCountries;
      if(r!=="all") list = list.filter(d=>d.region===r);
      if(q) list = list.filter(d=>d.name.toLowerCase().includes(q));
      else if(n!=="all") list = list.slice(0, +n);
      currentList = list;
      render(list);
    };

    d3.select("#topN").on("change", () => { reset(); applyFilters(); });
    d3.select("#regionSelect").on("change", () => { reset(); applyFilters(); });
    d3.select("#searchBox").on("input", () => { reset(); applyFilters(); });
    d3.select("#radial-reset").on("click", () => {
      d3.select("#searchBox").property("value","");
      d3.select("#topN").property("value","25");
      d3.select("#regionSelect").property("value","all");
      reset();
      applyFilters();
    });
    svg.on("click", reset);
    render(currentList);
  };

  // --- 5. STREAMGRAPH (Robust Tooltip) ---
  const initStream = () => {
    const container = d3.select("#streamgraph");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const svg = container.append("svg").attr("width", width).attr("height", height);

    const margin = {top: 20, right: 20, bottom: 30, left: 50};
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const years = Array.from(new Set(raw.map(d=>d.Year))).sort((a,b)=>a-b);
    const regions = ["Africa", "Americas", "Asia", "Europe", "Middle East"];
    
    const stackData = years.map(y => {
      const obj = { year: y };
      regions.forEach(r => obj[r] = 0);
      raw.filter(d=>d.Year===y).forEach(d => {
        if(regions.includes(d.Region)) obj[d.Region] += d.Fatalities;
      });
      return obj;
    });

    const stack = d3.stack().keys(regions).offset(d3.stackOffsetSilhouette).order(d3.stackOrderInsideOut);
    const series = stack(stackData);

    const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
    const y = d3.scaleLinear()
      .domain([d3.min(series, l => d3.min(l, d=>d[0])), d3.max(series, l => d3.max(l, d=>d[1]))])
      .range([innerH, 0]);
    
    const area = d3.area().x(d=>x(d.data.year)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveBasis);
    const areaFlat = d3.area().x(d=>x(d.data.year)).y0(0).y1(0).curve(d3.curveBasis);

    // Paths
    const paths = g.selectAll("path").data(series).enter().append("path")
      .attr("d", areaFlat)
      .attr("fill", d => regionColors[d.key])
      .attr("opacity", 0.9)
      .attr("stroke", "#fff").attr("stroke-width", 0.5)
      .on("mousemove", function(e, d) {
         // Calculate Year
         const mouseX = d3.pointer(e, g.node())[0];
         const year = Math.round(x.invert(mouseX));
         if(year < years[0] || year > years[years.length-1]) return;

         // Get Data
         const dataPoint = d.find(p => p.data.year === year);
         if(!dataPoint) return;
         const val = dataPoint[1] - dataPoint[0];

         // Move Vertical Line
         guide.attr("x1", x(year)).attr("x2", x(year)).style("opacity", 1);

         // Show Tooltip
         // ... inside streamgraph mousemove ...

         // Show Tooltip
         tooltip.style("display","block")
           .style("opacity",1)
           .style("transform", "none")
           .html(`
             <div style="font-size:1.1em; font-weight:bold; color:${regionColors[d.key]}">${d.key}</div>
             <div style="border-top:1px solid rgba(255,255,255,0.2); margin-top:4px; padding-top:4px;">
               Year: <strong>${year}</strong><br>
               Fatalities: <strong>${Math.round(val).toLocaleString()}</strong>
             </div>
           `)
           .style("left", (e.clientX + 15) + "px")
           .style("top", (e.clientY + 15) + "px");
         
         d3.select(this).attr("opacity", 1).attr("stroke-width", 1.5);
      })
      .on("mouseleave", function() {
         tooltip.style("display","none");
         guide.style("opacity", 0);
         d3.select(this).attr("opacity", 0.9).attr("stroke-width", 0.5);
      });
    
    // Guide Line (Appended after paths so it overlays them)
    const guide = g.append("line")
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#333").attr("stroke-width", 1.5).attr("stroke-dasharray", "4 4")
      .style("opacity", 0).style("pointer-events", "none");

    // Animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          paths.transition().duration(1500).ease(d3.easeCubicOut)
            .delay((d, i) => i * 150)
            .attr("d", area);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    observer.observe(container.node());

    // Axes
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(width/80));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(d => Math.abs(d).toLocaleString()));
  };

  initRadial();
  initStream();
})();