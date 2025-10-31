'use client';

import { QRCodeSVG } from 'qrcode.react';

export default function QRCode({ url }: { url: string }) {
  return (
    <div className="flex justify-center items-center p-4">
      <QRCodeSVG value={url} size={256} />
    </div>
  );
}

