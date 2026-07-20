import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { useNetworkStore } from '../store/network.store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Cache mémoire des GET (résilience hors-ligne) ────────────────────────────
// On mémorise la dernière réponse réussie de chaque GET (clé = URL + params).
// Si le réseau tombe, on ressert cette copie plutôt que d'échouer : l'utilisateur
// continue de voir ses commandes / ordonnances déjà chargées. Le cache est en
// mémoire (durée de vie = session) et volontairement simple — aucune donnée
// sensible n'est écrite sur le disque.
const getCache = new Map<string, unknown>();

function cacheKey(config: InternalAxiosRequestConfig): string {
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.url ?? ''}?${params}`;
}

/** Une réponse a-t-elle été servie depuis le cache local ? */
export function isCachedResponse(res: AxiosResponse): boolean {
  return (res as any).fromCache === true;
}

/** Vide le cache (à la déconnexion, pour ne pas fuiter entre comptes). */
export function clearApiCache(): void {
  getCache.clear();
}

// Injecte le JWT dans chaque requête
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    // Réponse serveur reçue → on est en ligne, et on met le GET en cache.
    useNetworkStore.getState().setOnline(true);
    if (res.config.method?.toLowerCase() === 'get') {
      getCache.set(cacheKey(res.config as InternalAxiosRequestConfig), res.data);
    }
    return res;
  },
  (err) => {
    // 401 → session expirée : on déconnecte et on purge le cache.
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      clearApiCache();
      return Promise.reject(err);
    }

    // Pas de réponse = erreur réseau (hors-ligne / timeout). On bascule
    // « hors-ligne » et, pour un GET, on ressert la dernière copie connue.
    const isNetworkError = !err.response;
    if (isNetworkError) {
      useNetworkStore.getState().setOnline(false);
      const config = err.config as InternalAxiosRequestConfig | undefined;
      if (config && config.method?.toLowerCase() === 'get') {
        const cached = getCache.get(cacheKey(config));
        if (cached !== undefined) {
          useNetworkStore.getState().markCacheServed();
          return Promise.resolve({
            data: cached,
            status: 200,
            statusText: 'OK (cache)',
            headers: {},
            config,
            fromCache: true,
          } as AxiosResponse & { fromCache: true });
        }
      }
    }
    return Promise.reject(err);
  },
);
