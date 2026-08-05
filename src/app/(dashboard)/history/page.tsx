import { Suspense } from "react";
import HistoryPage from "./HistoryClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-[13px] text-muted-foreground">
          กำลังโหลด...
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <HistoryPage />
      </div>
    </Suspense>
  );
}
