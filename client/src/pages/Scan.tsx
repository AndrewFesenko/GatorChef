import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Camera, QrCode, Upload, Receipt } from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/lib/api";

type ScanMode = "receipt" | "qr";

type PantryItem = {
  id: string;
  name: string;
  category: string | null;
  expiry: string;
};

type ReceiptUploadResponse = {
  raw_text: string;
  parsed_items: Array<{ name: string }>;
};

type ReceiptSessionState = {
  receiptFileName: string;
  receiptPreviewUrl: string;
  rawText: string;
  extractedItems: string[];
  addedItems: string[];
};

const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const RECEIPT_SESSION_STORAGE_KEY = "gatorchef.scan.receipt-state";

const hasAllowedReceiptExtension = (fileName: string) => {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".pdf");
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === "string" ? result : "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file preview"));
    reader.readAsDataURL(file);
  });

const loadReceiptSessionState = (): ReceiptSessionState | null => {
  try {
    const raw = sessionStorage.getItem(RECEIPT_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ReceiptSessionState>;
    return {
      receiptFileName: typeof parsed.receiptFileName === "string" ? parsed.receiptFileName : "",
      receiptPreviewUrl: typeof parsed.receiptPreviewUrl === "string" ? parsed.receiptPreviewUrl : "",
      rawText: typeof parsed.rawText === "string" ? parsed.rawText : "",
      extractedItems: Array.isArray(parsed.extractedItems)
        ? parsed.extractedItems.filter((item): item is string => typeof item === "string")
        : [],
      addedItems: Array.isArray(parsed.addedItems)
        ? parsed.addedItems.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return null;
  }
};

const saveReceiptSessionState = (state: ReceiptSessionState) => {
  try {
    sessionStorage.setItem(RECEIPT_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota or privacy mode failures
  }
};

const clearReceiptSessionState = () => {
  try {
    sessionStorage.removeItem(RECEIPT_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage cleanup failures
  }
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

// todo if we add receipt confidence later only map category for high-confidence matches
const DEFAULT_CATEGORY: string | null = null;
const DEFAULT_EXPIRY = "unknown";

function extractQrItems(rawValue: string): string[] {
  const text = rawValue.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }

    if (typeof parsed === "object" && parsed !== null) {
      const maybeItems = (parsed as { items?: unknown }).items;
      if (Array.isArray(maybeItems)) {
        return maybeItems
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (typeof item === "object" && item !== null && "name" in item) {
              const candidate = (item as { name?: unknown }).name;
              return typeof candidate === "string" ? candidate.trim() : "";
            }
            return "";
          })
          .filter(Boolean);
      }

      const singleName = (parsed as { name?: unknown }).name;
      if (typeof singleName === "string" && singleName.trim()) {
        return [singleName.trim()];
      }
    }
  } catch {
    // treat non-json payloads as plain text
  }

  try {
    const url = new URL(text);
    const fromParam = url.searchParams.getAll("item").map((item) => item.trim()).filter(Boolean);
    if (fromParam.length > 0) {
      return fromParam;
    }
  } catch {
    // not a url so keep plain text fallback
  }

  return [text];
}

const Scan = () => {
  const location = useLocation();
  const initialMode = (location.state as { mode?: ScanMode } | null)?.mode ?? "receipt";
  const [mode, setMode] = useState<ScanMode>(initialMode);

  const [isUploading, setIsUploading] = useState(false);
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string>("");
  const [rawText, setRawText] = useState("");
  const [extractedItems, setExtractedItems] = useState<string[]>([]);
  const [addingItemName, setAddingItemName] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastQrRawValue, setLastQrRawValue] = useState<string>("");
  const [isImportingQr, setIsImportingQr] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanActiveRef = useRef(false);

  const canUseBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

  const resetReceiptState = () => {
    setReceiptFileName("");
    setReceiptPreviewUrl("");
    setRawText("");
    setExtractedItems([]);
    setAddedItems(new Set());
    clearReceiptSessionState();
  };

  useEffect(() => {
    const saved = loadReceiptSessionState();
    if (!saved) return;

    setReceiptFileName(saved.receiptFileName);
    setReceiptPreviewUrl(saved.receiptPreviewUrl);
    setRawText(saved.rawText);
    setExtractedItems(saved.extractedItems);
    setAddedItems(new Set(saved.addedItems));
  }, []);

  const addPantryItem = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    await apiRequest<PantryItem>("/pantry", {
      method: "POST",
      bodyJson: {
        name: trimmed,
        category: DEFAULT_CATEGORY,
        expiry: DEFAULT_EXPIRY,
      },
    });

    return true;
  };

  const handleReceiptFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isAllowedMime = !file.type || ALLOWED_RECEIPT_MIME_TYPES.has(file.type);
    const isAllowedExt = hasAllowedReceiptExtension(file.name);
    if (!isAllowedMime || !isAllowedExt) {
      toast.error("Please upload a JPG, PNG, or PDF receipt (HEIC is not supported)");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setReceiptFileName(file.name);
    setRawText("");
    setExtractedItems([]);
    setAddedItems(new Set());

    try {
      const previewUrl = file.type.startsWith("image/")
        ? await readFileAsDataUrl(file).catch(() => "")
        : "";

      setReceiptPreviewUrl(previewUrl);

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiRequest<ReceiptUploadResponse>("/upload/receipt", {
        method: "POST",
        body: formData,
      });

      const names = response.parsed_items
        .map((item) => item.name.trim())
        .filter((name) => Boolean(name));

      setRawText(response.raw_text ?? "");
      setExtractedItems(names);
      saveReceiptSessionState({
        receiptFileName: file.name,
        receiptPreviewUrl: previewUrl,
        rawText: response.raw_text ?? "",
        extractedItems: names,
        addedItems: [],
      });

      if (names.length > 0) {
        toast.success(`Extracted ${names.length} item${names.length === 1 ? "" : "s"}`);
      } else {
        toast.error("No grocery items were detected from this receipt");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Receipt upload failed";
      toast.error(message);
      resetReceiptState();
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleAddSingleExtractedItem = async (name: string) => {
    if (addedItems.has(name)) return;
    setAddingItemName(name);
    try {
      await addPantryItem(name);
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.add(name);
        saveReceiptSessionState({
          receiptFileName,
          receiptPreviewUrl,
          rawText,
          extractedItems,
          addedItems: Array.from(next),
        });
        return next;
      });
      toast.success(`${name} added to pantry`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add item";
      toast.error(message);
    } finally {
      setAddingItemName(null);
    }
  };

  const handleAddAllExtractedItems = async () => {
    const pending = extractedItems.filter((item) => !addedItems.has(item));
    if (pending.length === 0) {
      toast.success("All extracted items are already added");
      return;
    }

    setIsAddingAll(true);
    try {
      const results = await Promise.allSettled(pending.map((item) => addPantryItem(item)));
      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        setAddedItems((prev) => {
          const next = new Set(prev);
          for (let i = 0; i < results.length; i += 1) {
            if (results[i].status === "fulfilled") {
              next.add(pending[i]);
            }
          }
          saveReceiptSessionState({
            receiptFileName,
            receiptPreviewUrl,
            rawText,
            extractedItems,
            addedItems: Array.from(next),
          });
          return next;
        });
      }

      if (failed === 0) {
        toast.success(`Added ${succeeded} item${succeeded === 1 ? "" : "s"} to pantry`);
      } else {
        toast.error(`Added ${succeeded}, failed ${failed}. Please retry failed items.`);
      }
    } finally {
      setIsAddingAll(false);
    }
  };

  const stopCamera = () => {
    scanActiveRef.current = false;
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  };

  const startCamera = async () => {
    if (!canUseBarcodeDetector) {
      setCameraError("QR camera scan is not supported in this browser.");
      return;
    }

    try {
      const BarcodeDetectorCtor = (
        window as unknown as Window & {
          BarcodeDetector: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;
      detectorRef.current = new BarcodeDetectorCtor({ formats: ["qr_code"] });
    } catch {
      setCameraError("QR scanner failed to initialize.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        setCameraError("Camera preview not available.");
        stopCamera();
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraError(null);
      setIsCameraActive(true);
      scanActiveRef.current = true;

      const tick = async () => {
        if (!scanActiveRef.current || !videoRef.current || !detectorRef.current) {
          return;
        }

        try {
          const detected = await detectorRef.current.detect(videoRef.current);
          const rawValue = detected[0]?.rawValue?.trim();
          if (rawValue) {
            setLastQrRawValue(rawValue);
            toast.success("QR code detected");
            stopCamera();
            return;
          }
        } catch {
          // ignore intermittent detection failures and keep scanning
        }

        rafRef.current = window.requestAnimationFrame(() => {
          void tick();
        });
      };

      rafRef.current = window.requestAnimationFrame(() => {
        void tick();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not access camera";
      setCameraError(message);
      stopCamera();
    }
  };

  const handleImportQrItems = async () => {
    const names = extractQrItems(lastQrRawValue);
    if (names.length === 0) {
      toast.error("No items found in the scanned QR payload");
      return;
    }

    setIsImportingQr(true);
    try {
      const results = await Promise.allSettled(names.map((name) => addPantryItem(name)));
      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        toast.success(`Imported ${succeeded} QR item${succeeded === 1 ? "" : "s"}`);
      } else {
        toast.error(`Imported ${succeeded}, failed ${failed}.`);
      }
    } finally {
      setIsImportingQr(false);
    }
  };

  useEffect(() => {
    if (mode !== "qr") {
      stopCamera();
      return;
    }

    if (!isCameraActive && !lastQrRawValue) {
      void startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const qrItems = extractQrItems(lastQrRawValue);

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-xl font-bold text-foreground">Scan</h1>

      {/* mode toggle */}
      <div className="flex bg-card border border-border rounded-lg p-1">
        <button
          onClick={() => setMode("receipt")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${mode === "receipt" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
        >
          <Receipt size={14} />
          Receipt
        </button>
        <button
          onClick={() => setMode("qr")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${mode === "qr" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
        >
          <QrCode size={14} />
          QR Code
        </button>
      </div>

      {mode === "receipt" ? (
        <div className="space-y-5">
          {/* upload area */}
          <div className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-card/50">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload size={24} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Upload a receipt</p>
              <p className="text-xs text-muted-foreground mt-1">Tap to take a photo or choose a file</p>
            </div>
            {receiptPreviewUrl ? (
              <div className="w-full max-w-[240px] overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <img src={receiptPreviewUrl} alt={receiptFileName || "Uploaded receipt preview"} className="h-40 w-full object-cover" />
              </div>
            ) : receiptFileName ? (
              <div className="w-full max-w-[240px] rounded-xl border border-border bg-background px-3 py-4 text-center">
                <p className="text-xs font-medium text-foreground break-words">{receiptFileName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Receipt uploaded</p>
              </div>
            ) : null}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Choose File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={handleReceiptFileSelected}
              className="hidden"
            />
            {receiptFileName && <p className="text-xs text-muted-foreground">Selected: {receiptFileName}</p>}
          </div>

          {/* extracted items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Extracted Items</h3>
              {extractedItems.length > 0 && (
                <button
                  onClick={() => void handleAddAllExtractedItems()}
                  disabled={isAddingAll}
                  className="text-xs text-primary font-medium disabled:opacity-60"
                >
                  {isAddingAll ? "Adding..." : "Add All"}
                </button>
              )}
            </div>

            <div className="rounded-xl bg-card border border-border divide-y divide-border">
              {extractedItems.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Upload a receipt to extract ingredients.
                </div>
              )}

              {extractedItems.map((item) => {
                const wasAdded = addedItems.has(item);
                const isAddingThis = addingItemName === item;

                return (
                  <div key={item} className="flex items-center justify-between px-4 py-3 gap-2">
                    <span className="text-sm text-foreground break-words">{item}</span>
                    <button
                      onClick={() => void handleAddSingleExtractedItem(item)}
                      disabled={wasAdded || isAddingThis || isAddingAll}
                      className="text-xs font-medium px-2.5 py-1 rounded-md border border-border bg-secondary text-foreground disabled:opacity-50"
                    >
                      {wasAdded ? "Added" : isAddingThis ? "Adding..." : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>

            {rawText && (
              <details className="mt-3 rounded-xl bg-card border border-border p-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">View extracted text</summary>
                <pre className="mt-2 text-xs text-foreground whitespace-pre-wrap break-words">{rawText}</pre>
              </details>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* camera scanner */}
          <div className="aspect-square rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-4 relative overflow-hidden">
            <div className="absolute inset-8 border-2 border-primary/30 rounded-xl" />
            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />

            {isCameraActive ? (
              <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
            ) : (
              <>
                <Camera size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  {cameraError ?? "Point camera at QR code"}
                </p>
              </>
            )}
          </div>

          <button
            onClick={() => void startCamera()}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold"
          >
            {isCameraActive ? "Scanning..." : "Start Camera"}
          </button>

          {/* qr result */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Last scanned</p>
            <p className="text-sm font-semibold text-foreground break-words">
              {lastQrRawValue || "No QR scanned yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {qrItems.length > 0
                ? `${qrItems.length} item${qrItems.length === 1 ? "" : "s"} ready to import`
                : "Scan a QR code that contains item names"}
            </p>
            <button
              onClick={() => void handleImportQrItems()}
              disabled={isImportingQr || qrItems.length === 0}
              className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium w-full disabled:opacity-50"
            >
              {isImportingQr ? "Importing..." : "Import Items"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scan;
