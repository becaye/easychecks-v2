/* Vite ImportMeta type declarations */
interface ImportMetaEnv {
  BASE_URL: string
  /** Base URL of the scan service when it is not served on the same origin */
  VITE_SCAN_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

