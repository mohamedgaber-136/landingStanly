"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { openInvoicePDF, type BookingData } from "@/utils/pdfGenerator";

interface BookingDetails {
  from: string;
  to: string;
  price: string;
  selectedSeats: string[];
  passengers: any[];
  bookerName: string;
  bookerEmail: string;
  bookingId: string;
  status: string;
}

const PaymentSuccessPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(
    null
  );
  const [invoiceData, setInvoiceData] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      // Get query parameters from Paymob redirect
      const merchantOrderId = searchParams.get("merchant_order_id");
      const orderId = searchParams.get("order_id");
      const success = searchParams.get("success");

      console.log("Payment Success Page - Query Params:", {
        merchantOrderId,
        orderId,
        success,
      });

      // Get pending booking data from localStorage
      const pendingBooking = localStorage.getItem("pendingBooking");

      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking);

          // Verify the booking from the API using the merchant order ID
          if (merchantOrderId) {
            verifyPayment(merchantOrderId, bookingData);
          }
        } catch (error) {
          console.error("Error parsing pending booking:", error);
          toast.error("Error processing booking details", { duration: 4000 });
        }
      } else {
        toast.error("No pending booking found", { duration: 4000 });
        setTimeout(() => router.push("/"), 3000);
      }
    } catch (error) {
      console.error("Error in payment success page:", error);
      toast.error("An error occurred", { duration: 4000 });
    }
  }, [searchParams, router]);

  const verifyPayment = async (bookingId: string, bookingData: any) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";

      // Verify the booking status with the backend
      const response = await fetch(`${apiUrl}/bookings/${bookingId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to verify booking");
      }

      const verifiedBooking = await response.json();
      console.log("Verified booking:", verifiedBooking);

      // Check if payment is completed
      const completedStatuses = ["CONFIRMED", "COMPLETED", "PAID", "SUCCESS"];
      const isPaymentCompleted =
        completedStatuses.includes(verifiedBooking.status) ||
        verifiedBooking.status === "PENDING_PAYMENT";

      if (isPaymentCompleted) {
        // Prepare invoice data
        const invoiceData = {
          bookingId: verifiedBooking.id,
          tripId: verifiedBooking.tripId || bookingData.originalTripData?.id,
          from: bookingData.from,
          to: bookingData.to,
          departure:
            bookingData.originalTripData?.departureTime ||
            new Date().toISOString(),
          flightNumber: bookingData.originalTripData?.flightNumber || "N/A",
          seats: bookingData.selectedSeats,
          passengers: bookingData.passengers.filter(
            (p: any) => p.name.trim() !== ""
          ),
          bookerName: bookingData.bookerName,
          bookerEmail: bookingData.bookerEmail,
          bookerPhone: bookingData.bookerPhone,
          totalAmount: bookingData.totalAmount,
          currency: "EGP",
          bookingDate: verifiedBooking.createdAt || new Date().toISOString(),
          paymentStatus: verifiedBooking.status,
        };

        // Set booking details for display
        setBookingDetails({
          from: bookingData.from,
          to: bookingData.to,
          price: bookingData.price || bookingData.totalAmount,
          selectedSeats: bookingData.selectedSeats,
          passengers: bookingData.passengers.filter(
            (p: any) => p.name.trim() !== ""
          ),
          bookerName: bookingData.bookerName,
          bookerEmail: bookingData.bookerEmail,
          bookingId: verifiedBooking.id,
          status: verifiedBooking.status,
        });

        setInvoiceData(invoiceData);

        // Auto-generate PDF
        setTimeout(() => {
          generateInvoicePDF(invoiceData);
        }, 500);

        toast.success("Payment confirmed! Your booking is complete.", {
          duration: 4000,
        });

        // Clear pending booking data
        localStorage.removeItem("pendingBooking");
      } else {
        toast.error("Payment verification failed. Please contact support.", {
          duration: 4000,
        });
        setTimeout(() => router.push("/"), 3000);
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast.error("Failed to verify payment. Please contact support.", {
        duration: 4000,
      });
      setTimeout(() => router.push("/"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInvoicePDF = (data: BookingData) => {
    try {
      openInvoicePDF(data);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate invoice PDF", { duration: 4000 });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl">
        {isLoading ? (
          /* Loading State */
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center border border-gray-100">
            <div className="animate-spin w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Verifying Payment...
            </h2>
            <p className="text-gray-600 font-medium text-base sm:text-lg">
              Please wait while we confirm your booking
            </p>
          </div>
        ) : bookingDetails ? (
          /* Success State */
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center border border-gray-100">
              <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg mb-8">
                <svg
                  className="w-12 h-12 sm:w-16 sm:h-16 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">
                Payment Successful!
              </h1>
              <p className="text-gray-600 font-medium text-base sm:text-lg mb-8">
                Your trip has been booked successfully.
              </p>

              {/* Booking Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 text-left border border-gray-200 mb-8">
                <h3 className="text-lg sm:text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Booking Summary
                </h3>
                <div className="space-y-4 sm:space-y-5">
                  {bookingDetails.bookingId && (
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-gray-600 font-medium text-sm sm:text-base">
                        Booking ID:
                      </span>
                      <span className="font-bold text-blue-600 text-sm sm:text-base text-right">
                        {bookingDetails.bookingId.slice(-8).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">
                      Route:
                    </span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base text-right">
                      {bookingDetails.from} → {bookingDetails.to}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">
                      Seats:
                    </span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {bookingDetails.selectedSeats.length} seat(s)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">
                      Passengers:
                    </span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {bookingDetails.passengers.length} passenger(s)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">
                      Price:
                    </span>
                    <span className="font-bold text-green-600 text-sm sm:text-base">
                      {bookingDetails.price}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">
                      Booked by:
                    </span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base text-right">
                      {bookingDetails.bookerName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="space-y-4 mb-8">
                <div className="bg-blue-50 rounded-xl p-4 sm:p-5 border border-blue-200">
                  <p className="text-blue-800 font-medium flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="break-all">
                      Confirmation email sent to {bookingDetails.bookerEmail}
                    </span>
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-4 sm:p-5 border border-green-200">
                  <p className="text-green-800 font-medium flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Your invoice has been generated and will be available below
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {invoiceData && (
                  <button
                    onClick={() => {
                      generateInvoicePDF(invoiceData);
                      toast.success("Opening PDF invoice...", {
                        duration: 3000,
                      });
                    }}
                    className="w-full flex-1 px-6 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Print Invoice
                  </button>
                )}
                <button
                  onClick={() => router.push("/")}
                  className="w-full flex-1 px-6 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-[#179FDB] to-[#0f7ac3] text-white rounded-xl hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Error State */
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center border border-gray-100">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center shadow-lg mb-6">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">
              Error Processing Payment
            </h2>
            <p className="text-gray-600 font-medium text-base sm:text-lg mb-8">
              We encountered an issue while processing your payment. Please try
              again or contact support.
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-4 bg-gradient-to-r from-[#179FDB] to-[#0f7ac3] text-white rounded-xl hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
