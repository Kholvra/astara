import { type SearchResultItem } from "./search.types";

export const MOCK_SEARCH_ITEMS: SearchResultItem[] = [
  {
    id: "stop-monas-ambiguous",
    title: "Halte Monas",
    subtitle: "Pilih arah peron perjalanan",
    type: "stop_or_route",
    coordinates: [106.8272, -6.1754],
    routes: ["Koridor 1", "Koridor 2"],
    verification: "Terverifikasi",
    confidence: "high",
    requiresPlatformChoice: true,
    platforms: [
      {
        id: "stop-monas-plat-1",
        label: "Pintu A • Arah Kota / Harmoni",
        coordinates: [106.8271, -6.1753],
      },
      {
        id: "stop-monas-plat-2",
        label: "Pintu B • Arah Blok M",
        coordinates: [106.8273, -6.1755],
      },
    ],
  },
  {
    id: "stop-blok-m",
    title: "Halte Blok M",
    subtitle: "Kebayoran Baru, Jakarta Selatan",
    type: "stop_or_route",
    coordinates: [106.7981, -6.2444],
    routes: ["Koridor 1", "10H"],
    walkTimeMinutes: 3,
    walkDistanceMeters: 180,
    verification: "Terverifikasi",
    confidence: "high",
  },
  {
    id: "stop-perpusnas",
    title: "Perpustakaan Nasional",
    subtitle: "Non-BRT • Rute 1P, 1R, 2Q",
    type: "stop_or_route",
    coordinates: [106.8271, -6.1804],
    routes: ["1P", "1R", "2Q"],
    walkDistanceMeters: 250,
    verification: "Terverifikasi",
    confidence: "high",
  },
  {
    id: "poi-monas",
    title: "Monumen Nasional (Monas)",
    subtitle: "Gambir, Jakarta Pusat",
    type: "place_or_address",
    coordinates: [106.8272, -6.1754],
    walkDistanceMeters: 100,
    verification: "Terverifikasi",
    confidence: "high",
  },
  {
    id: "stop-monas-barat",
    title: "Monas Barat",
    subtitle: "Mikrotrans • Rute JAK-10",
    type: "stop_or_route",
    coordinates: [106.8225, -6.1754],
    walkDistanceMeters: 350,
    walkTimeMinutes: 5,
    verification: "Data terbatas",
    confidence: "medium",
    routes: ["JAK-10"],
    requiresPlatformChoice: false,
  },
];

export const POPULAR_DESTINATIONS = [
  { label: "Monas", icon: "", targetQuery: "Monas" },
  { label: "Grand Indonesia", icon: "", targetQuery: "Grand Indonesia" },
  { label: "GBK", icon: "", targetQuery: "GBK" },
];