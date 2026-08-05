import { Suspense } from "react";
import HistoryPage from "./HistoryClient";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-slate-400">กำลังโหลด...</p>}>
      <HistoryPage />
    </Suspense>
  );
}
