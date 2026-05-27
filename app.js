/* ═══════════════════════════════════════════════
   SCUTE — App.js
   State management, views, trips, gamification
   + Mapbox GL JS map integration
═══════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════
// 0. MAPBOX CONFIG
// ══════════════════════════════════════
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ3VpbGhlcm1lZGJsIiwiYSI6ImNtcGtkbzR6dTAyaXkycnNoYjBteG44ZXMifQ.3p2s0utSNdnBevnOfZJplg';

// Center: Hospital Infante D. Pedro de Aveiro
const MAP_CENTER = [-8.6443, 40.6244];
const MAP_ZOOM   = 14.8;

// ══════════════════════════════════════
// 1. INITIAL DATA
//    Vehicles now carry real lat/lng
//    coordinates around the Hospital ↔
//    University of Aveiro corridor.
// ══════════════════════════════════════
const DEFAULT_VEHICLES = [
  // Near Hospital Infante D. Pedro
  { id: 'SC-001', type: 'Trotinete elétrica', battery: 88,  distance: 320,  lng: -8.6432, lat: 40.6248, status: 'available'   },
  // Near University of Aveiro – main entrance
  { id: 'SC-002', type: 'Trotinete elétrica', battery: 15,  distance: 780,  lng: -8.6581, lat: 40.6308, status: 'available'   },
  // Forum Aveiro shopping area
  { id: 'SC-003', type: 'E-Bike',             battery: 92,  distance: 210,  lng: -8.6512, lat: 40.6260, status: 'available'   },
  // Aveiro Train Station
  { id: 'SC-004', type: 'E-Bike',             battery: 67,  distance: 450,  lng: -8.6600, lat: 40.6241, status: 'available'   },
  // Between hospital and university
  { id: 'SC-005', type: 'Bicicleta',          battery: 100, distance: 180,  lng: -8.6493, lat: 40.6292, status: 'available'   },
  // Aveiro city centre / Rossio
  { id: 'SC-006', type: 'Trotinete elétrica', battery: 55,  distance: 620,  lng: -8.6521, lat: 40.6232, status: 'available'   },
  // University library / DETI building (maintenance)
  { id: 'SC-007', type: 'E-Bike',             battery: 73,  distance: 390,  lng: -8.6561, lat: 40.6294, status: 'maintenance' },
  // Near hospital car park entrance
  { id: 'SC-008', type: 'Bicicleta',          battery: 100, distance: 540,  lng: -8.6454, lat: 40.6267, status: 'available'   },
  // UA – Santiago campus west gate
  { id: 'SC-009', type: 'Trotinete elétrica', battery: 41,  distance: 870,  lng: -8.6614, lat: 40.6272, status: 'available'   },
  // UA – CICUA sports complex (maintenance)
  { id: 'SC-010', type: 'E-Bike',             battery: 80,  distance: 260,  lng: -8.6504, lat: 40.6318, status: 'maintenance' },
];

const DEFAULT_USER = {
  name: 'Mariana',
  points: 256,
  subscription: true,
};

const DEFAULT_MISSIONS = [
  { id: 'M1', desc: 'Relocate scooter to Aveiro center', reward: 200, icon: '🛴' },
  { id: 'M2', desc: 'Charge nearby e-bike in Station A', reward: 150, icon: '⚡' },
  { id: 'M3', desc: 'Return bike to Forum Aveiro rack',  reward: 100, icon: '🚲' },
  { id: 'M4', desc: 'Move e-bike to University campus',  reward: 200, icon: '🚴' },
];

const DEFAULT_TRIPS = [
  { id: 'T0', city: 'Aveiro', date: '2026-05-20', time: '08:14', distance: '2.3 km', vehicleType: 'Trotinete elétrica', duration: '00:07:42' },
  { id: 'T1', city: 'Aveiro', date: '2026-05-18', time: '17:32', distance: '1.8 km', vehicleType: 'E-Bike',             duration: '00:05:20' },
];

const LEADERBOARD = [
  { name: 'Pedro Costa',   pts: 1240 },
  { name: 'Ana Rodrigues', pts: 987  },
  { name: 'Mariana Silva', pts: 256  },
  { name: 'Diogo Santos',  pts: 198  },
  { name: 'Beatriz Lima',  pts: 120  },
];

const MARKETPLACE = [
  { name: 'Pedir Veículo',    cost: 100, emoji: '🛴' },
  { name: 'Bloquear Veículo', cost: 150, emoji: '🔒' },
  { name: 'Desconto Parceiro',cost: 80,  emoji: '🏪' },
];

// ══════════════════════════════════════
// 2. STATE MANAGEMENT (LocalStorage)
// ══════════════════════════════════════
const LS = {
  get: key => { try { return JSON.parse(localStorage.getItem('scute_' + key)); } catch { return null; } },
  set: (key, val) => localStorage.setItem('scute_' + key, JSON.stringify(val)),
};

function initState() {
  if (!LS.get('vehicles')) LS.set('vehicles', DEFAULT_VEHICLES);
  if (!LS.get('user'))     LS.set('user', DEFAULT_USER);
  if (!LS.get('missions')) LS.set('missions', DEFAULT_MISSIONS);
  if (!LS.get('trips'))    LS.set('trips', DEFAULT_TRIPS);
}

function getVehicles()            { return LS.get('vehicles') || []; }
function getUser()                { return LS.get('user') || DEFAULT_USER; }
function getTrips()               { return LS.get('trips') || []; }
function updateVehicle(id, patch) {
  const v = getVehicles();
  const i = v.findIndex(x => x.id === id);
  if (i < 0) return;
  Object.assign(v[i], patch);
  LS.set('vehicles', v);
}
function updatePoints(delta) {
  const u = getUser();
  u.points = Math.max(0, u.points + delta);
  LS.set('user', u);
  refreshPointsDisplay();
}
function addTrip(trip) {
  const t = getTrips();
  t.unshift(trip);
  LS.set('trips', t);
}

// ══════════════════════════════════════
// 3. ACTIVE TRIP STATE
// ══════════════════════════════════════
let activeVehicleId = null;
let tripStartTime   = null;
let tripTimerRef    = null;
let tripSeconds     = 0;

// ══════════════════════════════════════
// 4. MAPBOX MAP STATE
// ══════════════════════════════════════
let mapInstance   = null;   // mapboxgl.Map
let mapMarkers    = [];     // array of { id, marker: mapboxgl.Marker }
let mapInitialized = false;

// ══════════════════════════════════════
// 5. UTILITIES
// ══════════════════════════════════════
function fmtTime(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function typeToEmoji(type) {
  if (type === 'Trotinete elétrica') return '🛴';
  if (type === 'E-Bike')             return '🚴';
  return '🚲';
}

function typeToCssClass(type) {
  if (type === 'Trotinete elétrica') return 'type-scooter';
  if (type === 'E-Bike')             return 'type-ebike';
  return 'type-bike';
}

function showToast(msg, dur = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), dur);
}

let _backdrop = null;
function showBackdrop(onClick) {
  if (_backdrop) _backdrop.remove();
  _backdrop = document.createElement('div');
  _backdrop.className = 'overlay-backdrop';
  _backdrop.addEventListener('click', onClick);
  document.body.appendChild(_backdrop);
}
function hideBackdrop() {
  if (_backdrop) { _backdrop.remove(); _backdrop = null; }
}

// ══════════════════════════════════════
// 6. NAV / VIEW SWITCHING
// ══════════════════════════════════════
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const view = document.getElementById('view-' + viewName);
  if (view) view.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (viewName === 'map')          renderMap();
  if (viewName === 'history')      renderHistory();
  if (viewName === 'gamification') renderGamification();
  if (viewName === 'admin')        renderAdmin();

  // Resize Mapbox when the map tab becomes visible
  if (viewName === 'map' && mapInstance) {
    setTimeout(() => mapInstance.resize(), 50);
  }
}

// ══════════════════════════════════════
// 7. MAPBOX INITIALISATION
//    Called once on boot.
// ══════════════════════════════════════
function initMap() {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  mapInstance = new mapboxgl.Map({
    container:  'mapbox-container',
    style:      'mapbox://styles/mapbox/dark-v11',
    center:     MAP_CENTER,
    zoom:       MAP_ZOOM,
    pitch:      0,
    bearing:    0,
    antialias:  true,
  });

  // Disable default scroll-to-zoom on the page to keep mobile feel
  mapInstance.scrollZoom.enable();
  mapInstance.dragRotate.disable();
  mapInstance.touchZoomRotate.disableRotation();

  mapInstance.on('load', () => {
    mapInitialized = true;
    renderMapMarkers();
  });
}

// ══════════════════════════════════════
// 8. MAP RENDERING & FILTERING
// ══════════════════════════════════════
let currentTypeFilter    = 'all';
let currentBatteryFilter = 0;
let simConnectivity      = false;
let simGPS               = false;

/**
 * renderMap() — called on every view switch / filter apply.
 * Manages error banners and then delegates to renderMapMarkers().
 */
