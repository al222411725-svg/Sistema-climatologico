const WEATHER_CODES = {
  0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Niebla", 48: "Niebla con escarcha",
  51: "Llovizna ligera", 53: "Llovizna", 55: "Llovizna intensa",
  61: "Lluvia ligera", 63: "Lluvia", 65: "Lluvia intensa",
  71: "Nieve ligera", 73: "Nieve", 75: "Nieve intensa",
  80: "Chubascos ligeros", 81: "Chubascos", 82: "Chubascos fuertes",
  95: "Tormenta eléctrica", 96: "Tormenta con granizo", 99: "Tormenta con granizo fuerte"
};

// ---- Mapa (Leaflet + OpenStreetMap) ----
const map = L.map('map').setView([19.4326, -99.1332], 5);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

let marker = null;

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function mostrarEnMapa(lat, lon, titulo, detalle) {
  if (marker) map.removeLayer(marker);

  marker = L.marker([lat, lon]).addTo(map)
    .bindPopup(`<b>${escapeHTML(titulo)}</b><br>${detalle}`)
    .openPopup();

  map.setView([lat, lon], 12);
}

// ---- Búsqueda ----
document.getElementById('search-btn').addEventListener('click', async () => {
  const city = document.getElementById('city-input').value.trim();
  const weatherCard = document.getElementById('weather-card');

  if (!city) {
    weatherCard.innerHTML = "<p style='color: #fee2e2;'>⚠️ Por favor, escribe un lugar válido.</p>";
    return;
  }

  weatherCard.innerHTML = "<p>Consultando datos geográficos y meteorológicos...</p>";

  try {
    // 1) Geocodificación con Nominatim
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`
    );
    if (!geoResponse.ok) throw new Error(`Nominatim: HTTP ${geoResponse.status}`);
    const geoData = await geoResponse.json();

    if (geoData.length === 0) {
      weatherCard.innerHTML = "<p style='color: #fee2e2;'>No se encontraron datos para esa ubicación.</p>";
      return;
    }

    const lugar = geoData[0];

    // 2) Clima real con Open-Meteo
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lugar.lat}&longitude=${lugar.lon}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
    );
    if (!weatherResponse.ok) throw new Error(`Open-Meteo: HTTP ${weatherResponse.status}`);
    const weatherData = await weatherResponse.json();

    const temp = weatherData.current.temperature_2m;
    const humidity = weatherData.current.relative_humidity_2m;
    const condition = WEATHER_CODES[weatherData.current.weather_code] ?? "Sin descripción";

    // 3) Tarjeta
    weatherCard.innerHTML = `
      <h3>Ubicación localizada: ${escapeHTML(city)}</h3>
      <p class="description"><strong>Descripción oficial:</strong> ${escapeHTML(lugar.display_name)}</p>

      <div class="geo-data">
        <p><strong>Latitud:</strong> ${lugar.lat} &nbsp;|&nbsp; <strong>Longitud:</strong> ${lugar.lon}</p>
      </div>

      <hr style="border: 0.5px solid #4ade80; margin: 15px 0;">

      <div class="weather-data">
        <h4>Parámetros climatológicos</h4>
        <p><strong>Temperatura:</strong> ${temp}°C</p>
        <p><strong>Humedad:</strong> ${humidity}%</p>
        <p><strong>Condición:</strong> ${condition}</p>
      </div>

      <div class="success-footer">✓ Datos obtenidos de Open-Meteo.</div>`;

    // 4) Mapa
    mostrarEnMapa(
      parseFloat(lugar.lat),
      parseFloat(lugar.lon),
      city,
      `${temp}°C - ${condition}`
    );

  } catch (error) {
    console.error(error);
    weatherCard.innerHTML = "<p style='color: #fee2e2;'> Error en la comunicación con el servidor.</p>";
  }
});