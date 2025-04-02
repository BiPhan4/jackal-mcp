import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'text_store.db');

// Initialize database
async function initializeDb() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create the texts table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS texts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      filename TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

// Save text content
export async function saveText(content: string, filename: string) {
  const db = await initializeDb();
  try {
    const result = await db.run(
      'INSERT INTO texts (content, filename) VALUES (?, ?)',
      [content, filename]
    );
    return { success: true, id: result.lastID };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Get text by ID
export async function getText(id: number) {
  const db = await initializeDb();
  try {
    const text = await db.get('SELECT * FROM texts WHERE id = ?', [id]);
    return text;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Get all texts
export async function getAllTexts() {
  const db = await initializeDb();
  try {
    const texts = await db.all('SELECT * FROM texts ORDER BY created_at DESC');
    return texts;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Delete text by ID
export async function deleteText(id: number) {
  const db = await initializeDb();
  try {
    await db.run('DELETE FROM texts WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await db.close();
  }
} 