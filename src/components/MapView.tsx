import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import RBush from 'rbush';
import * as turf from '@turf/turf';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Filter } from 'lucide-react';

interface MapViewProps {
    data: any[];
    token: string;
    centerCoordinates?: { latitude: number, longitude: number } | null;
}

interface RBushItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    islandName: string;
}

import type { CircleLayer, SymbolLayer } from 'mapbox-gl';

const clusterLayer: CircleLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'data-points',
    filter: ['has', 'point_count'],
    paint: {
        'circle-color': [
            'step',
            ['get', 'point_count'],
            '#ef4444', // Red for < 100
            100,
            '#dc2626', // Darker red for < 750
            750,
            '#b91c1c'  // Darkest red for >= 750
        ],
        'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,  // 20px radius for < 100
            100,
            30,  // 30px radius for < 750
            750,
            40   // 40px radius for >= 750
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
    }
};

const clusterCountLayer: SymbolLayer = {
    id: 'cluster-count',
    type: 'symbol',
    source: 'data-points',
    filter: ['has', 'point_count'],
    layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
    },
    paint: {
        'text-color': '#ffffff'
    }
};

const unclusteredPointLayer: CircleLayer = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'data-points',
    filter: ['!', ['has', 'point_count']],
    paint: {
        'circle-color': '#ef4444',
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
    }
};

import GeocoderControl from './GeocoderControl';

type FilterType = 'all' | 'known' | 'offshore';

export default function MapView({ data, token, centerCoordinates }: MapViewProps) {
    const mapRef = useRef<MapRef>(null);
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [spatialIndex, setSpatialIndex] = useState<RBush<RBushItem> | null>(null);

    // Load spatial index for filtering
    useEffect(() => {
        async function loadBoxes() {
            try {
                const response = await fetch('/IslandBoxes.json');
                const boxesMap = await response.json();

                if (boxesMap) {
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
            } catch (e) {
                console.error("Failed to load IslandBoxes for filtering", e);
            }
        }
        loadBoxes();
    }, []);

    // Filter valid coordinate data first
    const baseMapData = useMemo(() => {
        return data.filter(
            (item) => item.latitude && item.longitude && !isNaN(Number(item.latitude)) && !isNaN(Number(item.longitude))
        );
    }, [data]);

    // Apply the Unknown / Offshore filter
    const mapData = useMemo(() => {
        if (filterType === 'all' || !spatialIndex) return baseMapData;

        return baseMapData.filter((item) => {
            const lat = Number(item.latitude);
            const lng = Number(item.longitude);

            let pt = turf.point([lng, lat]);
            pt = turf.toMercator(pt);

            const [ptLng, ptLat] = pt.geometry.coordinates;
            const candidates = spatialIndex.search({
                minX: ptLng,
                minY: ptLat,
                maxX: ptLng,
                maxY: ptLat
            });

            // If candidates exist, we assume it's on an island (fast estimation for visuals)
            const isOffshore = candidates.length === 0;

            if (filterType === 'offshore') return isOffshore;
            if (filterType === 'known') return !isOffshore;
            return true;
        });
    }, [baseMapData, filterType, spatialIndex]);

    // Fly to new coordinates if passed from external navigation (Eye icon)
    useEffect(() => {
        if (centerCoordinates && mapRef.current) {
            mapRef.current.flyTo({
                center: [centerCoordinates.longitude, centerCoordinates.latitude],
                zoom: 14, // Zoom in fairly close to the island
                duration: 2000,
                essential: true
            });
        }
    }, [centerCoordinates]);

    // Convert to GeoJSON for optimal WebGL rendering
    const geojson = useMemo<GeoJSON.FeatureCollection>(() => {
        return {
            type: 'FeatureCollection',
            features: mapData.map((item) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [Number(item.longitude), Number(item.latitude)]
                },
                properties: {
                    id: item.id,
                    identifier: item.identifier,
                    ...item
                }
            }))
        };
    }, [mapData]);

    // Calculate initial view state based on the first valid point, or a default
    const initialViewState = useMemo(() => {
        if (centerCoordinates) {
            return {
                longitude: centerCoordinates.longitude,
                latitude: centerCoordinates.latitude,
                zoom: 14,
            };
        }
        if (baseMapData.length > 0) {
            return {
                longitude: Number(baseMapData[0].longitude),
                latitude: Number(baseMapData[0].latitude),
                zoom: 12,
            };
        }
        return {
            longitude: 73.5093, // Default to a central location (e.g. Maldives context from data)
            latitude: 4.1755,
            zoom: 10,
        };
    }, [baseMapData, centerCoordinates]);

    const onClick = useCallback((event: any) => {
        const feature = event.features?.[0];
        if (!feature || !mapRef.current) return;

        const clusterId = feature.properties?.cluster_id;

        // If clicked on a cluster, zoom in
        if (clusterId) {
            const mapboxSource = mapRef.current.getSource('data-points') as GeoJSONSource;

            mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err || !mapRef.current) return;

                const geometry = feature.geometry;
                if (geometry?.type === 'Point') {
                    mapRef.current.easeTo({
                        center: [geometry.coordinates[0], geometry.coordinates[1]],
                        zoom: zoom,
                        duration: 500
                    });
                }
            });
        }
    }, []);

    if (baseMapData.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 h-full bg-muted/10">
                <div className="text-center text-muted-foreground">
                    <p>No valid coordinate data found in the current dataset.</p>
                    <p className="text-sm mt-2">Make sure your data contains 'latitude' and 'longitude' properties.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[500px] relative">
            <div className="absolute top-4 right-14 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-1.5 rounded-md shadow-md border flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground ml-1" />
                <Select value={filterType} onValueChange={(val: FilterType) => setFilterType(val)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Filter items..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Show All Items</SelectItem>
                        <SelectItem value="known">Only Known Islands</SelectItem>
                        <SelectItem value="offshore">Only Unknown / Offshore</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Map
                ref={mapRef}
                initialViewState={initialViewState}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={token}
                style={{ width: '100%', height: '100%' }}
                interactiveLayerIds={['clusters', 'unclustered-point']}
                onClick={onClick}
                cursor={'auto'}
            >
                <NavigationControl position="top-right" />
                <GeocoderControl mapboxAccessToken={token} position="top-left" />

                <Source
                    id="data-points"
                    type="geojson"
                    data={geojson}
                    cluster={true}
                    clusterMaxZoom={14}
                    clusterRadius={30}
                >
                    <Layer {...clusterLayer} />
                    <Layer {...clusterCountLayer} />
                    <Layer {...unclusteredPointLayer} />
                </Source>
            </Map>
        </div>
    );
}
