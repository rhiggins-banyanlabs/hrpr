// types/google-maps.d.ts

// Declare the Google namespace on the window object
interface Window {
    google: typeof google;
    googleMapsCallback: () => void;
  }
  
  // Simple declarations for the Google Maps API types we're using
  declare namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: MapOptions);
        setCenter(latLng: LatLng | LatLngLiteral): void;
        setZoom(zoom: number): void;
        setOptions(options: MapOptions): void;
        panTo(latLng: LatLng | LatLngLiteral): void;
        getBounds(): LatLngBounds;
      }
  
      class Marker {
        constructor(options: MarkerOptions);
        setMap(map: Map | null): void;
        setPosition(latLng: LatLng | LatLngLiteral): void;
        setTitle(title: string): void;
        setIcon(icon: string | Icon | Symbol): void;
        setVisible(visible: boolean): void;
        addListener(event: string, handler: Function): MapsEventListener;
      }
  
      class InfoWindow {
        constructor(options?: InfoWindowOptions);
        open(map: Map | StreetViewPanorama, anchor?: MVCObject): void;
        close(): void;
        setContent(content: string | Node): void;
        setPosition(latLng: LatLng | LatLngLiteral): void;
      }
  
      class Geocoder {
        constructor();
        geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
      }
  
      class LatLng {
        constructor(lat: number, lng: number, noWrap?: boolean);
        lat(): number;
        lng(): number;
        equals(other: LatLng): boolean;
        toString(): string;
        toUrlValue(precision?: number): string;
      }
  
      class LatLngBounds {
        constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
        contains(latLng: LatLng | LatLngLiteral): boolean;
        equals(other: LatLngBounds | LatLngBoundsLiteral): boolean;
        extend(point: LatLng | LatLngLiteral): LatLngBounds;
        getCenter(): LatLng;
        getNorthEast(): LatLng;
        getSouthWest(): LatLng;
        isEmpty(): boolean;
        toJSON(): LatLngBoundsLiteral;
        toSpan(): LatLng;
        toString(): string;
        toUrlValue(precision?: number): string;
        union(other: LatLngBounds | LatLngBoundsLiteral): LatLngBounds;
      }
  
      interface MapOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        mapTypeId?: string;
        disableDefaultUI?: boolean;
        zoomControl?: boolean;
        mapTypeControl?: boolean;
        scaleControl?: boolean;
        streetViewControl?: boolean;
        rotateControl?: boolean;
        fullscreenControl?: boolean;
        styles?: any[];
      }
  
      interface MarkerOptions {
        position: LatLng | LatLngLiteral;
        map?: Map;
        title?: string;
        icon?: string | Icon | Symbol;
        label?: string | MarkerLabel;
        draggable?: boolean;
        clickable?: boolean;
        visible?: boolean;
        zIndex?: number;
      }
  
      interface InfoWindowOptions {
        content?: string | Node;
        disableAutoPan?: boolean;
        maxWidth?: number;
        pixelOffset?: Size;
        position?: LatLng | LatLngLiteral;
        zIndex?: number;
      }
  
      interface GeocoderRequest {
        address?: string;
        location?: LatLng | LatLngLiteral;
        placeId?: string;
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        componentRestrictions?: GeocoderComponentRestrictions;
        region?: string;
      }
  
      interface GeocoderComponentRestrictions {
        administrativeArea?: string;
        country?: string | string[];
        locality?: string;
        postalCode?: string;
        route?: string;
      }
  
      interface GeocoderResult {
        address_components: GeocoderAddressComponent[];
        formatted_address: string;
        geometry: GeocoderGeometry;
        place_id: string;
        types: string[];
      }
  
      interface GeocoderAddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }
  
      interface GeocoderGeometry {
        bounds?: LatLngBounds;
        location: LatLng;
        location_type?: GeocoderLocationType;
        viewport: LatLngBounds;
      }
  
      type GeocoderLocationType = 'APPROXIMATE' | 'GEOMETRIC_CENTER' | 'RANGE_INTERPOLATED' | 'ROOFTOP';
      type GeocoderStatus = 'ERROR' | 'INVALID_REQUEST' | 'OK' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR' | 'ZERO_RESULTS';
  
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
  
      interface LatLngBoundsLiteral {
        east: number;
        north: number;
        south: number;
        west: number;
      }
  
      interface Icon {
        url: string;
        size?: Size;
        scaledSize?: Size;
        origin?: Point;
        anchor?: Point;
        labelOrigin?: Point;
      }
  
      interface MarkerLabel {
        text: string;
        color?: string;
        fontFamily?: string;
        fontSize?: string;
        fontWeight?: string;
      }
  
      class Size {
        constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
        equals(other: Size): boolean;
        width: number;
        height: number;
      }
  
      class Point {
        constructor(x: number, y: number);
        equals(other: Point): boolean;
        x: number;
        y: number;
      }
  
      interface MapsEventListener {
        remove(): void;
      }
  
      interface MVCObject {
        addListener(eventName: string, handler: Function): MapsEventListener;
      }
  
      interface StreetViewPanorama extends MVCObject {
        // Basic StreetViewPanorama definition
      }
  
      interface Symbol {
        // Symbol definition
      }
  
      namespace places {
        class PlacesService {
          constructor(attrContainer: HTMLElement | Map);
          findPlaceFromQuery(request: FindPlaceFromQueryRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus) => void): void;
          getDetails(request: PlaceDetailsRequest, callback: (result: PlaceResult, status: PlacesServiceStatus) => void): void;
          nearbySearch(request: PlaceSearchRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus, pagination: PlaceSearchPagination) => void): void;
          textSearch(request: TextSearchRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus, pagination: PlaceSearchPagination) => void): void;
        }
  
        interface PlaceSearchRequest {
          bounds?: LatLngBounds | LatLngBoundsLiteral;
          location?: LatLng | LatLngLiteral;
          radius?: number;
          rankBy?: RankBy;
          keyword?: string;
          type?: string;
        }
  
        interface FindPlaceFromQueryRequest {
          fields: string[];
          query: string;
          locationBias?: LocationBias;
        }
  
        interface PlaceDetailsRequest {
          placeId: string;
          fields?: string[];
          sessionToken?: AutocompleteSessionToken;
        }
  
        interface TextSearchRequest {
          query: string;
          bounds?: LatLngBounds | LatLngBoundsLiteral;
          location?: LatLng | LatLngLiteral;
          radius?: number;
          type?: string;
        }
  
        interface LocationBias {
          // LocationBias definition
        }
  
        interface PlaceSearchPagination {
          hasNextPage: boolean;
          nextPage(): void;
        }
  
        interface PlaceResult {
          place_id: string;
          name: string;
          formatted_address?: string;
          geometry: {
            location: LatLng;
            viewport?: LatLngBounds;
          };
          vicinity?: string;
          types?: string[];
          rating?: number;
          user_ratings_total?: number;
          opening_hours?: {
            open_now?: boolean;
          };
          photos?: PlacePhoto[];
          icon?: string;
          icon_background_color?: string;
          icon_mask_base_uri?: string;
          business_status?: string;
          plus_code?: {
            compound_code: string;
            global_code: string;
          };
          price_level?: number;
        }
  
        interface PlacePhoto {
          height: number;
          width: number;
          html_attributions: string[];
          getUrl(options: PhotoOptions): string;
        }
  
        interface PhotoOptions {
          maxWidth?: number;
          maxHeight?: number;
        }
  
        class AutocompleteSessionToken {
          constructor();
        }
  
        enum RankBy {
          PROMINENCE,
          DISTANCE
        }
  
        enum PlacesServiceStatus {
          OK = 'OK',
          ZERO_RESULTS = 'ZERO_RESULTS',
          OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
          REQUEST_DENIED = 'REQUEST_DENIED',
          INVALID_REQUEST = 'INVALID_REQUEST',
          UNKNOWN_ERROR = 'UNKNOWN_ERROR',
          NOT_FOUND = 'NOT_FOUND'
        }
      }
    }
  }