import React from "react";
import { QrCode } from "lucide-react";

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 150 }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}`;

  return (
    <div className="flex flex-col items-center justify-center bg-white p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm inline-block">
      <div className="relative overflow-hidden rounded-xl border border-slate-100 p-2 bg-slate-50">
        <img
          src={qrUrl}
          alt={`Check-in QR Code: ${value}`}
          width={size}
          height={size}
          className="mx-auto block"
          loading="lazy"
        />
      </div>
      <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <QrCode className="h-3.5 w-3.5 text-red-500" />
        Ref: {value.substring(0, 8).toUpperCase()}
      </div>
    </div>
  );
};
export default QRCode;