function renderMap() {
  document.getElementById('banner-connectivity').classList.toggle('hidden', !simConnectivity);
  document.getElementById('banner-gps').classList.toggle('hidden', !simGPS);

  if (simConnectivity || simGPS) {
    clearAllMarkers();
    document.getElementById('no-results').classList.add('hidden');
    return;
  }

  if (mapInitialized) {
    renderMapMarkers();
  }

  updateAdminStats();
}

/**
 * Build / rebuild Mapbox markers from filtered vehicle data.
 */
function renderMapMarkers() {
  clearAllMarkers();

  const vehicles = getVehicles().filter(v => v.status === 'available');
  const filtered = vehicles.filter(v => {
    const typeOk    = currentTypeFilter === 'all' || v.type === currentTypeFilter;
    const batteryOk = v.battery >= currentBatteryFilter;
    return typeOk && batteryOk;
  });

  document.getElementById('no-results').classList.toggle('hidden', filtered.length > 0);

  filtered.forEach((v, idx) => {
    const el = createMarkerElement(v, idx);
    // offset: nudge up so the bottom-point of the rotated diamond lands on the coordinate
    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([v.lng, v.lat])
      .addTo(mapInstance);
    mapMarkers.push({ id: v.id, marker });
  });
}

/**
 * Build the DOM element used as the custom Mapbox marker.
 */
