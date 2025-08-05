declare module '@mapbox/mapbox-gl-geocoder' {
  import { Map, IControl } from 'mapbox-gl';
  
  interface MapboxGeocoderOptions {
    accessToken: string;
    mapboxgl: any;
    placeholder?: string;
    countries?: string;
    language?: string;
    types?: string;
    marker?: boolean;
  }
  
  class MapboxGeocoder implements IControl {
    constructor(options: MapboxGeocoderOptions);
    on(event: string, callback: (e: any) => void): void;
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }
  
  export = MapboxGeocoder;
} 