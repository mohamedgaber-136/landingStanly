"use client";
import Image from "next/image";
import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import BookModal from "./BookModal";

interface TripCardProps {
  from: string;
  to: string;
  departure: string; // e.g., "2025-10-25"
  availableSeats: number;
  flightNumber: string;
  price: string;
  image?: string;
  tripData?: any;
  onModalOpenChange?: (isOpen: boolean) => void;
}

export interface TripCardRef {
  openModal: () => void;
  closeModal: () => void;
  getTripData: () => any;
}

const TripCard = forwardRef<TripCardRef, TripCardProps>(
  (
    {
      from,
      to,
      departure,
      availableSeats,
      flightNumber,
      price,
      image = "/Media.jpg",
      tripData,
      onModalOpenChange,
    },
    ref
  ) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      openModal: () => setIsModalOpen(true),
      closeModal: () => setIsModalOpen(false),
      getTripData: () => ({
        from,
        to,
        departure,
        availableSeats,
        flightNumber,
        price,
        tripData,
      }),
    }));

    // Notify parent when modal state changes
    useEffect(() => {
      onModalOpenChange?.(isModalOpen);
    }, [isModalOpen, onModalOpenChange]);

    return (
      <div
        className={
          "bg-white border border-gray-300 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 transform transition-transform duration-300 w-full  max-w-full"
        }
      >
        {/* Trip Image */}
        <div className="shrink-0">
          <Image
            src="/Media.jpg"
            className="rounded-2xl object-cover w-full h-48 md:h-full md:w-48"
            width={150}
            height={150}
            alt={`${from} to ${to}`}
          />
        </div>

        {/* Trip Info */}
        <div className="flex flex-col justify-between flex-1 p-2 gap-2">
          {/* Route */}
          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-2">
            <h2 className="font-semibold">
              {from} → {to}
            </h2>
            <span className="text-gray-500 text-sm">{departure}</span>
          </div>

          {/* Flight Info */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <div className="text-gray-600 text-sm">Flight: {flightNumber}</div>
            <div className="text-gray-600 text-sm">
              Seats available: {availableSeats}
            </div>
          </div>

          {/* Price & Book Button */}
          <div className="flex justify-between items-center mt-auto">
            {/* <div className="text-lg font-bold text-[#179FDB]">{price}</div> */}
            <button
              onClick={() => (availableSeats > 0 ? setIsModalOpen(true) : null)}
              disabled={availableSeats === 0}
              className={`px-4 py-2 rounded-xl transition font-medium ${
                availableSeats === 0
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-[#179FDB] text-white hover:bg-[#0f7ac3]"
              }`}
            >
              {availableSeats === 0 ? "Full" : "Book Now"}
            </button>
          </div>
        </div>
        {/* Seat Map Renderer */}
        {tripData?.seatMap && Array.isArray(tripData.seatMap) && (
          <div className="mt-6">
            {/* <div className="font-semibold mb-2">Seat Map</div> */}
            <div className="grid grid-cols-4 gap-2">
              {(() => {
                // Group seats by row (A, B, C, D...)
                const seatRows: { [row: string]: any[] } = {};
                tripData.seatMap.forEach((seat: any) => {
                  // seatNumber like 'A1', 'B2', etc.
                  const match = seat.seatNumber.match(/^([A-Z]+)(\d+)$/);
                  if (!match) return;
                  const row = match[1];
                  if (!seatRows[row]) seatRows[row] = [];
                  seatRows[row].push(seat);
                });
                // Sort rows alphabetically, seats numerically
                const sortedRows = Object.keys(seatRows).sort();
                return sortedRows.map((row) => (
                  <div key={row} className="flex flex-col gap-2">
                    {seatRows[row]
                      .sort((a, b) => {
                        const anum = parseInt(
                          a.seatNumber.replace(/^[A-Z]+/, "")
                        );
                        const bnum = parseInt(
                          b.seatNumber.replace(/^[A-Z]+/, "")
                        );
                        return anum - bnum;
                      })
                      .map((seat) => (
                        <div
                          key={seat.seatNumber}
                          className={`w-12 h-10 flex items-center justify-center rounded-md border text-sm font-bold mb-1 ${
                            seat.isAvailable
                              ? "bg-white text-blue-800 border-gray-300"
                              : "bg-red-500 text-white border-red-500"
                          }`}
                        >
                          {seat.seatNumber}
                        </div>
                      ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
        <BookModal
          isModalOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          from={from}
          to={to}
          price={price}
          availableSeats={availableSeats}
          tripData={tripData}
        />
      </div>
    );
  }
);

TripCard.displayName = "TripCard";

export default TripCard;
