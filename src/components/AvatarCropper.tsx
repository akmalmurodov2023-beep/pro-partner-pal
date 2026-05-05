import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

async function getCroppedBlob(src: string, area: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  const size = Math.min(area.width, area.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

export function AvatarCropper({ open, file, onCancel, onDone }: { open: boolean; file: File | null; onCancel: () => void; onDone: (blob: Blob) => void }) {
  const [src, setSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<any>(null);

  if (file && !src) {
    const r = new FileReader();
    r.onload = () => setSrc(String(r.result));
    r.readAsDataURL(file);
  }

  const onComplete = useCallback((_: any, a: any) => setArea(a), []);
  const handleClose = () => { setSrc(""); setZoom(1); setCrop({ x: 0, y: 0 }); onCancel(); };
  const confirm = async () => {
    if (!src || !area) return;
    const blob = await getCroppedBlob(src, area);
    setSrc(""); setZoom(1); setCrop({ x: 0, y: 0 });
    onDone(blob);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Profil rasmini sozlash</DialogTitle></DialogHeader>
        <div className="relative w-full h-72 bg-muted">
          {src && <Cropper image={src} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} />}
        </div>
        <div className="px-1">
          <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Bekor qilish</Button>
          <Button onClick={confirm}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}