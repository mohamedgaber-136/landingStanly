import React from "react";
import type { SeatInfo, SeatRow, SeatLegendItem } from "./types";

interface SeatSelectionSectionProps {
  numberOfAdults: number;
  numberOfInfants: number;
  isLoadingSeats: boolean;
  seatError: string | null;
  seats: SeatInfo[];
  seatLegendItems: SeatLegendItem[];
  seatRows: SeatRow[];
  renderSeatNode: (seat: SeatInfo | null, key: string) => React.ReactNode;
  getRowLabel: (row: SeatRow, fallbackIndex: number) => string;
  selectedSeatsCount: number;
  requiredSeatsCount: number;
}

const SeatSelectionSection: React.FC<SeatSelectionSectionProps> = ({
  numberOfAdults,
  numberOfInfants,
  isLoadingSeats,
  seatError,
  seats,
  seatLegendItems,
  seatRows,
  renderSeatNode,
  getRowLabel,
  selectedSeatsCount,
  requiredSeatsCount,
}) => {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 h-full">
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
          Select {requiredSeatsCount} seat{requiredSeatsCount > 1 ? "s" : ""}{" "}
          for adults
          {numberOfInfants > 0 &&
            ` (${numberOfInfants} infant${
              numberOfInfants > 1 ? "s" : ""
            } will share)`}
        </p>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl p-0 md:p-4 border-2 border-gray-100 shadow-sm flex-1 flex flex-col">
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
          <div className="flex-1 min-h-0 overflow-x-auto sm:overflow-visible -mx-2 sm:mx-0 px-2 sm:px-0">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 sm:min-w-0 flex flex-col h-full min-h-0">
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pb-4 border-b border-gray-200 dark:border-gray-600 text-[11px] sm:text-sm">
                {seatLegendItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border ${item.className}`}
                    ></div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="relative rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-inner">
                <div>
                  <p className="text-sm sm:text-base font-semibold">
                    Front Cabin
                  </p>
                </div>
                <svg
                  className="w-8 h-8 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.5 7h-5a1.5 1.5 0 00-1.5 1.5V11a1 1 0 00.553.894L8 13v4l-1 1v1h2l1-1h4l1 1h2v-1l-1-1v-4l3.447-1.106A1 1 0 0018 11V8.5A1.5 1.5 0 0016.5 7h-5"
                  />
                </svg>
              </div>

              {seatRows.length === 0 ? (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Seat layout is unavailable.
                </div>
              ) : (
                <div className="w-full flex justify-center flex-1 min-h-0">
                  <div className="w-full h-full min-h-0">
                    <div className="h-full overflow-y-auto space-y-6 min-h-0 px-4">
                      {seatRows.map((row, rowIndex) => {
                        const rowLabel = getRowLabel(row, rowIndex + 1);

                        return (
                          <div
                            key={`seat-row-${rowIndex}`}
                            className="w-full flex flex-col items-center gap-2"
                          >
                            <div className="flex items-center justify-center gap-6 w-full">
                              <div className="flex gap-3">
                                {row.left.map((seat, idx) =>
                                  renderSeatNode(
                                    seat,
                                    `left-${rowIndex}-${idx}`
                                  )
                                )}
                              </div>
                              <div className="text-center text-[11px] font-semibold text-gray-400 w-8">
                                {rowLabel}
                              </div>
                              <div className="flex gap-3">
                                {row.right.map((seat, idx) =>
                                  renderSeatNode(
                                    seat,
                                    `right-${rowIndex}-${idx}`
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-[10px] uppercase tracking-[0.35em] text-gray-400 dark:text-gray-500">
                Tail Section
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs text-gray-600 dark:text-gray-300">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
                    Selected Seats
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSeatsCount}/{requiredSeatsCount}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
                    Tap to Toggle
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-100">
                    Choose seats on either side of the aisle
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 text-center">
                Showing {seats.length} seat{seats.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatSelectionSection;
