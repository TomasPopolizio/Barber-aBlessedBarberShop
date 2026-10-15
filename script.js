/* ============================================================
   Blessed Barber Shop — reservas
   Editá CONFIG para cambiar servicios, precios y horarios.
   ============================================================ */
const CONFIG = {
  whatsapp: "5491123563376", // 011 2356-3376
  address: "Lavalle 575, CABA",
  slotMinutes: 30,
  daysAhead: 21,
  // 0 = domingo … 6 = sábado. null = cerrado
  hours: {
    0: null,
    1: ["10:00", "20:30"],
    2: ["10:00", "20:30"],
    3: ["10:00", "20:30"],
    4: ["10:00", "20:30"],
    5: ["10:00", "20:30"],
    6: ["10:00", "20:30"],
  },
  services: [
    { id: "corte", name: "Corte", desc: "Asesoría + corte adaptado a tu cabeza", minutes: 30, price: 14000 },
    { id: "corte-barba", name: "Corte + barba", desc: "Corte completo, perfilado y toalla caliente", minutes: 60, price: 16000 },
    { id: "barba", name: "Barba", desc: "Perfilado, rebaje y terminación a navaja", minutes: 30, price: 9000 },
    { id: "corte-lavado", name: "Corte + lavado", desc: "Corte con champú y acondicionador", minutes: 45, price: 15000 },
    { id: "fade", name: "Fade / degradé", desc: "Degradé a máquina con detalle a navaja", minutes: 45, price: 15000 },
  ],
};

const REVIEWS = [
  { text: "Increíble atención y muy buenos cortes. Adaptan el corte a las medidas de tu cráneo.", author: "Ignacio C." },
  { text: "Peluquera muy profesional, concienzuda y atenta. ¡Recomiendo!", author: "Julien L." },
  { text: "Muy prolijo y muy buena onda los pibes 🤙🏾", author: "Cmv B." },
  { text: "No doubt the best barbershop in Buenos Aires.", author: "Nico S." },
  { text: "La mejor atención y el mejor estilo ✨ te cambian el aura totalmente.", author: "Viviana S." },
  { text: "Without waiting, good haircuts.", author: "Tomáš H." },
  { text: "Excelente servicio.", author: "Santiago" },
  { text: "Even though I don't speak Spanish, we managed to agree on a haircut. 10/10.", author: "Google review" },
  { text: "Gran acogida, gran corte de pelo, ¡lo recomiendo!", author: "Anthony M." },
];

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const STORE_KEY = "blessed.bookings";

const $ = (s) => document.querySelector(s);
const money = (n) => "$" + n.toLocaleString("es-AR");
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const state = { service: null, date: null, time: null };

/* ---------- Almacenamiento local (demo sin backend) ---------- */
function loadBookings() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveBooking(b) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...loadBookings(), b])); } catch { /* sin storage */ }
}
// Intervalos ocupados [inicio, fin) en minutos para un día
function busyRanges(key) {
  return loadBookings().filter((b) => b.date === key).map((b) => [toMin(b.time), toMin(b.time) + b.minutes]);
}

/* ---------- Estado abierto / cerrado ---------- */
function renderStatus() {
  const now = new Date();
  const h = CONFIG.hours[now.getDay()];
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = h && mins >= toMin(h[0]) && mins < toMin(h[1]);
  $("#statusDot").classList.toggle("open", !!open);
  $("#statusText").textContent = open
    ? `Abierto ahora · cierra ${h[1]} hs`
    : "Cerrado ahora · reservá para después";
}

/* ---------- Paso 1: servicios ---------- */
function renderServices() {
  const wrap = $("#services");
  wrap.innerHTML = "";
  CONFIG.services.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "service";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", state.service?.id === s.id);
    b.innerHTML = `
      <span><span class="service-name">${s.name}</span><span class="service-desc">${s.desc}</span></span>
      <span class="service-dur">${s.minutes} min</span>
      <span class="service-price">${money(s.price)}</span>`;
    b.addEventListener("click", () => {
      state.service = s;
      state.time = null; // la duración cambia la disponibilidad
      renderServices();
      renderSlots();
      update();
    });
    wrap.appendChild(b);
  });
}

