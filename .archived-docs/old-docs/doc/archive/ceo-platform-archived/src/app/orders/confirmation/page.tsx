'use client';

import { Suspense } from 'react';
// Removed unused Link import
import { Loader2 } from 'lucide-react';
import ConfirmationContent from './confirmation-content';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-linear-to-b from-success/5 to-transparent py-12 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-gray-600">載入訂單確認資訊...</p>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmationContent />
    </Suspense>
  );
}
