import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  /** Un rendu au moins a-t-il servi des données du cache local ? */
  servedFromCache: boolean;
  setOnline: (online: boolean) => void;
  markCacheServed: () => void;
}

/**
 * État réseau global, alimenté par les intercepteurs axios : toute réponse
 * serveur repasse l'app « en ligne », toute erreur réseau (pas de réponse) la
 * bascule « hors-ligne ». Sert à afficher un bandeau et à servir le cache.
 */
export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  servedFromCache: false,
  setOnline: (online) => set((s) => (s.isOnline === online ? s : { isOnline: online })),
  markCacheServed: () => set((s) => (s.servedFromCache ? s : { servedFromCache: true })),
}));
