import React from "react";

interface PaymentViewProps {
  paymentUrl: string;
  isLoading: boolean;
  onCancelBooking: () => void;
}

const PaymentView: React.FC<PaymentViewProps> = ({ paymentUrl, isLoading, onCancelBooking }) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg sm:text-xl font-bold text-blue-900">
            {isLoading ? "Processing Payment..." : "Complete Your Payment"}
          </h3>
        </div>
        <p className="text-blue-700 font-medium text-sm sm:text-base">
          {isLoading
            ? "Please wait while we process your request..."
            : "Complete your payment below to confirm your booking"}
        </p>
      </div>

      <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg bg-white">
        <iframe
          src={paymentUrl}
          width="100%"
          height="500"
          className="border-0 sm:h-[650px]"
          title="Payment Gateway"
          style={{ minHeight: "500px" }}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 sm:pt-6 border-t-2 border-gray-100 bg-linear-to-r from-gray-50 to-gray-100 p-4 sm:p-6 rounded-2xl">
        <button
          onClick={onCancelBooking}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm sm:text-base"
        >
          {isLoading ? "Cancelling..." : "← Back to Booking"}
        </button>
        <div className="text-center order-first sm:order-0">
          <div className="text-xs sm:text-sm text-gray-600 font-medium">Secure payment powered by</div>
          <div className="text-base sm:text-lg font-bold text-blue-600">Paymob</div>
        </div>
      </div>
    </div>
  );
};

export default PaymentView;
