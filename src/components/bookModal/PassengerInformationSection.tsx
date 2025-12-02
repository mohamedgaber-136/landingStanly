import React from "react";
import type { Passenger } from "./types";

interface PassengerInformationSectionProps {
  bookerName: string;
  setBookerName: (value: string) => void;
  bookerEmail: string;
  setBookerEmail: (value: string) => void;
  bookerPhone: string;
  handlePhoneChange: (value: string) => void;
  phoneError: string;
  availableSeats: number;
  numberOfAdults: number;
  setNumberOfAdults: (value: number) => void;
  numberOfInfants: number;
  setNumberOfInfants: (value: number) => void;
  passengers: Passenger[];
  updatePassenger: (index: number, field: keyof Passenger, value: any) => void;
  handleFileUpload: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemovePassengerFile: (passengerIndex: number, fileIndex: number) => void;
  selectedTripType: "ONE_WAY" | "ROUND_TRIP";
  setSelectedTripType: (value: "ONE_WAY" | "ROUND_TRIP") => void;
  oneWayPrice?: number;
  roundTripPrice?: number;
  formatCurrencyValue: (value?: number) => string;
  selectedPriceLabel: string;
  formattedTotalAmount: string;
  seatTotal: number;
  infantsTotal: number;
  selectedSeatsCount: number;
  handleModalClose: () => void;
  handleBooking: () => void;
  isLoading: boolean;
}

