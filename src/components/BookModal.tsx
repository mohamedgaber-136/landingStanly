"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  generateInvoicePDF,
  openInvoicePDF,
  type BookingData,
} from "@/utils/pdfGenerator";

interface Passenger {
  type: "ADULT" | "INFANT";
  name: string;
  passportNumberOrIdNumber: string;
  files: {
    type: "PASSPORT" | "BIRTH_CERTIFICATE";
    originalFilename: string;
    mimeType: string;
    base64Content: string;
  }[];
}

interface BookModalProps {
  isModalOpen: boolean;
  onClose: () => void;
  from: string;
  to: string;
  price: string; // e.g., "$120"
  availableSeats: number;
  tripData?: any;
}

const BookModal: React.FC<BookModalProps> = ({
  isModalOpen,
  onClose,
  from,
  to,
  price,
  availableSeats,
  tripData,
}) => {
  const router = useRouter();

  // Form state
  const [bookerName, setBookerName] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [bookerPhone, setBookerPhone] = useState("+20");
  const [phoneError, setPhoneError] = useState("");
  const [numberOfAdults, setNumberOfAdults] = useState(1);
  const [numberOfInfants, setNumberOfInfants] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [seats, setSeats] = useState<any[]>([]);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<BookingData | null>(null);

  // Reset all states when modal is closed
  const resetModalStates = () => {
    setPaymentUrl(null);
    setShowPayment(false);
    setBookingConfirmed(false);
    setCurrentBookingId(null);
    setBookingDetails(null);
    setInvoiceData(null);
    setPhoneError("");
  };

  // Enhanced onClose to reset states and cancel booking if needed
  const handleModalClose = async () => {
    // If user closes modal while on payment screen, cancel the booking
    if (showPayment && currentBookingId) {
      try {
        const token = localStorage.getItem("authToken");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        await fetch(`${apiUrl}/bookings/${currentBookingId}/cancel`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Booking cancelled due to modal close");
      } catch (error) {
        console.error("Error cancelling booking on modal close:", error);
      }
    }

    resetModalStates();
    onClose();
  };

  // Handle payment completion
  const handlePaymentComplete = async () => {
    if (!currentBookingId) {
      toast.error("No booking ID found");
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";

      // Check booking status
      const response = await fetch(`${apiUrl}/bookings/${currentBookingId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch booking status");
      }

      const bookingData = await response.json();
      console.log("Booking status:", bookingData);

      // Check if payment is completed (status not PENDING_PAYMENT)
      const completedStatuses = ["CONFIRMED", "COMPLETED", "PAID", "SUCCESS"];
      const isPaymentCompleted =
        completedStatuses.includes(bookingData.status) ||
        bookingData.status == "PENDING_PAYMENT";

      if (isPaymentCompleted) {
        // Payment is complete, generate PDF invoice
        const invoiceData = {
          bookingId: bookingData.id,
          tripId: bookingData.tripId || tripData?.id,
          from: from,
          to: to,
          departure: tripData?.departureTime || new Date().toISOString(),
          flightNumber: tripData?.flightNumber || "N/A",
          seats: selectedSeats,
          passengers: passengers.filter((p) => p.name.trim() !== ""),
          bookerName: bookerName,
          bookerEmail: bookerEmail,
          bookerPhone: bookerPhone,
          totalAmount: totalAmount,
          currency: tripData?.currency || "USD",
          bookingDate: bookingData.createdAt || new Date().toISOString(),
          paymentStatus: bookingData.status,
        };

        // Store invoice data for Print PDF button
        setInvoiceData(invoiceData);

        // Generate and open PDF invoice in new tab
        generateInvoicePDF(invoiceData);

        // Show success message
        toast.success("Payment completed! Invoice generated successfully.", {
          duration: 5000,
        });

        setShowPayment(false);
        setPaymentUrl(null);
        setCurrentBookingId(null);
        setBookingConfirmed(true);

        // Store booking details for confirmation screen
        setBookingDetails({
          from,
          to,
          price,
          selectedSeats,
          passengers: passengers.filter((p) => p.name.trim() !== ""),
          bookerName,
          bookerEmail,
          bookingId: bookingData.id,
          status: bookingData.status,
        });
      } else {
        // Payment still pending
        toast.error(
          "Payment is still pending. Please complete the payment first.",
          {
            duration: 4000,
          }
        );
      }
    } catch (error) {
      console.error("Error checking booking status:", error);
      toast.error("Failed to verify payment status. Please try again.", {
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle booking cancellation when going back from payment
  const handleCancelBooking = async () => {
    if (!currentBookingId) {
      // If no booking ID, just go back to booking form
      setShowPayment(false);
      setPaymentUrl(null);
      return;
    }

    // Confirm cancellation with user
    const confirmCancel = window.confirm(
      "Going back will cancel your current booking. Are you sure you want to continue?"
    );

    if (!confirmCancel) {
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(
        `${apiUrl}/bookings/${currentBookingId}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to cancel booking");
        // Even if cancellation fails, allow user to go back
      } else {
        console.log("Booking cancelled successfully");
      }

      // Reset states
      setShowPayment(false);
      setPaymentUrl(null);
      setCurrentBookingId(null);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      // Even if there's an error, allow user to go back
      setShowPayment(false);
      setPaymentUrl(null);
      setCurrentBookingId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize seats on component mount and when tripData changes
  useEffect(() => {
    // Generate seats from trip data or mock data
    let newSeats;

    // If we have real seat data from the API, use it
    if (tripData?.seatMap && Array.isArray(tripData.seatMap)) {
      newSeats = tripData.seatMap.map((seat: any) => ({
        id: seat.id, // This should be the UUID from the API
        seatNumber: seat.seatNumber,
        isAvailable: seat.isAvailable,
        isSelected: false,
      }));
    } else {
      // Fallback to mock data if no real seat data
      newSeats = [];
      const rows = 11; // 44 seats = 11 rows × 4 seats
      const seatsPerRow = 4;
      const seatLetters = ["A", "B", "C", "D"];

      for (let row = 1; row <= rows; row++) {
        for (let seatIndex = 0; seatIndex < seatsPerRow; seatIndex++) {
          newSeats.push({
            id: `mock-seat-${row}${seatLetters[seatIndex]}`, // Mock UUID-like ID
            seatNumber: `${row}${seatLetters[seatIndex]}`,
            isAvailable: Math.random() > 0.3, // 70% available
            isSelected: false,
          });
        }
      }
    }

    setSeats(newSeats);
  }, [tripData]);

  // Restore booking data if user came back from login
  useEffect(() => {
    if (isModalOpen) {
      const pendingBooking = localStorage.getItem("pendingBooking");
      if (pendingBooking) {
        try {
          const data = JSON.parse(pendingBooking);

          // Only restore if this modal matches the pending booking trip
          if (data.from === from && data.to === to) {
            setBookerName(data.bookerName || "");
            setBookerEmail(data.bookerEmail || "");
            setBookerPhone(data.bookerPhone || "+20");
            setNumberOfAdults(data.numberOfAdults || 1);
            setNumberOfInfants(data.numberOfInfants || 0);
            setSelectedSeats(data.selectedSeats || []);
            if (data.passengers) {
              setPassengers(data.passengers);
            }

            // Show specific restoration success message only if substantial data was restored
            const restoredItems = [];
            if (data.bookerName) restoredItems.push("contact info");
            if (data.selectedSeats?.length > 0)
              restoredItems.push(`${data.selectedSeats.length} selected seats`);
            if (data.passengers?.length > 0)
              restoredItems.push(`${data.passengers.length} passengers`);

            // Only show toast if there's meaningful data to restore
            if (restoredItems.length > 0) {
              toast.success(`Booking restored: ${restoredItems.join(", ")}`, {
                duration: 3000,
              });
            }
          }
        } catch (error) {
          console.error("Error restoring booking data:", error);
          localStorage.removeItem("pendingBooking");
        }
      }
    }
  }, [isModalOpen, from, to]);

  // Phone validation function
  const validatePhone = (phone: string): boolean => {
    // Phone should be in format +20123456789(exactly 14 characters)
    const phoneRegex = /^\+20\d{10}$/;
    return phoneRegex.test(phone);
  };

  // Handle phone input change
  const handlePhoneChange = (value: string) => {
    // Always ensure phone starts with +20
    if (!value.startsWith("+20")) {
      value = "+20" + value.replace(/^\+?20?/, "");
    }

    // Limit to 14 characters total (+20 + 10 digits)
    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    setBookerPhone(value);

    // Validate phone and set error
    if (value.length > 3) {
      // Only validate if user has typed more than "+20"
      if (!validatePhone(value)) {
        setPhoneError(
          "Phone number must be in format +20012345678 (11 digits after +20)"
        );
      } else {
        setPhoneError("");
      }
    } else {
      setPhoneError("");
    }
  };

  // Update passengers when adult/infant count changes
  useEffect(() => {
    const newPassengers: Passenger[] = [];

    // Add adult passengers only (infants don't need individual passenger forms)
    for (let i = 0; i < numberOfAdults; i++) {
      newPassengers.push({
        type: "ADULT",
        name: "",
        passportNumberOrIdNumber: "",
        files: [],
      });
    }

    setPassengers(newPassengers);
  }, [numberOfAdults]);

  // Handle seat selection when number of adults changes
  useEffect(() => {
    // Only run this effect when numberOfAdults changes, not when selectedSeats changes
    // to avoid infinite loops
    const currentSeatsCount = selectedSeats.length;

    // If we have more seats selected than adults, remove excess seats
    if (currentSeatsCount > numberOfAdults) {
      const newSelectedSeats = selectedSeats.slice(0, numberOfAdults);
      setSelectedSeats(newSelectedSeats);
      toast.success(
        `Adjusted seat selection to match ${numberOfAdults} adult(s)`,
        {
          duration: 3000,
        }
      );
    }
    // If we have fewer seats than adults and some seats are already selected,
    // clear all selections to let user reselect properly
    else if (currentSeatsCount > 0 && currentSeatsCount < numberOfAdults) {
      setSelectedSeats([]);
      toast(
        `Please select ${numberOfAdults} seat(s) for your updated booking`,
        {
          duration: 3000,
          icon: "ℹ️",
        }
      );
    }
  }, [numberOfAdults]);

  // Calculate total amount
  useEffect(() => {
    const basePrice = tripData?.basePrice || 200;
    const infantPrice = 50; // You might want to get this from API
    const total = numberOfAdults * basePrice + numberOfInfants * infantPrice;
    setTotalAmount(total);
  }, [numberOfAdults, numberOfInfants, tripData]);

  // Check if form is valid
  const isFormValid = () => {
    if (!bookerName || !bookerEmail || !bookerPhone) return false;
    if (phoneError || !validatePhone(bookerPhone)) return false;
    if (selectedSeats.length !== numberOfAdults) return false;

    // Check if all adult passengers have required info (files are optional)
    for (const passenger of passengers) {
      if (!passenger.name || !passenger.passportNumberOrIdNumber) return false;
    }

    return true;
  };

  const handleSeatClick = (seatId: string) => {
    const totalNeeded = numberOfAdults; // Infants don't need separate seats

    if (selectedSeats.includes(seatId)) {
      // Deselect seat
      setSelectedSeats((prev) => prev.filter((id) => id !== seatId));
    } else if (selectedSeats.length < totalNeeded) {
      // Select seat
      setSelectedSeats((prev) => [...prev, seatId]);
    }
  };

  const updatePassenger = (
    index: number,
    field: keyof Passenger,
    value: any
  ) => {
    setPassengers((prev) =>
      prev.map((passenger, i) =>
        i === index ? { ...passenger, [field]: value } : passenger
      )
    );
  };

  const handleFileUpload = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Content = reader.result as string;
        const fileData = {
          type:
            passengers[index].type === "ADULT"
              ? ("PASSPORT" as const)
              : ("BIRTH_CERTIFICATE" as const),
          originalFilename: file.name,
          mimeType: file.type,
          base64Content: base64Content.split(",")[1], // Remove data URL prefix
        };

        updatePassenger(index, "files", [fileData]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBooking = async () => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    const isLoggedIn = !!token;

    if (!isLoggedIn) {
      // Store complete booking data and search parameters for after login
      const bookingData = {
        // Trip and booking data
        tripData,
        bookerName,
        bookerEmail,
        bookerPhone,
        numberOfAdults,
        numberOfInfants,
        passengers,
        selectedSeats,
        totalAmount,
        from,
        to,
        returnUrl: window.location.pathname,
        shouldReopenModal: true,

        // Store search parameters to recreate the search
        searchParams: {
          from,
          to,
          // We can derive approximate dates or store them if available
          departure: tripData?.departureTime || new Date().toISOString(),
        },

        // Store the complete trip data so we don't lose it
        originalTripData: tripData,

        // Timestamp for data freshness
        timestamp: Date.now(),
      };
      localStorage.setItem("pendingBooking", JSON.stringify(bookingData));

      // Show toaster with countdown
      let countdown = 3;
      const toastId = toast.loading(
        `Please log in to complete your booking. Redirecting to login page in ${countdown} seconds...`,
        {
          duration: 3000,
        }
      );

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          toast.loading(
            `Please log in to complete your booking. Redirecting to login page in ${countdown} seconds...`,
            {
              id: toastId,
            }
          );
        }
      }, 1000);

      // Redirect after countdown
      setTimeout(() => {
        clearInterval(countdownInterval);
        toast.dismiss(toastId);
        toast.success("Redirecting to login page...", { duration: 2000 });
        router.push("/signin");
        onClose();
      }, 3000);

      return;
    }

    setIsLoading(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";

      // Step 1: Create booking
      const bookingData = {
        tripId: tripData?.id,
        travelerName: bookerName,
        travelerEmail: bookerEmail,
        travelerPhone: bookerPhone,
        seatIds: selectedSeats,
        passengers: [
          ...passengers.map((p) => ({
            type: p.type,
            name: p.name,
            passportNumberOrIdNumber: p.passportNumberOrIdNumber,
            files: p.files || [],
          })),
          // Add infants if any
          ...Array.from({ length: numberOfInfants }).map((_, i) => ({
            type: "INFANT",
            name: `Infant ${i + 1}`,
            passportNumberOrIdNumber: "",
            files: [],
          })),
        ],
      };

      const bookingResponse = await fetch(`${apiUrl}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      if (!bookingResponse.ok) {
        throw new Error("Booking creation failed");
      }

      const bookingResult = await bookingResponse.json();
      console.log("Booking created:", bookingResult);

      // Store booking ID for potential cancellation
      setCurrentBookingId(bookingResult.id);

      // Step 2: Create payment intent
      const paymentData = {
        firstName: bookerName.split(" ")[0] || bookerName,
        lastName: bookerName.split(" ").slice(1).join(" ") || bookerName,
        email: bookerEmail,
        phone: bookerPhone,
        city: "Cairo", // You might want to make this dynamic
        country: "EG",
      };

      const paymentResponse = await fetch(
        `${apiUrl}/bookings/${bookingResult.id}/payments/intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(paymentData),
        }
      );

      if (!paymentResponse.ok) {
        throw new Error("Payment intent creation failed");
      }

      const paymentResult = await paymentResponse.json();
      console.log("Payment intent created:", paymentResult);

      // Clear pending booking data
      localStorage.removeItem("pendingBooking");

      // Show payment iframe instead of redirecting
      if (paymentResult.redirectUrl) {
        setPaymentUrl(paymentResult.redirectUrl);
        setShowPayment(true);
      } else {
        // If no payment URL, show success message
        toast.success("Booking created successfully!", {
          duration: 4000,
        });
        onClose();
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Booking failed. Please try again.",
        {
          duration: 4000,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isModalOpen) return null;

  // Don't show modal if no seats are available
  if (availableSeats === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
        <div className="relative">
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 lg:p-8 pb-4 sm:pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {bookingConfirmed
                  ? "Booking Confirmed!"
                  : showPayment
                  ? "Complete Payment"
                  : `Book Trip: ${from} → ${to}`}
              </h2>
            </div>
            <button
              onClick={handleModalClose}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
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
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(95vh-80px)] sm:max-h-[calc(90vh-120px)] p-4 sm:p-6 lg:p-8">
            {/* Booking confirmation view */}
            {bookingConfirmed ? (
              <div className="text-center space-y-6 sm:space-y-8 py-4 sm:py-8">
                <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-2xl sm:text-3xl font-bold text-green-600">
                    Payment Successful!
                  </h3>
                  <p className="text-base sm:text-lg text-gray-600 px-4">
                    Your trip has been booked successfully.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 lg:p-8 text-left max-w-full sm:max-w-md mx-auto border border-gray-200">
                  <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-900 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
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
                  </h4>
                  <div className="space-y-3 sm:space-y-4">
                    {bookingDetails?.bookingId && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600 font-medium text-sm sm:text-base">
                          Booking ID:
                        </span>
                        <span className="font-bold text-blue-600 text-sm sm:text-base text-right">
                          {bookingDetails.bookingId.slice(-8).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 font-medium text-sm sm:text-base">
                        Route:
                      </span>
                      <span className="font-bold text-gray-900 text-sm sm:text-base text-right">
                        {bookingDetails?.from} → {bookingDetails?.to}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 font-medium text-sm sm:text-base">
                        Price:
                      </span>
                      <span className="font-bold text-green-600 text-sm sm:text-base">
                        {bookingDetails?.price}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 font-medium text-sm sm:text-base">
                        Seats:
                      </span>
                      <span className="font-bold text-gray-900 text-sm sm:text-base">
                        {bookingDetails?.selectedSeats?.length} seat(s)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 font-medium text-sm sm:text-base">
                        Passengers:
                      </span>
                      <span className="font-bold text-gray-900 text-sm sm:text-base">
                        {bookingDetails?.passengers?.length} passenger(s)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 font-medium text-sm sm:text-base">
                        Booked by:
                      </span>
                      <span className="font-bold text-gray-900 text-sm sm:text-base text-right">
                        {bookingDetails?.bookerName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200 mx-2 sm:mx-0">
                    <p className="text-blue-800 font-medium flex items-center gap-2 text-sm sm:text-base">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
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
                        Confirmation email sent to {bookingDetails?.bookerEmail}
                      </span>
                    </p>
                  </div>

                  {bookingDetails?.bookingId && (
                    <div className="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-200 mx-2 sm:mx-0">
                      <p className="text-green-800 font-medium flex items-center gap-2 text-sm sm:text-base">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
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
                        Invoice ready - use "Print PDF" button below
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                    {invoiceData && (
                      <button
                        onClick={() => {
                          try {
                            openInvoicePDF(invoiceData);
                            toast.success("Opening PDF invoice in new tab...", {
                              duration: 3000,
                            });
                          } catch (error) {
                            toast.error(
                              "Failed to open PDF. Please try again.",
                              {
                                duration: 4000,
                              }
                            );
                          }
                        }}
                        className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-5 h-5"
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
                        Print PDF
                      </button>
                    )}
                    <button
                      onClick={handleModalClose}
                      className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-[#179FDB] to-[#0f7ac3] text-white rounded-xl hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : showPayment && paymentUrl ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <h3 className="text-lg sm:text-xl font-bold text-blue-900">
                      {isLoading
                        ? "Processing Payment..."
                        : "Complete Your Payment"}
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

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 sm:pt-6 border-t-2 border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 rounded-2xl">
                  <button
                    onClick={handleCancelBooking}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm sm:text-base"
                  >
                    {isLoading ? "Cancelling..." : "← Back to Booking"}
                  </button>
                  <div className="text-center order-first sm:order-0">
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">
                      Secure payment powered by
                    </div>
                    <div className="text-base sm:text-lg font-bold text-blue-600">
                      Paymob
                    </div>
                  </div>
                  <button
                    onClick={handlePaymentComplete}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2 justify-center">
                        <svg
                          className="animate-spin w-4 h-4 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Verifying...
                      </div>
                    ) : (
                      "Payment Complete ✓"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Modern responsive booking form */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
                {/* Left Column - Seat Selection */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
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
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Select Seats
                    </h3>
                    <p className="text-blue-700 font-medium text-sm sm:text-base">
                      Select {numberOfAdults} seat
                      {numberOfAdults > 1 ? "s" : ""} for adults
                      {numberOfInfants > 0 &&
                        ` (${numberOfInfants} infant${
                          numberOfInfants > 1 ? "s" : ""
                        } will share)`}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-100 shadow-sm">
                    <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm sm:max-w-md mx-auto">
                      {seats.map((seat: any) => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat.id)}
                          disabled={!seat.isAvailable}
                          className={`
                            p-2 sm:p-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold border-2 transition-all duration-200 transform hover:scale-105
                            ${
                              !seat.isAvailable
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300"
                                : selectedSeats.includes(seat.id)
                                ? "bg-gradient-to-br from-[#179FDB] to-[#0f7ac3] text-white border-[#179FDB] shadow-lg"
                                : "bg-white border-gray-300 hover:border-[#179FDB] hover:bg-blue-50 text-gray-700"
                            }
                          `}
                        >
                          {seat.seatNumber}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white border-2 border-gray-300 rounded-lg"></div>
                        <span className="font-medium text-gray-600">
                          Available
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-[#179FDB] to-[#0f7ac3] border-2 border-[#179FDB] rounded-lg"></div>
                        <span className="font-medium text-gray-600">
                          Selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-200 border-2 border-gray-300 rounded-lg"></div>
                        <span className="font-medium text-gray-600">
                          Occupied
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Passenger Information */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Passenger Information
                    </h3>
                  </div>

                  {/* Contact Information Card */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                    <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-blue-600"
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
                      Contact Information
                    </h4>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={bookerName}
                          onChange={(e) => setBookerName(e.target.value)}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 font-medium"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={bookerEmail}
                          onChange={(e) => setBookerEmail(e.target.value)}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 font-medium"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="tel"
                          placeholder="Phone Number (+2001011005130)"
                          value={bookerPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className={`w-full p-4 border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 font-medium ${
                            phoneError
                              ? "border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50"
                              : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                          }`}
                        />
                        {phoneError && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm font-medium flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {phoneError}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Number of Passengers */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                    <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Number of Passengers
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-700 mb-3">
                          Adults
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={availableSeats}
                          value={numberOfAdults}
                          onChange={(e) =>
                            setNumberOfAdults(Number(e.target.value))
                          }
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 font-medium text-center text-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-3">
                          Infants
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={numberOfInfants}
                          onChange={(e) =>
                            setNumberOfInfants(Number(e.target.value))
                          }
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 font-medium text-center text-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passenger Details */}
                  {passengers.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-orange-600"
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
                        Passenger Details
                      </h4>
                      {passengers.map((passenger, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm"
                        >
                          <h5 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            {passenger.type === "ADULT" ? "Adult" : "Infant"}{" "}
                            {index + 1}
                          </h5>
                          <div className="space-y-4">
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={passenger.name}
                              onChange={(e) =>
                                updatePassenger(index, "name", e.target.value)
                              }
                              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all duration-200 font-medium"
                            />
                            <input
                              type="text"
                              placeholder={
                                passenger.type === "ADULT"
                                  ? "Passport Number"
                                  : "ID Number"
                              }
                              value={passenger.passportNumberOrIdNumber}
                              onChange={(e) =>
                                updatePassenger(
                                  index,
                                  "passportNumberOrIdNumber",
                                  e.target.value
                                )
                              }
                              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all duration-200 font-medium"
                            />
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                {passenger.type === "ADULT"
                                  ? "Passport (Optional)"
                                  : "Birth Certificate (Optional)"}
                              </label>
                              <input
                                type="file"
                                accept={
                                  passenger.type === "ADULT"
                                    ? "image/*"
                                    : "application/pdf,image/*"
                                }
                                onChange={(e) => handleFileUpload(index, e)}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-all duration-200 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
                    <button
                      onClick={handleModalClose}
                      className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-bold text-gray-700 shadow-sm text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBooking}
                      disabled={isLoading || !isFormValid()}
                      className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 rounded-xl bg-gradient-to-r from-[#179FDB] to-[#0f7ac3] text-white hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none text-sm sm:text-base"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2 justify-center">
                          <svg
                            className="animate-spin w-4 h-4 sm:w-5 sm:h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Booking...
                        </div>
                      ) : (
                        "Book Now"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookModal;
