import * as fs from 'fs';
import * as path from 'path';
import { calculateDynamicMonth } from './src/core/engine';
import * as dotenv from 'dotenv';
dotenv.config();

async function rebuildPastMonths() {
    console.log("Rebuilding closures from Jan 2026 to May 2026 to include all active roster members...");
    const year = 2026;
    for (let month = 1; month <= 5; month++) {
        console.log(`Building ${year}-${month.toString().padStart(2, '0')}...`);
        const results = await calculateDynamicMonth(year, month);
        
        const dir = path.join(__dirname, 'src/core/snapshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const file = path.join(dir, `cierre_${year}_${month.toString().padStart(2, '0')}.json`);
        fs.writeFileSync(file, JSON.stringify(results, null, 2), 'utf8');
        console.log(`Saved ${results.length} commercials to ${file}`);
    }
    console.log("Finished rebuilding closures!");
}

rebuildPastMonths().catch(console.error);
