import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { QrCode } from 'lucide-react';

const QRCodeModal = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">QR Code Quick Login</DialogTitle>
          <DialogDescription className="text-sm">
            Exhibition Demo Feature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Mock QR Code */}
          <div className="bg-white p-4 sm:p-8 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="relative inline-block">
                <div className="w-36 h-36 sm:w-48 sm:h-48 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <QrCode className="w-24 h-24 sm:w-32 sm:h-32 text-white" />
                </div>
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-base sm:text-lg">DEMO</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Scan to login instantly</p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-xl">
            <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-300">
              <strong>Exhibition Feature:</strong> This is a demonstration of QR-based quick login.
              In a production environment, teachers would scan this code with their mobile devices for instant authentication.
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">How it works:</p>
            <ol className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Teacher opens the mobile app</li>
              <li>Scans the QR code displayed here</li>
              <li>Instantly logged in without typing credentials</li>
              <li>Quick access to their schedule</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
