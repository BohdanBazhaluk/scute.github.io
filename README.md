# MAS-Scute-Micromobility
## Claude prompt usado na primeira implementação do projeto

~~~Act as an expert Senior Frontend Developer. Your task is to generate the complete code for the first functional increment of the "Scute" project, a smart and gamified micromobility platform. 

Following the project's Iteration 5 guidelines, you must deliver a single-page or cleanly separated web application using ONLY the core web stack: HTML5, CSS3, and JavaScript (Vanilla JS). Do NOT use any frameworks (e.g., React, Vue, Angular) or backend languages. The application must look and feel like a native mobile app (mobile-first responsive design) and simulate persistence/state management using `LocalStorage`.

### 1. UX/UI Requirements (Based on Prototype Video & Specs)
- **Design:** Mobile-first, modern, and clean interface with a green/dark/white color palette mirroring the Scute prototype.
- **Navigation Bar:** A persistent bottom navigation bar with 4 tabs: 
  1. Map (Home)
  2. History (Clock icon)
  3. Gamification/Profile (Hamburger menu/Star icon)
  4. Admin/Partner Dashboard
- **Transitions:** Smooth conditional rendering or tab switching without page reloads.

### 2. Core State Data Model (LocalStorage Base)
Initialize the `LocalStorage` with mockup data if empty:
- **Vehicles Array:** Unique ID, type (Trotinete elétrica, E-Bike, Bicicleta), battery level (%), distance (m), coordinates/grid position, status ("available", "in_use", "maintenance").
- **User Profile:** Points balance (start with 256 points), active subscription status (true/false).
- **Missions Array:** Available rebalancing tasks ("Relocate vehicle to Aveiro center", "Charge Scooter nearby") rewarding +100, +150, or +200 points.
- **Trips History:** List of past trips (City, Date/Time, Distance, Vehicle type).

### 3. Epic 1: Vehicle Rental Base (User Stories & Scenarios)
Implement the core flows exactly as defined in the Acceptance Criteria:

#### US1.1 & US1.2: Vehicle Map & Filtering
- Create a visual interactive map area (you can simulate the map using an elegant grid/canvas layout or mock layout with interactive icons based on the video).
- Render vehicle pins based on the database. Clicking a pin slides up a **Vehicle Profile Panel** showing: Type, Battery %, Distance, and an "Iniciar Viagem" button.
- Implement a **Filter Dropdown**: Allow filtering by vehicle type and battery thresholds (e.g., "+75% Bateria"). Include a clear message if no results are found: *"Nenhum veículo encontrado para os filtros aplicados"*.
- Include error mock toggles/handlers for GPS error and Connectivity error to validate acceptance criteria.

#### US1.3: Start Trip (QR Code Simulation)
- Clicking "Iniciar Viagem" opens a camera scanner overlay view (simulated beautifully in HTML/CSS with a green scanning square targeting the prototype's layout). Clicking inside it simulates a successful read.
- **Business Rule Validations:**
  - If battery < 20%, block the trip with: *"Este veículo não tem carga suficiente para realizar uma viagem segura. Por favor escolha outro veículo"*.
  - If status is "maintenance", block with: *"Este veículo requer manutenção e não está disponível para utilização..."*.
- On successful unlock: Update vehicle status to "in_use" (hiding it from the map), open a dynamic trip screen showing an active live timer (`00:00:00`), a red "Stop" button, and a Gamification context button.

#### US1.4: End Trip & Proximity
- Clicking "Terminar Viagem" (or triggering a "Simulate 25m Walk Away" button) stops the timer, locks the vehicle, updates its status to "available", saves the trip to the History array, and adds it to the list.

### 4. Gamification Layer & Extended Views
Integrate the elements showcased in the navigation and prototype flow:
- **Gamification Tab / Profile:** Displays the user's current points balance (e.g., 256 points), a dynamic **Leaderboard** ranking regional users, and a **Marketplace** where points can be used (e.g., "Pedir Veículo" or "Bloquear Veículo").
- **In-Trip Gamification Context:** While a trip is active, clicking the star icon slides up the "Ajude-nos e ganhe pontos!" panel showing localized mission pins (+100, +150, +200 stars) that incentivize rebalancing.
- **Report Problem (UC-15):** Users can access a "Reportar Problema" view, select categories (Travões, Motor, Rodas, Outro), write a short description, simulate taking a photo, and click "Enviar", which dynamically marks that specific vehicle's status as "maintenance".
- **Admin/Partner Dashboard:** A simple toggle layout showcasing the analytics from the prototype video: active user count, fleet counters, subscription charts, and a partner area with coupon distribution metrics and an "Exportar" button.

### Output Structure Expected:
Please output the codebase cleanly:
1. `index.html` containing the semantic layout and application shells.
2. `style.css` containing the responsive mobile layout, animations, panels, and polished UI theme.
3. `app.js` containing the state initialization, LocalStorage bindings, event listeners, filtering algorithms, trip timers, and views management.

Ensure all code is self-contained, fully written (no placeholders or "code goes here" comments), robust, and ready to be deployed.~~~