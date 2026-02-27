import { useMemo, useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import RBush from 'rbush';

interface IslandSummaryProps {
    data: any[];
    onNavigateToMap?: (latitude: number, longitude: number) => void;
}

interface IslandData {
    name: string;
    count: number;
    avgLat: number;
    avgLng: number;
    atoll: string;
    category: string;
}

interface IslandBoxMap {
    [key: string]: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        islandName: string;
        atoll: string;
        category: string;
    }
}

interface RBushItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    islandName: string;
}

export default function IslandSummary({ data, onNavigateToMap }: IslandSummaryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [islandFeatures, setIslandFeatures] = useState<Feature<Polygon | MultiPolygon, any>[]>([]);
    const [spatialIndex, setSpatialIndex] = useState<RBush<RBushItem> | null>(null);
    const [islandMeta, setIslandMeta] = useState<IslandBoxMap>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchIslands() {
            try {
                // Fetch the actual heavy GeoJSON polygons
                const geojsonPromise = fetch('/Island.json').then(res => res.json());
                // Fetch the lightweight pre-calculated bounding boxes
                const boxesPromise = fetch('/IslandBoxes.json').then(res => res.json());

                const [geojson, boxesMap] = await Promise.all([geojsonPromise, boxesPromise]);

                if (geojson && geojson.features) {
                    setIslandFeatures(geojson.features);
                }

                if (boxesMap) {
                    setIslandMeta(boxesMap);

                    // Populate the rbush spatial tree for instantaneous lookup
                    const tree = new RBush<RBushItem>();
                    const items: RBushItem[] = Object.values(boxesMap).map((box: any) => ({
                        minX: box.minX,
                        minY: box.minY,
                        maxX: box.maxX,
                        maxY: box.maxY,
                        islandName: box.islandName
                    }));
                    tree.load(items);
                    setSpatialIndex(tree);
                }
            } catch (error) {
                console.error("Failed to load island reference data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchIslands();
    }, []);

    const summaryData = useMemo(() => {
        if (!islandFeatures.length || !spatialIndex) return [];

        const mapData = data.filter(
            (item) => item.latitude && item.longitude && !isNaN(Number(item.latitude)) && !isNaN(Number(item.longitude))
        );

        const islandMap = new Map<string, { count: number; sumLat: number; sumLng: number; atoll: string; category: string }>();

        mapData.forEach((item) => {
            const itemLat = Number(item.latitude);
            const itemLng = Number(item.longitude);

            let pt = turf.point([itemLng, itemLat]);
            pt = turf.toMercator(pt);

            // 1. FAST PATH: Ask rbush which bounding boxes this point overlaps
            // This instantly reduces the 1,561 islands down to 0, 1, or rarely 2 candidate islands!
            const [ptLng, ptLat] = pt.geometry.coordinates;
            const candidates = spatialIndex.search({
                minX: ptLng,
                minY: ptLat,
                maxX: ptLng,
                maxY: ptLat
            });

            let matchedIslandName = 'Unknown/Offshore';
            let matchedAtoll = '';
            let matchedCategory = '';

            // 2. SLOW PATH: Only run the heavy booleanPointInPolygon math on the 1-2 candidates
            if (candidates.length > 0) {
                // Find the actual GeoJSON features for these handful of candidates
                const candidateFeatures = islandFeatures.filter(f =>
                    candidates.some((c: RBushItem) => c.islandName === f.properties?.islandName)
                );

                for (const feature of candidateFeatures) {
                    try {
                        if (turf.booleanPointInPolygon(pt, feature)) {
                            matchedIslandName = feature.properties?.islandName || 'Unnamed Island';
                            // Grab meta from our fast dictionary rather than digging in properties
                            const meta = islandMeta[matchedIslandName];
                            matchedAtoll = meta?.atoll || feature.properties?.atoll || '';
                            matchedCategory = meta?.category || feature.properties?.category || '';
                            break;
                        }
                    } catch (err) { }
                }
            }

            if (islandMap.has(matchedIslandName)) {
                const current = islandMap.get(matchedIslandName)!;
                current.count += 1;
                current.sumLat += itemLat;
                current.sumLng += itemLng;
            } else {
                islandMap.set(matchedIslandName, {
                    count: 1,
                    sumLat: itemLat,
                    sumLng: itemLng,
                    atoll: matchedAtoll,
                    category: matchedCategory
                });
            }
        });

        const result: IslandData[] = [];
        islandMap.forEach((val, name) => {
            result.push({
                name,
                atoll: val.atoll,
                category: val.category,
                count: val.count,
                avgLat: val.sumLat / val.count,
                avgLng: val.sumLng / val.count,
            });
        });

        return result.sort((a, b) => b.count - a.count);
    }, [data, islandFeatures, spatialIndex, islandMeta]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return summaryData;
        const lower = searchTerm.toLowerCase();
        return summaryData.filter(d =>
            d.name.toLowerCase().includes(lower) ||
            (d.atoll && d.atoll.toLowerCase().includes(lower)) ||
            (d.category && d.category.toLowerCase().includes(lower))
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
                            <th className="px-6 py-3 font-medium">Type</th>
                            <th className="px-6 py-3 font-medium">Island / Location Name</th>
                            <th className="px-6 py-3 font-medium text-right">Item Count</th>
                            <th className="px-6 py-3 font-medium text-right">Approx. Center (Lat, Lng)</th>
                            <th className="px-6 py-3 font-medium text-center w-16">Actions</th>
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
                                <td className="px-6 py-4 text-muted-foreground">
                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/20">
                                        {island.category || 'Unknown'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-foreground">{island.name}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                                        {island.count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-muted-foreground font-mono text-xs">
                                    {island.avgLat.toFixed(5)}, {island.avgLng.toFixed(5)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => onNavigateToMap && onNavigateToMap(island.avgLat, island.avgLng)}
                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-foreground h-8 w-8 text-muted-foreground"
                                        title="View on Map"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    </button>
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
