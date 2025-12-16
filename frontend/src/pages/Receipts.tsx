import { AppHeader } from "@/components/navigation/AppHeader";
import { ReceiptExplorerTab } from "@/features/receipts/components/ReceiptExplorerTab";

const Receipts = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        <ReceiptExplorerTab />
      </main>
    </div>
  );
};

export default Receipts;
