// Config, seed data, and ordering

const moduleOrder = [
  "greetings",
  "numbers",
  "smalltalk",
  "bangalore-slangs",
  "eating",
  "directions",
  "shopping",
  "home",
  "family",
];

// Minimal seed modules from index.html
const seedModules = [
  { id: "greetings", title: "Greetings & Introductions", icon: "dY`<", phrases: [ { id: 1, en: "Hello", kn: "Namaskara", translit: "na-mas-ka-ra" } ] },
  { id: "numbers", title: "Numbers & Time", icon: "dY\"�", phrases: [ { id: 51, en: "One", kn: "Ondu", translit: "on-du" } ] },
  { id: "directions", title: "Directions & Transport", icon: "dYs�", phrases: [ { id: 101, en: "Where is...?", kn: "... ellide?", translit: "el-li-de" } ] },
  { id: "eating", title: "Eating Out", icon: "dY?��,?", phrases: [ { id: 151, en: "Restaurant", kn: "Upahara gruha", translit: "u-pa-haa-ra gru-ha" } ] },
  { id: "shopping", title: "Shopping & Money", icon: "dY>?�,?", phrases: [ { id: 201, en: "How much is this?", kn: "Idara bele eshtu?", translit: "i-da-ra be-le esh-tu" } ] },
  { id: "home", title: "At Home & Chores", icon: "dY?�", phrases: [ { id: 251, en: "House", kn: "Mane", translit: "ma-ne" } ] },
  { id: "smalltalk", title: "Social Small Talk", icon: "dY'�", phrases: [ { id: 301, en: "How was your day?", kn: "Nimma dina hegittu?", translit: "nim-ma di-na he-git-tu" } ] },
  { id: "family", title: "Family & Relationships", icon: "dY`\"�??dY`c�??dY`\u0015�??dY`�", phrases: [ { id: 351, en: "Family", kn: "Kutumba", translit: "ku-tum-ba" } ] },
];

// Google TTS API Key sourced from runtime config (if provided)
const configScope = typeof window !== 'undefined' ? window : globalThis;
const runtimeConfig = (configScope && configScope.__APP_CONFIG__) || {};
const GOOGLE_API_KEY =
  typeof runtimeConfig.googleTtsKey === 'string' ? runtimeConfig.googleTtsKey : '';

export { moduleOrder, seedModules, GOOGLE_API_KEY };

