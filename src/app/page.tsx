"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import TripCard, { TripCardRef } from "@/components/TripCard";
import Image from "next/image";
import toast from "react-hot-toast";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

// Minimal Trip type used in this page
interface Trip {
  id: string;
  from: string;
  to: string;
  departure: string;
  availableSeats: number;
  flightNumber: string;
  price: string;
  image?: string;
  seatMap?: any;
  basePrice?: number;
  currency?: string;
}

const locations = ["Siwa", "Cairo"];

const DEFAULT_SEARCH_FILTERS = {
  airline: "",
  minPrice: "0",
  maxPrice: "10000",
  minAvailableSeats: "1",
  limit: "50",
  offset: "0",
};

export default function Home() {
  const [searchResults, setSearchResults] = useState<Trip[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const tripCardRefs = useRef<{ [key: string]: TripCardRef }>({});
  const [from, setFrom] = useState(locations[0]);
  const [to, setTo] = useState(locations[1]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [swapSuggestion, setSwapSuggestion] = useState<{
    message: string;
    trips: Trip[];
  } | null>(null);
  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );
  const yearStartDate = useMemo(
    () => new Date(calendarYear, 0, 1),
    [calendarYear]
  );
  const yearEndDate = useMemo(
    () => new Date(calendarYear, 11, 31),
    [calendarYear]
  );
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const disabledDays = useMemo(
    () => [
      { before: today },
      { before: yearStartDate, after: yearEndDate },
      (date: Date) => !availableDateSet.has(dateToISO(date)),
    ],
    [availableDateSet, today, yearStartDate, yearEndDate]
  );

  const getYearBoundaries = (year: number) => {
    const startUtc = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endUtc = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    return { startUtc, endUtc };
  };

  const dateToISO = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseISODate = (value: string) => {
    if (!value) return undefined;
    const [year, month, day] = value.split("-").map((part) => Number(part));
    if (!year || !month || !day) return undefined;
    return new Date(year, month - 1, day);
  };

  const toDayBoundaryISO = (
    isoDate: string,
    boundary: "start" | "end" = "start"
  ) => {
    const date = parseISODate(isoDate);
    if (!date) return "";
    if (boundary === "start") {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date.toISOString();
  };

  const formatCalendarDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return isoDate;
    }
  };

  useEffect(() => {
    const fetchAvailableDates = async () => {
      setIsLoadingCalendar(true);
      setCalendarError(null);
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://api.stanlyegypt.com/api/v1";
        const { startUtc, endUtc } = getYearBoundaries(calendarYear);
        const params = new URLSearchParams({
          from: dateToISO(startUtc),
          to: dateToISO(endUtc),
        });

        const response = await fetch(
          `${apiUrl}/trips/calendar?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error("Failed to load available dates");
        }

        const data = await response.json();
        const dates = Array.isArray(data)
          ? data
              .map((entry: any) => entry?.departureDate)
              .filter((d: string | undefined): d is string => Boolean(d))
              .sort(
                (a: string, b: string) =>
                  new Date(a).getTime() - new Date(b).getTime()
              )
          : [];

        setAvailableDates(dates);

        if (dates.length === 0) {
          setDateRange({ start: "", end: "" });
          setSelectedCalendarDate("");
          return;
        }

        setDateRange((prev) => {
          const nextStart =
            prev.start && dates.includes(prev.start) ? prev.start : dates[0];
          const nextEnd =
            prev.end && dates.includes(prev.end) ? prev.end : nextStart;
          setSelectedCalendarDate(nextStart);
          return { start: nextStart, end: nextEnd };
        });
      } catch (error) {
        console.error("Calendar fetch error:", error);
        setCalendarError("Unable to load available dates right now.");
        setAvailableDates([]);
      } finally {
        setIsLoadingCalendar(false);
      }
    };

    fetchAvailableDates();
  }, [from, to, calendarYear]);

  useEffect(() => {
    const now = new Date();
    const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
    const timeoutMs = nextYearStart.getTime() - now.getTime();

    const timer = setTimeout(() => {
      setCalendarYear(new Date().getFullYear());
    }, Math.max(timeoutMs, 0));

    return () => clearTimeout(timer);
  }, [calendarYear]);

  useEffect(() => {
    const parsed = parseISODate(selectedCalendarDate);
    if (parsed) {
      setCalendarMonth(parsed);
    }
  }, [selectedCalendarDate]);

  // Handle payment success redirect from Paymob
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPaymentSuccess = params.get("success") === "true";

    if (isPaymentSuccess) {
      toast.success("Payment successful! Your booking is being confirmed...", {
        duration: 3000,
      });

      // Get merchant order ID to match with our booking
      const merchantOrderId = params.get("merchant_order_id");

      // Attempt to reopen the booking modal with pending booking data
      const pendingBooking = localStorage.getItem("pendingBooking");
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking);

          // Store payment success flag to trigger modal opening
          localStorage.setItem(
            "paymentSuccessful",
            JSON.stringify({
              merchantOrderId,
              timestamp: Date.now(),
              shouldOpenModal: true,
            })
          );

          // Update pending booking to trigger modal reopening
          const updatedBookingData = {
            ...bookingData,
            shouldReopenModal: true,
            paymentSuccessful: true,
          };
          localStorage.setItem(
            "pendingBooking",
            JSON.stringify(updatedBookingData)
          );
        } catch (error) {
          console.error("Error handling payment success:", error);
        }
      }

      // Clean up URL to remove query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle pending booking restoration after login with auto-search
  useEffect(() => {
    const restorePendingBooking = async () => {
      const pendingBooking = localStorage.getItem("pendingBooking");
      if (!pendingBooking) return;

      try {
        const bookingData = JSON.parse(pendingBooking);
        const token = localStorage.getItem("authToken");

        // Check if user is now logged in and booking should be reopened
        if (token && bookingData.shouldReopenModal) {
          // Check if data is not too old (24 hours)
          const isDataFresh =
            bookingData.timestamp &&
            Date.now() - bookingData.timestamp < 24 * 60 * 60 * 1000;

          if (!isDataFresh) {
            localStorage.removeItem("pendingBooking");
            toast.error("Booking session expired. Please search again.");
            return;
          }

          // Strategy 1: If we have search results and can find matching trip, use it
          const matchingTrip = searchResults.find(
            (trip) =>
              trip.from === bookingData.from &&
              trip.to === bookingData.to &&
              trip.id === bookingData.originalTripData?.id
          );

          if (
            matchingTrip &&
            tripCardRefs.current[
              matchingTrip.id || `${matchingTrip.from}-${matchingTrip.to}`
            ]
          ) {
            // Perfect match found in current search results
            setTimeout(() => {
              tripCardRefs.current[
                matchingTrip.id || `${matchingTrip.from}-${matchingTrip.to}`
              ].openModal();
              const updatedBookingData = {
                ...bookingData,
                shouldReopenModal: false,
              };
              localStorage.setItem(
                "pendingBooking",
                JSON.stringify(updatedBookingData)
              );
            }, 1000);
            return;
          }

          // Strategy 2: Auto-search for the user's trip if no current results or no match
          if (
            bookingData.searchParams ||
            (bookingData.from && bookingData.to)
          ) {
            toast.loading("Searching for your trip...", { duration: 2000 });

            try {
              await performAutoSearch(bookingData);
            } catch (error) {
              console.error("Auto-search failed:", error);
              // Strategy 3: Fallback - create a temporary trip card with stored data
              await createTempTripForBooking(bookingData);
            }
          } else {
            // Strategy 3: No search params, use stored trip data directly
            await createTempTripForBooking(bookingData);
          }
        }
      } catch (error) {
        console.error("Error restoring pending booking:", error);
        localStorage.removeItem("pendingBooking");
        toast.error(
          "Error restoring booking data. Please search and try again."
        );
      }
    };

    // Auto-search function
    const performAutoSearch = async (bookingData: any) => {
      try {
        // Use search params if available, otherwise derive from booking data
        const searchParams = bookingData.searchParams || {
          from: bookingData.from,
          to: bookingData.to,
          departure:
            bookingData.originalTripData?.departureTime ||
            new Date().toISOString(),
        };

        // Calculate search dates
        const departureDate = new Date(searchParams.departure);
        const startDate = departureDate.toISOString().split("T")[0];
        const endDate = new Date(
          departureDate.getTime() + 7 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0]; // +7 days

        // Prepare API call parameters
        const departureFrom = `${startDate}T00:00:00.000Z`;
        const departureTo = `${endDate}T23:59:59.000Z`;

        const arrivalFromDate = new Date(startDate);
        arrivalFromDate.setDate(arrivalFromDate.getDate() + 1);
        const arrivalToDate = new Date(endDate);
        arrivalToDate.setDate(arrivalToDate.getDate() + 3);

        const arrivalFrom = arrivalFromDate.toISOString();
        const arrivalTo = arrivalToDate.toISOString();

        const params = new URLSearchParams({
          from: searchParams.from,
          to: searchParams.to,
          departureFrom,
          departureTo,
          arrivalFrom,
          arrivalTo,
          offset: "0",
        });

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://api.stanlyegypt.com/api/v1";
        const response = await fetch(`${apiUrl}/trips?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Auto-search failed");
        }

        const data = await response.json();
        const trips = data.trips || data || [];

        if (trips.length > 0) {
          // Update search results with auto-search results
          handleSearchResults(trips);
          toast.success("Found your trips! Opening booking...", {
            duration: 2000,
          });

          // Try to find exact match or similar trip
          setTimeout(() => {
            const exactMatch = trips.find(
              (trip: any) => trip.id === bookingData.originalTripData?.id
            );

            const similarMatch = trips.find(
              (trip: any) =>
                trip.origin === searchParams.from &&
                trip.destination === searchParams.to
            );

            const targetTrip = exactMatch || similarMatch || trips[0];
            const mappedTrip = {
              id: targetTrip.id,
              from: targetTrip.origin,
              to: targetTrip.destination,
              departure: new Date(
                targetTrip.departureTime
              ).toLocaleDateString(),
              availableSeats: targetTrip.availableSeats,
              flightNumber: targetTrip.flightNumber,
              price: `$${targetTrip.basePrice} ${targetTrip.currency}`,
            };

            const tripKey =
              mappedTrip.id || `${mappedTrip.from}-${mappedTrip.to}`;
            if (tripCardRefs.current[tripKey]) {
              tripCardRefs.current[tripKey].openModal();
              const updatedBookingData = {
                ...bookingData,
                shouldReopenModal: false,
              };
              localStorage.setItem(
                "pendingBooking",
                JSON.stringify(updatedBookingData)
              );

              if (!exactMatch && similarMatch) {
                toast(
                  "⚠️ Similar trip found. Please verify the details match your needs.",
                  {
                    duration: 5000,
                  }
                );
              }
            }
          }, 1500);
        } else {
          throw new Error("No trips found");
        }
      } catch (error) {
        console.error("Auto-search error:", error);
        throw error;
      }
    };

    // Fallback: Create temporary trip for booking continuation
    const createTempTripForBooking = async (bookingData: any) => {
      try {
        if (bookingData.originalTripData || bookingData.from) {
          toast("Restoring your trip data...", { duration: 2000 });

          // Create a temporary search result with the stored trip data
          const tempTrip = {
            id: bookingData.originalTripData?.id || `temp-${Date.now()}`,
            from: bookingData.from,
            to: bookingData.to,
            departure: bookingData.originalTripData?.departureTime
              ? new Date(
                  bookingData.originalTripData.departureTime
                ).toLocaleDateString()
              : new Date().toLocaleDateString(),
            availableSeats: bookingData.originalTripData?.availableSeats || 10,
            flightNumber:
              bookingData.originalTripData?.flightNumber || "TEMP001",
            price: `$${bookingData.originalTripData?.basePrice || 200} ${
              bookingData.originalTripData?.currency || "USD"
            }`,
            image: "/siwa.jpg",
            seatMap: bookingData.originalTripData?.seatMap,
            basePrice: bookingData.originalTripData?.basePrice || 200,
            currency: bookingData.originalTripData?.currency || "USD",
          };

          // Add this trip to search results
          setSearchResults([tempTrip]);
          setHasSearched(true);

          // Open modal after a short delay
          setTimeout(() => {
            const tripKey = tempTrip.id;
            if (tripCardRefs.current[tripKey]) {
              tripCardRefs.current[tripKey].openModal();
              const updatedBookingData = {
                ...bookingData,
                shouldReopenModal: false,
              };
              localStorage.setItem(
                "pendingBooking",
                JSON.stringify(updatedBookingData)
              );

              toast(
                "📋 Your trip data has been restored. Please verify and continue booking.",
                {
                  duration: 4000,
                  icon: "📋",
                }
              );
            }
          }, 1000);
        } else {
          toast.error(
            "Unable to restore trip data. Please search for your trip again."
          );
          localStorage.removeItem("pendingBooking");
        }
      } catch (error) {
        console.error("Error creating temp trip:", error);
        toast.error(
          "Unable to restore trip data. Please search for your trip again."
        );
        localStorage.removeItem("pendingBooking");
      }
    };

    restorePendingBooking();
  }, [searchResults]); // Depend on searchResults to recheck when trips are loaded

  // Clear pending booking if user manually navigates away and searches for different trips
  useEffect(() => {
    const pendingBooking = localStorage.getItem("pendingBooking");
    if (pendingBooking && searchResults.length > 0) {
      try {
        const bookingData = JSON.parse(pendingBooking);
        const hasMatchingTrip = searchResults.some(
          (trip) => trip.from === bookingData.from && trip.to === bookingData.to
        );

        // If user searched for completely different routes and has pending booking, ask what to do
        if (!hasMatchingTrip && !bookingData.shouldReopenModal) {
          const timeoutId = setTimeout(() => {
            const shouldClear = confirm(
              "You have a pending booking for a different trip. Would you like to clear it and start fresh?"
            );
            if (shouldClear) {
              localStorage.removeItem("pendingBooking");
              toast.success(
                "Previous booking cleared. You can start a new booking."
              );
            }
          }, 2000);

          return () => clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error("Error checking pending booking:", error);
      }
    }
  }, [searchResults]);

  const mapTripsForDisplay = (results: any[]): Trip[] => {
    return results.map((trip: any, idx: number) => {
      const departureDate = trip.departureTime
        ? new Date(trip.departureTime).toLocaleDateString()
        : trip.departure
        ? trip.departure
        : "";
      return {
        id:
          trip.id ||
          `${trip.from || trip.origin}-${trip.to || trip.destination}-${
            trip.departureTime || trip.departure || idx
          }`,
        from: trip.from || trip.origin || "",
        to: trip.to || trip.destination || "",
        departure: departureDate,
        availableSeats: trip.availableSeats ?? 0,
        flightNumber: trip.flightNumber || "",
        price:
          trip.basePrice !== undefined
            ? `$${trip.basePrice}${trip.currency ? " " + trip.currency : ""}`
            : trip.price || "",
        image: "/siwa.jpg",
        seatMap: trip.seatMap,
        basePrice: trip.basePrice,
        currency: trip.currency,
      };
    });
  };

  const handleSearchResults = (results: any[]) => {
    setIsSearching(false);
    setSearchError(null);
    setHasSearched(true);
    setSwapSuggestion(null);
    const mappedResults = mapTripsForDisplay(results);
    setSearchResults(mappedResults);
    if (mappedResults.length > 0) {
      setSelectedDate(mappedResults[0].departure);
    }
  };

  const handleSearchError = (error: string) => {
    setIsSearching(false);
    setSearchError(error);
    setSearchResults([]);
    setHasSearched(true);
    setSwapSuggestion(null);
  };

  const handleSearchStart = () => {
    setIsSearching(true);
    setSearchError(null);
  };

  const handleOpenCalendar = () => {
    const selected = parseISODate(selectedCalendarDate);
    const firstAvailable = availableDates.length
      ? parseISODate(availableDates[0])
      : undefined;
    const baseDate = selected || firstAvailable || today;
    setCalendarMonth(baseDate);
    setIsCalendarModalOpen(true);
  };

  const handleCloseCalendar = () => {
    setIsCalendarModalOpen(false);
  };

  const handleCalendarSelect = (day?: Date) => {
    if (!day) return;
    const normalized = new Date(day);
    normalized.setHours(0, 0, 0, 0);
    if (normalized < today) return;
    const iso = dateToISO(normalized);
    if (!availableDateSet.has(iso)) return;
    setSelectedCalendarDate(iso);
    setDateRange({ start: iso, end: iso });
    setIsCalendarModalOpen(false);
  };

  // Form submit handler for the BUY TICKET form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // start
    setIsSearching(true);
    setSearchError(null);
    setSwapSuggestion(null);

    try {
      // Use provided dates or sensible defaults
      let start = dateRange.start;
      let end = dateRange.end;
      if (!start && selectedCalendarDate) {
        start = selectedCalendarDate;
      }

      if (!end && selectedCalendarDate) {
        end = selectedCalendarDate;
      }

      if (!start) start = new Date().toISOString().split("T")[0];
      if (!end)
        end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

      const departureFrom =
        toDayBoundaryISO(start, "start") || `${start}T00:00:00.000Z`;
      const departureTo =
        toDayBoundaryISO(end, "end") || `${end}T23:59:59.000Z`;

      const arrivalFrom = departureFrom;
      const arrivalTo = departureTo;

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";

      const buildSearchParams = (routeFrom: string, routeTo: string) => {
        const params = new URLSearchParams({
          from: routeFrom,
          to: routeTo,
          departureFrom,
          departureTo,
          arrivalFrom,
          arrivalTo,
          minPrice: DEFAULT_SEARCH_FILTERS.minPrice,
          maxPrice: DEFAULT_SEARCH_FILTERS.maxPrice,
          minAvailableSeats: DEFAULT_SEARCH_FILTERS.minAvailableSeats,
          limit: DEFAULT_SEARCH_FILTERS.limit,
          offset: DEFAULT_SEARCH_FILTERS.offset,
        });

        if (DEFAULT_SEARCH_FILTERS.airline) {
          params.set("airline", DEFAULT_SEARCH_FILTERS.airline);
        }

        return params;
      };

      const fetchTripsForRoute = async (routeFrom: string, routeTo: string) => {
        const params = buildSearchParams(routeFrom, routeTo);
        const response = await fetch(
          `${apiUrl}/trips/search?${params.toString()}`
        );

        if (!response.ok) throw new Error("Failed to fetch trips");

        const data = await response.json();
        return Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.trips)
          ? data.trips
          : Array.isArray(data)
          ? data
          : [];
      };

      const formatSelectedDateLabel = () => {
        if (start && end) {
          if (start === end) {
            return formatCalendarDate(start);
          }
          return `${formatCalendarDate(start)} - ${formatCalendarDate(end)}`;
        }
        if (start) {
          return formatCalendarDate(start);
        }
        if (selectedCalendarDate) {
          return formatCalendarDate(selectedCalendarDate);
        }
        return "the selected date";
      };

      const primaryTrips = await fetchTripsForRoute(from, to);
      if (primaryTrips.length > 0) {
        handleSearchResults(primaryTrips);
        return;
      }

      const reversedTrips = await fetchTripsForRoute(to, from);
      if (reversedTrips.length > 0) {
        setIsSearching(false);
        setSearchError(null);
        setHasSearched(true);
        setSearchResults([]);
        const mappedReversedTrips = mapTripsForDisplay(reversedTrips);
        const dateLabel = formatSelectedDateLabel();
        setSwapSuggestion({
          message: `There are no trips from ${from} to ${to} for ${dateLabel}, but we found trips from ${to} to ${from} on the same date.`,
          trips: mappedReversedTrips,
        });
        return;
      }

      handleSearchResults([]);
    } catch (err: any) {
      console.error("Search error:", err);
      handleSearchError(err?.message || "Failed to search trips");
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#114577]">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto p-8 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex items-center justify-center">
              <Image
                src="/siwa.jpg"
                width={400}
                height={300}
                alt="Siwa"
                className="rounded-xl object-cover"
              />
            </div>
            <div className="flex-1 flex flex-col gap-4 justify-center">
              <h2 className="text-2xl font-bold text-[#114577] mb-2">
                Fly to {to}
              </h2>
              <div className="text-gray-700 mb-2">
                <span className="font-semibold">Coach Type</span> : AC
              </div>
              <div className="text-gray-700 mb-2">
                <span className="font-semibold">Passenger Capacity</span> : 44
              </div>
              <div className="flex gap-4 mb-2">
                <div className="bg-gray-100 rounded-lg p-2 flex-1">
                  <div className="font-semibold text-[#114577]">Boarding</div>
                  <div className="text-sm text-gray-600">
                    Siwa Oasis | North Airport (2:00 pm)
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg p-2 flex-1">
                  <div className="font-semibold text-[#114577]">Dropping</div>
                  <div className="text-sm text-gray-600">
                    Cairo | East Airport (3:30 am)
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 mt-4">
            <h3 className="text-lg font-bold text-[#114577] mb-4">
              BUY TICKET
            </h3>
            <form className="w-full" onSubmit={handleSubmit}>
              <div className="w-full">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
                  <div className="flex flex-col w-full md:w-1/4">
                    <label className="font-semibold mb-1">From</label>
                    <select
                      className="p-2 rounded-lg border border-gray-300"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col w-full md:w-1/4">
                    <label className="font-semibold mb-1">To</label>
                    <select
                      className="p-2 rounded-lg border border-gray-300"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col w-full md:w-1/2">
                    <label className="font-semibold mb-1">Selected Date</label>
                    <button
                      type="button"
                      onClick={handleOpenCalendar}
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 min-h-12 flex items-center justify-between text-left hover:border-[#179FDB] transition"
                      aria-haspopup="dialog"
                      aria-expanded={isCalendarModalOpen}
                    >
                      <span>
                        {selectedCalendarDate
                          ? formatCalendarDate(selectedCalendarDate)
                          : "Pick a date from the calendar to continue."}
                      </span>
                      <span className="text-xs text-[#179FDB] font-semibold">
                        {selectedCalendarDate ? "Change" : "Select"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="font-semibold mb-2 block">
                    Choose An Available Date
                  </label>
                  <div className="rounded-xl border border-gray-200 p-4 bg-white">
                    {isLoadingCalendar ? (
                      <p className="text-sm text-gray-500">Loading calendar…</p>
                    ) : availableDates.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No departures listed for this year. Try another route.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {selectedCalendarDate
                          ? `Selected date: ${formatCalendarDate(
                              selectedCalendarDate
                            )}. Use the button above to change it.`
                          : "Click the selected date above to open the calendar modal."}
                      </p>
                    )}
                    {calendarError ? (
                      <p className="text-sm text-red-500 mt-2">
                        {calendarError}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end mt-3 w-full">
                  <button
                    type="submit"
                    disabled={isSearching}
                    className={`bg-[#179FDB] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#0f7ac3] transition w-full md:w-auto md:min-w-[120px] ${
                      isSearching ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </div>
              </div>
            </form>
          </div>
          {/* Results area */}
          <div className="mt-4 w-full">
            {searchResults.length === 0 && hasSearched ? (
              <div className="bg-white rounded-lg p-6 text-center text-gray-600">
                No trips found for the selected dates.
              </div>
            ) : null}

            {searchResults.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 mt-4">
                {/* Date tabs */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  {Array.from(
                    new Set(searchResults.map((t) => t.departure))
                  ).map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`px-4 py-2 rounded-md border text-sm ${
                        selectedDate === d
                          ? "bg-[#179FDB] text-white border-[#179FDB]"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {/* Header row */}
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="text-sm text-gray-600">
                    {searchResults[0]?.from} ➜ {searchResults[0]?.to}
                  </div>
                  <div className="text-sm text-gray-600">{selectedDate}</div>
                </div>

                {/* List of trip cards for selectedDate */}
                <div className="mt-4 flex flex-col gap-4">
                  {searchResults
                    .filter((t) =>
                      selectedDate ? t.departure === selectedDate : true
                    )
                    .map((trip) => (
                      <div key={trip.id} className="border-t pt-4">
                        <TripCard
                          ref={(r) => {
                            tripCardRefs.current[trip.id] = r as TripCardRef;
                          }}
                          from={trip.from}
                          to={trip.to}
                          departure={trip.departure}
                          availableSeats={trip.availableSeats}
                          flightNumber={trip.flightNumber}
                          price={trip.price}
                          image={trip.image}
                          tripData={trip}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {swapSuggestion ? (
              <div className="bg-[#e6f3fb] border border-[#b7e0f8] rounded-lg p-5 mt-4">
                <p className="text-sm font-semibold text-[#0f4c81]">
                  {swapSuggestion.message}
                </p>
                <div className="mt-4 flex flex-col gap-4">
                  {swapSuggestion.trips.map((trip) => (
                    <div key={`swap-${trip.id}`} className="border-t pt-4">
                      <TripCard
                        ref={(r) => {
                          tripCardRefs.current[trip.id] = r as TripCardRef;
                        }}
                        from={trip.from}
                        to={trip.to}
                        departure={trip.departure}
                        availableSeats={trip.availableSeats}
                        flightNumber={trip.flightNumber}
                        price={trip.price}
                        image={trip.image}
                        tripData={trip}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseCalendar}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-[#114577]">
                Choose An Available Date
              </h4>
              <button
                type="button"
                onClick={handleCloseCalendar}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                aria-label="Close calendar"
              >
                Close
              </button>
            </div>
            {isLoadingCalendar ? (
              <p className="text-sm text-gray-500">Loading calendar…</p>
            ) : availableDates.length === 0 ? (
              <p className="text-sm text-gray-500">
                No departures listed for this year. Try another route.
              </p>
            ) : (
              <DayPicker
                mode="single"
                selected={parseISODate(selectedCalendarDate)}
                onSelect={handleCalendarSelect}
                fromDate={yearStartDate}
                toDate={yearEndDate}
                showOutsideDays
                disabled={disabledDays}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                initialFocus
              />
            )}
            {calendarError ? (
              <p className="text-sm text-red-500 mt-4">{calendarError}</p>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
