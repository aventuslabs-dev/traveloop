// Seeds a runnable Urban Sprint campaign: categories, boosters, teams,
// stations and one account per role.
//
//   node supabase/seed-urban-sprint.mjs
//
// Run supabase/urban-sprint-schema.sql first. Safe to re-run: rows are matched
// on their natural key and updated rather than duplicated, and existing
// accounts have their password reset rather than being recreated.
//
// Passwords come from URBAN_SPRINT_SEED_PASSWORD (default "sprint2026"). These
// are demo credentials — change them, or delete the accounts, before a real
// event.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  } catch {
    // .env.local not found — rely on already-exported env vars.
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.URBAN_SPRINT_SEED_PASSWORD ?? "sprint2026";

if (!url || !serviceRoleKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local).");
  process.exit(1);
}

const db = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

function fail(label, error) {
  console.error(`${label}:`, error.message ?? error);
  process.exit(1);
}

/* ------------------------------- Categories ------------------------------- */

const CATEGORIES = [
  { name: "Food & Beverage", slug: "food-beverage", color: "#ff8a3d", sort_order: 1 },
  { name: "Retail", slug: "retail", color: "#3da5ff", sort_order: 2 },
  { name: "Beauty & Wellness", slug: "beauty-wellness", color: "#ff5c9d", sort_order: 3 },
  { name: "Arts & Culture", slug: "arts-culture", color: "#7c5cff", sort_order: 4 },
];

const { error: categoryError } = await db
  .from("us_categories")
  .upsert(CATEGORIES, { onConflict: "slug" });
if (categoryError) fail("Categories", categoryError);

const { data: categories } = await db.from("us_categories").select("id, slug");
const categoryId = Object.fromEntries(categories.map((row) => [row.slug, row.id]));
console.log(`Categories: ${categories.length}`);

/* -------------------------------- Boosters -------------------------------- */

const BOOSTERS = [
  {
    name: "Food Booster",
    slug: "food-beverage",
    bonus_percent: 25,
    description: "Every cafe, kopitiam and hawker stall pays more.",
  },
  {
    name: "Retail Booster",
    slug: "retail",
    bonus_percent: 25,
    description: "Shopfronts and boutiques are worth the detour.",
  },
  {
    name: "Glow Booster",
    slug: "beauty-wellness",
    bonus_percent: 30,
    description: "Salons and wellness stops pay the biggest bonus in the deck.",
  },
  {
    name: "Culture Booster",
    slug: "arts-culture",
    bonus_percent: 20,
    description: "Galleries, museums and heritage stops.",
  },
];

for (const booster of BOOSTERS) {
  const { data: existing } = await db
    .from("us_boosters")
    .select("id")
    .eq("name", booster.name)
    .maybeSingle();

  const row = {
    name: booster.name,
    category_id: categoryId[booster.slug],
    bonus_percent: booster.bonus_percent,
    description: booster.description,
    active: true,
  };

  const { error } = existing
    ? await db.from("us_boosters").update(row).eq("id", existing.id)
    : await db.from("us_boosters").insert(row);

  if (error) fail(`Booster ${booster.name}`, error);
}
console.log(`Boosters: ${BOOSTERS.length}`);

/* --------------------------------- Teams ---------------------------------- */

const TEAMS = [
  { name: "Night Owls", slug: "night-owls", color: "#ff4d1c" },
  { name: "Street Cats", slug: "street-cats", color: "#3da5ff" },
  { name: "Monsoon Crew", slug: "monsoon-crew", color: "#21d47f" },
  { name: "Lantern Squad", slug: "lantern-squad", color: "#ffc94d" },
  { name: "Harbour Rats", slug: "harbour-rats", color: "#7c5cff" },
  { name: "Kopi Kings", slug: "kopi-kings", color: "#ff5c9d" },
];

const { error: teamError } = await db
  .from("us_teams")
  .upsert(
    TEAMS.map((team) => ({ ...team, active: true })),
    { onConflict: "slug", ignoreDuplicates: true }
  );
if (teamError) fail("Teams", teamError);

console.log(`Teams: ${TEAMS.length}`);

/* -------------------------------- Stations -------------------------------- */

