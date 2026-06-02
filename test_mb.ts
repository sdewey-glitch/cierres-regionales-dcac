import { fetchCard, getMetabaseSession } from './src/api/metabase';

async function test() {
  try {
      const token = await getMetabaseSession();
      console.log("Fetching Card 249...");
      const data249 = await fetchCard(249, token);
      console.log("Card 249 rows:", data249.length);
  } catch (e: any) {
      console.error("Error 249:", e.message);
  }

  try {
      const token = await getMetabaseSession();
      console.log("Fetching Card 95...");
      const data95 = await fetchCard(95, token);
      console.log("Card 95 rows:", data95.length);
  } catch (e: any) {
      console.error("Error 95:", e.message);
  }
}
test();