/* ---------- Paso 2: días ---------- */
function renderDays() {
  const wrap = $("#days");
  wrap.innerHTML = "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < CONFIG.daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const closed = !CONFIG.hours[d.getDay()];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "day";
    b.setAttribute("role", "radio");
    b.dataset.key = dateKey(d);
    b.disabled = closed || (i === 0 && !hasFutureSlots(d));
    b.setAttribute("aria-checked", state.date && dateKey(state.date) === b.dataset.key);
    b.setAttribute("aria-label", `${DAY_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}${closed ? ", cerrado" : ""}`);
    b.innerHTML = `<small>${i === 0 ? "Hoy" : DAY_SHORT[d.getDay()]}</small><strong>${d.getDate()}</strong>`;
    b.addEventListener("click", () => {
      state.date = d;
      state.time = null;
      wrap.querySelectorAll(".day").forEach((x) => x.setAttribute("aria-checked", x === b));
      $("#monthLabel").textContent = `· ${MONTHS[d.getMonth()]}`;
      renderSlots();
      update();
    });
    wrap.appendChild(b);
  }
}

function hasFutureSlots(d) {
  const h = CONFIG.hours[d.getDay()];
  if (!h) return false;
  const now = new Date();
  return toMin(h[1]) - 30 > now.getHours() * 60 + now.getMinutes();
}

document.querySelectorAll(".scroll-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    $("#days").scrollBy({ left: Number(btn.dataset.dir) * 300, behavior: "smooth" });
  })
);