const STATIONS = [
  ["ABC Cafe", "ABC Coffee House", "food-beverage", "12 Lebuh Armenian, George Town", "Order the house kopi and get a stamp from the barista.", 30],
  ["Toh Soon Alley", "Toh Soon Cafe", "food-beverage", "Lebuh Campbell alley, George Town", "Find the charcoal toast stall and photograph the team with the owner.", 35],
  ["Chulia Night Bites", "Chulia Street Hawkers", "food-beverage", "Lebuh Chulia, George Town", "Split one plate of char kway teow between the whole team.", 25],
  ["Batik & Co", "Batik & Company", "retail", "44 Lebuh Pantai, George Town", "Pick out the loudest shirt in the shop and try it on.", 30],
  ["The Tin Shop", "Penang Tin Craft", "retail", "8 Lebuh Light, George Town", "Ask the shopkeeper what tin was mined for and repeat it back.", 30],
  ["Kaki Lima Books", "Kaki Lima Bookstore", "retail", "19 Lebuh Acheh, George Town", "Find a book about Penang published before 2000.", 35],
  ["Rehat Spa", "Rehat Wellness", "beauty-wellness", "6 Jalan Sultan Ahmad Shah", "One team member takes a five-minute shoulder massage.", 40],
  ["Gunting Barber", "Gunting Traditional Barber", "beauty-wellness", "77 Lebuh Kimberley", "Get a hot towel shave, or talk your way out of one.", 30],
  ["Khoo Kongsi", "Khoo Kongsi Clan House", "arts-culture", "18 Cannon Square, George Town", "Count the dragons on the roof and report the number.", 40],
  ["Street Art Wall", "Mirrors George Town", "arts-culture", "Lebuh Armenian wall mural", "Recreate the mural pose as a team.", 25],
  ["Peranakan House", "Pinang Peranakan Mansion", "arts-culture", "29 Church Street", "Name one object in the front room and what it was used for.", 45],
  ["Chew Jetty", "Chew Jetty Waterfront", "arts-culture", "Pengkalan Weld, George Town", "Walk to the end of the jetty together.", 35],
];

for (const [name, business, slug, address, instructions, basePoints] of STATIONS) {
  const { data: existing } = await db
    .from("us_stations")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  const row = {
    name,
    business_name: business,
    category_id: categoryId[slug],
    address,
    instructions,
    base_points: basePoints,
    active: true,
  };

  const { error } = existing
    ? await db.from("us_stations").update(row).eq("id", existing.id)
    : await db.from("us_stations").insert(row);

  if (error) fail(`Station ${name}`, error);
}
console.log(`Stations: ${STATIONS.length}`);

/* --------------------------------- People --------------------------------- */

// Gamemasters only. No admin: the Traveloop admin login (ADMIN_LOGIN_EMAIL) is
// the Urban Sprint admin too. No racers: they don't sign in — a booked team
// follows its race from its private link.
const PEOPLE = [
  { email: "gm1@urbansprint.test", role: "gamemaster", name: "Aisyah Rahim" },
  { email: "gm2@urbansprint.test", role: "gamemaster", name: "Daniel Ooi" },
  { email: "gm3@urbansprint.test", role: "gamemaster", name: "Priya Nair" },
];

// One listUsers() call rather than one lookup per person.
const { data: authList, error: listError } = await db.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) fail("Listing users", listError);

const existingByEmail = new Map(authList.users.map((user) => [user.email, user.id]));

for (const person of PEOPLE) {
  let userId = existingByEmail.get(person.email);

  if (userId) {
    const { error } = await db.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) fail(`Updating ${person.email}`, error);
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
    });
    if (error) fail(`Creating ${person.email}`, error);
    userId = data.user.id;
  }

  const { error: profileError } = await db.from("us_profiles").upsert(
    {
      user_id: userId,
      role: person.role,
      display_name: person.name,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (profileError) fail(`Profile for ${person.email}`, profileError);
}

console.log(`People: ${PEOPLE.length}`);

/* -------------------------------- Settings -------------------------------- */

const { error: settingsError } = await db
  .from("us_settings")
  .update({
    event_name: "Urban Sprint",
    event_tagline: "One city. Six teams. Three hours on the clock.",
    event_status: "live",
    event_location: "George Town, Penang",
    default_base_points: 30,
    updated_at: new Date().toISOString(),
  })
  .eq("id", 1);
if (settingsError) fail("Settings", settingsError);

console.log("");
console.log("Urban Sprint seeded. Sign in at /urban-sprint/login:");
console.log("  Admin        the Traveloop admin login (ID \"admin\")");
console.log(`  Gamemaster   gm1@urbansprint.test / ${password}`);
