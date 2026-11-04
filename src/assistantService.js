const assistantEndpoint = import.meta.env?.VITE_ASSISTANT_API_URL?.trim() || "";
const MAX_HISTORY_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 600;

const DEFAULT_SUGGESTIONS = [
  "Գտիր մեքենա մինչև $15,000",
  "Ո՞ր էլեկտրական մեքենան է ինձ հարմար",
  "Ինչի՞ց է կազմվում գինը",
  "Որքա՞ն է տևում ներմուծումը",
];

function normalizeText(value) {
  return String(value || "")
    .toLocaleLowerCase("hy")
    .replace(/[՞՜՛]/g, "")
    .replace(/[։,.;:!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value, multiplier = "") {
  const parsed = Number(String(value || "").replace(/[\s,]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return multiplier.toLocaleLowerCase() === "k" ? parsed * 1000 : parsed;
}

function extractBudget(message) {
  const text = String(message || "");
  const patterns = [
    /\$\s*([\d][\d\s,.]*)(k)?/i,
    /([\d][\d\s,.]*)(k)?\s*(?:usd|դոլար)/i,
    /(?:մինչև|բյուջե(?:ս|ով)?|budget)\s*\$?\s*([\d][\d\s,.]*)(k)?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match ? parseNumber(match[1], match[2]) : null;
    if (value && value >= 4000 && value <= 500000) return Math.round(value);
  }
  const candidates = [...text.matchAll(/\b([\d][\d\s,]*)(k)?\b/gi)]
    .map((match) => parseNumber(match[1], match[2]))
    .filter((value) => value >= 4000 && value <= 500000);
  return candidates[0] || null;
}

function extractYears(message) {
  const text = String(message || "");
  const range = text.match(/\b((?:19|20)\d{2})\s*(?:-|–|—|ից\s*մինչև)\s*((?:19|20)\d{2})\b/i);
  if (range) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    return { min: Math.min(first, second), max: Math.max(first, second) };
  }
  const match = text.match(/\b((?:19|20)\d{2})\b/);
  if (!match) return { min: null, max: null };
  const year = Number(match[1]);
  if (new RegExp(`(?:մինչև|առավելագույնը|up to)\\s*${year}`, "i").test(text)) return { min: null, max: year };
  return { min: year, max: null };
}

function findMake(message, vehicles) {
  const normalized = normalizeText(message);
  return [...new Set(vehicles.map((vehicle) => vehicle.make).filter(Boolean))]
    .find((make) => normalized.includes(normalizeText(make))) || null;
}

function findFuel(message) {
  const normalized = normalizeText(message);
  if (/էլեկտր|electric|\bev\b/.test(normalized)) return "Էլեկտրական";
  if (/հիբրիդ|hybrid/.test(normalized)) return "Հիբրիդ";
  if (/դիզել|diesel/.test(normalized)) return "Դիզել";
  if (/բենզին|gasoline|petrol/.test(normalized)) return "Բենզին";
  return null;
}

function findBody(message) {
  const normalized = normalizeText(message);
  if (/քրոսովեր|crossover/.test(normalized)) return "քրոսովեր";
  if (/ամենագնաց|suv/.test(normalized)) return "ամենագնաց";
  if (/սեդան|sedan/.test(normalized)) return "սեդան";
  return null;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function publishedVehicles(vehicles) {
  return vehicles.filter((vehicle) => vehicle.status === "published");
}

function selectRecommendations(message, vehicles) {
  const inventory = publishedVehicles(vehicles);
  const budget = extractBudget(message);
  const years = extractYears(message);
  const make = findMake(message, inventory);
  const fuel = findFuel(message);
  const body = findBody(message);
  const hasCriteria = Boolean(budget || years.min || years.max || make || fuel || body);

  const matchesCriteria = (vehicle, includeBudget = true) => {
    if (includeBudget && budget && Number(vehicle.estimateMax) > budget) return false;
    if (years.min && Number(vehicle.year) < years.min) return false;
    if (years.max && Number(vehicle.year) > years.max) return false;
    if (make && vehicle.make !== make) return false;
    if (fuel && normalizeText(vehicle.fuel) !== normalizeText(fuel)) return false;
    if (body && !normalizeText(vehicle.body).includes(body)) return false;
    return true;
  };

  const sortCandidates = (items) => [...items].sort((left, right) => {
    if (Boolean(left.featured) !== Boolean(right.featured)) return left.featured ? -1 : 1;
    if (Number(left.year) !== Number(right.year)) return Number(right.year) - Number(left.year);
    return Number(left.estimateMax) - Number(right.estimateMax);
  });

  const exact = sortCandidates(inventory.filter((vehicle) => matchesCriteria(vehicle, true)));

  return {
    budget,
    yearMin: years.min,
    yearMax: years.max,
    make,
    fuel,
    body,
    hasCriteria,
    vehicles: exact.slice(0, 3),
  };
}

function recommendationReply(message, vehicles) {
  const result = selectRecommendations(message, vehicles);
  if (!result.hasCriteria) {
    return {
      text: "Որպեսզի ճիշտ տարբերակներ առաջարկեմ, նախ նշեք ձեր ամբողջական բյուջեն Հայաստանում։ Կարող եք գրել, օրինակ՝ «մինչև $20,000»։",
      vehicleIds: [],
      suggestions: ["Մինչև $15,000", "Մինչև $25,000", "Միայն էլեկտրական", "Խոսել մասնագետի հետ"],
      mode: "local-demo",
    };
  }

  const criteria = [
    result.budget ? `մինչև ${formatUsd(result.budget)}` : null,
    result.yearMin && result.yearMax ? `${result.yearMin}–${result.yearMax}թ․` : null,
    result.yearMin && !result.yearMax ? `${result.yearMin}թ․-ից նոր` : null,
    result.yearMax && !result.yearMin ? `մինչև ${result.yearMax}թ․` : null,
    result.make,
    result.fuel,
    result.body,
  ].filter(Boolean).join(" • ");

  if (!result.vehicles.length) {
    return {
      text: `${criteria || "Ձեր պահանջներին"} համապատասխան հրապարակված տարբերակ հիմա չկա։ Կարող եք փոխել չափանիշները կամ ուղարկել անհատական հարցում Hovex-ի մասնագետին։`,
      vehicleIds: [],
      suggestions: ["Մեծացնել բյուջեն", "Դիտել բոլոր մեքենաները", "Խոսել մասնագետի հետ"],
      mode: "local-demo",
    };
  }

  const lead = `${criteria} չափանիշներով գտա ${result.vehicles.length} համապատասխան ցուցադրական տարբերակ։`;

  return {
    text: `${lead} Գներն ու հասանելիությունը նախնական են․ վերջնական լոտը, VIN-ը և ամբողջական արժեքը հաստատում է Hovex-ի մասնագետը։`,
    vehicleIds: result.vehicles.map((vehicle) => vehicle.id),
    suggestions: result.fuel === "Էլեկտրական"
      ? ["Մինչև $30,000", "Ինչ է ներառում գինը", "Խոսել մասնագետի հետ"]
      : ["Միայն էլեկտրական", "Ինչ է ներառում գինը", "Խոսել մասնագետի հետ"],
    mode: "local-demo",
  };
}

function findFaqAnswer(message, faqs) {
  const normalized = normalizeText(message);
  const rules = [
    { test: /տև|ժամկետ|շաբաթ|առաքման ժամանակ/, index: 4 },
    { test: /գին|արժեք|ներառում|ծախս|մաքս/, index: /վերջնական/.test(normalized) ? 0 : /միջակայք|ինչու/.test(normalized) ? 2 : 1 },
    { test: /ստուգ|vin|վնաս|պատմություն/, index: 3 },
    { test: /գրանց|հաշիվ/, index: 5 },
  ];
  const rule = rules.find((item) => item.test.test(normalized));
  return rule ? faqs[rule.index]?.answer : null;
}

export function buildLocalAssistantReply({ message, vehicles = [], faqs = [] }) {
  const trimmed = String(message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
  const normalized = normalizeText(trimmed);
  const asksForVehicle = /մեքենա|տարբերակ|ընտր|առաջարկ|գտ|բյուջե|էլեկտր|սեդան|քրոսովեր|ամենագնաց|car|vehicle|recommend|budget/.test(normalized)
    || Boolean(extractBudget(trimmed) || findMake(trimmed, vehicles));

  if (/^(?:բարև|ողջույն|hello|hi|hey)(?:\s|$)/.test(normalized)) {
    return {
      text: "Բարև։ Ես Hovex-ի խելացի demo օգնականն եմ։ Կարող եմ ընտրել մեքենաներ ըստ բյուջեի, բացատրել ներմուծման ծախսերը կամ օգնել կապվել մասնագետի հետ։",
      vehicleIds: [],
      suggestions: DEFAULT_SUGGESTIONS,
      mode: "local-demo",
    };
  }

  if (/դրամ|\bamd\b|֏/.test(normalized)) {
    return {
      text: "Այս demo օգնականը live փոխարժեք չունի, ուստի դրամով բյուջեն չեմ փոխարկի ենթադրությամբ։ Նշեք մոտավոր բյուջեն ԱՄՆ դոլարով կամ ճշտեք ընթացիկ հաշվարկը Hovex-ի մասնագետի հետ։",
      vehicleIds: [],
      suggestions: ["Մինչև $15,000", "Մինչև $25,000", "Խոսել մասնագետի հետ"],
      mode: "local-demo",
    };
  }

  if (/(ներմուծ|առաք|աճուրդ)/.test(normalized) && /ինչպես|ընթացք|փուլ|գործընթաց/.test(normalized)) {
    return {
      text: "Ներմուծման հիմնական փուլերն են՝ պահանջների հստակեցում, մեքենայի և պատմության ստուգում, անվտանգ խաղադրույք կամ պատվեր, տեղափոխում, մաքսազերծում և հանձնում Հայաստանում։ Յուրաքանչյուր փուլում վերջնական տվյալները հաստատում է Hovex-ի մասնագետը։",
      vehicleIds: [],
      suggestions: ["Որքա՞ն է տևում ներմուծումը", "Ինչ է ներառում գինը", "Խոսել մասնագետի հետ"],
      mode: "local-demo",
    };
  }

  const explicitFaqQuestion = /վերջնական|ինչից է կազմ|ինչ է ներառում|միջակայք|ինչու|տև|ժամկետ|շաբաթ|ստուգ|\bvin\b|պարտադիր.*գրանց|մաքս/.test(normalized);
  const faqAnswer = explicitFaqQuestion ? findFaqAnswer(trimmed, faqs) : null;
  if (faqAnswer) {
    return {
      text: `${faqAnswer} Տվյալները նախնական են, իսկ կոնկրետ մեքենայի վերջնական հաշվարկը հաստատում է մասնագետը։`,
      vehicleIds: [],
      suggestions: ["Գտիր մեքենա մինչև $15,000", "Ինչ է ներառում գինը", "Խոսել մասնագետի հետ"],
      mode: "local-demo",
    };
  }

  if (asksForVehicle) return recommendationReply(trimmed, vehicles);

  return {
    text: "Կարող եմ օգնել երեք ուղղությամբ՝ ընտրել մեքենա ըստ բյուջեի, բացատրել ներմուծման ընթացքն ու ծախսերը կամ փոխանցել ձեզ Hovex-ի մասնագետին։ Ի՞նչն է հիմա ամենակարևորը։",
    vehicleIds: [],
    suggestions: DEFAULT_SUGGESTIONS,
    mode: "local-demo",
  };
}

function getSessionId() {
  if (typeof window === "undefined") return "server-session";
  const key = "hovex.assistant.session.v1";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
  window.sessionStorage.setItem(key, id);
  return id;
}

function compactVehicle(vehicle) {
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    body: vehicle.body,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    damage: vehicle.damage,
    auction: vehicle.auction,
    estimate_min: vehicle.estimateMin,
    estimate_max: vehicle.estimateMax,
    max_bid: vehicle.maxBid,
  };
}

function normalizeRemoteReply(payload, vehicles) {
  const message = payload?.message;
  const text = typeof message === "string"
    ? message
    : message?.text || payload?.reply || payload?.text;
  if (typeof text !== "string" || !text.trim()) throw new Error("Assistant response is missing text");
  const requestedIds = message?.suggested_vehicle_ids || payload?.vehicleIds || payload?.vehicle_ids || [];
  const publishedIds = new Set(publishedVehicles(vehicles).map((vehicle) => vehicle.id));
  const vehicleIds = Array.isArray(requestedIds) ? requestedIds.filter((id) => publishedIds.has(id)).slice(0, 3) : [];
  const rawSuggestions = message?.quick_replies || payload?.suggestions || [];
  const suggestions = Array.isArray(rawSuggestions)
    ? rawSuggestions.filter((item) => typeof item === "string" && item.trim()).slice(0, 4)
    : [];
  return { text: text.trim(), vehicleIds, suggestions, mode: "remote-ai" };
}

export function isRemoteAssistantConfigured() {
  return Boolean(assistantEndpoint);
}

export async function askAssistant({ message, history = [], vehicles = [], faqs = [], criteria = {}, comparedVehicleIds = [] }) {
  const trimmed = String(message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!trimmed) throw new Error("Message is required");
  if (!assistantEndpoint) return buildLocalAssistantReply({ message: trimmed, vehicles, faqs });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(assistantEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Request-Id": globalThis.crypto?.randomUUID?.() || `request-${Date.now()}` },
      body: JSON.stringify({
        client_session_id: getSessionId(),
        locale: "hy-AM",
        message: trimmed,
        history: history.slice(-MAX_HISTORY_MESSAGES).map((item) => ({ role: item.role, content: String(item.content || "").slice(0, MAX_MESSAGE_LENGTH) })),
        context: {
          route: window.location.pathname,
          filters: {
            budget: Number(criteria.budget) || null,
            year_from: Number(criteria.yearFrom) || null,
            year_to: Number(criteria.yearTo) || null,
            make: criteria.make || "all",
          },
          compared_vehicle_ids: comparedVehicleIds.slice(0, 3),
          vehicles: publishedVehicles(vehicles).slice(0, 50).map(compactVehicle),
        },
      }),
      signal: controller.signal,
      credentials: "omit",
    });
    if (!response.ok) throw new Error(`Assistant endpoint returned ${response.status}`);
    return normalizeRemoteReply(await response.json(), vehicles);
  } catch {
    return {
      ...buildLocalAssistantReply({ message: trimmed, vehicles, faqs }),
      mode: "local-fallback",
      notice: "AI կապը ժամանակավորապես հասանելի չէ, ուստի պատասխանը կազմվել է Hovex-ի տեղային տվյալներից։",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export { DEFAULT_SUGGESTIONS, MAX_MESSAGE_LENGTH };
