// Import necessary modules and types
import leaflet, { LatLng } from "leaflet";
import luck from "./luck.ts";
import { Board, Cell } from "./board.ts"; // Import the Board class and Cell interface

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Location of our classroom
const OAKES_CLASSROOM: LatLng = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;

// Create the map
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

// Initialize the Board
const tileWidth = 0.001;
const tileVisibilityRadius = 3;
const board = new Board(tileWidth, tileVisibilityRadius);

// State to track player's coins
let playerCoins = 0;

// Define structures for Coin and Cache
interface Coin {
  id: string;
  originatingCacheId: string;
}

interface Cache {
  cell: Cell;
  coins: Coin[];
  id: string;
}

// Cache locations structure
const cacheLocations: Cache[] = [];

// Generate cache locations using Board
function initializeCacheLocations(
  center: LatLng,
  numCaches: number,
  radius: number,
) {
  for (let i = 0; i < numCaches; i++) {
    const cacheId = `cache-${i}`;

    const angle = 2 * Math.PI * luck(`${cacheId}-angle`);
    const distance = radius * luck(`${cacheId}-distance`);
    const offsetLat = (distance * Math.cos(angle)) / 111139;
    const offsetLng = (distance * Math.sin(angle)) /
      (111139 * Math.cos(center.lat * Math.PI / 180));

    const cacheLocation = leaflet.latLng(
      center.lat + offsetLat,
      center.lng + offsetLng,
    );
    const cell = board.getCellForPoint(cacheLocation);

    const numCoins = generateNumberOfCoins(cacheId);
    const coins: Coin[] = [];
    for (let j = 0; j < numCoins; j++) {
      const coinId = `${cell.i}:${cell.j}#${j}`; // Compact coin ID
      coins.push({
        id: coinId,
        originatingCacheId: cacheId,
      });
    }

    cacheLocations.push({ cell, coins, id: cacheId });
  }
}

function generateNumberOfCoins(cacheId: string): number {
  const baseKey = `${cacheId},coins`;
  return Math.floor((luck(baseKey) * 10) + 1);
}

// Display initial location on the map
const playerMarker = leaflet.marker(OAKES_CLASSROOM).addTo(map);
playerMarker.bindTooltip("Player's starting location").openTooltip();

// Handle collecting coins
function handleCollect(index: number) {
  const cache = cacheLocations[index];

  if (cache.coins.length > 0) {
    playerCoins++;
    const collectedCoin = cache.coins.pop(); // Remove coin from the cache
    alert(
      `Collected a coin with ID ${collectedCoin?.id}. Player now has ${playerCoins} coins.`,
    );
    updatePopup(index);
  } else {
    alert("No coins left to collect in this cache!");
  }
}

// Handle depositing coins
function handleDeposit(index: number) {
  if (playerCoins > 0) {
    const cache = cacheLocations[index];
    const depositedCoin: Coin = {
      id: `cache-${index}-coin-${cache.coins.length}`,
      originatingCacheId: cache.id,
    };
    playerCoins--;
    cache.coins.push(depositedCoin); // Increase coins in the cache
    alert(
      `Deposited a coin. Player now has ${playerCoins} coins. Cache now has ${cache.coins.length} coins.`,
    );
    updatePopup(index);
  } else {
    alert("No coins available to deposit!");
  }
}

// Update the popup and rebind it to the marker
function updatePopup(index: number) {
  const cache = cacheLocations[index];
  const cacheBounds = board.getCellBounds(cache.cell);

  // Remove only cache-associated markers
  map.eachLayer((layer: L.Layer) => {
    if (layer instanceof leaflet.Marker && layer !== playerMarker) {
      const marker = layer as leaflet.Marker;
      if (cacheBounds.getCenter().equals(marker.getLatLng())) {
        map.removeLayer(marker);
      }
    }
  });

  const marker = leaflet.marker(cacheBounds.getCenter()).addTo(map);

  // Generate updated popup content
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
    <div>Cache with ${cache.coins.length} coins</div>
    <button id="collect-btn-${index}" class="collect-button">Collect</button>
    <button id="deposit-btn-${index}" class="deposit-button">Deposit</button>
  `;

  // Rebind popup content to the marker
  marker.bindPopup(popupContent);

  // Ensure the popup opens when the marker is clicked
  marker.on("click", () => {
    marker.openPopup();
  });

  // Add event listeners for buttons
  const collectButton = popupContent.querySelector(
    `#collect-btn-${index}`,
  ) as HTMLElement;
  const depositButton = popupContent.querySelector(
    `#deposit-btn-${index}`,
  ) as HTMLElement;

  collectButton.addEventListener("click", () => {
    handleCollect(index);
    updatePopup(index);
  });

  depositButton.addEventListener("click", () => {
    handleDeposit(index);
    updatePopup(index);
  });
}

// Initialize caches
initializeCacheLocations(OAKES_CLASSROOM, 5, 100);

// Set up tooltips for all caches
cacheLocations.forEach((_, index) => {
  updatePopup(index);
});

const gameName = "Jason's Game :)";
document.title = gameName;
