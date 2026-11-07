import { SecureWorkspace } from "@/components/doctrack/secure-workspace";
import { Suspense } from "react";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-slate-500" role="status">
          Opening your workspace…
        </div>
      }
    >
      <SecureWorkspace>{children}</SecureWorkspace>
    </Suspense>
  );
}
