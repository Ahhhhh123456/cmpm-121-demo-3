// Import necessary modules and types
import leaflet, { LatLng } from "leaflet";
import luck from "./luck.ts";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM: LatLng = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// State to track player's coins
let playerCoins = 0;

// Cache locations structure
const cacheLocations: Array<{ location: LatLng; coins: number }> = [];

// Function to generate cache locations
function initializeCacheLocations(
  center: LatLng,
  numCaches: number,
  radius: number,
) {
  for (let i = 0; i < numCaches; i++) {
    const angle = 2 * Math.PI * luck(`cache-${i}-angle`);
    const distance = radius * luck(`cache-${i}-distance`);
    const offsetLat = (distance * Math.cos(angle)) / 111139;
    const offsetLng = (distance * Math.sin(angle)) /
      (111139 * Math.cos(center.lat * Math.PI / 180));

    const cacheLocation = leaflet.latLng(
      center.lat + offsetLat,
      center.lng + offsetLng,
    );
    const cacheCoins = generateCoins(cacheLocation.lat, cacheLocation.lng);

    cacheLocations.push({ location: cacheLocation, coins: cacheCoins });
  }
}

// Function to generate a number of coins based on location
function generateCoins(lat: number, lng: number): number {
  const baseKey = `${lat},${lng},coins`;
  return Math.floor((luck(baseKey) * 10) + 1);
}

// Display initial location on the map
const playerMarker = leaflet.marker(OAKES_CLASSROOM).addTo(map);
playerMarker.bindTooltip("Player's starting location").openTooltip();

// Handle collecting coins
function handleCollect(index: number) {
  const cache = cacheLocations[index];

  // Check if there are coins to collect
  if (cache.coins > 0) {
    playerCoins++;
    cache.coins--; // Decrease coins in the cache
    alert(
      `Collected a coin. Player now has ${playerCoins} coins. Cache now has ${cache.coins} coins.`,
    );
    updatePopup(index); // Update popup to reflect changes
  } else {
    alert("No coins left to collect in this cache!");
  }
}

// Handle depositing coins
function handleDeposit(index: number) {
  if (playerCoins > 0) {
    const cache = cacheLocations[index];
    playerCoins--;
    cache.coins++; // Increase coins in the cache
    alert(
      `Deposited a coin. Player now has ${playerCoins} coins. Cache now has ${cache.coins} coins.`,
    );
    updatePopup(index); // Update popup to reflect changes
  } else {
    alert("No coins available to deposit!");
  }
}

// Add buttons and information to cache popups
// Modify the updatePopup function for interactive popups
function updatePopup(index: number) {
  const cache = cacheLocations[index];
  const marker = leaflet.marker(cache.location).addTo(map);

  // HTML for the popup with placeholder buttons
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
    <div>Cache with ${cache.coins} coins</div>
    <button id="collect-btn-${index}" class="collect-button">Collect</button>
    <button id="deposit-btn-${index}" class="deposit-button">Deposit</button>
  `;

  // Attach popup to marker without opening it
  marker.bindPopup(popupContent);

  // Add click event to open the popup when marker is clicked
  marker.on("click", function () {
    marker.openPopup();
  });

  // Add event listeners for the buttons within the popup content
  const collectButton = popupContent.querySelector(
    `#collect-btn-${index}`,
  ) as HTMLElement;
  const depositButton = popupContent.querySelector(
    `#deposit-btn-${index}`,
  ) as HTMLElement;

  collectButton.addEventListener("click", () => handleCollect(index));
  depositButton.addEventListener("click", () => handleDeposit(index));
}

// Initialize caches
initializeCacheLocations(OAKES_CLASSROOM, 5, 100);

// Set up tooltips for all caches
cacheLocations.forEach((_, index) => {
  updatePopup(index);
});

const gameName = "Jason's Game :)";
document.title = gameName;
