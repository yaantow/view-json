import { useControl } from 'react-map-gl/mapbox';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import type { ControlPosition } from 'react-map-gl/mapbox';

type GeocoderControlProps = {
    mapboxAccessToken: string;
    position: ControlPosition;
};

export default function GeocoderControl({ mapboxAccessToken, position }: GeocoderControlProps) {
    useControl<any>(
        () => new MapboxGeocoder({
            accessToken: mapboxAccessToken,
            marker: false,
            mapboxgl: (window as any).mapboxgl
        }),
        {
            position
        }
    );

    return null;
}
