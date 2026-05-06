/**
 * SafeSpace AI – frontend config (single place for ports and API URL).
 * Change these if you run the backend or frontend on different ports.
 */
const APP_CONFIG = {
    /** Must match PORT in server/.env (default backend: 3001 if unset in Python) */
    apiBaseUrl: "http://localhost:3001",
    /** Frontend port (for reference; used when serving with e.g. python -m http.server 5500) */
    frontendPort: 5500
};
