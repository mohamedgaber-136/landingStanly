"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, useCallback } from "react";
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

  const parsePriceValue = useCallback((value: any) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

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
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [seatError, setSeatError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<BookingData | null>(null);
  const skipPassengerSyncRef = useRef(false);
  const formatSeatPrice = useCallback(
    (seat?: any) => {
      const currency = seat?.currency || tripData?.currency || "EGP";
      const formatAmount = (value?: number) =>
        typeof value === "number" ? `${currency} ${value}` : `${currency} —`;
      const fallbackOneWay =
        parsePriceValue(seat?.oneWayBasePrice) ??
        parsePriceValue(tripData?.oneWayBasePrice) ??
        parsePriceValue(tripData?.basePrice);
      const fallbackRoundTrip =
        parsePriceValue(seat?.roundTripBasePrice) ??
        parsePriceValue(tripData?.roundTripBasePrice) ??
        parsePriceValue(tripData?.basePrice);
      return {
        oneWayLabel: `One Way: ${formatAmount(fallbackOneWay)}`,
        roundTripLabel: `Round Trip: ${formatAmount(fallbackRoundTrip)}`,
      };
    },
    [
      tripData?.oneWayBasePrice,
      tripData?.roundTripBasePrice,
      tripData?.basePrice,
      tripData?.currency,
      parsePriceValue,
    ]
  );

  const createEmptyPassenger = (): Passenger => ({
    type: "ADULT",
    name: "",
    passportNumberOrIdNumber: "",
    files: [],
  });

  const isValidUUID = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );

  // Handle payment success redirect from Paymob
  useEffect(() => {
    if (isModalOpen) {
      const paymentSuccessData = localStorage.getItem("paymentSuccessful");
      const pendingBooking = localStorage.getItem("pendingBooking");

      if (paymentSuccessData && pendingBooking) {
        try {
          const successData = JSON.parse(paymentSuccessData);
          const bookingData = JSON.parse(pendingBooking);

          // If payment was successful, show confirmation screen
          if (successData.shouldOpenModal && bookingData.paymentSuccessful) {
            // Set booking confirmation state
            setBookingConfirmed(true);
            setShowPayment(false);
            setPaymentUrl(null);

            // Restore booking details
            setBookerName(bookingData.bookerName || "");
            setBookerEmail(bookingData.bookerEmail || "");
            setBookerPhone(bookingData.bookerPhone || "");
            setNumberOfAdults(bookingData.numberOfAdults || 1);
            setNumberOfInfants(bookingData.numberOfInfants || 0);
            setSelectedSeats(bookingData.selectedSeats || []);
            skipPassengerSyncRef.current = true;
            setPassengers(bookingData.passengers || []);
            setTotalAmount(bookingData.totalAmount || 0);

            // Set booking details for confirmation screen
            setBookingDetails({
              from: bookingData.from,
              to: bookingData.to,
              price: bookingData.price || bookingData.totalAmount,
              selectedSeats: bookingData.selectedSeats,
              passengers: bookingData.passengers,
              bookerName: bookingData.bookerName,
              bookerEmail: bookingData.bookerEmail,
              bookingId: successData.merchantOrderId,
              status: "CONFIRMED",
            });

            // Clear the payment success flag
            localStorage.removeItem("paymentSuccessful");

            toast.success("Payment confirmed! Your booking is complete.", {
              duration: 4000,
            });
          }
        } catch (error) {
          console.error("Error handling payment success in modal:", error);
        }
      }
    }
  }, [isModalOpen]);

  // Reset all states when modal is closed
  const resetModalStates = () => {
    setPaymentUrl(null);
    setShowPayment(false);
    setBookingConfirmed(false);
    setCurrentBookingId(null);
    setBookingDetails(null);
    setInvoiceData(null);
    setPhoneError("");
    setSeatError(null);
    setSelectedSeats([]);
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
          currency: "EGP",
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

  // Initialize seats when modal opens or trip changes
  useEffect(() => {
    const loadSeats = async () => {
      if (!isModalOpen || !tripData?.id) {
        setSeats([]);
        return;
      }

      setIsLoadingSeats(true);
      setSeatError(null);

      try {
        let seatMap = Array.isArray(tripData.seatMap) ? tripData.seatMap : null;

        if (!seatMap || seatMap.length === 0) {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL ||
            "https://api.stanlyegypt.com/api/v1";
          const response = await fetch(`${apiUrl}/trips/${tripData.id}`);

          if (!response.ok) {
            throw new Error("Unable to load seat map");
          }

          const tripDetails = await response.json();
          seatMap = Array.isArray(tripDetails?.seatMap)
            ? tripDetails.seatMap
            : Array.isArray(tripDetails?.data?.seatMap)
            ? tripDetails.data.seatMap
            : [];
        }

        const normalizedSeats = (seatMap || [])
          .map((seat: any) => ({
            id: seat.id,
            seatNumber: seat.seatNumber,
            isAvailable:
              typeof seat.isAvailable === "boolean" ? seat.isAvailable : true,
            oneWayBasePrice:
              parsePriceValue(seat.oneWayBasePrice) ??
              parsePriceValue(seat.effectivePrice) ??
              parsePriceValue(seat.seatPrice),
            roundTripBasePrice:
              parsePriceValue(seat.roundTripBasePrice),
            currency: seat.currency || tripData?.currency || "EGP",
          }))
          .filter((seat: any) => seat.id && isValidUUID(seat.id));

        if (normalizedSeats.length === 0) {
          setSeatError(
            "Seat map is not available for this trip yet. Please try again later."
          );
          setSeats([]);
          return;
        }

        setSeats(normalizedSeats);
      } catch (error) {
        console.error("Seat map load error:", error);
        setSeatError(
          "Unable to load seat availability right now. Please try again later."
        );
        setSeats([]);
      } finally {
        setIsLoadingSeats(false);
      }
    };

    loadSeats();
  }, [tripData, isModalOpen, parsePriceValue]);

  useEffect(() => {
    if (seats.length === 0) {
      setSelectedSeats([]);
      return;
    }

    setSelectedSeats((prev) =>
      prev.filter((seatId) => seats.some((seat) => seat.id === seatId))
    );
  }, [seats]);

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
              skipPassengerSyncRef.current = true;
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
    if (skipPassengerSyncRef.current) {
      skipPassengerSyncRef.current = false;
      return;
    }

    setPassengers((prev) => {
      if (numberOfAdults === prev.length) {
        return prev;
      }

      const nextPassengers: Passenger[] = [];
      for (let i = 0; i < numberOfAdults; i++) {
        nextPassengers.push(prev[i] ?? createEmptyPassenger());
      }
      return nextPassengers;
    });
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
    const basePrice =
      tripData?.oneWayBasePrice ??
      tripData?.roundTripBasePrice ??
      tripData?.basePrice ??
      200;
    const infantPrice = 50; // You might want to get this from API
    const total = numberOfAdults * basePrice + numberOfInfants * infantPrice;
    setTotalAmount(total);
  }, [numberOfAdults, numberOfInfants, tripData]);

  // Check if form is valid
  const isFormValid = () => {
    if (!bookerName || !bookerEmail || !bookerPhone) return false;
    if (phoneError || !validatePhone(bookerPhone)) return false;
    if (seats.length === 0 || seatError) return false;
    if (
      selectedSeats.length !== numberOfAdults ||
      selectedSeats.some((seatId) => !isValidUUID(seatId))
    )
      return false;

    // Check if all adult passengers have required info (files are optional)
    for (const passenger of passengers) {
      if (!passenger.name || !passenger.passportNumberOrIdNumber) return false;
      // Passport/ID should be at least 3 characters
      if (passenger.passportNumberOrIdNumber.trim().length < 3) return false;
    }

    return true;
  };

  const handleSeatClick = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return;
    if (!seat.isAvailable) {
      toast.error("This seat is no longer available.", { duration: 3000 });
      return;
    }
    if (!isValidUUID(seatId)) {
      toast.error("Seat information is invalid. Please reload and try again.", {
        duration: 4000,
      });
      return;
    }

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
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error("File size must be less than 5MB", { duration: 4000 });
        return;
      }

      // Check file type
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("File type must be JPEG, PNG, or PDF", { duration: 4000 });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Content = reader.result as string;
        const base64String = base64Content.split(",")[1]; // Remove data URL prefix

        if (!base64String) {
          toast.error("Failed to read file. Please try again.", {
            duration: 4000,
          });
          return;
        }

        const fileData = {
          type:
            passengers[index].type === "ADULT"
              ? ("PASSPORT" as const)
              : ("BIRTH_CERTIFICATE" as const),
          originalFilename: file.name,
          mimeType: file.type,
          base64Content: base64String,
        };

        console.log(
          `File uploaded for passenger ${index}:`,
          `Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
        );

        updatePassenger(index, "files", [fileData]);
        toast.success("File uploaded successfully", { duration: 2000 });
      };

      reader.onerror = () => {
        toast.error("Failed to read file. Please try again.", {
          duration: 4000,
        });
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRemovePassengerFile = (
    passengerIndex: number,
    fileIndex: number
  ) => {
    setPassengers((prev) =>
      prev.map((passenger, idx) => {
        if (idx !== passengerIndex) return passenger;
        const files = Array.isArray(passenger.files)
          ? [...passenger.files]
          : [];
        files.splice(fileIndex, 1);
        return { ...passenger, files };
      })
    );
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
      if (!tripData?.id) {
        toast.error(
          "Trip details missing. Please close the modal and try again.",
          {
            duration: 4000,
          }
        );
        setIsLoading(false);
        return;
      }

      if (seats.length === 0 || seatError) {
        toast.error("Seat map not available. Please try again later.", {
          duration: 4000,
        });
        setIsLoading(false);
        return;
      }

      if (selectedSeats.some((seatId) => !isValidUUID(seatId))) {
        toast.error(
          "Selected seats are invalid. Please reselect seats and try again.",
          { duration: 4000 }
        );
        setIsLoading(false);
        return;
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";

      // Step 1: Create booking
      const bookingData = {
        tripId: tripData.id,
        travelerName: bookerName,
        travelerEmail: bookerEmail,
        travelerPhone: bookerPhone,
        seatIds: selectedSeats,
        passengers: [
          ...passengers
            .filter((p) => p.name.trim() !== "") // Only include passengers with names
            .map((p) => ({
              type: p.type,
              name: p.name.trim(),
              passportNumberOrIdNumber: p.passportNumberOrIdNumber.trim(),
              files: Array.isArray(p.files) ? p.files : [],
            })),
          // Add infants if any
          ...Array.from({ length: numberOfInfants }).map((_, i) => ({
            type: "INFANT" as const,
            name: `Infant ${i + 1}`,
            passportNumberOrIdNumber: "",
            files: [],
          })),
        ],
      };

      console.log(
        "Booking payload being sent:",
        JSON.stringify(bookingData, null, 2)
      );

      const bookingResponse = await fetch(`${apiUrl}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      if (!bookingResponse.ok) {
        const errorResponse = await bookingResponse.text();
        console.error("Booking creation error response:", errorResponse);
        throw new Error(
          `Booking creation failed: ${bookingResponse.status} ${bookingResponse.statusText}`
        );
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
        const errorResponse = await paymentResponse.text();
        console.error("Payment intent creation error response:", errorResponse);
        throw new Error(
          `Payment intent creation failed: ${paymentResponse.status} ${paymentResponse.statusText}`
        );
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
                <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
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

                <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 lg:p-8 text-left max-w-full sm:max-w-md mx-auto border border-gray-200">
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
                        className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-linear-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
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
                      className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-linear-to-r from-[#179FDB] to-[#0f7ac3] text-white rounded-xl hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : showPayment && paymentUrl ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6">
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

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 sm:pt-6 border-t-2 border-gray-100 bg-linear-to-r from-gray-50 to-gray-100 p-4 sm:p-6 rounded-2xl">
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
                </div>
              </div>
            ) : (
              /* Modern responsive booking form */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
                {/* Left Column - Seat Selection */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
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
                    {isLoadingSeats ? (
                      <div className="text-center py-6 text-sm text-gray-500">
                        Loading seats...
                      </div>
                    ) : seatError ? (
                      <div className="text-center py-6 text-sm text-red-600">
                        {seatError}
                      </div>
                    ) : seats.length === 0 ? (
                      <div className="text-center py-6 text-sm text-gray-500">
                        Seat map is unavailable for this trip.
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm sm:max-w-md mx-auto">
                        {seats.map((seat: any) => {
                          const { oneWayLabel, roundTripLabel } =
                            formatSeatPrice(seat);
                          return (
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
                                    ? "bg-linear-to-br from-[#179FDB] to-[#0f7ac3] text-white border-[#179FDB] shadow-lg"
                                    : "bg-white border-gray-300 hover:border-[#179FDB] hover:bg-blue-50 text-gray-700"
                                }
                              `}
                            >
                              <span className="block text-sm sm:text-base leading-none">
                                {seat.seatNumber}
                              </span>
                              <span className="block text-[10px] sm:text-xs font-normal text-gray-600 mt-1">
                                {oneWayLabel}
                              </span>
                              <span className="block text-[10px] sm:text-xs font-normal text-gray-600">
                                {roundTripLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {seats.length > 0 && !seatError ? (
                      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white border-2 border-gray-300 rounded-lg"></div>
                          <span className="font-medium text-gray-600">
                            Available
                          </span>
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-linear-to-br from-[#179FDB] to-[#0f7ac3] border-2 border-[#179FDB] rounded-lg"></div>
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
                    ) : null}
                  </div>
                </div>

                {/* Right Column - Passenger Information */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
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
                            <div className="w-8 h-8 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
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
                                  ? "Passport Number or ID Number"
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
                              {passenger.files?.length ? (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs text-gray-500">
                                    Uploaded files stay attached even if you
                                    return after logging in again.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {passenger.files.map((file, fileIdx) => (
                                      <span
                                        key={`${file.originalFilename}-${fileIdx}`}
                                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold border border-orange-200"
                                      >
                                        {file.originalFilename ||
                                          "Uploaded document"}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemovePassengerFile(
                                              index,
                                              fileIdx
                                            )
                                          }
                                          className="text-orange-500 hover:text-orange-700"
                                          aria-label="Remove file"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
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
                      className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 rounded-xl bg-linear-to-r from-[#179FDB] to-[#0f7ac3] text-white hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none text-sm sm:text-base"
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
