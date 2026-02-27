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
for (const feature of geojson.features) {
    if (!feature.geometry) continue;

    const islandName = feature.properties?.islandName || 'Unknown';

    // Turf bbox calculates [minX, minY, maxX, maxY]
    const box = bbox.default ? bbox.default(feature) : bbox(feature);

    boxesMap[islandName] = {
        minX: box[0],
        minY: box[1],
        maxX: box[2],
        maxY: box[3],
        // Save the properties we actually care about so we don't have to keep a mapping to Island.json
        islandName: islandName,
        atoll: feature.properties?.atoll || '',
        category: feature.properties?.category || ''
    };
    i++;
}

console.log(`Calculated ${i} Bounding Boxes.`);

// Write the much smaller, flat JSON file
fs.writeFileSync(outputPath, JSON.stringify(boxesMap, null, 2));

console.log(`Successfully saved spatial index to public/IslandBoxes.json`);
