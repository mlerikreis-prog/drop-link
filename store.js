const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { supabaseAdmin } = require("./config/supabase");

const dataDir = path.resolve(__dirname, "../../data");
const dataFile = path.join(dataDir, "db.json");

const emptyDb = {
  products: [],
  suppliers: [],
  customers: [],
  orders: []
};

function ensureLocalDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(emptyDb, null, 2));
  }
}

function readLocal() {
  ensureLocalDb();
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function writeLocal(db) {
  ensureLocalDb();
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

function uuid() {
  return crypto.randomUUID();
}

function timestamp() {
  return new Date().toISOString();
}

async function list(resource) {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from(resource)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return readLocal()[resource] || [];
}

async function get(resource, id) {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from(resource)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  return (readLocal()[resource] || []).find(x => x.id === id) || null;
}

async function create(resource, payload) {
  const record = { id: uuid(), created_at: timestamp(), updated_at: timestamp(), ...payload };
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(resource).insert(record).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  db[resource].unshift(record);
  writeLocal(db);
  return record;
}

async function update(resource, id, payload) {
  const changes = { ...payload, updated_at: timestamp() };
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from(resource).update(changes).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const index = db[resource].findIndex(x => x.id === id);
  if (index < 0) return null;
  db[resource][index] = { ...db[resource][index], ...changes };
  writeLocal(db);
  return db[resource][index];
}

async function remove(resource, id) {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from(resource).delete().eq("id", id);
    if (error) throw error;
    return true;
  }
  const db = readLocal();
  const before = db[resource].length;
  db[resource] = db[resource].filter(x => x.id !== id);
  writeLocal(db);
  return db[resource].length !== before;
}

module.exports = { list, get, create, update, remove };