function createMarkerElement(v, idx) {
  const el = document.createElement('div');
  el.className = 'map-marker entering';

  // 1. The bubble is ALWAYS the vehicle type color now
  const bubbleClass = typeToCssClass(v.type);

  // 2. Determine the battery label color class based on your thresholds
  let batClass = '';
  if (v.battery >= 80) batClass = 'bat-green';
  else if (v.battery >= 50) batClass = 'bat-yellow';
  else if (v.battery >= 25) batClass = 'bat-orange';
  else batClass = 'bat-red';

  el.innerHTML = `
    <div class="pin-bubble ${bubbleClass}">
      <span class="pin-inner">${typeToEmoji(v.type)}</span>
    </div>
    <div class="pin-label ${batClass}">${v.battery}%</div>
  `;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    openVehiclePanel(v.id);
  });

  setTimeout(() => {
    el.classList.remove('entering');
    el.classList.add('entered');
  }, 30 + idx * 60);

  return el;
}

/**
 * Remove all existing Mapbox markers from the map.
 */
function clearAllMarkers() {
  mapMarkers.forEach(({ marker }) => marker.remove());
  mapMarkers = [];
}

// ══════════════════════════════════════
// 9. VEHICLE PANEL
// ══════════════════════════════════════
let selectedVehicleId = null;

function openVehiclePanel(vehicleId) {
  selectedVehicleId = vehicleId;
  const v = getVehicles().find(x => x.id === vehicleId);
  if (!v) return;

  // Fly the map to the selected vehicle
  if (mapInstance) {
    mapInstance.flyTo({
      center: [v.lng, v.lat],
      zoom:   15.5,
      speed:  1.2,
      curve:  1,
    });
  }

  document.getElementById('vp-icon').textContent    = typeToEmoji(v.type);
  document.getElementById('vp-type').textContent    = v.type;
  document.getElementById('vp-id').textContent      = '#' + v.id;
  document.getElementById('vp-battery').textContent = v.battery + '%';
  document.getElementById('vp-distance').textContent = v.distance + 'm';

  const statusMap = { available: 'Disponível', in_use: 'Em Uso', maintenance: 'Manutenção' };
  document.getElementById('vp-status-text').textContent = statusMap[v.status] || v.status;

  const panel = document.getElementById('vehicle-panel');
  panel.classList.remove('hidden');
  showBackdrop(closeVehiclePanel);
}

function closeVehiclePanel() {
  document.getElementById('vehicle-panel').classList.add('hidden');
  hideBackdrop();
  selectedVehicleId = null;
}

// ══════════════════════════════════════
// 10. QR SCANNER
// ══════════════════════════════════════
function openQRScanner() {
  closeVehiclePanel();
  document.getElementById('qr-overlay').classList.remove('hidden');
}

function closeQRScanner() {
  document.getElementById('qr-overlay').classList.add('hidden');
}

function handleQRScan(vehicleId) {
  const id = vehicleId || selectedVehicleId;
  closeQRScanner();
  attemptStartTrip(id);
}

