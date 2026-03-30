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
  {
    id: "sclass",
    name: "Premium Luxury Sedan",
    ratePerHour: 3800,
    meta: "On request • Chauffeur included • Photo-ready presentation",
    mediaClass: "car-media-sclass",
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

function clearFieldError(name, root = document) {
  const err = root.querySelector(`[data-error-for="${name}"]`);
  if (err) err.textContent = "";
  const input = root.querySelector(`[name="${name}"]`);
  if (input) input.setAttribute("aria-invalid", "false");
}

function setFieldError(name, message, root = document) {
  const err = root.querySelector(`[data-error-for="${name}"]`);
  if (err) err.textContent = message;
  const input = root.querySelector(`[name="${name}"]`);
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

function setupServiceTabs() {
  const tabs = $all(".service-tab");
  const panels = $all(".service-panel");
  const bookingTitle = $("#bookingTitle");
  const bookingLede = $("#bookingLede");
  const contactTitle = $("#contactTitle");
  const contactLede = $("#contactLede");
  const scopedSections = $all("[data-service-visible]");

  const copyByService = {
    wedding: {
      title: "Book a Ride",
      lede: "Start with your trip details. Next, choose your vehicle. Finally, confirm your request.",
    },
    taxi: {
      title: "Taxi Booking",
      lede: "Choose your taxi options and share route/date details for quick confirmation.",
    },
    travellers: {
      title: "Travellers & Airbuses Booking",
      lede: "Select your seat range (18-49), route, and timing to reserve the right vehicle.",
    },
    drivers: {
      title: "Drivers / Chauffeurs Booking",
      lede: "Book a private driver based on required days and expected travel distance.",
    },
  };

  const taxiResult = $("#taxiRequestResult");
  const travellerResult = $("#travellerRequestResult");
  const driverResult = $("#driverRequestResult");
  const requestResult = $("#requestResult");
  const taxiWhatsApp = $("#taxiWhatsApp");
  const travellerWhatsApp = $("#travellerWhatsApp");
  const driverWhatsApp = $("#driverWhatsApp");

  function resetAllResults() {
    if (requestResult) requestResult.textContent = "";
    if (taxiResult) taxiResult.textContent = "";
    if (travellerResult) travellerResult.textContent = "";
    if (driverResult) driverResult.textContent = "";

    [taxiWhatsApp, travellerWhatsApp, driverWhatsApp].forEach((a) => {
      if (!a) return;
      a.hidden = true;
      a.href = "#";
    });
  }

  function applyServicePageMode(service) {
    scopedSections.forEach((section) => {
      const visibleFor = String(section.getAttribute("data-service-visible") || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      section.hidden = !visibleFor.includes(service);
    });

    const copy = copyByService[service] || copyByService.wedding;
    if (bookingTitle) bookingTitle.textContent = copy.title;
    if (bookingLede) bookingLede.textContent = copy.lede;

    if (contactTitle) {
      contactTitle.textContent =
        service === "wedding"
          ? "Contact"
          : service === "taxi"
            ? "Contact (Taxi)"
            : service === "travellers"
              ? "Contact (Travellers)"
              : "Contact (Drivers)";
    }
    if (contactLede) {
      contactLede.textContent =
        service === "wedding"
          ? "Tell us your date and route—we’ll recommend the best car and confirm availability."
          : service === "taxi"
            ? "Tell us your route and timing—we’ll confirm the best taxi option."
            : service === "travellers"
              ? "Share your seat range (18–49), route, and pickup time—we’ll reserve the right bus/airbus."
              : "Share your days and distance—we’ll arrange the private chauffeur accordingly.";
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const service = tab.getAttribute("data-service-tab");

      tabs.forEach((t) => {
        const active = t.getAttribute("data-service-tab") === service;
        t.classList.toggle("service-tab-active", active);
        t.setAttribute("aria-selected", String(active));
      });

      panels.forEach((p) => {
        const active = p.getAttribute("data-service-panel") === service;
        p.classList.toggle("service-panel-active", active);
      });

      applyServicePageMode(service);

      // Reset UI so the selected service feels "fresh".
      resetAllResults();
      if (service === "wedding") {
        setStep(1);
        setSelectedVehicle(null);
      }
    });
  });

  applyServicePageMode("wedding");
  resetAllResults();
}

function isPastDateOnly(dateStr) {
  if (!dateStr) return false;
  const chosen = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(chosen.getTime())) return false;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return chosen < startOfToday;
}

function validatePhoneField(phone) {
  const cleaned = normalizePhone(phone);
  if (!cleaned) return null;
  if (cleaned.length < 10 || cleaned.length > 15) return "Please enter a valid phone number.";
  return null;
}

