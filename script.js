const VEHICLES = [
  {
    id: "bmw5",
    name: "BMW 5 Series",
    ratePerHour: 2500,
    meta: "Luxury sedan • Chauffeur included • Wedding décor option",
    mediaClass: "car-media-bmw5",
  },
  {
    id: "a6",
    name: "Audi A6",
    ratePerHour: 2700,
    meta: "Premium comfort • Quiet ride • Chauffeur included",
    mediaClass: "car-media-a6",
  },
  {
    id: "s90",
    name: "Volvo S90",
    ratePerHour: 2600,
    meta: "Elegant & refined • Spacious rear seat • Décor option",
    mediaClass: "car-media-s90",
  },
  {
    id: "bmw7",
    name: "BMW 7 Series",
    ratePerHour: 4000,
    meta: "Flagship luxury • Chauffeur included",
    mediaClass: "car-media-bmw7",
  },
  {
    id: "a8",
    name: "Audi A8",
    ratePerHour: 4200,
    meta: "Ultra-premium • Chauffeur included • Wedding décor option",
    mediaClass: "car-media-a8",
  },
];

const DECOR_ADDON_FLAT = 1500;

const state = {
  trip: null,
  selectedVehicleId: null,
};

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizePhone(raw) {
  return (raw || "").replace(/[^\d]/g, "");
}

function setStep(stepNum) {
  $all(".step").forEach((s) => {
    const active = String(stepNum) === s.getAttribute("data-step");
    s.classList.toggle("step-active", active);
  });
  $all(".panel").forEach((p) => {
    const active = String(stepNum) === p.getAttribute("data-panel");
    p.classList.toggle("panel-active", active);
  });
}

function scrollToBooking() {
  const el = $("#booking");
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearFieldError(name) {
  const err = document.querySelector(`[data-error-for="${name}"]`);
  if (err) err.textContent = "";
  const input = document.querySelector(`[name="${name}"]`);
  if (input) input.setAttribute("aria-invalid", "false");
}

function setFieldError(name, message) {
  const err = document.querySelector(`[data-error-for="${name}"]`);
  if (err) err.textContent = message;
  const input = document.querySelector(`[name="${name}"]`);
  if (input) input.setAttribute("aria-invalid", "true");
}

function validateTrip(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const cleaned = {
    fullName: (data.fullName || "").trim(),
    phone: normalizePhone(data.phone),
    email: (data.email || "").trim(),
    startLocation: (data.startLocation || "").trim(),
    endLocation: (data.endLocation || "").trim(),
    eventDate: (data.eventDate || "").trim(),
    pickupTime: (data.pickupTime || "").trim(),
    hours: Number(String(data.hours || "").trim()),
  };

  const errors = {};

  if (!cleaned.fullName) errors.fullName = "Please enter your full name.";
  if (!cleaned.phone) errors.phone = "Please enter your phone number.";
  if (cleaned.phone && (cleaned.phone.length < 10 || cleaned.phone.length > 15)) {
    errors.phone = "Please enter a valid phone number.";
  }
  if (!cleaned.email) errors.email = "Please enter your email.";
  if (cleaned.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!cleaned.eventDate) errors.eventDate = "Please select an event date.";
  if (!cleaned.startLocation) errors.startLocation = "Please enter the trip start location.";
  if (!cleaned.endLocation) errors.endLocation = "Please enter the trip end location.";
  if (!cleaned.pickupTime) errors.pickupTime = "Please select a pickup time.";
  if (!Number.isFinite(cleaned.hours) || cleaned.hours <= 0) {
    errors.hours = "Please enter the number of hours required.";
  }

  // Soft guard against past dates (local time).
  if (cleaned.eventDate) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const chosen = new Date(`${cleaned.eventDate}T00:00:00`);
    if (Number.isFinite(chosen.getTime()) && chosen < startOfToday) {
      errors.eventDate = "Please choose a date in the future.";
    }
  }

  return { cleaned, errors };
}

function renderTripSummary(trip) {
  $("#summaryRoute").textContent = `${trip.startLocation} → ${trip.endLocation}`;
  $("#summaryDateTime").textContent = `${trip.eventDate} • ${trip.pickupTime}`;
  $("#summaryHours").textContent = `${trip.hours} hour${trip.hours === 1 ? "" : "s"}`;
}

function vehicleCardTemplate(v, hours) {
  const base = v.ratePerHour * hours;
  return `
    <article class="vehicle-card" data-vehicle-id="${v.id}">
      <div class="vehicle-media ${v.mediaClass}" aria-hidden="true"></div>
      <div class="vehicle-body">
        <h3 class="vehicle-title">${v.name}</h3>
        <p class="vehicle-price">${formatINR(v.ratePerHour)} <span class="muted tiny">/ hour</span></p>
        <p class="vehicle-meta">${v.meta}</p>
        <div class="panel-actions" style="margin-top: 0">
          <button class="btn btn-outline btn-full" type="button" data-select-vehicle="${v.id}">
            Select This Vehicle
          </button>
        </div>
        <p class="muted tiny" style="margin: 10px 0 0">Estimated base: <strong>${formatINR(base)}</strong></p>
      </div>
    </article>
  `;
}

