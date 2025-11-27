// Base configuration for all maps
// Using a light basemap to match 'Warm parchment' background
const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const attribution = '&copy; OpenStreetMap &copy; CARTO';

// ------------------------------------------------------
// MAP 1: CHOROPLETH (Regional Intensity)
// ------------------------------------------------------
const mapChoropleth = L.map('map-choropleth').setView([20, 0], 2);
L.tileLayer(tileUrl, { attribution }).addTo(mapChoropleth);

// NOTE: A true choropleth requires a GeoJSON file of country borders.
// This code simulates the visual effect using static colored areas for demonstration.
const countryData = [
    { coords: [48.3, 31.1], value: 1000 }, // Ukraine (High)
    { coords: [15.5, 48.5], value: 800 },  // Yemen (Med-High)
    { coords: [12.6, 106.3], value: 200 }, // Example Low
];

countryData.forEach(item => {
    // Logic: If value > 900 use Deep Blue (#003a70), else Light Blue
    let color = item.value > 900 ? '#003a70' : '#7f9cc4'; 
    
    L.circle(item.coords, {
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        radius: 400000 // Large radius to simulate a region
    }).addTo(mapChoropleth);
});

// ------------------------------------------------------
// MAP 2: PROPORTIONAL SYMBOLS (Scaled Circles)
// ------------------------------------------------------
const mapSymbol = L.map('map-symbol').setView([30, 40], 3);
L.tileLayer(tileUrl, { attribution }).addTo(mapSymbol);

// SAMPLE DATA (To replace with our real dataset...)
const events = [
    { lat: 33.3, lng: 44.3, fatalities: 50 },  // Baghdad
    { lat: 34.5, lng: 69.2, fatalities: 200 }, // Kabul
    { lat: 50.4, lng: 30.5, fatalities: 120 }, // Kyiv
    { lat: 31.5, lng: 34.4, fatalities: 400 }, // Gaza area
    { lat: 15.3, lng: 44.1, fatalities: 80 }   // Sana'a
];

events.forEach(event => {
    // Formula: Square root ensures circle area is proportional to value, not radius
    let size = Math.sqrt(event.fatalities) * 20000; 

    L.circle([event.lat, event.lng], {
        color: '#f5b7a3',     
        fillColor: '#f5b7a3',
        fillOpacity: 0.5,      // Transparency for 'organic' look
        radius: size
    }).bindPopup(`<b>Event Location</b><br>Fatalities: ${event.fatalities}`).addTo(mapSymbol);
});


// ------------------------------------------------------
// MAP 3: HEATMAP (Density)
// ------------------------------------------------------
const mapHeat = L.map('map-heat').setView([30, 40], 3);
L.tileLayer(tileUrl, { attribution }).addTo(mapHeat);

// SAMPLE DATA [Lat, Lng, Intensity 0.0-1.0]
const heatPoints = [
    [33.3, 44.3, 0.5], 
    [33.4, 44.4, 0.6], 
    [34.5, 69.2, 1.0], 
    [34.6, 69.3, 0.8],
    [50.4, 30.5, 0.7],
    [50.5, 30.6, 0.9],
    [31.5, 34.4, 1.0],
    [31.6, 34.5, 0.9]
];

// Generate heatmap using palette (Deep Blue -> Soft Coral)
L.heatLayer(heatPoints, {
    radius: 25,
    blur: 15,
    gradient: {
        0.4: '#003a70', // Deep Blue (Low density)
        1.0: '#f5b7a3'  // Soft Coral (High density)
    }
}).addTo(mapHeat);