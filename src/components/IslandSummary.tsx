import { useMemo, useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface IslandSummaryProps {
    data: any[];
}

interface IslandData {
    name: string;
    count: number;
    avgLat: number;
    avgLng: number;
    atoll: string;
}

interface IslandRef {
    name: string;
    atoll: string;
    lat: number;
    lng: number;
}

// Haversine formula to calculate distance between two coordinates in kilometers
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

export default function IslandSummary({ data }: IslandSummaryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [islandRefs, setIslandRefs] = useState<IslandRef[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchIslands() {
            try {
                // Fetch the island.csv file from public folder
                const response = await fetch('/island.csv');
                const text = await response.text();

                // Parse TSV/CSV format
                const lines = text.split('\n');
                const refs: IslandRef[] = [];

                // Skip header (assuming first line is header)
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // The uploaded file seems to be tab-separated based on previous snippets
                    // We split by standard CSV/TSV delimiters just in case
                    const columns = line.split(/\t|,/);

                    if (columns.length >= 5) {
                        const atoll = columns[1]?.trim();
                        const islandName = columns[2]?.trim();
                        const lng = parseFloat(columns[3]?.trim());
                        const lat = parseFloat(columns[4]?.trim());

                        if (islandName && !isNaN(lat) && !isNaN(lng)) {
                            refs.push({ name: islandName, atoll, lat, lng });
                        }
                    }
                }
                setIslandRefs(refs);
            } catch (error) {
                console.error("Failed to load island.csv reference data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchIslands();
    }, []);

    const summaryData = useMemo(() => {
        if (!islandRefs.length) return [];

        // Filter out items without valid coordinates first, to match map data
        const mapData = data.filter(
            (item) => item.latitude && item.longitude && !isNaN(Number(item.latitude)) && !isNaN(Number(item.longitude))
        );

        const islandMap = new Map<string, { count: number; sumLat: number; sumLng: number; atoll: string }>();

        mapData.forEach((item) => {
            const itemLat = Number(item.latitude);
            const itemLng = Number(item.longitude);

            // Find closest island in our reference data
            let closestIsland = islandRefs[0];
            let minDistance = Infinity;

            for (const ref of islandRefs) {
                const distance = getDistanceInKm(itemLat, itemLng, ref.lat, ref.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIsland = ref;
                }
            }

            // Only map to closest island if it's reasonably close (e.g. within 20km)
            // If it's too far, classify as "Unknown/Offshore"
            const islandKey = minDistance <= 20 ? closestIsland.name : 'Unknown/Offshore';
            const atollKey = minDistance <= 20 ? closestIsland.atoll : '';

            if (islandMap.has(islandKey)) {
                const current = islandMap.get(islandKey)!;
                current.count += 1;
                current.sumLat += itemLat;
                current.sumLng += itemLng;
            } else {
                islandMap.set(islandKey, { count: 1, sumLat: itemLat, sumLng: itemLng, atoll: atollKey });
            }
        });

        const result: IslandData[] = [];
        islandMap.forEach((val, name) => {
            result.push({
                name,
                atoll: val.atoll,
                count: val.count,
                avgLat: val.sumLat / val.count,
                avgLng: val.sumLng / val.count,
            });
        });

        // Sort by count descending
        return result.sort((a, b) => b.count - a.count);
    }, [data, islandRefs]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return summaryData;
        const lower = searchTerm.toLowerCase();
        return summaryData.filter(d =>
            d.name.toLowerCase().includes(lower) ||
            (d.atoll && d.atoll.toLowerCase().includes(lower))
        );
    }, [summaryData, searchTerm]);

    const totalItems = useMemo(() => summaryData.reduce((sum, item) => sum + item.count, 0), [summaryData]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-full bg-muted/10">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="animate-spin w-8 h-8 text-primary" />
                    <p>Loading island reference data...</p>
                </div>
            </div>
        );
    }

    if (summaryData.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 h-full bg-muted/10">
                <div className="text-center text-muted-foreground">
                    <p>No valid map data found to summarize against reference islands.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Island Summary</h2>
                    <p className="text-muted-foreground">
                        {summaryData.length} islands found, total of {totalItems} items placed.
                    </p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search islands..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium">Atoll</th>
                            <th className="px-6 py-3 font-medium">Island / Location Name</th>
                            <th className="px-6 py-3 font-medium text-right">Item Count</th>
                            <th className="px-6 py-3 font-medium text-right">Approx. Center (Lat, Lng)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((island, index) => (
                            <tr
                                key={island.name}
                                className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                    }`}
                            >
                                <td className="px-6 py-4 text-muted-foreground">{island.atoll}</td>
                                <td className="px-6 py-4 font-medium text-foreground">{island.name}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                                        {island.count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-muted-foreground font-mono text-xs">
                                    {island.avgLat.toFixed(5)}, {island.avgLng.toFixed(5)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        No islands match your search "{searchTerm}".
                    </div>
                )}
            </div>
        </div>
    );
}
