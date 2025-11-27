// maps.js - FIXED VERSION

// Base configuration for all maps
// Using CartoDB Positron for a light, clean background that matches your theme
const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const attribution = '&copy; OpenStreetMap &copy; CARTO';

// ------------------------------------------------------
// MAP 1: CHOROPLETH (Regional Intensity)
// ------------------------------------------------------
const mapChoropleth = L.map('map-choropleth', {
    scrollWheelZoom: false // Disables zooming with the mouse wheel for better page scrolling
}).setView([48, 32], 3); // Centered on Europe/East

L.tileLayer(tileUrl, { attribution }).addTo(mapChoropleth);

// Visual simulation: Large static circles representing colored regions
const countryData = [
    { coords: [49.0, 31.0], value: 1000 }, // Ukraine (High intensity)
    { coords: [15.5, 48.0], value: 800 },  // Yemen (Med-High)
    { coords: [33.0, 44.0], value: 600 },  // Iraq
    { coords: [12.0, 106.0], value: 200 }, // SE Asia
    { coords: [5.0, 25.0], value: 400 },   // Central Africa
];

countryData.forEach(item => {
    // Color Logic: Deep Blue for high intensity, lighter shades for lower
    let color = item.value > 900 ? '#003a70' : // Deep Blue
                item.value > 500 ? '#2a5a8c' : 
                '#7f9cc4'; 
    
    L.circle(item.coords, {
        color: 'transparent', // No border
        fillColor: color,
        fillOpacity: 0.6,
        radius: 600000 // 600km radius to simulate a regional area
    }).addTo(mapChoropleth);
});


// ------------------------------------------------------
// MAP 2: PROPORTIONAL SYMBOLS
// ------------------------------------------------------
const mapSymbol = L.map('map-symbol', {
    scrollWheelZoom: false
}).setView([35, 45], 3);

L.tileLayer(tileUrl, { attribution }).addTo(mapSymbol);

// Sample Data: Specific events
const events = [
    { lat: 33.3, lng: 44.3, fatalities: 150, location: "Baghdad" },
    { lat: 34.5, lng: 69.2, fatalities: 600, location: "Kabul" },
    { lat: 50.4, lng: 30.5, fatalities: 300, location: "Kyiv" },
    { lat: 47.0, lng: 37.5, fatalities: 900, location: "Mariupol" },
    { lat: 31.5, lng: 34.4, fatalities: 1200, location: "Gaza Strip" },
    { lat: 15.3, lng: 44.1, fatalities: 250, location: "Sana'a" },
    { lat: 4.0, lng: 30.0, fatalities: 100, location: "Juba" }
];

events.forEach(event => {
    // Formula: Square root ensures the area is proportional (not just radius)
    let size = Math.sqrt(event.fatalities) * 15000; 

    L.circle([event.lat, event.lng], {
        color: '#f5b7a3',      // Soft Coral (Border)
        weight: 2,
        fillColor: '#f5b7a3',  // Soft Coral (Fill)
        fillOpacity: 0.5,
        radius: size
    }).bindPopup(`<b>${event.location}</b><br>Civilian Impact: ${event.fatalities}`).addTo(mapSymbol);
});


// ------------------------------------------------------
// MAP 3: HEATMAP (Zones of Intensity) - FIXED & BOOSTED
// ------------------------------------------------------
const mapHeat = L.map('map-heat', {
    scrollWheelZoom: false
}).setView([40, 40], 3); // Centered slightly North

L.tileLayer(tileUrl, { attribution }).addTo(mapHeat);

// We need "clusters" of points to make the heat visible on a world map
const heatPoints = [
    // Ukraine Cluster
    [50.4, 30.5, 1.0], [50.5, 30.6, 0.9], [50.3, 30.4, 0.8], [49.8, 30.0, 0.7],
    [48.0, 37.0, 1.0], [48.1, 37.2, 0.9], [47.9, 37.1, 1.0], [47.5, 36.8, 0.8],
    
    // Middle East Cluster
    [33.3, 44.3, 0.8], [33.4, 44.4, 0.7], [33.2, 44.2, 0.9], // Iraq area
    [34.5, 69.2, 1.0], [34.6, 69.3, 0.9], [34.4, 69.1, 0.8], // Afghanistan area
    [31.5, 34.4, 1.0], [31.6, 34.5, 1.0], [31.4, 34.3, 0.9], // Gaza/Israel area
    
    // Yemen Cluster
    [15.3, 44.1, 0.6], [15.4, 44.2, 0.7], [15.2, 44.0, 0.5]
];

// Safety Check: Ensure the Heat plugin is loaded
if (L.heatLayer) {
    L.heatLayer(heatPoints, {
        radius: 40,        // INCREASED: Larger radius makes it visible from afar
        blur: 25,          // INCREASED: Softer gradients
        maxZoom: 10,
        minOpacity: 0.4,   // INCREASED: Ensures even low values are visible
        gradient: {
            0.2: '#aabde0', // Light Blue (Low density)
            0.5: '#003a70', // Deep Blue (Medium density)
            1.0: '#f5b7a3'  // Soft Coral (High intensity/Hotspot)
        }
    }).addTo(mapHeat);
} else {
    console.error("Error: Leaflet.heat plugin is not loaded.");
}