function attemptStartTrip(vehicleId) {
  const v = getVehicles().find(x => x.id === vehicleId);
  if (!v) { showToast('❌ Veículo não encontrado.'); return; }

  if (v.status === 'maintenance') {
    showToast('🔧 Este veículo requer manutenção e não está disponível para utilização. Por favor escolha outro veículo', 4000);
    return;
  }
  if (v.battery < 20) {
    showToast('🔋 Este veículo não tem carga suficiente para realizar uma viagem segura. Por favor escolha outro veículo', 4000);
    return;
  }

  startTrip(v);
}

// ══════════════════════════════════════
// 11. ACTIVE TRIP
// ══════════════════════════════════════
function startTrip(v) {
  activeVehicleId = v.id;
  tripStartTime   = Date.now();
  tripSeconds     = 0;

  updateVehicle(v.id, { status: 'in_use' });
  renderMap();

  document.getElementById('trip-vehicle-icon').textContent       = typeToEmoji(v.type);
  document.getElementById('trip-vehicle-name').textContent       = v.type + ' #' + v.id;
  document.getElementById('trip-battery').textContent            = v.battery + '%';
  document.getElementById('trip-distance-live').textContent      = '0.00 km';
  document.getElementById('trip-timer').textContent              = '00:00:00';

  document.getElementById('trip-overlay').classList.remove('hidden');

  tripTimerRef = setInterval(() => {
    tripSeconds++;
    document.getElementById('trip-timer').textContent = fmtTime(tripSeconds);
    const km = (tripSeconds * 0.006).toFixed(2);
    document.getElementById('trip-distance-live').textContent = km + ' km';
  }, 1000);

  showToast('✅ Veículo desbloqueado! Boa viagem!');
}

function endTrip() {
  if (!activeVehicleId) return;
  clearInterval(tripTimerRef);

  const v = getVehicles().find(x => x.id === activeVehicleId);
  if (v) updateVehicle(activeVehicleId, { status: 'available', battery: Math.max(5, v.battery - Math.floor(tripSeconds / 60)) });

  const distKm   = (tripSeconds * 0.006).toFixed(2);

  const now = new Date();
  const trip = {
    id:          'T' + Date.now(),
    city:        'Aveiro',
    date:        now.toISOString().split('T')[0],
    time:        now.toTimeString().slice(0, 5),
    distance:    distKm + ' km',
    vehicleType: v ? v.type : 'Veículo',
    duration:    fmtTime(tripSeconds),
  };
  addTrip(trip);

  document.getElementById('sum-duration').textContent = fmtTime(tripSeconds);
  document.getElementById('sum-distance').textContent = distKm + ' km';
  // Points come only from quests — hide the points row in summary
  document.getElementById('sum-points-row').classList.add('hidden');

  document.getElementById('trip-overlay').classList.add('hidden');
  document.getElementById('summary-overlay').classList.remove('hidden');

  activeVehicleId = null;
  tripSeconds     = 0;
  renderMap();
}

