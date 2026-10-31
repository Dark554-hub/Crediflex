import { getOrCreateTodayCollection } from '../lib/collections.js';

async function run() {
  try {
    console.log("Calling getOrCreateTodayCollection()...");
    const result = await getOrCreateTodayCollection();
    console.log("Success! Items count:", result.items.length);
  } catch (err) {
    console.error("FAILED with error:", err);
  }
}

run();
