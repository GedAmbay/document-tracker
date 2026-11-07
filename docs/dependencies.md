# Dependencies
Existing Next.js, React, TypeScript, ESLint and Tailwind v4 are retained; no framework upgrade. Use Node.js 22.22.2+ (22 LTS) or 24.15+ and npm ci with the committed lockfile.

Initial runtime command:

    npm install @supabase/supabase-js @supabase/ssr zod clsx tailwind-merge class-variance-authority lucide-react server-only

Supabase packages support future Auth/data adapters; Zod validates boundaries; clsx/tailwind-merge, CVA and Lucide support shadcn/ui; server-only protects future server adapters.

Initial test command:

    npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom @playwright/test
    npx playwright install chromium

shadcn/ui owns generated source, not a single runtime component package. The mock interface now uses generated button, badge, input, label, sheet, dialog, tabs, textarea, switch and skeleton components. The CLI added radix-ui and cn. The mock packet QR dialog uses qrcode.react. Future component changes should be reviewed before acceptance.

Supabase CLI/SQL tests and real camera-scanning packages remain deferred. QR rendering is implemented for demo labels only. Do not link or push a remote database during UI work.

Node types were aligned to @types/node@^22 for the current Vitest peer requirement. System fonts replace the starter Google font downloads so builds do not require the font service.

Audit at setup: 8 moderate advisories in the existing ESLint/typescript-eslint/minimatch chain (GHSA-g3hv-75wg-m249). npm suggested an incompatible eslint-config-next downgrade for part of the chain; no forced fixes applied. Review compatible remediation separately.