function setupServiceForms() {
  const taxiForm = $("#taxiForm");
  const travellerForm = $("#travellerForm");
  const driverForm = $("#driverForm");

  const taxiResult = $("#taxiRequestResult");
  const travellerResult = $("#travellerRequestResult");
  const driverResult = $("#driverRequestResult");
  const taxiWhatsApp = $("#taxiWhatsApp");
  const travellerWhatsApp = $("#travellerWhatsApp");
  const driverWhatsApp = $("#driverWhatsApp");

  const WHATSAPP_NUMBER = "919995795321";

  function waHref(text) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  function clearFormErrors(form) {
    $all(".field-error", form).forEach((n) => (n.textContent = ""));
    $all("input, select", form).forEach((el) => el.setAttribute("aria-invalid", "false"));
  }

  if (taxiForm) {
    $all("#taxiForm input, #taxiForm select").forEach((el) => {
      el.addEventListener("input", () => clearFieldError(el.name, taxiForm));
      el.addEventListener("change", () => clearFieldError(el.name, taxiForm));
    });

    taxiForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (taxiResult) taxiResult.textContent = "";
      if (taxiWhatsApp) taxiWhatsApp.hidden = true;
      clearFormErrors(taxiForm);

      const data = Object.fromEntries(new FormData(taxiForm).entries());
      const errors = {};

      if (!(data.taxiFullName || "").trim()) errors.taxiFullName = "Please enter your full name.";
      if (!data.taxiPhone) errors.taxiPhone = "Please enter your phone number.";
      const phoneErr = validatePhoneField(data.taxiPhone);
      if (!errors.taxiPhone && phoneErr) errors.taxiPhone = phoneErr;

      if (!(data.taxiStartLocation || "").trim()) errors.taxiStartLocation = "Please enter the pickup location.";
      if (!(data.taxiEndLocation || "").trim()) errors.taxiEndLocation = "Please enter the drop location.";
      if (!data.taxiEventDate) errors.taxiEventDate = "Please select an event date.";
      if (!errors.taxiEventDate && isPastDateOnly(data.taxiEventDate)) errors.taxiEventDate = "Please choose a date in the future.";
      if (!data.taxiPickupTime) errors.taxiPickupTime = "Please select a pickup time.";
      if (!data.taxiType) errors.taxiType = "Please select a taxi type.";

      const hours = Number(String(data.taxiHours ?? "").trim());
      if (!Number.isFinite(hours) || hours <= 0) errors.taxiHours = "Please enter trip duration hours.";

      const errorEntries = Object.entries(errors);
      if (errorEntries.length > 0) {
        errorEntries.forEach(([name, msg]) => setFieldError(name, msg, taxiForm));
        const first = taxiForm.querySelector('[aria-invalid="true"]');
        first?.focus();
        return;
      }

      const msg = [
        "Request received.",
        `Taxi type: ${data.taxiType}.`,
        `Route: ${data.taxiStartLocation} → ${data.taxiEndLocation}.`,
        `Date: ${data.taxiEventDate} at ${data.taxiPickupTime}.`,
        `Duration: ${hours} hour(s).`,
        `We’ll contact you at ${normalizePhone(data.taxiPhone)} shortly.`,
      ].join(" ");

      if (taxiResult) {
        taxiResult.textContent = msg;
        taxiResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (taxiWhatsApp) {
        const waText = `Hi Adham's Auto World, I want to book a Taxi.\nTaxi type: ${data.taxiType}\nFrom: ${data.taxiStartLocation}\nTo: ${data.taxiEndLocation}\nDate: ${data.taxiEventDate}\nPickup time: ${data.taxiPickupTime}\nDuration: ${hours} hour(s).`;
        taxiWhatsApp.href = waHref(waText);
        taxiWhatsApp.hidden = false;
      }
    });
  }

  if (travellerForm) {
    $all("#travellerForm input, #travellerForm select").forEach((el) => {
      el.addEventListener("input", () => clearFieldError(el.name, travellerForm));
      el.addEventListener("change", () => clearFieldError(el.name, travellerForm));
    });

    travellerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (travellerResult) travellerResult.textContent = "";
      if (travellerWhatsApp) travellerWhatsApp.hidden = true;
      clearFormErrors(travellerForm);

      const data = Object.fromEntries(new FormData(travellerForm).entries());
      const errors = {};

      if (!(data.travellerFullName || "").trim()) errors.travellerFullName = "Please enter your full name.";
      if (!data.travellerPhone) errors.travellerPhone = "Please enter your phone number.";
      const phoneErr = validatePhoneField(data.travellerPhone);
      if (!errors.travellerPhone && phoneErr) errors.travellerPhone = phoneErr;

      if (!(data.travellerStartLocation || "").trim()) errors.travellerStartLocation = "Please enter pickup location.";
      if (!(data.travellerEndLocation || "").trim()) errors.travellerEndLocation = "Please enter drop location.";
      if (!data.travellerEventDate) errors.travellerEventDate = "Please select an event date.";
      if (!errors.travellerEventDate && isPastDateOnly(data.travellerEventDate))
        errors.travellerEventDate = "Please choose a date in the future.";
      if (!data.travellerPickupTime) errors.travellerPickupTime = "Please select a pickup time.";
      if (!data.travellerSeats) errors.travellerSeats = "Please select a seat range.";

      const hours = Number(String(data.travellerHours ?? "").trim());
      if (!Number.isFinite(hours) || hours <= 0) errors.travellerHours = "Please enter trip duration hours.";

      const errorEntries = Object.entries(errors);
      if (errorEntries.length > 0) {
        errorEntries.forEach(([name, msg]) => setFieldError(name, msg, travellerForm));
        const first = travellerForm.querySelector('[aria-invalid="true"]');
        first?.focus();
        return;
      }

      const msg = [
        "Request received.",
        `Seat range: ${data.travellerSeats} seats.`,
        `Route: ${data.travellerStartLocation} → ${data.travellerEndLocation}.`,
        `Date: ${data.travellerEventDate} at ${data.travellerPickupTime}.`,
        `Duration: ${hours} hour(s).`,
        `We’ll contact you at ${normalizePhone(data.travellerPhone)} shortly.`,
      ].join(" ");

      if (travellerResult) {
        travellerResult.textContent = msg;
        travellerResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (travellerWhatsApp) {
        const waText = `Hi Adham's Auto World, I want to book Travellers/Airbus.\nSeat range: ${data.travellerSeats}\nFrom: ${data.travellerStartLocation}\nTo: ${data.travellerEndLocation}\nDate: ${data.travellerEventDate}\nPickup time: ${data.travellerPickupTime}\nDuration: ${hours} hour(s).`;
        travellerWhatsApp.href = waHref(waText);
        travellerWhatsApp.hidden = false;
      }
    });
  }

  if (driverForm) {
    $all("#driverForm input, #driverForm select").forEach((el) => {
      el.addEventListener("input", () => clearFieldError(el.name, driverForm));
      el.addEventListener("change", () => clearFieldError(el.name, driverForm));
    });

    driverForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (driverResult) driverResult.textContent = "";
      if (driverWhatsApp) driverWhatsApp.hidden = true;
      clearFormErrors(driverForm);

      const data = Object.fromEntries(new FormData(driverForm).entries());
      const errors = {};

      if (!(data.driverFullName || "").trim()) errors.driverFullName = "Please enter your full name.";
      if (!data.driverPhone) errors.driverPhone = "Please enter your phone number.";
      const phoneErr = validatePhoneField(data.driverPhone);
      if (!errors.driverPhone && phoneErr) errors.driverPhone = phoneErr;

      if (!(data.driverStartLocation || "").trim()) errors.driverStartLocation = "Please enter pickup location.";
      if (!(data.driverEndLocation || "").trim()) errors.driverEndLocation = "Please enter drop location.";

      const days = Number(String(data.driverDays ?? "").trim());
      if (!Number.isFinite(days) || days <= 0) errors.driverDays = "Please enter number of days.";

      const distanceKm = Number(String(data.driverDistanceKm ?? "").trim());
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) errors.driverDistanceKm = "Please enter distance in KM.";

      const errorEntries = Object.entries(errors);
      if (errorEntries.length > 0) {
        errorEntries.forEach(([name, msg]) => setFieldError(name, msg, driverForm));
        const first = driverForm.querySelector('[aria-invalid="true"]');
        first?.focus();
        return;
      }

      const note = (data.driverVehicleNote || "").trim();
      const msg = [
        "Request received.",
        `Private chauffeur booking: ${days} day(s), ${distanceKm} km.`,
        note ? `Vehicle note: ${note}.` : "",
        `Route: ${data.driverStartLocation} → ${data.driverEndLocation}.`,
        `We’ll contact you at ${normalizePhone(data.driverPhone)} shortly.`,
      ]
        .filter(Boolean)
        .join(" ");

      if (driverResult) {
        driverResult.textContent = msg;
        driverResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (driverWhatsApp) {
        const waText = `Hi Adham's Auto World, I want to book a private Chauffeur/Driver.\nDays: ${days}\nDistance: ${distanceKm} km\nFrom: ${data.driverStartLocation}\nTo: ${data.driverEndLocation}\nVehicle note: ${note || "N/A"}`;
        driverWhatsApp.href = waHref(waText);
        driverWhatsApp.hidden = false;
      }
    });
  }
}

function setupRevealMotion() {
  const targets = $all(".section");
  if (!targets.length) return;

  targets.forEach((el) => el.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
  );

  targets.forEach((el) => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupFlow();
  setupServiceTabs();
  setupServiceForms();
  setupRevealMotion();
});
