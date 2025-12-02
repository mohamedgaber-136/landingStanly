import React from "react";
import type { BookingConfirmationDetails, InvoiceData } from "./types";

interface BookingConfirmationViewProps {
  bookingDetails: BookingConfirmationDetails | null;
  invoiceData: InvoiceData | null;
  onOpenInvoice: () => void;
  onClose: () => void;
}

const BookingConfirmationView: React.FC<BookingConfirmationViewProps> = ({
  bookingDetails,
  invoiceData,
  onOpenInvoice,
  onClose,
}) => {
  if (!bookingDetails) {
    return null;
  }

  return (
    <div className="text-center space-y-6 sm:space-y-8 py-4 sm:py-8">
      <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-green-600">Payment Successful!</h3>
        <p className="text-base sm:text-lg text-gray-600 px-4">Your trip has been booked successfully.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-linear-to-r from-green-50 to-emerald-50 p-4 sm:p-6 border-b border-green-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Booking Confirmed
          </h3>
          <p className="text-green-700 font-medium text-sm sm:text-base mt-2">
            Thank you! Your booking is confirmed. Details have been sent to your email.
          </p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bookingDetails.bookingId && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium text-sm sm:text-base">Booking ID:</span>
                <span className="font-bold text-blue-600 text-sm sm:text-base text-right">
                  {bookingDetails.bookingId.slice(-8).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600 font-medium text-sm sm:text-base">Route:</span>
              <span className="font-bold text-gray-900 text-sm sm:text-base text-right">
                {bookingDetails?.from} → {bookingDetails?.to}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600 font-medium text-sm sm:text-base">Price:</span>
              <span className="font-bold text-green-600 text-sm sm:text-base">{bookingDetails?.price}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600 font-medium text-sm sm:text-base">Seats:</span>
              <span className="font-bold text-gray-900 text-sm sm:text-base">
                {bookingDetails?.selectedSeats?.length} seat(s)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600 font-medium text-sm sm:text-base">Passengers:</span>
              <span className="font-bold text-gray-900 text-sm sm:text-base">
                {bookingDetails?.passengers?.length} passenger(s)
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 font-medium text-sm sm:text-base">Booked by:</span>
              <span className="font-bold text-gray-900 text-sm sm:text-base text-right">
                {bookingDetails?.bookerName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200 mx-2 sm:mx-0">
          <p className="text-blue-800 font-medium flex items-center gap-2 text-sm sm:text-base">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="break-all">Confirmation email sent to {bookingDetails?.bookerEmail}</span>
          </p>
        </div>

        {bookingDetails?.bookingId && (
          <div className="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-200 mx-2 sm:mx-0">
            <p className="text-green-800 font-medium flex items-center gap-2 text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Invoice ready - use "Print PDF" button below
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
          {invoiceData && (
            <button
              onClick={onOpenInvoice}
              className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-linear-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-linear-to-r from-[#179FDB] to-[#0f7ac3] text-white rounded-xl hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationView;
