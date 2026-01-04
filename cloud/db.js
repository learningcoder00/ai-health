/**
 * SQLite storage layer for cloud-server.js
 *
 * Requires dependency: better-sqlite3
 *   npm i better-sqlite3
 *
 * Env:
 * - CLOUD_DB_PATH=./cloud-data/cloud.db
 */

const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.CLOUD_DB_PATH || path.join(__dirname, '..', 'cloud-data', 'cloud.db');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function openDb() {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const Database = require('better-sqlite3');
  ensureDir(path.dirname(DB_PATH));
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

const db = openDb();

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_data (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_json TEXT,
  snapshot_json TEXT,
  updated_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1
);
`);

const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtGetUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const stmtInsertUser = db.prepare(
  'INSERT INTO users (id, email, name, pass_hash, pass_salt, created_at) VALUES (@id, @email, @name, @passHash, @passSalt, @createdAt)'
);
const stmtUpdateUserName = db.prepare('UPDATE users SET name = ? WHERE id = ?');
const stmtUpdateUserPassword = db.prepare('UPDATE users SET pass_hash = ?, pass_salt = ? WHERE id = ?');
const stmtDeleteUserById = db.prepare('DELETE FROM users WHERE id = ?');

const stmtGetUserData = db.prepare('SELECT * FROM user_data WHERE user_id = ?');
const stmtInsertUserData = db.prepare(
  'INSERT INTO user_data (user_id, profile_json, snapshot_json, updated_at, revision) VALUES (?, ?, ?, ?, ?)'
);
const stmtUpdateUserData = db.prepare(
  'UPDATE user_data SET profile_json = ?, snapshot_json = ?, updated_at = ?, revision = ? WHERE user_id = ?'
);

function safeJsonParse(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

function getUserByEmail(email) {
  return stmtGetUserByEmail.get(email) || null;
}

function getUserById(id) {
  return stmtGetUserById.get(id) || null;
}

function createUser({ id, email, name, passHash, passSalt, createdAt }) {
  stmtInsertUser.run({ id, email, name, passHash, passSalt, createdAt });
  // init user_data
  stmtInsertUserData.run(
    id,
    JSON.stringify({ id, email, name }),
    JSON.stringify({}),
    new Date().toISOString(),
    1
  );
}

function updateUserName(id, name) {
  stmtUpdateUserName.run(name, id);
  const u = getUserById(id);
  const existing = stmtGetUserData.get(id);
  if (existing) {
    const profile = safeJsonParse(existing.profile_json, { id, email: u.email, name: u.name });
    profile.name = name;
    stmtUpdateUserData.run(
      JSON.stringify(profile),
      existing.snapshot_json,
      new Date().toISOString(),
      existing.revision || 1,
      id
    );
  }
}

function updateUserPassword(id, passHash, passSalt) {
  stmtUpdateUserPassword.run(passHash, passSalt, id);
}

function deleteUserById(id) {
  stmtDeleteUserById.run(id);
}

function getUserData(userId) {
  const row = stmtGetUserData.get(userId);
  if (!row) return { profile: null, snapshot: {}, updatedAt: null, revision: 1 };
  return {
    profile: safeJsonParse(row.profile_json, null),
    snapshot: safeJsonParse(row.snapshot_json, {}),
    updatedAt: row.updated_at || null,
    revision: row.revision || 1,
  };
}

function setUserData({ userId, profile, snapshot, updatedAt, revision }) {
  const existing = stmtGetUserData.get(userId);
  if (!existing) {
    stmtInsertUserData.run(
      userId,
      profile ? JSON.stringify(profile) : null,
      JSON.stringify(snapshot || {}),
      updatedAt || new Date().toISOString(),
      revision || 1
    );
    return;
  }
  stmtUpdateUserData.run(
    profile ? JSON.stringify(profile) : existing.profile_json,
    JSON.stringify(snapshot || {}),
    updatedAt || new Date().toISOString(),
    revision || existing.revision || 1,
    userId
  );
}

module.exports = {
  DB_PATH,
  getUserByEmail,
  getUserById,
  createUser,
  updateUserName,
  updateUserPassword,
  deleteUserById,
  getUserData,
  setUserData,
};