const PassengerInformationSection: React.FC<PassengerInformationSectionProps> = ({
  bookerName,
  setBookerName,
  bookerEmail,
  setBookerEmail,
  bookerPhone,
  handlePhoneChange,
  phoneError,
  availableSeats,
  numberOfAdults,
  setNumberOfAdults,
  numberOfInfants,
  setNumberOfInfants,
  passengers,
  updatePassenger,
  handleFileUpload,
  handleRemovePassengerFile,
  selectedTripType,
  setSelectedTripType,
  oneWayPrice,
  roundTripPrice,
  formatCurrencyValue,
  selectedPriceLabel,
  formattedTotalAmount,
  seatTotal,
  infantsTotal,
  selectedSeatsCount,
  handleModalClose,
  handleBooking,
  isLoading,
}) => {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6 border border-green-200">
        <h4 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Passenger Information
        </h4>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <h6 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contact Information
        </h6>
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Full Name"
              value={bookerName}
              onChange={(e) => setBookerName(e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
            />
          </div>
          <div className="relative">
            <input
              type="email"
              placeholder="Email Address"
              value={bookerEmail}
              onChange={(e) => setBookerEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
            />
          </div>
          <div className="relative">
            <input
              type="tel"
              placeholder="Phone Number (+1234567890)"
              value={bookerPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border rounded-xl focus:ring-2 outline-none transition-all duration-200 ${
                phoneError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50"
                  : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
              }`}
            />
            {phoneError && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-xs sm:text-sm font-medium flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {phoneError}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <h4 className="font-semibold text-base sm:text-lg text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Number of Passengers
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Adults</label>
            <input
              type="number"
              min="1"
              max={availableSeats}
              value={numberOfAdults}
              onChange={(e) => setNumberOfAdults(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 text-center"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Infants</label>
            <input
              type="number"
              min="0"
              value={numberOfInfants}
              onChange={(e) => setNumberOfInfants(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 text-center"
            />
          </div>
        </div>
      </div>

      {passengers.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h4 className="font-semibold text-base sm:text-lg text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Passenger Details
          </h4>
          {passengers.map((passenger, index) => {
            const passengersOfSameType = passengers.slice(0, index).filter((p) => p.type === passenger.type);
            const displayNumber = passengersOfSameType.length + 1;

            return (
              <div key={index} className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-base sm:text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                    {displayNumber}
                  </div>
                  {passenger.type === "ADULT" ? "Adult" : "Infant"} {displayNumber}
                </h5>
                <div className="space-y-3 sm:space-y-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={passenger.name}
                    onChange={(e) => updatePassenger(index, "name", e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all duration-200"
                  />
                  <input
                    type="text"
                    placeholder={
                      passenger.type === "ADULT" ? "Passport Number or ID Number" : "ID Number (Optional)"
                    }
                    value={passenger.passportNumberOrIdNumber}
                    onChange={(e) => updatePassenger(index, "passportNumberOrIdNumber", e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all duration-200"
                  />
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      {passenger.type === "ADULT" ? "Passport (Optional)" : "Birth Certificate (Optional)"}
                    </label>
                    <input
                      type="file"
                      accept={passenger.type === "ADULT" ? "image/*" : "application/pdf,image/*"}
                      onChange={(e) => handleFileUpload(index, e)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-all duration-200 text-sm sm:text-base file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {passenger.files?.length ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-500">
                          Uploaded files stay attached even if you return after logging in again.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {passenger.files.map((file, fileIdx) => (
                            <span
                              key={`${file.originalFilename}-${fileIdx}`}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] sm:text-xs font-semibold border border-orange-200"
                            >
                              {file.originalFilename || "Uploaded document"}
                              <button
                                type="button"
                                onClick={() => handleRemovePassengerFile(index, fileIdx)}
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
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <h4 className="font-semibold text-base sm:text-lg text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2v-7H3v7a2 2 0 002 2z" />
          </svg>
          Trip Type & Price
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Type</label>
            <select
              value={selectedTripType}
              onChange={(e) =>
                setSelectedTripType(e.target.value === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY")
              }
              disabled={oneWayPrice === undefined && roundTripPrice === undefined}
              className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all duration-200 bg-white disabled:opacity-60"
            >
              <option value="ONE_WAY" disabled={oneWayPrice === undefined}>
                One Way
                {oneWayPrice !== undefined ? ` (${formatCurrencyValue(oneWayPrice)})` : " (Unavailable)"}
              </option>
              <option value="ROUND_TRIP" disabled={roundTripPrice === undefined}>
                Round Trip
                {roundTripPrice !== undefined ? ` (${formatCurrencyValue(roundTripPrice)})` : " (Unavailable)"}
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Selected Price</label>
            <input
              type="text"
              value={selectedPriceLabel}
              disabled
              className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-semibold cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Total</label>
            <input
              type="text"
              value={formattedTotalAmount}
              disabled
              className="w-full px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-3 border border-teal-100 rounded-xl bg-gray-50 text-gray-900 font-semibold cursor-not-allowed"
            />
          </div>
        </div>
        <div className="mt-4 sm:mt-6 p-4 bg-linear-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-200">
          <h5 className="font-semibold text-base text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Price Breakdown
          </h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                <span className="font-semibold">{selectedSeatsCount || numberOfAdults}</span> {" "}
                {selectedTripType === "ROUND_TRIP" ? "Round-Trip" : "One-Way"} Seat
                {(selectedSeatsCount || numberOfAdults) > 1 ? "s" : ""}
              </span>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrencyValue(seatTotal)}</span>
            </div>
            {numberOfInfants > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">
                  <span className="font-semibold">{numberOfInfants}</span> Infant{numberOfInfants > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrencyValue(infantsTotal)}</span>
              </div>
            )}
            <div className="border-t border-teal-300 pt-2 mt-2 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Amount</span>
              <span className="text-base sm:text-lg font-bold text-teal-700">{formattedTotalAmount}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Total updates automatically as you change seats, trip type, or infant count.
        </p>
        {oneWayPrice === undefined && roundTripPrice === undefined ? (
          <p className="text-sm text-red-500 mt-2">
            Pricing is unavailable for this trip. Please pick a different departure.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
        <button
          onClick={handleModalClose}
          className="w-full sm:w-auto px-5 py-2.5 sm:px-8 sm:py-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-gray-700 shadow-sm text-sm sm:text-base"
        >
          Cancel
        </button>
        <button
          onClick={handleBooking}
          disabled={isLoading}
          className="w-full sm:w-auto px-5 py-2.5 sm:px-8 sm:py-4 rounded-xl bg-linear-to-r from-[#179FDB] to-[#0f7ac3] text-white hover:from-[#0f7ac3] hover:to-[#0a5a8a] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none text-sm sm:text-base"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 justify-center">
              <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Booking...
            </div>
          ) : (
            "Book Now"
          )}
        </button>
      </div>
    </div>
  );
};

export default PassengerInformationSection;
