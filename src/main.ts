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

interface CacheData {
  id: string;
  coins: Coin[];
  cell: Cell; // Assuming Cell is accurately imported from './board.ts'
}

interface GameState {
  playerCoins: number;
  playerPosition: Location;
  cacheLocations: CacheData[];
  movementHistory: Location[];
}

interface Location {
  lat: number;
  lng: number;
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

const CACHE_VISIBILITY_RADIUS = 0.005; // Adjust this based on preferred vicinity

function isCacheVisible(
  cacheLocation: LatLng,
  playerPosition: LatLng,
): boolean {
  const distanceLat = (cacheLocation.lat - playerPosition.lat) * 111139;
  const distanceLng = (cacheLocation.lng - playerPosition.lng) *
    (111139 * Math.cos(playerPosition.lat * Math.PI / 180));
  const distance = Math.sqrt(distanceLat ** 2 + distanceLng ** 2); // Approximate distance in meters
  return distance <= CACHE_VISIBILITY_RADIUS;
}

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Geocache implements Momento<string> {
  i: number;
  j: number;
  numCoins: number;

  constructor(i: number, j: number, numCoins: number) {
    this.i = i;
    this.j = j;
    this.numCoins = numCoins;
  }

  toMomento() {
    return `${this.i},${this.j},${this.numCoins}`;
  }

  fromMomento(momento: string) {
    const [i, j, numCoins] = momento.split(",").map(Number);
    this.i = i;
    this.j = j;
    this.numCoins = numCoins;
  }
}

// Dictionary to store mementos for each cache location
const geocacheMementos: { [key: string]: string } = {};

// Modify the updateCacheLocations function to use the Memento pattern
function updateCacheLocations() {
  cacheLocations.forEach((cache) => {
    // Save the current state of each cache item using its coordinates (i, j) as the key
    const key = `${cache.cell.i},${cache.cell.j}`;
    geocacheMementos[key] = new Geocache(
      cache.cell.i,
      cache.cell.j,
      cache.coins.length,
    ).toMomento();
  });

  cacheLocations.length = 0; // Clear existing cache locations
  map.eachLayer((layer: L.Layer) => {
    if (layer instanceof leaflet.Marker && layer !== playerMarker) {
      map.removeLayer(layer); // Remove old markers
    }
  });

  // Generate new caches within visibility radius
  // Ensure to check mementos first for existing state
  for (let i = 0; i < 5; i++) {
    const cacheId = `cache-${i}`;

    const angle = 2 * Math.PI * luck(`${cacheId}-angle`);
    const distance = CACHE_VISIBILITY_RADIUS * luck(`${cacheId}-distance`);
    const offsetLat = (distance * Math.cos(angle)) / 111139;
    const offsetLng = (distance * Math.sin(angle)) /
      (111139 * Math.cos(playerLocation.lat * Math.PI / 180));

    const cacheLocation = leaflet.latLng(
      playerLocation.lat + offsetLat,
      playerLocation.lng + offsetLng,
    );

    if (isCacheVisible(cacheLocation, playerLocation)) {
      const cell = board.getCellForPoint(cacheLocation);
      const key = `${cell.i},${cell.j}`;
      let numCoins = 0;

      if (geocacheMementos[key]) {
        // Restore the state if it exists
        const geocache = new Geocache(cell.i, cell.j, 0);
        geocache.fromMomento(geocacheMementos[key]);
        numCoins = geocache.numCoins;
      } else {
        numCoins = generateNumberOfCoins(cacheId);
      }

      const coins: Coin[] = [];
      for (let j = 0; j < numCoins; j++) {
        const coinId = `${cell.i}:${cell.j}#${j}`;
        coins.push({
          id: coinId,
          originatingCacheId: cacheId,
        });
      }

      cacheLocations.push({ cell, coins, id: cacheId });
      updatePopup(cacheLocations.length - 1);
    }
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

  // Create popup content with clickable coin identifiers
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
    <div>Cache with ${cache.coins.length} coins</div>
    ${
    cache.coins.map((coin) =>
      `<div class="coin-id" data-cache-id="${coin.originatingCacheId}">${coin.id}</div>`
    ).join("")
  }
    <button id="collect-btn-${index}" class="collect-button">Collect</button>
    <button id="deposit-btn-${index}" class="deposit-button">Deposit</button>
  `;

  // Rebind the updated content to the marker
  marker.bindPopup(popupContent);

  // Open the popup when marker is clicked
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
    saveGameState();
  });

  depositButton.addEventListener("click", () => {
    handleDeposit(index);
    updatePopup(index);
    saveGameState();
  });

  // Add click event for each coin identifier to recentre map on coin’s home cache
  const coinIdentifiers = popupContent.querySelectorAll(
    ".coin-id",
  ) as NodeListOf<HTMLElement>;
  coinIdentifiers.forEach((el) => {
    el.addEventListener("click", () => {
      const cacheId = el.getAttribute("data-cache-id")!;
      centerMapOnCache(cacheId);
      saveGameState();
    });
  });
}

// Initialize caches
initializeCacheLocations(OAKES_CLASSROOM, 5, 100);

// Set up tooltips for all caches
cacheLocations.forEach((_, index) => {
  updatePopup(index);
});

// State to track player's current location
let playerLocation: LatLng = OAKES_CLASSROOM;

// Movement parameters
const MOVE_DISTANCE = 0.0001; // You can adjust this value to control the movement distance

// Movement function
function movePlayer(direction: "north" | "south" | "east" | "west") {
  switch (direction) {
    case "north":
      playerLocation = leaflet.latLng(
        playerLocation.lat + MOVE_DISTANCE,
        playerLocation.lng,
      );
      break;
    case "south":
      playerLocation = leaflet.latLng(
        playerLocation.lat - MOVE_DISTANCE,
        playerLocation.lng,
      );
      break;
    case "east":
      playerLocation = leaflet.latLng(
        playerLocation.lat,
        playerLocation.lng + MOVE_DISTANCE,
      );
      break;
    case "west":
      playerLocation = leaflet.latLng(
        playerLocation.lat,
        playerLocation.lng - MOVE_DISTANCE,
      );
      break;
  }

  // Update the player marker's position
  playerMarker.setLatLng(playerLocation);
  updateCacheLocations();

  // Update the movement history and draw the polyline
  updateMovementHistory(playerLocation);
  saveGameState(); // Save state after moving
}

updateCacheLocations();

// Attach event listeners
document.getElementById("north")!.addEventListener(
  "click",
  () => movePlayer("north"),
);
document.getElementById("south")!.addEventListener(
  "click",
  () => movePlayer("south"),
);
document.getElementById("east")!.addEventListener(
  "click",
  () => movePlayer("east"),
);
document.getElementById("west")!.addEventListener(
  "click",
  () => movePlayer("west"),
);

// Declare a variable to track whether geolocation is active
let geolocationActive = false;

// Function to handle geolocation updates
function handleGeolocationUpdate(position: GeolocationPosition) {
  const { latitude, longitude } = position.coords;
  playerLocation = leaflet.latLng(latitude, longitude);

  // Update the player marker's position
  playerMarker.setLatLng(playerLocation);

  // Center the map on the new player location
  map.setView(playerLocation, GAMEPLAY_ZOOM_LEVEL);

  // Update visible caches
  updateCacheLocations();
}

// Function to toggle geolocation tracking
function toggleGeolocation() {
  if (geolocationActive) {
    // If geolocation is active, stop watching the position
    geolocationActive = false;
    alert("Geolocation tracking disabled.");
  } else {
    // Request current position and keep watching
    if (navigator.geolocation) {
      geolocationActive = true;
      alert("Geolocation tracking enabled.");

      navigator.geolocation.watchPosition(handleGeolocationUpdate, (error) => {
        console.error("Geolocation error: ", error);
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }
}

const movementHistory: LatLng[] = []; // Array to keep track of the player's position history
let movementPolyline: leaflet.Polyline; // The polyline to display the player's path on the map

function resetGame() {
  const confirmReset = globalThis.confirm(
    "Are you sure you want to erase your game state and reset all progress?",
  );

  if (confirmReset) {
    playerCoins = 0;
    cacheLocations.length = 0; // Clear all existing cache locations

    // Remove all layers besides the player's marker
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof leaflet.Marker && layer !== playerMarker) {
        map.removeLayer(layer);
      } else if (layer instanceof leaflet.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Re-initialize cache locations
    initializeCacheLocations(OAKES_CLASSROOM, 5, 100);

    // Reset player position
    playerLocation = OAKES_CLASSROOM;
    playerMarker.setLatLng(playerLocation);
    map.setView(playerLocation, GAMEPLAY_ZOOM_LEVEL);

    // Clear movement history
    movementHistory.length = 0;

    // Optionally clear persistent state storage
    localStorage.removeItem("gameState");

    // Update the map with new cache locations
    cacheLocations.forEach((_, index) => {
      updatePopup(index);
    });

    alert(
      "Game has been reset. All coins are returned, and history is cleared.",
    );
  } else {
    alert("Game reset canceled.");
  }
}

function updateMovementHistory(newPosition: LatLng) {
  movementHistory.push(newPosition);

  // Remove the previous polyline from the map, if it exists
  if (movementPolyline) {
    map.removeLayer(movementPolyline);
  }

  // Create a new polyline with the updated movement history
  movementPolyline = leaflet.polyline(movementHistory, { color: "blue" }).addTo(
    map,
  );
}

function centerMapOnCache(cacheId: string) {
  const cache = cacheLocations.find((cache) => cache.id === cacheId);
  if (cache) {
    const cacheCenter = board.getCellBounds(cache.cell).getCenter();
    map.setView(cacheCenter, GAMEPLAY_ZOOM_LEVEL);
  }
}

function saveGameState() {
  const gameState = {
    playerCoins: playerCoins,
    playerPosition: { lat: playerLocation.lat, lng: playerLocation.lng },
    cacheLocations: cacheLocations.map((cache) => ({
      id: cache.id,
      coins: cache.coins,
      cell: cache.cell,
    })),
    movementHistory: movementHistory.map((location) => ({
      lat: location.lat,
      lng: location.lng,
    })),
  };
  localStorage.setItem("gameState", JSON.stringify(gameState));
}

function loadGameState() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    const gameState: GameState = JSON.parse(savedState);

    // Restore player's coins count
    playerCoins = gameState.playerCoins || 0;

    // Restore player location
    playerLocation = leaflet.latLng(
      gameState.playerPosition.lat,
      gameState.playerPosition.lng,
    );
    playerMarker.setLatLng(playerLocation);
    map.setView(playerLocation, GAMEPLAY_ZOOM_LEVEL);

    // Restore cache locations
    cacheLocations.length = 0; // Clear any existing caches
    gameState.cacheLocations.forEach((cacheData: CacheData) => {
      cacheLocations.push({
        id: cacheData.id,
        coins: cacheData.coins,
        cell: cacheData.cell,
      });
    });

    updateCacheLocations(); // Update cache visibility based on player location

    // Restore the movement history
    movementHistory.length = 0; // Clear existing movement history
    gameState.movementHistory.forEach((location: Location) => {
      movementHistory.push(leaflet.latLng(location.lat, location.lng));
    });
    if (movementHistory.length > 0) {
      movementPolyline = leaflet.polyline(movementHistory, { color: "blue" })
        .addTo(map);
    }
  }
}

loadGameState(); // Load the game state from local storage

// Attach event listener for the reset game button
document.getElementById("reset")!.addEventListener("click", resetGame);

// Attach event listener for the geolocation toggle button
document.getElementById("sensor")!.addEventListener("click", toggleGeolocation);

const gameName = "Jason's Game :)";
document.title = gameName;