// ══════════════════════════════════════
// 12. HISTORY RENDERING
// ══════════════════════════════════════
function renderHistory() {
  const trips = getTrips();
  const list  = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const badge = document.getElementById('trip-count-badge');

  badge.textContent = trips.length;

  if (trips.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = trips.map(t => `
    <div class="history-card">
      <div class="history-icon">${typeToEmoji(t.vehicleType)}</div>
      <div class="history-info">
        <h4>${t.vehicleType}</h4>
        <p class="history-meta">${t.city} · ${t.date} ${t.time}</p>
        <p class="history-meta">Duração: ${t.duration}</p>
      </div>
      <div class="history-right">
        <p class="history-dist">${t.distance}</p>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════
// 13. GAMIFICATION RENDERING
// ══════════════════════════════════════
function refreshPointsDisplay() {
  const pts = getUser().points;
  document.getElementById('header-points').textContent  = pts;
  document.getElementById('profile-points').textContent = pts;
}

function renderGamification() {
  refreshPointsDisplay();

  const user = getUser();
  const lb = LEADERBOARD.map(r => r.name === 'Mariana Silva' ? { ...r, pts: user.points } : r);
  lb.sort((a, b) => b.pts - a.pts);

  // Find Mariana's rank for the overlay header card
  const myRank = lb.findIndex(r => r.name === 'Mariana Silva') + 1;
  const myRankEl = document.getElementById('lb-my-rank');
  const myPtsEl  = document.getElementById('lb-my-pts');
  if (myRankEl) myRankEl.textContent = '#' + myRank;
  if (myPtsEl)  myPtsEl.textContent  = user.points.toLocaleString() + ' pts';

  const rankClass = ['top1', 'top2', 'top3'];
  document.getElementById('leaderboard-overlay-list').innerHTML = lb.map((r, i) => `
    <div class="leader-row ${r.name === 'Mariana Silva' ? 'leader-row-me' : ''}">
      <div class="leader-rank ${rankClass[i] || ''}">${i + 1}</div>
      <span class="leader-name">${r.name}${r.name === 'Mariana Silva' ? ' <span style="font-size:10px;opacity:0.6">(você)</span>' : ''}</span>
      <span class="leader-pts">★ ${r.pts.toLocaleString()}</span>
    </div>`).join('');

  document.getElementById('missions-list').innerHTML = DEFAULT_MISSIONS.map(m => `
    <div class="mission-row" data-mission="${m.id}">
      <span style="font-size:20px">${m.icon}</span>
      <span class="mission-desc">${m.desc}</span>
      <span class="mission-pts">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        +${m.reward}
      </span>
    </div>`).join('');

  document.getElementById('marketplace-grid').innerHTML = MARKETPLACE.map(m => `
    <div class="market-item" data-cost="${m.cost}" data-name="${m.name}">
      <div class="market-emoji">${m.emoji}</div>
      <div class="market-name">${m.name}</div>
      <div class="market-cost">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        ${m.cost} pts
      </div>
    </div>`).join('');

  document.getElementById('marketplace-grid').querySelectorAll('.market-item').forEach(el => {
    el.addEventListener('click', () => {
      const cost = parseInt(el.dataset.cost);
      const name = el.dataset.name;
      const u = getUser();
      if (u.points < cost) { showToast('❌ Pontos insuficientes!'); return; }
      updatePoints(-cost);
      showToast(`✅ "${name}" ativado com sucesso!`);
      renderGamification();
    });
  });

  document.getElementById('missions-list').querySelectorAll('.mission-row').forEach(el => {
    el.addEventListener('click', () => {
      const m = DEFAULT_MISSIONS.find(x => x.id === el.dataset.mission);
      if (!m) return;
      updatePoints(m.reward);
      showToast(`🎯 Missão concluída! +${m.reward} pontos ganhos!`);
      renderGamification();
    });
  });
}

// ══════════════════════════════════════
// 14. IN-TRIP QUEST MAP
// ══════════════════════════════════════

// Quest definitions — each has a fixed destination [lat, lng] for routing
const QUEST_DEFINITIONS = [
  { id: 'Q1', icon: '🛴', title: 'Relocar Trotinete', desc: 'Leve a SC-006 para o centro de Aveiro',         reward: 200, targetId: 'SC-006', destLat: 40.640706581298616, destLng: -8.656769275146528 },
  { id: 'Q2', icon: '⚡', title: 'Carregar E-Bike',   desc: 'Leve a SC-003 até à Estação A de carregamento', reward: 150, targetId: 'SC-003', destLat: 40.63176820548308,  destLng: -8.651086120216103 },
  { id: 'Q3', icon: '🚲', title: 'Devolver Bicicleta',desc: 'Devolva SC-005 ao parque do Forum Aveiro',       reward: 100, targetId: 'SC-005', destLat: 40.64119372144858,  destLng: -8.652585976016647 },
  { id: 'Q4', icon: '🚴', title: 'E-Bike ao Campus',  desc: 'Leve SC-004 até ao campus universitário',       reward: 200, targetId: 'SC-004', destLat: 40.6292399272708,   destLng: -8.655683655430522 },
];

let questMapInstance  = null;
let questMapMarkers   = [];
let activeQuestRoute  = false;
let questDestMarker   = null;  // mapboxgl.Marker for the destination pin

// ── Fetch and draw a green cycling route on questMapInstance ──────────────
async function drawQuestRoute(fromLng, fromLat, toLng, toLat) {
  clearQuestRoute();
  
  // Construct URL with explicit from/to coordinates
  const url = `https://api.mapbox.com/directions/v5/mapbox/cycling/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    
  try {
    const res  = await fetch(url);
    const data = await res.json();
    
    // Log explicit error if Mapbox fails to find a route
    if (!data.routes || !data.routes.length) {
      console.error('Mapbox Routing Error. No routes found or invalid coordinates:', data);
      return;
    }
    
    const geojson = data.routes[0].geometry;
    activeQuestRoute = true;

    if (questMapInstance.getSource('quest-route')) {
      questMapInstance.getSource('quest-route').setData(geojson);
    } else {
      questMapInstance.addSource('quest-route', { type: 'geojson', data: geojson });
      questMapInstance.addLayer({ id: 'quest-route-glow', type: 'line', source: 'quest-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint:  { 'line-color': '#1DBA6A', 'line-width': 10, 'line-opacity': 0.22 } });
      questMapInstance.addLayer({ id: 'quest-route-line', type: 'line', source: 'quest-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint:  { 'line-color': '#1DBA6A', 'line-width': 4,  'line-opacity': 0.92 } });
    }

    // Destination marker (green flag pin)
    if (questDestMarker) questDestMarker.remove();
    const destEl = document.createElement('div');
    destEl.className = 'quest-dest-marker';
    destEl.innerHTML = `<div class="quest-dest-pin">🏁</div>`;
    questDestMarker = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
      .setLngLat([toLng, toLat])
      .addTo(questMapInstance);

    // Fit map to the full route
    const coords = geojson.coordinates;
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    questMapInstance.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, duration: 800 }
    );
  } catch (e) { 
    console.error('Route fetch failed catastrophically:', e); 
  }
}

function clearQuestRoute() {
  if (questDestMarker) { questDestMarker.remove(); questDestMarker = null; }
  if (!questMapInstance || !activeQuestRoute) return;
  try {
    if (questMapInstance.getLayer('quest-route-line')) questMapInstance.removeLayer('quest-route-line');
    if (questMapInstance.getLayer('quest-route-glow')) questMapInstance.removeLayer('quest-route-glow');
    if (questMapInstance.getSource('quest-route'))     questMapInstance.removeSource('quest-route');
  } catch (_) {}
  activeQuestRoute = false;
}

function openMissionsPanel() {
  const overlay = document.getElementById('quest-map-overlay');
  overlay.classList.remove('hidden');

  // Init quest map once
  if (!questMapInstance) {
    questMapInstance = new mapboxgl.Map({
      container:  'quest-mapbox-container',
      style:      'mapbox://styles/mapbox/dark-v11',
      center:     MAP_CENTER,
      zoom:       13.8,
      pitch:      0,
      interactive: true,
    });
    questMapInstance.dragRotate.disable();
    questMapInstance.touchZoomRotate.disableRotation();
    questMapInstance.on('load', () => renderQuestMarkers());
  } else {
    questMapInstance.resize();
    renderQuestMarkers();
  }
}

function renderQuestMarkers() {
  // Clear old markers
  questMapMarkers.forEach(m => m.remove());
  questMapMarkers = [];

  const vehicles = getVehicles();

  QUEST_DEFINITIONS.forEach(q => {
    const v = vehicles.find(x => x.id === q.targetId);
    if (!v) return;

    // Quest pin element
    const el = document.createElement('div');
    el.className = 'quest-marker';
    el.innerHTML = `
      <div class="quest-pin-bubble">
        <span>${q.icon}</span>
      </div>
      <div class="quest-pin-label">+${q.reward}★</div>
    `;
    
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      clearQuestRoute();
      // Ensure exact order: fromLng, fromLat, toLng, toLat
      drawQuestRoute(v.lng, v.lat, q.destLng, q.destLat);
      openQuestDetail(q, v);
    });

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([v.lng, v.lat])
      .addTo(questMapInstance);
      
    questMapMarkers.push(marker);
  });
}

function openQuestDetail(q, v) {
  document.getElementById('qd-icon').textContent   = q.icon;
  document.getElementById('qd-title').textContent  = q.title;
  document.getElementById('qd-desc').textContent   = q.desc;
  document.getElementById('qd-reward').textContent = q.reward;
  document.getElementById('qd-vehicle').textContent = '#' + v.id + ' · ' + v.battery + '% bat.';

  const acceptBtn = document.getElementById('qd-accept-btn');
  // Remove old listener
  const fresh = acceptBtn.cloneNode(true);
  acceptBtn.parentNode.replaceChild(fresh, acceptBtn);
  fresh.addEventListener('click', () => {
    updatePoints(q.reward);
    showToast(`🎯 Missão concluída! +${q.reward} pontos ganhos!`);
    closeMissionsPanel();
    // Show summary points row
    const row = document.getElementById('sum-points-row');
    if (row) {
      row.classList.remove('hidden');
      document.getElementById('sum-points').textContent = q.reward;
    }
  });

  document.getElementById('quest-detail-panel').classList.remove('hidden');
}

function closeMissionsPanel() {
  clearQuestRoute();
  document.getElementById('quest-map-overlay').classList.add('hidden');
  document.getElementById('quest-detail-panel').classList.add('hidden');
}

// ══════════════════════════════════════
// 15. REPORT PROBLEM
// ══════════════════════════════════════
let selectedReportCat = null;

function openReportPanel(vehicleId) {
  selectedVehicleId = vehicleId;
  document.getElementById('report-vehicle-id').textContent  = '#' + vehicleId;
  document.getElementById('report-description').value       = '';
  document.getElementById('report-photo-status').textContent = '';
  selectedReportCat = null;
  document.querySelectorAll('.report-cat').forEach(b => b.classList.remove('selected'));

  closeVehiclePanel();
  document.getElementById('report-panel').classList.remove('hidden');
  showBackdrop(closeReportPanel);
}

function closeReportPanel() {
  document.getElementById('report-panel').classList.add('hidden');
  hideBackdrop();
}

function submitReport() {
  if (!selectedReportCat) { showToast('⚠️ Selecione uma categoria.'); return; }
  const desc = document.getElementById('report-description').value.trim();
  if (!desc) { showToast('⚠️ Adicione uma descrição do problema.'); return; }

  updateVehicle(selectedVehicleId, { status: 'maintenance' });
  showToast('✅ Relatório enviado! Veículo marcado para manutenção.', 3500);
  closeReportPanel();
  renderMap();
  renderAdmin();
}

// ══════════════════════════════════════
// 16. ADMIN / DASHBOARD
// ══════════════════════════════════════
function updateAdminStats() {
  const vehicles = getVehicles();
  const avail = vehicles.filter(v => v.status === 'available').length;
  const inUse = vehicles.filter(v => v.status === 'in_use').length;
  const maint = vehicles.filter(v => v.status === 'maintenance').length;

  const saU = document.getElementById('stat-active-users');
  const sF  = document.getElementById('stat-fleet');
  const sI  = document.getElementById('stat-in-use');
  const sM  = document.getElementById('stat-maintenance');
  if (saU) saU.textContent = 47 + inUse;
  if (sF)  sF.textContent  = avail;
  if (sI)  sI.textContent  = inUse;
  if (sM)  sM.textContent  = maint;
}

function renderAdmin() {
  updateAdminStats();
  const vehicles    = getVehicles();
  const statusLabel = { available: 'Disponível', in_use: 'Em Uso', maintenance: 'Manutenção' };
  document.getElementById('fleet-table').innerHTML = vehicles.map(v => `
    <div class="fleet-row">
      <span class="fleet-type">${typeToEmoji(v.type)}</span>
      <span class="fleet-id">${v.id}</span>
      <span class="fleet-bat" style="color: ${v.battery < 20 ? 'var(--red)' : v.battery < 50 ? 'var(--amber)' : 'var(--green)'}">${v.battery}%</span>
      <span class="fleet-status ${v.status}">${statusLabel[v.status]}</span>
    </div>`).join('');
}

// ══════════════════════════════════════
// 17. FILTERS
// ══════════════════════════════════════
function setupFilters() {
  document.getElementById('type-filters').querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('#type-filters .chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      currentTypeFilter = c.dataset.type;
    });
  });

  document.getElementById('battery-filters').querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('#battery-filters .chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      currentBatteryFilter = parseInt(c.dataset.battery);
    });
  });

  document.getElementById('filter-toggle-btn').addEventListener('click', () => {
    document.getElementById('filter-panel').classList.toggle('hidden');
  });
  document.getElementById('filter-close-btn').addEventListener('click', () => {
    document.getElementById('filter-panel').classList.add('hidden');
  });
  document.getElementById('filter-apply').addEventListener('click', () => {
    document.getElementById('filter-panel').classList.add('hidden');
    renderMap();
  });
  document.getElementById('filter-reset').addEventListener('click', () => {
    currentTypeFilter    = 'all';
    currentBatteryFilter = 0;
    document.querySelectorAll('#type-filters .chip').forEach((c, i)   => c.classList.toggle('active', i === 0));
    document.querySelectorAll('#battery-filters .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    document.getElementById('filter-panel').classList.add('hidden');
    renderMap();
  });

  document.getElementById('sim-connectivity').addEventListener('change', e => {
    simConnectivity = e.target.checked;
    if (simConnectivity) { simGPS = false; document.getElementById('sim-gps').checked = false; }
    renderMap();
  });
  document.getElementById('sim-gps').addEventListener('change', e => {
    simGPS = e.target.checked;
    if (simGPS) { simConnectivity = false; document.getElementById('sim-connectivity').checked = false; }
    renderMap();
  });
}

