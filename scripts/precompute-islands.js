import fs from 'fs';
import bbox from '@turf/bbox';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputPath = path.join(__dirname, '../public/Island.json');
const outputPath = path.join(__dirname, '../public/IslandBoxes.json');

console.log('Loading Island.json...');
const geojsonRaw = fs.readFileSync(inputPath, 'utf8');
const geojson = JSON.parse(geojsonRaw);

console.log(`Processing ${geojson.features.length} features...`);

const boxesMap = {};

let i = 0;
let skipped = 0;
for (const feature of geojson.features) {
    if (!feature.geometry) continue;

    const islandName = feature.properties?.islandName || '';
    const atoll = feature.properties?.atoll || '';

    // Skip features with no island name
    if (!islandName) {
        skipped++;
        continue;
    }

    // Use composite key "Atoll::IslandName" to avoid collisions
    // e.g. "Kaafu::Funadhoo" vs "Shaviyani::Funadhoo"
    const key = atoll ? `${atoll}::${islandName}` : islandName;

    // Turf bbox calculates [minX, minY, maxX, maxY]
    const box = bbox.default ? bbox.default(feature) : bbox(feature);

    boxesMap[key] = {
        minX: box[0],
        minY: box[1],
        maxX: box[2],
        maxY: box[3],
        islandName: islandName,
        atoll: atoll,
        category: feature.properties?.category || ''
    };
    i++;
}

console.log(`Calculated ${i} Bounding Boxes. Skipped ${skipped} features with no island name.`);
console.log(`Total unique keys: ${Object.keys(boxesMap).length}`);

// Write the much smaller, flat JSON file
fs.writeFileSync(outputPath, JSON.stringify(boxesMap, null, 2));

console.log(`Successfully saved spatial index to public/IslandBoxes.json`);
