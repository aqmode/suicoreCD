/**
 * Minimal Yandex Maps 2.1 typings shared across the project.
 *
 * Covers the subset used by PochtaWidget and YandexMap components.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface YmapsGeoObjects {
  add: (obj: unknown) => void;
  remove: (obj: unknown) => void;
  removeAll: () => void;
}

interface YmapsMapEvents {
  add: (type: string, handler: (e: { get: (key: string) => any }) => void) => void;
}

interface YmapsMap {
  events: YmapsMapEvents;
  geoObjects: YmapsGeoObjects;
  setCenter: (center: [number, number], zoom?: number) => void;
  setBounds: (bounds: [[number, number], [number, number]], opts?: object) => void;
  destroy: () => void;
}

interface YmapsPlacemark {
  events: { add: (type: string, handler: () => void) => void };
}

interface YmapsObjectManager {
  add: (data: object) => unknown;
  objects: {
    events: {
      add: (type: string, handler: (e: { get: (key: string) => number }) => void) => void;
    };
  };
}

interface YmapsGeoObject {
  getAddressLine?: () => string;
  properties?: { get: (key: string) => string };
  geometry?: { getCoordinates?: () => [number, number] };
}

interface YmapsGeocodeResult {
  geoObjects: {
    get: (index: number) => YmapsGeoObject;
    getLength: () => number;
  };
}

interface YmapsStatic {
  ready: (fn: () => void) => void;

  Map: new (
    el: string | HTMLElement,
    state: { center: [number, number]; zoom: number },
    opts?: object,
  ) => YmapsMap;

  Placemark: new (
    coords: [number, number],
    properties?: object,
    options?: object,
  ) => YmapsPlacemark;

  ObjectManager: new (options?: {
    clusterize?: boolean;
    geoObjectOpenBalloonOnClick?: boolean;
  }) => YmapsObjectManager;

  geocode: (query: string | [number, number]) => Promise<YmapsGeocodeResult>;
}

declare global {
  interface Window {
    ymaps?: YmapsStatic;
  }
}

export {};