/* ---------- Paso 3: horarios ---------- */
function renderSlots() {
  const wrap = $("#slots");
  if (!state.date) return;
  const h = CONFIG.hours[state.date.getDay()];
  const key = dateKey(state.date);
  const dur = state.service?.minutes ?? CONFIG.slotMinutes;
  const busy = busyRanges(key);
  const now = new Date();
  const isToday = key === dateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  wrap.innerHTML = "";
  let lastGroup = "";
  let available = 0;
  for (let t = toMin(h[0]); t + dur <= toMin(h[1]); t += CONFIG.slotMinutes) {
    const group = t < 13 * 60 ? "Mañana" : t < 17 * 60 ? "Tarde" : "Noche";
    if (group !== lastGroup) {
      const g = document.createElement("span");
      g.className = "slot-group";
      g.textContent = group;
      wrap.appendChild(g);
      lastGroup = group;
    }
    const taken = busy.some(([a, b]) => t < b && t + dur > a);
    const past = isToday && t <= nowMin + 15;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slot";
    b.setAttribute("role", "radio");
    b.textContent = toHHMM(t);
    b.disabled = taken || past;
    if (!b.disabled) available++;
    b.setAttribute("aria-checked", state.time === toHHMM(t));
    b.addEventListener("click", () => {
      state.time = toHHMM(t);
      wrap.querySelectorAll(".slot").forEach((x) => x.setAttribute("aria-checked", x === b));
      update();
      if (window.matchMedia("(max-width: 960px)").matches) {
        $('[data-step="4"]').scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    wrap.appendChild(b);
  }
  if (!available) {
    wrap.innerHTML = `<p class="muted small">No quedan horarios para este día. Probá con otro.</p>`;
  }
}

/* ---------- Resumen / validación ---------- */
const nameEl = $("#name");
const phoneEl = $("#phone");
const validPhone = (v) => v.replace(/\D/g, "").length >= 8;

function update() {
  const { service, date, time } = state;
  const name = nameEl.value.trim();
  const phoneOk = validPhone(phoneEl.value);

  // pasos
  const done = [!!service, !!date, !!time, name.length > 1 && phoneOk];
  // cada paso se habilita cuando los anteriores están completos
  document.querySelectorAll(".step").forEach((el, i) => {
    el.classList.toggle("done", done[i]);
    el.classList.toggle("locked", !done.slice(0, i).every(Boolean));
  });

  $("#tService").textContent = service ? service.name : "—";
  $("#tDay").textContent = date ? `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}` : "—";
  $("#tTime").textContent = time ? `${time} hs` : "—";
  $("#tDur").textContent = service ? `${service.minutes} min` : "—";
  document.querySelectorAll(".ticket-rows dd").forEach((dd) => dd.classList.toggle("empty", dd.textContent === "—"));
  $("#tPrice").textContent = money(service ? service.price : 0);

  const ready = done.every(Boolean);
  $("#confirmBtn").disabled = !ready;
  $("#hint").textContent = !service ? "Elegí un servicio para empezar."
    : !date ? "Ahora elegí el día."
    : !time ? "Elegí un horario."
    : !ready ? "Completá tu nombre y WhatsApp."
    : "Todo listo. Pago en el local.";
}

[nameEl, phoneEl].forEach((el) => el.addEventListener("input", () => { el.classList.remove("invalid"); update(); }));

/* ---------- Confirmación ---------- */
let lastBooking = null;

$("#bookingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (nameEl.value.trim().length < 2) { nameEl.classList.add("invalid"); nameEl.focus(); return; }
  if (!validPhone(phoneEl.value)) { phoneEl.classList.add("invalid"); phoneEl.focus(); return; }
  if (!state.service || !state.date || !state.time) return;

  const booking = {
    code: Math.random().toString(36).slice(2, 7).toUpperCase(),
    service: state.service.name,
    minutes: state.service.minutes,
    price: state.service.price,
    date: dateKey(state.date),
    time: state.time,
    name: nameEl.value.trim(),
    phone: phoneEl.value.trim(),
    note: $("#note").value.trim(),
  };
  saveBooking(booking);
  lastBooking = booking;

  const d = state.date;
  const when = `${DAY_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} a las ${booking.time} hs`;
  $("#modalText").textContent = `${booking.name}, te esperamos el ${when} para ${booking.service.toLowerCase()}.`;
  $("#modalCode").textContent = booking.code;

  const msg = [
    `Hola Blessed! Quiero confirmar mi turno 💈`,
    `• ${booking.service} (${money(booking.price)})`,
    `• ${when}`,
    `• Nombre: ${booking.name}`,
    `• Tel: ${booking.phone}`,
    booking.note ? `• Nota: ${booking.note}` : "",
    `Código: ${booking.code}`,
  ].filter(Boolean).join("\n");
  $("#waBtn").href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

  $("#modal").showModal();
});

$("#closeModal").addEventListener("click", () => $("#modal").close());
$("#modal").addEventListener("close", resetBooking);
$("#modal").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

function resetBooking() {
  state.service = null;
  state.date = null;
  state.time = null;
  $("#bookingForm").reset();
  $("#monthLabel").textContent = "";
  $("#slots").innerHTML = `<p class="muted small">Elegí un día para ver los horarios.</p>`;
  renderServices();
  renderDays();
  update();
}

/* ---------- Archivo .ics para el calendario ---------- */
$("#icsBtn").addEventListener("click", () => {
  if (!lastBooking) return;
  const b = lastBooking;
  const [y, m, d] = b.date.split("-");
  const start = `${y}${m}${d}T${b.time.replace(":", "")}00`;
  const end = `${y}${m}${d}T${toHHMM(toMin(b.time) + b.minutes).replace(":", "")}00`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Blessed Barber Shop//Turnos//ES",
    "BEGIN:VEVENT",
    `UID:${b.code}@blessedbarbershop`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=America/Argentina/Buenos_Aires:${start}`,
    `DTEND;TZID=America/Argentina/Buenos_Aires:${end}`,
    `SUMMARY:${b.service} · Blessed Barber Shop`,
    `LOCATION:${CONFIG.address}`,
    `DESCRIPTION:Código ${b.code}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `turno-blessed-${b.code}.ics` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* ---------- Opiniones ---------- */
function renderReviews() {
  const track = $("#marquee");
  const card = (r) => `
    <article class="review">
      <blockquote>“${r.text}”</blockquote>
      <footer><span>${r.author}</span><span class="stars">★★★★★</span></footer>
    </article>`;
  // duplicado para el loop infinito
  track.innerHTML = REVIEWS.map(card).join("") + REVIEWS.map(card).join("").replaceAll("<article", '<article aria-hidden="true"');
}

/* ---------- Horarios ---------- */
function renderHours() {
  const today = new Date().getDay();
  $("#hours").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((i) => {
    const h = CONFIG.hours[i];
    return `<li class="${i === today ? "today" : ""}"><span>${DAY_LONG[i]}</span><span>${h ? `${h[0]} – ${h[1]}` : "Cerrado"}</span></li>`;
  }).join("");
}

/* ---------- Init ---------- */
$("#year").textContent = new Date().getFullYear();
renderStatus();
setInterval(renderStatus, 60_000);
renderServices();
renderDays();
renderReviews();
renderHours();
update();
