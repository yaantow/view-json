import { useMemo, useRef, useCallback } from 'react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
    data: any[];
    token: string;
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

export default function MapView({ data, token }: MapViewProps) {
    const mapRef = useRef<MapRef>(null);

    // Filter data points that have valid latitude and longitude
    const mapData = useMemo(() => {
        return data.filter(
            (item) => item.latitude && item.longitude && !isNaN(Number(item.latitude)) && !isNaN(Number(item.longitude))
        );
    }, [data]);

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
        if (mapData.length > 0) {
            return {
                longitude: Number(mapData[0].longitude),
                latitude: Number(mapData[0].latitude),
                zoom: 12,
            };
        }
        return {
            longitude: 73.5093, // Default to a central location (e.g. Maldives context from data)
            latitude: 4.1755,
            zoom: 10,
        };
    }, [mapData]);

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

    if (mapData.length === 0) {
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
            <Map
                ref={mapRef}
                initialViewState={initialViewState}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={token}
                style={{ width: '100%', height: '100%' }}
                interactiveLayerIds={['clusters', 'unclustered-point']}
                onClick={onClick}
                cursor={mapRef.current?.getLayer('clusters') ? 'pointer' : 'grab'}
            >
                <NavigationControl position="top-right" />

                <Source
                    id="data-points"
                    type="geojson"
                    data={geojson}
                    cluster={true}
                    clusterMaxZoom={14}
                    clusterRadius={30} //50 is okay
                >
                    <Layer {...clusterLayer} />
                    <Layer {...clusterCountLayer} />
                    <Layer {...unclusteredPointLayer} />
                </Source>
            </Map>
        </div>
    );
}
