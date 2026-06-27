import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/** Coordonnées de repli (centre de Libreville) si la localisation échoue. */
export const LIBREVILLE: Coords = { lat: 0.3924, lng: 9.4536 };

export const locationService = {
  /** Demande la permission de localisation. Retourne true si accordée. */
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Position GPS actuelle. Retourne null si la permission est refusée ou si la
   * localisation est indisponible — l'appelant décide du repli.
   */
  async getCurrentCoords(): Promise<Coords | null> {
    try {
      const granted = await this.requestPermission();
      if (!granted) return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  },

  /** Géocode une adresse texte en coordonnées. Retourne null si introuvable. */
  async geocode(address: string): Promise<Coords | null> {
    try {
      const results = await Location.geocodeAsync(address);
      if (!results.length) return null;
      return { lat: results[0].latitude, lng: results[0].longitude };
    } catch {
      return null;
    }
  },

  /** Géocode inverse : transforme des coordonnées en libellé lisible. */
  async reverseGeocode(coords: Coords): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      if (!results.length) return null;
      const r = results[0];
      return [r.name, r.street, r.district, r.city].filter(Boolean).join(', ') || null;
    } catch {
      return null;
    }
  },
};
