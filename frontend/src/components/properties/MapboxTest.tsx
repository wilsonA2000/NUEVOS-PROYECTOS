import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoid2lsc29uYXJndWVsbG8yMDI1IiwiYSI6ImNtYm1zcmg1aDE0NTkyam9rZDRkNzF5YWoifQ.FgvTtKt3AK5uxcoz8BHtmw';

export default function MapboxTest() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-74.2973, 4.5709],
      zoom: 6,
    });
    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: 400, border: '1px solid #ccc', margin: '2rem 0' }}
    />
  );
} 