// ══════════════════════════════════════
// 18. LOCATE ME BUTTON
// ══════════════════════════════════════
function setupLocateButton() {
  const btn = document.getElementById('locate-btn');
  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      mapInstance.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM, speed: 1.2 });
      showToast('📍 GPS não suportado. A mostrar Aveiro.');
      return;
    }
    btn.classList.add('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.classList.remove('locating');
        mapInstance.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom:   16,
          speed:  1.4,
        });
        showToast('📍 Localização encontrada!');
      },
      () => {
        btn.classList.remove('locating');
        // Always fall back to Hospital/UA center
        mapInstance.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM, speed: 1.2 });
        showToast('📍 GPS indisponível. A mostrar zona da Universidade de Aveiro.');
      },
      { timeout: 6000, maximumAge: 30000 }
    );
  });
}

// ══════════════════════════════════════
// 19. BOOT & EVENT LISTENERS
// ══════════════════════════════════════
function boot() {
  initState();

  // ── Initialise Mapbox map
  initMap();

  // ── Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // ── Filters
  setupFilters();

  // ── Locate button
  setupLocateButton();

  // ── Vehicle Panel
  document.getElementById('vp-close').addEventListener('click', closeVehiclePanel);
  document.getElementById('vp-start-btn').addEventListener('click', () => {
    if (!selectedVehicleId) return;
    openQRScanner();
  });
  document.getElementById('vp-report-btn').addEventListener('click', () => {
    if (!selectedVehicleId) return;
    openReportPanel(selectedVehicleId);
  });

  // ── QR Overlay
  document.getElementById('qr-close').addEventListener('click', closeQRScanner);
  document.getElementById('qr-frame').addEventListener('click', () => handleQRScan());
  document.getElementById('qr-manual-submit').addEventListener('click', () => {
    const code = document.getElementById('qr-manual-code').value.trim().replace('#', '');
    if (!code) { showToast('⚠️ Insira um código válido.'); return; }
    handleQRScan(code.toUpperCase());
  });

  // ── Trip controls
  document.getElementById('trip-stop-btn').addEventListener('click', endTrip);
  document.getElementById('sim-walk-btn').addEventListener('click', () => {
    showToast('📍 Afastamento de 25m detectado. A terminar viagem...');
    setTimeout(endTrip, 1200);
  });
  document.getElementById('trip-missions-btn').addEventListener('click', openMissionsPanel);

  // ── Summary
  document.getElementById('summary-close-btn').addEventListener('click', () => {
    document.getElementById('summary-overlay').classList.add('hidden');
    switchView('history');
  });

  // ── Report
  document.querySelectorAll('.report-cat').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.report-cat').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      selectedReportCat = b.dataset.cat;
    });
  });
  document.getElementById('report-photo-btn').addEventListener('click', () => {
    document.getElementById('report-photo-status').textContent = '📷 Foto adicionada';
  });
  document.getElementById('report-submit-btn').addEventListener('click', submitReport);

  // ── Admin export
  document.getElementById('export-btn').addEventListener('click', () => {
    showToast('📊 Relatório exportado com sucesso!');
  });

  // ── Notification btn
  document.getElementById('notif-btn').addEventListener('click', () => {
    showToast('🔔 Sem novas notificações.');
  });

  // ── Leaderboard overlay
  const lbBtn     = document.getElementById('lb-trophy-btn');
  const lbOverlay = document.getElementById('leaderboard-overlay');
  const lbClose   = document.getElementById('lb-close-btn');
  if (lbBtn)   lbBtn.addEventListener('click',  () => { renderGamification(); lbOverlay.classList.remove('hidden'); });
  if (lbClose) lbClose.addEventListener('click', () => lbOverlay.classList.add('hidden'));

  // ── Initial render
  refreshPointsDisplay();
  renderHistory();
  renderGamification();
  renderAdmin();

  // ── Hide splash, show app
  setTimeout(() => {
    document.getElementById('app').classList.remove('hidden');
    // Trigger a map resize after the app becomes visible
    setTimeout(() => { if (mapInstance) mapInstance.resize(); }, 100);
  }, 2100);
}
// Start!
document.addEventListener('DOMContentLoaded', boot);
