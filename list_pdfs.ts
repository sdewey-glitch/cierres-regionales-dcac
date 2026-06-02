import { listDriveFolders, listDriveFiles } from './src/api/drive';

async function main() {
    console.log("Listing Drive folders...");
    const years = await listDriveFolders('1ryE13Qo7C_DAknwFTZq9QWKUhkUOu4Oh');
    console.log("Years:", years);
    for (const year of years) {
        console.log(`Year folder: ${year.name} (id: ${year.id})`);
        const months = await listDriveFolders(year.id);
        for (const month of months.slice(0, 2)) {
            console.log(`  Month folder: ${month.name} (id: ${month.id})`);
            const files = await listDriveFiles(month.id);
            console.log(`    Files (first 3):`);
            for (const f of files.slice(0, 3)) {
                console.log(`      Name: "${f.name}" | ID: ${f.id}`);
            }
        }
    }
}

main().catch(console.error);
