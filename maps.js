// maps.js - ROBUST VERSION

// 1. Base Configuration
// We use CartoDB Positron for a clean, light background that matches your 'parchment' theme.
const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const attribution = '&copy; OpenStreetMap &copy; CARTO';

// ------------------------------------------------------
// MAP 1: CHOROPLETH (Regional Intensity)
// ------------------------------------------------------
const mapChoropleth = L.map('map-choropleth', { 
    scrollWheelZoom: false // Disable zoom on scroll to keep page navigation smooth
}).setView([48, 32], 3); // Centered on Europe/Middle East

L.tileLayer(tileUrl, { attribution }).addTo(mapChoropleth);

// Simulated Regional Data (Large static circles to mimic colored countries)
const regions = [
    { coords: [49.0, 31.0], val: 1000, color: '#003a70' }, // Ukraine (High - Deep Blue)
    { coords: [15.5, 48.0], val: 800,  color: '#003a70' }, // Yemen (High)
    { coords: [33.0, 44.0], val: 600,  color: '#2a5a8c' }, // Iraq (Medium)
    { coords: [12.0, 106.0], val: 200, color: '#7f9cc4' }, // SE Asia (Low)
    { coords: [5.0, 25.0], val: 400,   color: '#557ba8' }  // Central Africa
];

regions.forEach(r => {
    L.circle(r.coords, {
        color: 'transparent', // No border
        fillColor: r.color, 
        fillOpacity: 0.6, 
        radius: 600000 // Very large radius to look like a region
    }).addTo(mapChoropleth);
});


// ------------------------------------------------------
// MAP 2: PROPORTIONAL SYMBOLS (Specific Events)
// ------------------------------------------------------
const mapSymbol = L.map('map-symbol', { 
    scrollWheelZoom: false 
}).setView([35, 45], 3);

L.tileLayer(tileUrl, { attribution }).addTo(mapSymbol);

// Event Data: Location, Fatalities, Name
const events = [
    { loc: [33.3, 44.3], val: 150, name: "Baghdad" },
    { loc: [34.5, 69.2], val: 600, name: "Kabul" },
    { loc: [50.4, 30.5], val: 300, name: "Kyiv" },
    { loc: [47.0, 37.5], val: 900, name: "Mariupol" },
    { loc: [31.5, 34.4], val: 1200, name: "Gaza Strip" },
    { loc: [15.3, 44.1], val: 250, name: "Sana'a" }
];

events.forEach(e => {
    // Logic: Size based on square root of fatalities for correct visual proportion
    L.circle(e.loc, {
        color: '#f5b7a3',      // Soft Coral (Border)
        fillColor: '#f5b7a3',  // Soft Coral (Fill)
        fillOpacity: 0.5, 
        weight: 2,
        radius: Math.sqrt(e.val) * 15000 // Scale factor
    }).bindPopup(`<b>${e.name}</b><br>Civilian Impact: ${e.val}`).addTo(mapSymbol);
});


// ------------------------------------------------------
// MAP 3: HEATMAP (Zones of Intensity) - WITH SAFEGUARD
// ------------------------------------------------------
const mapHeat = L.map('map-heat', { 
    scrollWheelZoom: false 
}).setView([40, 40], 3);

L.tileLayer(tileUrl, { attribution }).addTo(mapHeat);

// Data Points for Heatmap [Lat, Lng, Intensity]
const heatPoints = [
    // Ukraine Cluster
    [50.4, 30.5, 1.0], [50.5, 30.6, 1.0], [48.0, 37.0, 1.0], [47.9, 37.1, 1.0],
    // Middle East Cluster
    [33.3, 44.3, 0.9], [34.5, 69.2, 1.0], [31.5, 34.4, 1.0], [31.6, 34.5, 1.0],
    // Yemen Cluster
    [15.3, 44.1, 0.7], [15.4, 44.2, 0.7]
];

// SAFETY CHECK: Try to load the Heatmap. If the plugin fails, use Fallback.
try {
    if (L.heatLayer) {
        // PLUGIN IS WORKING: Draw the organic heatmap
        L.heatLayer(heatPoints, {
            radius: 50,        // Large radius for visibility
            blur: 30,          // Soft gradient
            minOpacity: 0.5,   // Make it visible even with few points
            gradient: { 
                0.4: '#003a70', // Deep Blue (Low)
                1.0: '#f5b7a3'  // Soft Coral (High)
            }
        }).addTo(mapHeat);
        console.log("Success: Heatmap loaded.");
    } else {
        throw new Error("Heatmap plugin not found.");
    }
} catch (error) {
    // FALLBACK PLAN: If plugin fails, draw simple soft circles so the map isn't empty
    console.warn("Heatmap plugin failed. Using fallback circles.");
    
    heatPoints.forEach(point => {
        L.circle([point[0], point[1]], {
            color: 'transparent',
            fillColor: '#f5b7a3', // Use accent color
            fillOpacity: 0.3,     // Very transparent
            radius: 100000        // Large static circle
        }).addTo(mapHeat);
    });
}