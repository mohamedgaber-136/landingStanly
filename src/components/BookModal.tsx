"use client";
import { useRouter } from "next/navigation";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import {
  generateInvoicePDF,
  openInvoicePDF,
  type BookingData,
} from "@/utils/pdfGenerator";
import SeatSelectionSection from "./bookModal/SeatSelectionSection";
import PassengerInformationSection from "./bookModal/PassengerInformationSection";
import PaymentView from "./bookModal/PaymentView";
import BookingConfirmationView from "./bookModal/BookingConfirmationView";
import type {
  Passenger,
  SeatInfo,
  SeatRow,
  BookModalProps,
  SeatLegendItem,
} from "./bookModal/types";

const SEAT_COLUMN_ORDER = ["A", "B", "C", "D"];

const DISPLAY_CURRENCY = "EGP";

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
  const [bookerPhone, setBookerPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [numberOfAdults, setNumberOfAdults] = useState(1);
  const [numberOfInfants, setNumberOfInfants] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [seatError, setSeatError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<BookingData | null>(null);
  const skipPassengerSyncRef = useRef(false);
  const [selectedTripType, setSelectedTripType] = useState<
    "ONE_WAY" | "ROUND_TRIP"
  >("ONE_WAY");
  const tripSeatMap = useMemo(() => {
    if (Array.isArray(tripData?.seatMap)) {
      return tripData.seatMap;
    }
    if (Array.isArray(tripData?.data?.seatMap)) {
      return tripData.data.seatMap;
    }
    return [];
  }, [tripData]);
  /**
   * Pick the correct seat price based on trip type.
   * ONE_WAY: Uses oneWayBasePrice (outbound trip only)
   * ROUND_TRIP: Uses roundTripBasePrice (outbound + return trip combined)
   *
   * The API provides prices where:
   * - oneWayBasePrice = price for one-way journey
   * - roundTripBasePrice = price for round-trip journey (both directions)
   */
  const pickSeatPrice = useCallback(
    (seat: SeatInfo | undefined, tripType: "ONE_WAY" | "ROUND_TRIP") => {
      if (!seat) return undefined;

      // Select the primary price based on trip type
      const primary =
        tripType === "ROUND_TRIP"
          ? parsePriceValue(seat?.roundTripBasePrice)
          : parsePriceValue(seat?.oneWayBasePrice);

      // Fallback to secondary price if primary is not available
      const secondary =
        tripType === "ROUND_TRIP"
          ? parsePriceValue(seat?.oneWayBasePrice)
          : parsePriceValue(seat?.roundTripBasePrice);

      // Try primary, then effectivePrice, then seatPrice, then secondary
      return (
        primary ??
        parsePriceValue(seat?.effectivePrice) ??
        parsePriceValue(seat?.seatPrice) ??
        secondary
      );
    },
    [parsePriceValue]
  );
  const formatSeatPrice = useCallback(
    (seat?: any) => {
      const seatCurrency = DISPLAY_CURRENCY;
      const formatAmount = (value?: number) =>
        typeof value === "number"
          ? `${value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })} ${seatCurrency}`
          : `— ${seatCurrency}`;
      const fallbackOneWay =
        pickSeatPrice(seat, "ONE_WAY") ??
        parsePriceValue(tripData?.oneWayBasePrice) ??
        parsePriceValue(tripData?.basePrice);
      const fallbackRoundTrip =
        pickSeatPrice(seat, "ROUND_TRIP") ??
        parsePriceValue(tripData?.roundTripBasePrice) ??
        parsePriceValue(tripData?.basePrice);
      return {
        oneWayLabel: `One Way: ${formatAmount(fallbackOneWay)}`,
        roundTripLabel: `Round Trip: ${formatAmount(fallbackRoundTrip)}`,
      };
    },
    [
      pickSeatPrice,
      tripData?.basePrice,
      tripData?.oneWayBasePrice,
      tripData?.roundTripBasePrice,
      parsePriceValue,
    ]
  );
  const seatOneWayFallback = useMemo(() => {
    const seatWithPrice = seats.find(
      (seat) => pickSeatPrice(seat, "ONE_WAY") !== undefined
    );
    return seatWithPrice ? pickSeatPrice(seatWithPrice, "ONE_WAY") : undefined;
  }, [pickSeatPrice, seats]);
  const seatRoundTripFallback = useMemo(() => {
    const seatWithPrice = seats.find(
      (seat) => pickSeatPrice(seat, "ROUND_TRIP") !== undefined
    );
    return seatWithPrice
      ? pickSeatPrice(seatWithPrice, "ROUND_TRIP")
      : undefined;
  }, [pickSeatPrice, seats]);
  const tripSeatFallbacks = useMemo(() => {
    const compute = (tripType: "ONE_WAY" | "ROUND_TRIP") => {
      for (const seat of tripSeatMap) {
        const price = pickSeatPrice(seat, tripType);
        if (price !== undefined) {
          return price;
        }
      }
      return undefined;
    };
    return {
      oneWay: compute("ONE_WAY"),
      roundTrip: compute("ROUND_TRIP"),
    };
  }, [pickSeatPrice, tripSeatMap]);
  const currency = DISPLAY_CURRENCY;
  const labelPriceFallbacks = useMemo(() => {
    if (typeof price !== "string" || price.trim().length === 0) {
      return { oneWay: undefined, roundTrip: undefined };
    }

    const normalized = price.replace(/,/g, "");
    const extractValue = (pattern: RegExp) => {
      const match = normalized.match(pattern);
      if (!match || match.length < 2) {
        return undefined;
      }
      return parsePriceValue(match[1]);
    };

    let oneWay = extractValue(/one\s*way[^0-9]*([0-9]+(?:\.\d+)?)/i);
    let roundTrip = extractValue(/round\s*trip[^0-9]*([0-9]+(?:\.\d+)?)/i);

    if (oneWay === undefined || roundTrip === undefined) {
      const numberMatches = normalized.match(/([0-9]+(?:\.\d+)?)/g) || [];
      const numericValues = numberMatches
        .map((value) => parsePriceValue(value))
        .filter((value): value is number => typeof value === "number");

      if (oneWay === undefined) {
        oneWay = numericValues[0];
      }
      if (roundTrip === undefined) {
        roundTrip = numericValues[1] ?? numericValues[0];
      }
    }

    return { oneWay, roundTrip };
  }, [price, parsePriceValue]);
  const formatCurrencyValue = useCallback(
    (value?: number) =>
      typeof value === "number"
        ? `${value.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })} ${currency}`
        : `— ${currency}`,
    [currency]
  );
  const baseTripPrice = useMemo(
    () => parsePriceValue(tripData?.basePrice),
    [tripData?.basePrice, parsePriceValue]
  );
  const tripOneWayFallback = tripSeatFallbacks.oneWay;
  const tripRoundTripFallback = tripSeatFallbacks.roundTrip;
  const labelOneWayFallback = labelPriceFallbacks.oneWay;
  const labelRoundTripFallback = labelPriceFallbacks.roundTrip;
  const oneWayPrice = useMemo(() => {
    const price =
      seatOneWayFallback ??
      tripOneWayFallback ??
      parsePriceValue(tripData?.oneWayBasePrice) ??
      labelOneWayFallback ??
      baseTripPrice;
    return price;
  }, [
    seatOneWayFallback,
    tripOneWayFallback,
    tripData?.oneWayBasePrice,
    labelOneWayFallback,
    baseTripPrice,
    parsePriceValue,
  ]);

  const roundTripPrice = useMemo(() => {
    const price =
      seatRoundTripFallback ??
      tripRoundTripFallback ??
      parsePriceValue(tripData?.roundTripBasePrice) ??
      labelRoundTripFallback ??
      baseTripPrice;
    return price;
  }, [
    seatRoundTripFallback,
    tripRoundTripFallback,
    tripData?.roundTripBasePrice,
    labelRoundTripFallback,
    baseTripPrice,
    parsePriceValue,
  ]);

  const defaultOneWayPrice = useMemo(
    () => parsePriceValue(tripData?.oneWayBasePrice) ?? baseTripPrice,
    [parsePriceValue, tripData?.oneWayBasePrice, baseTripPrice]
  );

  const defaultRoundTripPrice = useMemo(
    () => parsePriceValue(tripData?.roundTripBasePrice) ?? baseTripPrice,
    [parsePriceValue, tripData?.roundTripBasePrice, baseTripPrice]
  );

  const parseSeatPosition = useCallback((seatNumber?: string) => {
    if (!seatNumber) {
      return { rowNumber: null, columnLetter: null };
    }
    const normalized = seatNumber.toString().toUpperCase();
    const rowMatch = normalized.match(/\d+/);
    const rowNumber = rowMatch ? Number(rowMatch[0]) : null;
    const letterMatches = normalized.match(/[A-Z]+/g);
    const letterGroup = letterMatches ? letterMatches[letterMatches.length - 1] : null;
    const columnLetter = letterGroup ? letterGroup.slice(-1) : null;
    return { rowNumber, columnLetter };
  }, []);

  const sortedSeats = useMemo(
    () =>
      [...seats].sort((a, b) => {
        const metaA = parseSeatPosition(a?.seatNumber);
        const metaB = parseSeatPosition(b?.seatNumber);

        if (
          metaA.rowNumber !== null &&
          metaB.rowNumber !== null &&
          metaA.rowNumber !== metaB.rowNumber
        ) {
          return metaA.rowNumber - metaB.rowNumber;
        }

        if (metaA.rowNumber !== null && metaB.rowNumber === null) return -1;
        if (metaA.rowNumber === null && metaB.rowNumber !== null) return 1;

        const columnIndexA =
          metaA.columnLetter && SEAT_COLUMN_ORDER.includes(metaA.columnLetter)
            ? SEAT_COLUMN_ORDER.indexOf(metaA.columnLetter)
            : SEAT_COLUMN_ORDER.length;
        const columnIndexB =
          metaB.columnLetter && SEAT_COLUMN_ORDER.includes(metaB.columnLetter)
            ? SEAT_COLUMN_ORDER.indexOf(metaB.columnLetter)
            : SEAT_COLUMN_ORDER.length;

        if (columnIndexA !== columnIndexB) {
          return columnIndexA - columnIndexB;
        }

        return (a?.seatNumber || "").localeCompare(b?.seatNumber || "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }),
    [parseSeatPosition, seats]
  );

  const seatRows = useMemo(() => {
    if (sortedSeats.length === 0) {
      return [] as SeatRow[];
    }

    const rowsMap = new Map<
      string,
      {
        seatsByColumn: Partial<Record<string, SeatInfo | null>>;
        rowNumber: number | null;
        fallbackIndex: number;
      }
    >();

    sortedSeats.forEach((seat, index) => {
      const { rowNumber, columnLetter } = parseSeatPosition(seat?.seatNumber);
      const rowKey = rowNumber !== null ? `row-${rowNumber}` : `index-${index}`;

      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          seatsByColumn: {},
          rowNumber,
          fallbackIndex: index,
        });
      }

      const columnKey = columnLetter ?? `extra-${index}`;
      rowsMap.get(rowKey)!.seatsByColumn[columnKey] = seat;
    });

    return [...rowsMap.values()]
      .sort((a, b) => {
        if (
          a.rowNumber !== null &&
          b.rowNumber !== null &&
          a.rowNumber !== b.rowNumber
        ) {
          return a.rowNumber - b.rowNumber;
        }

        if (a.rowNumber !== null && b.rowNumber === null) return -1;
        if (a.rowNumber === null && b.rowNumber !== null) return 1;

        return a.fallbackIndex - b.fallbackIndex;
      })
      .map((rowData) => {
        const orderedSeats = SEAT_COLUMN_ORDER.map(
          (letter) => rowData.seatsByColumn[letter] ?? null
        );

        const leftovers = Object.entries(rowData.seatsByColumn)
          .filter(([key]) => !SEAT_COLUMN_ORDER.includes(key))
          .map(([, seat]) => seat ?? null);

        for (let i = 0; i < orderedSeats.length && leftovers.length > 0; i++) {
          if (!orderedSeats[i]) {
            orderedSeats[i] = leftovers.shift() ?? null;
          }
        }

        while (orderedSeats.length < 4) {
          orderedSeats.push(null);
        }

        return {
          left: orderedSeats.slice(0, 2),
          right: orderedSeats.slice(2, 4),
        };
      });
  }, [parseSeatPosition, sortedSeats]);

  const cabinColumnLabels = useMemo(
    () => ({ left: ["A", "B"], right: ["C", "D"] }),
    []
  );

  const getRowLabel = useCallback((row: SeatRow, fallbackIndex: number) => {
    const seatWithNumber = [...row.left, ...row.right].find(
      (seat) => seat?.seatNumber
    );
    if (!seatWithNumber?.seatNumber) {
      return fallbackIndex.toString();
    }
    const match = seatWithNumber.seatNumber.match(/(\d+)/);
    return match?.[1] ?? seatWithNumber.seatNumber;
  }, []);

  const getSeatPricingDetails = useCallback(
    (seat: SeatInfo | undefined) => {
      const seatOneWay = pickSeatPrice(seat, "ONE_WAY");
      const seatRoundTrip = pickSeatPrice(seat, "ROUND_TRIP");
      const differs = (seatValue?: number, baseValue?: number) => {
        if (typeof seatValue === "number" && typeof baseValue === "number") {
          return Math.abs(seatValue - baseValue) > 0.009;
        }
        if (typeof seatValue === "number" && typeof baseValue !== "number") {
          return true;
        }
        return false;
      };

      const hasCustomPricing =
        differs(seatOneWay, defaultOneWayPrice) ||
        differs(seatRoundTrip, defaultRoundTripPrice);

      return { seatOneWay, seatRoundTrip, hasCustomPricing };
    },
    [defaultOneWayPrice, defaultRoundTripPrice, pickSeatPrice]
  );
  const selectedPriceValue =
    selectedTripType === "ROUND_TRIP" ? roundTripPrice : oneWayPrice;
  const selectedPriceLabel = useMemo(
    () => formatCurrencyValue(selectedPriceValue),
    [formatCurrencyValue, selectedPriceValue]
  );
  const infantPriceValue = useMemo(
    () => parsePriceValue(tripData?.infantPrice),
    [tripData?.infantPrice, parsePriceValue]
  );
  const fallbackSeatPrice = useMemo(() => {
    const seatTypeFallback =
      selectedTripType === "ROUND_TRIP"
        ? tripRoundTripFallback ?? seatRoundTripFallback
        : tripOneWayFallback ?? seatOneWayFallback;
    return selectedPriceValue ?? seatTypeFallback ?? baseTripPrice ?? 0;
  }, [
    baseTripPrice,
    seatOneWayFallback,
    seatRoundTripFallback,
    selectedPriceValue,
    selectedTripType,
    tripOneWayFallback,
    tripRoundTripFallback,
  ]);
  /**
   * Calculate the total cost of all selected seats based on the trip type.
   * - For ONE_WAY: Sum of all selected seats at one-way price
   * - For ROUND_TRIP: Sum of all selected seats at round-trip price (which includes both legs)
   *
   * Also tracks how many seats are missing price information for fallback calculation.
   */
  const seatPricingSummary = useMemo(() => {
    let total = 0;
    let seatsMissingPrice = 0;

    selectedSeats.forEach((seatId) => {
      const seat = seats.find((s) => s.id === seatId);
      if (!seat) {
        seatsMissingPrice += 1;
        return;
      }

      // Get the price for this seat based on the selected trip type
      const seatPrice = pickSeatPrice(seat, selectedTripType);

      if (typeof seatPrice === "number" && Number.isFinite(seatPrice)) {
        total += seatPrice;
      } else {
        seatsMissingPrice += 1;
      }
    });

    return { total, seatsMissingPrice };
  }, [pickSeatPrice, selectedSeats, seats, selectedTripType]);
  /**
   * Calculate the total cost for seats.
   *
   * If seats are selected:
   *   - Use actual prices from seatPricingSummary
   *   - For seats missing prices, use fallbackSeatPrice
   *
   * If no seats selected yet:
   *   - Estimate using fallbackSeatPrice * numberOfAdults
   *
   * The price used (fallbackSeatPrice) is already trip-type aware,
   * so this automatically handles ONE_WAY vs ROUND_TRIP correctly.
   */
  const seatTotal = useMemo(() => {
    if (selectedSeats.length > 0) {
      const { total, seatsMissingPrice } = seatPricingSummary;
      const fallbackContribution = seatsMissingPrice * fallbackSeatPrice;
      return total + fallbackContribution;
    }

    // No seats selected yet - estimate based on number of adults
    return fallbackSeatPrice * Math.max(numberOfAdults, 1);
  }, [
    fallbackSeatPrice,
    numberOfAdults,
    seatPricingSummary,
    selectedSeats.length,
  ]);
  /**
   * Calculate the total cost for infants.
   * Infants don't occupy separate seats, so they have a separate pricing model.
   */
  const infantsTotal = useMemo(() => {
    if (!infantPriceValue || numberOfInfants === 0) {
      return 0;
    }
    return infantPriceValue * numberOfInfants;
  }, [infantPriceValue, numberOfInfants]);
  /**
   * CENTRALIZED TOTAL AMOUNT CALCULATION
   *
   * This is the single source of truth for the total booking cost.
   *
   * Formula: totalAmount = seatTotal + infantsTotal
   *
   * Where:
   * - seatTotal = sum of selected seats at trip-type-specific prices
   *   * ONE_WAY: sum of seats × oneWayBasePrice
   *   * ROUND_TRIP: sum of seats × roundTripBasePrice (includes both legs)
   * - infantsTotal = numberOfInfants × infantPrice
   *
   * This automatically recalculates when:
   * - Selected seats change
   * - Trip type changes (ONE_WAY ↔ ROUND_TRIP)
   * - Number of infants changes
   * - Seat prices are loaded/updated
   */
  const computedTotalAmount = useMemo(
    () => (seatTotal || 0) + (infantsTotal || 0),
    [infantsTotal, seatTotal]
  );
  /**
   * Sync the computed total to state.
   * This updates whenever computedTotalAmount changes.
   *
   * Skip update if seats are selected but seat data hasn't loaded yet
   * to avoid showing incorrect prices.
   */
  useEffect(() => {
    if (selectedSeats.length > 0 && seats.length === 0) {
      return;
    }
    setTotalAmount(computedTotalAmount);

    // Debug logging for total amount calculation
    console.log("💰 Total Amount Calculation:", {
      tripType: selectedTripType,
      selectedSeatsCount: selectedSeats.length,
      seatTotal,
      infantsTotal,
      computedTotalAmount,
      currency: DISPLAY_CURRENCY,
    });
  }, [
    computedTotalAmount,
    seats.length,
    selectedSeats.length,
    selectedTripType,
    seatTotal,
    infantsTotal,
  ]);
  const formattedTotalAmount = useMemo(
    () => formatCurrencyValue(totalAmount),
    [formatCurrencyValue, totalAmount]
  );
  const buildPendingBookingData = useCallback(() => {
    if (!tripData) {
      return null;
    }

    const returnUrl =
      typeof window !== "undefined" ? window.location.pathname : "/";

    return {
      tripData,
      bookerName,
      bookerEmail,
      bookerPhone,
      numberOfAdults,
      numberOfInfants,
      passengers,
      selectedSeats,
      totalAmount,
      selectedTripType,
      price: formattedTotalAmount,
      pricePerSeat: selectedPriceLabel,
      from,
      to,
      returnUrl,
      shouldReopenModal: true,
      searchParams: {
        from,
        to,
        departure: tripData?.departureTime || new Date().toISOString(),
      },
      originalTripData: tripData,
      currency,
      timestamp: Date.now(),
    };
  }, [
    bookerEmail,
    bookerName,
    bookerPhone,
    from,
    numberOfAdults,
    numberOfInfants,
    passengers,
    formattedTotalAmount,
    selectedPriceLabel,
    selectedSeats,
    selectedTripType,
    to,
    totalAmount,
    tripData,
    currency,
  ]);
  const redirectToLoginForBooking = useCallback(() => {
    const pendingData = buildPendingBookingData();

    if (!pendingData) {
      toast.error("Trip details missing. Please search again.", {
        duration: 4000,
      });
      router.push("/signin");
      onClose();
      return;
    }

    localStorage.setItem("pendingBooking", JSON.stringify(pendingData));

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

    setTimeout(() => {
      clearInterval(countdownInterval);
      toast.dismiss(toastId);
      toast.success("Redirecting to login page...", { duration: 2000 });
      router.push("/signin");
      onClose();
    }, 3000);
  }, [buildPendingBookingData, onClose, router]);

  useEffect(() => {
    if (
      selectedTripType === "ONE_WAY" &&
      oneWayPrice === undefined &&
      roundTripPrice !== undefined
    ) {
      setSelectedTripType("ROUND_TRIP");
    } else if (
      selectedTripType === "ROUND_TRIP" &&
      roundTripPrice === undefined &&
      oneWayPrice !== undefined
    ) {
      setSelectedTripType("ONE_WAY");
    }
  }, [selectedTripType, oneWayPrice, roundTripPrice]);

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
            setSelectedTripType(bookingData.selectedTripType || "ONE_WAY");
            // Note: totalAmount will auto-calculate from selected seats and trip type

            // Set booking details for confirmation screen
            setBookingDetails({
              from: bookingData.from,
              to: bookingData.to,
              price:
                bookingData.price && bookingData.price.length > 0
                  ? bookingData.price
                  : formattedTotalAmount,
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
  }, [formattedTotalAmount, isModalOpen]);

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
    setSelectedTripType("ONE_WAY");
    setTotalAmount(0);
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
        const resolvedTotalAmount =
          typeof bookingData.totalAmount === "number"
            ? bookingData.totalAmount
            : totalAmount;
        const resolvedCurrency = currency;
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
          totalAmount: resolvedTotalAmount,
          currency: resolvedCurrency,
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
          price: formatCurrencyValue(invoiceData.totalAmount),
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
            roundTripBasePrice: parsePriceValue(seat.roundTripBasePrice),
            currency: DISPLAY_CURRENCY,
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
            setSelectedTripType(data.selectedTripType || "ONE_WAY");
            // Note: totalAmount will auto-calculate from selected seats and trip type
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
    // Phone should be at least 10 digits
    return phone.trim().length >= 10;
  };

  // Handle phone input change
  const handlePhoneChange = (value: string) => {
    setBookerPhone(value);

    // Validate phone and set error
    if (value.trim().length > 0) {
      if (!validatePhone(value)) {
        setPhoneError("Phone number must be at least 10 digits");
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
      const totalPassengers = numberOfAdults + numberOfInfants;
      if (totalPassengers === prev.length) {
        // Check if the distribution of adults vs infants is correct
        const adultsInArray = prev.filter((p) => p.type === "ADULT").length;
        const infantsInArray = prev.filter((p) => p.type === "INFANT").length;
        if (
          adultsInArray === numberOfAdults &&
          infantsInArray === numberOfInfants
        ) {
          return prev;
        }
      }

      const nextPassengers: Passenger[] = [];

      // Add adults
      for (let i = 0; i < numberOfAdults; i++) {
        const existingAdult = prev.find(
          (p, idx) =>
            p.type === "ADULT" &&
            prev.slice(0, idx).filter((pp) => pp.type === "ADULT").length === i
        );
        nextPassengers.push(existingAdult ?? createEmptyPassenger());
      }

      // Add infants
      for (let i = 0; i < numberOfInfants; i++) {
        const existingInfant = prev.find(
          (p, idx) =>
            p.type === "INFANT" &&
            prev.slice(0, idx).filter((pp) => pp.type === "INFANT").length === i
        );
        nextPassengers.push(
          existingInfant ?? {
            ...createEmptyPassenger(),
            type: "INFANT" as const,
          }
        );
      }

      return nextPassengers;
    });
  }, [numberOfAdults, numberOfInfants]);

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

  // Check if form is valid
  const isFormValid = () => {
    if (!bookerName || !bookerEmail || !bookerPhone) return false;
    if (phoneError || !validatePhone(bookerPhone)) return false;
    if (seats.length === 0 || seatError) return false;
    if (selectedPriceValue === undefined) return false;
    if (
      selectedSeats.length !== numberOfAdults ||
      selectedSeats.some((seatId) => !isValidUUID(seatId))
    )
      return false;

    // Check if all passengers have required info (files are optional)
    for (const passenger of passengers) {
      // All passengers must have a name
      if (!passenger.name || passenger.name.trim().length === 0) return false;

      // Adults must have passport/ID number with at least 3 characters
      if (passenger.type === "ADULT") {
        if (
          !passenger.passportNumberOrIdNumber ||
          passenger.passportNumberOrIdNumber.trim().length < 3
        ) {
          return false;
        }
      }
      // Infants should have ID number if provided, but it's optional
      // If provided, it should be at least 3 characters
      else if (passenger.type === "INFANT") {
        if (
          passenger.passportNumberOrIdNumber &&
          passenger.passportNumberOrIdNumber.trim().length > 0
        ) {
          if (passenger.passportNumberOrIdNumber.trim().length < 3) {
            return false;
          }
        }
      }
    }

    return true;
  };

  // Validate form and return specific error messages
  const validateBookingForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Contact Information Validation
    if (!bookerName || bookerName.trim().length === 0) {
      errors.push("Please enter your full name");
    }

    if (!bookerEmail || bookerEmail.trim().length === 0) {
      errors.push("Please enter your email address");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookerEmail)) {
      errors.push("Please enter a valid email address");
    }

    if (!bookerPhone || bookerPhone.trim().length === 0) {
      errors.push("Please enter your phone number");
    } else if (!validatePhone(bookerPhone)) {
      errors.push("Phone number must be at least 10 digits");
    }

    // Seat Selection Validation
    if (seats.length === 0 || seatError) {
      errors.push("Seat map is not available. Please try again later");
    } else if (selectedSeats.length === 0) {
      errors.push(`Please select ${numberOfAdults} seat(s) for adults`);
    } else if (selectedSeats.length < numberOfAdults) {
      errors.push(
        `Please select ${numberOfAdults} seat(s). You have selected ${selectedSeats.length}`
      );
    } else if (selectedSeats.some((seatId) => !isValidUUID(seatId))) {
      errors.push(
        "Some selected seats are invalid. Please reselect your seats"
      );
    }

    // Price Validation
    if (selectedPriceValue === undefined) {
      errors.push("Price information is not available for this trip");
    }

    // Passenger Information Validation
    if (passengers.length > 0) {
      passengers.forEach((passenger, index) => {
        const passengerLabel = `${
          passenger.type === "ADULT" ? "Adult" : "Infant"
        } ${index + 1}`;

        if (!passenger.name || passenger.name.trim().length === 0) {
          errors.push(`${passengerLabel}: Please enter passenger name`);
        }

        if (passenger.type === "ADULT") {
          if (
            !passenger.passportNumberOrIdNumber ||
            passenger.passportNumberOrIdNumber.trim().length === 0
          ) {
            errors.push(`${passengerLabel}: Please enter passport/ID number`);
          } else if (passenger.passportNumberOrIdNumber.trim().length < 3) {
            errors.push(
              `${passengerLabel}: Passport/ID number must be at least 3 characters`
            );
          }
        } else if (passenger.type === "INFANT") {
          if (
            passenger.passportNumberOrIdNumber &&
            passenger.passportNumberOrIdNumber.trim().length > 0 &&
            passenger.passportNumberOrIdNumber.trim().length < 3
          ) {
            errors.push(
              `${passengerLabel}: ID number must be at least 3 characters if provided`
            );
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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

  const seatLegendItems: SeatLegendItem[] = [
    { label: "Available", className: "bg-white border-gray-300" },
 
    {
      label: "Selected",
      className:
        "bg-gradient-to-br from-[#179FDB] to-[#0f7ac3] border-[#0f7ac3] text-white",
    },
    { label: "Booked", className: "bg-red-500 border-red-400 text-white" },
  ];

  const renderSeatNode = (seat: SeatInfo | null, key: string) => {
    if (!seat) {
      return (
        <div
          key={key}
          className="w-12 h-12 sm:w-14 sm:h-14 opacity-0 pointer-events-none"
          aria-hidden
        />
      );
    }

    const { seatOneWay, seatRoundTrip, hasCustomPricing } =
      getSeatPricingDetails(seat);
    const isSelected = selectedSeats.includes(seat.id);
    const isUnavailable = !seat.isAvailable;
    const hasAnyPrice =
      typeof seatOneWay === "number" || typeof seatRoundTrip === "number";
    const seatLabel = seat.seatNumber || "—";
    const seatDigits = seatLabel.replace(/\D+/g, "");
    const seatLetters = seatLabel.replace(/[0-9]/g, "");
    const normalizedSeatLabel =
      seatDigits && seatLetters
        ? `${seatDigits}${seatLetters.toLowerCase()}`
        : seatLabel;

    let buttonClasses =
      "w-10 h-12 sm:w-14 sm:h-16 flex flex-col items-center justify-center rounded-2xl border font-semibold text-[11px] sm:text-sm transition-colors duration-200 shadow-sm";

    if (isUnavailable) {
      buttonClasses += " bg-red-500 border-red-400 text-white cursor-not-allowed";
    } else if (isSelected) {
      buttonClasses += " bg-green-600 text-white shadow-lg";
    } 
     else {
      buttonClasses += " bg-white border-gray-300 text-blue-900 hover:bg-gray-50";
    }

    const priceTextClass = isSelected
      ? "text-[#0f7ac3]"
      : "text-gray-600 dark:text-gray-400";

    return (
      <div
        key={seat.id}
        className="flex flex-col items-center gap-1 text-center w-16 sm:w-20"
      >
        <button
          type="button"
          onClick={() => handleSeatClick(seat.id)}
          disabled={isUnavailable}
          className={buttonClasses}
          aria-pressed={isSelected}
          aria-label={`Seat ${seat.seatNumber}`}
          title={`${seatLabel} • OW ${formatCurrencyValue(
            seatOneWay
          )} | RT ${formatCurrencyValue(seatRoundTrip)}`}
        >
          <span className="text-xs sm:text-base font-bold leading-none">
            {normalizedSeatLabel}
          </span>
        </button>
        <div
          className={`flex flex-col gap-1 text-[9px] sm:text-[11px] leading-tight font-medium ${priceTextClass}`}
        >
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 shadow-sm">
            <span className="text-[9px] font-semibold mr-1">OW</span>
            {formatCurrencyValue(seatOneWay)}
          </span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 shadow-sm">
            <span className="text-[9px] font-semibold mr-1">RT</span>
            {formatCurrencyValue(seatRoundTrip)}
          </span>
        </div>
      </div>
    );
  };

  const handleOpenInvoice = useCallback(() => {
    if (!invoiceData) {
      return;
    }
    try {
      openInvoicePDF(invoiceData);
      toast.success("Opening PDF invoice in new tab...", { duration: 3000 });
    } catch (error) {
      toast.error("Failed to open PDF. Please try again.", {
        duration: 4000,
      });
    }
  }, [invoiceData]);

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
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB", { duration: 4000 });
        input.value = "";
        return;
      }

      // Check file type
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("File type must be JPEG, PNG, or PDF", { duration: 4000 });
        input.value = "";
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
          input.value = "";
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

        // Add file to existing files array (support multiple files)
        const currentFiles = passengers[index]?.files || [];
        updatePassenger(index, "files", [...currentFiles, fileData]);
        toast.success("File uploaded successfully", { duration: 2000 });
      };

      reader.onerror = () => {
        toast.error("Failed to read file. Please try again.", {
          duration: 4000,
        });
        try {
          input.value = "";
        } catch (e) {
          /* ignore */
        }
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
    // Validate form and show specific errors
    const validation = validateBookingForm();
    if (!validation.isValid) {
      // Show all validation errors in a toast
      const errorMessage = `Please complete the following:\n\n${validation.errors.join(
        "\n"
      )}`;
      toast.error(errorMessage, {
        duration: 6000,
        style: {
          maxWidth: "500px",
          whiteSpace: "pre-line",
        },
      });
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    const isLoggedIn = !!token;

    if (!isLoggedIn) {
      redirectToLoginForBooking();
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

      // Step 1: Create booking payload matching backend schema
      const bookingData = {
        tripId: tripData.id,
        bookingType: selectedTripType, // "ONE_WAY" | "ROUND_TRIP"
        travelerName: bookerName,
        travelerEmail: bookerEmail,
        travelerPhone: bookerPhone,
        seatIds: selectedSeats,
        passengers: passengers
          .filter((p) => p.name.trim() !== "") // Only include passengers with names
          .map((p) => ({
            type: p.type,
            name: p.name.trim(),
            passportNumberOrIdNumber: p.passportNumberOrIdNumber.trim(),
            // Backend expects files with only `type` and `base64Content`
            files: Array.isArray(p.files)
              ? p.files.map((f) => ({
                  type: f.type,
                  base64Content: f.base64Content,
                }))
              : [],
          })),
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

      if (bookingResponse.status === 401) {
        toast.error("Please sign in to continue your booking.", {
          duration: 4000,
        });
        localStorage.removeItem("authToken");
        redirectToLoginForBooking();
        return;
      }

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

      if (paymentResponse.status === 401) {
        toast.error("Please sign in to continue your booking.", {
          duration: 4000,
        });
        localStorage.removeItem("authToken");
        redirectToLoginForBooking();
        return;
      }

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
          <div className="overflow-y-auto max-h-[calc(95vh-80px)] sm:max-h-[calc(90vh-120px)] p-2  lg:p-8">
            {bookingConfirmed ? (
              <BookingConfirmationView
                bookingDetails={bookingDetails}
                invoiceData={invoiceData}
                onOpenInvoice={handleOpenInvoice}
                onClose={handleModalClose}
              />
            ) : showPayment && paymentUrl ? (
              <PaymentView
                paymentUrl={paymentUrl}
                isLoading={isLoading}
                onCancelBooking={handleCancelBooking}
              />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
                <SeatSelectionSection
                  numberOfAdults={numberOfAdults}
                  numberOfInfants={numberOfInfants}
                  isLoadingSeats={isLoadingSeats}
                  seatError={seatError}
                  seats={seats}
                  seatLegendItems={seatLegendItems}
                  seatRows={seatRows}
                  cabinColumnLabels={cabinColumnLabels}
                  renderSeatNode={renderSeatNode}
                  getRowLabel={getRowLabel}
                  selectedSeatsCount={selectedSeats.length}
                  requiredSeatsCount={numberOfAdults}
                />
                <PassengerInformationSection
                  bookerName={bookerName}
                  setBookerName={setBookerName}
                  bookerEmail={bookerEmail}
                  setBookerEmail={setBookerEmail}
                  bookerPhone={bookerPhone}
                  handlePhoneChange={handlePhoneChange}
                  phoneError={phoneError}
                  availableSeats={availableSeats}
                  numberOfAdults={numberOfAdults}
                  setNumberOfAdults={setNumberOfAdults}
                  numberOfInfants={numberOfInfants}
                  setNumberOfInfants={setNumberOfInfants}
                  passengers={passengers}
                  updatePassenger={updatePassenger}
                  handleFileUpload={handleFileUpload}
                  handleRemovePassengerFile={handleRemovePassengerFile}
                  selectedTripType={selectedTripType}
                  setSelectedTripType={setSelectedTripType}
                  oneWayPrice={oneWayPrice}
                  roundTripPrice={roundTripPrice}
                  formatCurrencyValue={formatCurrencyValue}
                  selectedPriceLabel={selectedPriceLabel}
                  formattedTotalAmount={formattedTotalAmount}
                  seatTotal={seatTotal}
                  infantsTotal={infantsTotal}
                  selectedSeatsCount={selectedSeats.length}
                  handleModalClose={handleModalClose}
                  handleBooking={handleBooking}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookModal;