function renderVehicles(trip) {
  const grid = $("#vehicleGrid");
  grid.innerHTML = VEHICLES.map((v) => vehicleCardTemplate(v, trip.hours)).join("");
}

function setSelectedVehicle(vehicleId) {
  state.selectedVehicleId = vehicleId;

  $all(".vehicle-card").forEach((card) => {
    card.classList.toggle("selected", card.getAttribute("data-vehicle-id") === vehicleId);
  });

  const continueBtn = $("#continueToConfirm");
  continueBtn.disabled = !state.selectedVehicleId;
}

function buildConfirmation() {
  const trip = state.trip;
  const vehicle = VEHICLES.find((v) => v.id === state.selectedVehicleId);
  if (!trip || !vehicle) return;

  const base = vehicle.ratePerHour * trip.hours;
  const estimatedTotal = base; // décor add-on could be added later if you add a toggle

  $("#confirmCar").textContent = vehicle.name;
  $("#confirmTrip").textContent = `${trip.startLocation} → ${trip.endLocation}`;
  $("#confirmDateTime").textContent = `${trip.eventDate} • ${trip.pickupTime} • ${trip.hours}h`;
  $("#confirmBasePrice").textContent = `${formatINR(vehicle.ratePerHour)}/hr`;
  $("#confirmTotal").textContent = formatINR(estimatedTotal);
}

function setupNav() {
  const toggle = $(".nav-toggle");
  const menu = $(".nav-menu");

  function closeMenu() {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle?.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  $all(".nav-link, .nav-menu .btn").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  // Active section highlighting (best-effort).
  const sections = ["home", "about", "cars", "booking", "pricing", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const links = new Map(
    $all('.nav-link[href^="#"]').map((a) => [a.getAttribute("href")?.slice(1), a]),
  );

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((a) => a.classList.remove("active"));
        links.get(id)?.classList.add("active");
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 },
  );

  sections.forEach((s) => io.observe(s));

  // Close menu on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

function setupFlow() {
  const form = $("#tripForm");
  const backToForm = $("#backToForm");
  const continueToConfirm = $("#continueToConfirm");
  const backToVehicles = $("#backToVehicles");
  const requestBooking = $("#requestBooking");
  const requestResult = $("#requestResult");

  // Clear errors on input
  $all("#tripForm input").forEach((input) => {
    input.addEventListener("input", () => clearFieldError(input.name));
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    requestResult.textContent = "";

    const { cleaned, errors } = validateTrip(form);
    $all(".field-error").forEach((n) => (n.textContent = ""));
    $all("#tripForm input").forEach((i) => i.setAttribute("aria-invalid", "false"));

    const errorEntries = Object.entries(errors);
    if (errorEntries.length > 0) {
      errorEntries.forEach(([name, msg]) => setFieldError(name, msg));
      const first = form.querySelector('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    state.trip = cleaned;
    state.selectedVehicleId = null;

    renderTripSummary(state.trip);
    renderVehicles(state.trip);
    setSelectedVehicle(null);

    setStep(2);
    scrollToBooking();
  });

  $("#vehicleGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-select-vehicle]");
    if (!btn) return;
    const id = btn.getAttribute("data-select-vehicle");
    setSelectedVehicle(id);
  });

  backToForm?.addEventListener("click", () => {
    setStep(1);
    scrollToBooking();
  });

  continueToConfirm?.addEventListener("click", () => {
    if (!state.trip || !state.selectedVehicleId) return;
    buildConfirmation();
    setStep(3);
    scrollToBooking();
  });

  backToVehicles?.addEventListener("click", () => {
    setStep(2);
    scrollToBooking();
  });

  requestBooking?.addEventListener("click", () => {
    const trip = state.trip;
    const vehicle = VEHICLES.find((v) => v.id === state.selectedVehicleId);
    if (!trip || !vehicle) return;

    // Demo “request” (no backend). Present a premium confirmation message.
    const base = vehicle.ratePerHour * trip.hours;
    const message = [
      "Request received.",
      `We’ll contact ${trip.fullName} shortly to confirm availability for ${trip.eventDate} at ${trip.pickupTime}.`,
      `Selected: ${vehicle.name} • Estimated: ${formatINR(base)}.`,
    ].join(" ");

    requestResult.textContent = message;
    requestResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupFlow();
});
