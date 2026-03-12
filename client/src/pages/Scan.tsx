import { useState } from "react";
import { Camera, QrCode, Upload, Receipt } from "lucide-react";

const Scan = () => {
  const [mode, setMode] = useState<"receipt" | "qr">("receipt");

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-xl font-bold text-foreground">Scan</h1>

      {/* Mode Toggle */}
      <div className="flex bg-card border border-border rounded-lg p-1">
        <button
          onClick={() => setMode("receipt")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
            mode === "receipt" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Receipt size={14} />
          Receipt
        </button>
        <button
          onClick={() => setMode("qr")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
            mode === "qr" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <QrCode size={14} />
          QR Code
        </button>
      </div>

      {mode === "receipt" ? (
        <div className="space-y-5">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-card/50">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload size={24} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Upload a receipt</p>
              <p className="text-xs text-muted-foreground mt-1">Tap to take a photo or choose a file</p>
            </div>
            <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold">
              Choose File
            </button>
          </div>

          {/* Mock extracted items */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Extracted Items</h3>
            <div className="rounded-xl bg-card border border-border divide-y divide-border">
              {["Milk (1 gal)", "Eggs (12 ct)", "White bread", "Bananas (bunch)"].map((item) => (
                <div key={item} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-foreground">{item}</span>
                  <span className="text-xs text-primary font-medium">+ Add</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Scanner placeholder */}
          <div className="aspect-square rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-4 relative overflow-hidden">
            <div className="absolute inset-8 border-2 border-primary/30 rounded-xl" />
            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
            <Camera size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Point camera at QR code</p>
          </div>

          {/* Mock result */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Last scanned</p>
            <p className="text-sm font-semibold text-foreground">Trader Joe's Shopping List</p>
            <p className="text-xs text-muted-foreground">12 items • Shared by @roommate</p>
            <button className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium w-full">
              Import Items
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scan;
