"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const locations = ["Siwa", "Cairo", "Alexandria", "Luxor", "Aswan", "Dubai"];

const getRandomDate = (start: Date, end: Date) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  )
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD
};

interface SearchBarProps {
  onSearchResults?: (results: any[]) => void;
  onSearchStart?: () => void;
  onSearchError?: (error: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearchResults,
  onSearchStart,
  onSearchError,
}) => {
  const router = useRouter();
  const [from, setFrom] = useState<string>(locations[0]);
  const [to, setTo] = useState<string>(locations[1]);
  const [startDate, setStartDate] = useState<string>(
    getRandomDate(new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)) // within 30 days
  );
  const [endDate, setEndDate] = useState<string>(
    getRandomDate(
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 31),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
    )
  );

  const handleSearch = async () => {
    // Notify parent that search is starting
    if (onSearchStart) {
      onSearchStart();
    }

    try {
      // Convert dates to the required format for the API
      const departureFrom = `${startDate}T00:00:00.000Z`;
      const departureTo = `${endDate}T23:59:59.000Z`;
      // For arrival, using similar logic but offset by a day or two
      const arrivalFromDate = new Date(startDate);
      arrivalFromDate.setDate(arrivalFromDate.getDate() + 1);
      const arrivalToDate = new Date(endDate);
      arrivalToDate.setDate(arrivalToDate.getDate() + 3);

      const arrivalFrom = arrivalFromDate.toISOString().replace(".000Z", "Z");
      const arrivalTo = arrivalToDate.toISOString().replace(".000Z", "Z");

      const params = new URLSearchParams({
        from,
        to,
        departureFrom,
        departureTo,
        arrivalFrom,
        arrivalTo,
        offset: "0",
      });

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";
      const response = await fetch(`${apiUrl}/trips?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch trips");
      }

      const data = await response.json();
      console.log("Search results:", data);

      // Pass results to parent component
      if (onSearchResults) {
        onSearchResults(data.trips || data || []);
      }
    } catch (error) {
      console.error("Search error:", error);
      if (onSearchError) {
        onSearchError(
          error instanceof Error ? error.message : "Failed to search trips"
        );
      }
    }
  };

  return (
    <div className="bg-white/90 text-black backdrop-blur-md p-3 md:p-5 rounded-2xl shadow-lg w-full max-w-4xl mx-auto flex flex-col gap-4">
      {/* wrapper that contains inputs row and button */}
      <div className="w-full">
        {/* Inputs row: stack on mobile, row on md+ */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
          {/* From Location */}
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

          {/* To Location */}
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

          {/* Start Date */}
          <div className="flex flex-col w-full md:w-1/4">
            <label className="font-semibold mb-1">Start Date</label>
            <input
              type="date"
              className="p-2 rounded-lg border border-gray-300"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col w-full md:w-1/4">
            <label className="font-semibold mb-1">End Date</label>
            <input
              type="date"
              className="p-2 rounded-lg border border-gray-300"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Button row: below inputs, aligned to the right */}
        <div className="flex justify-end mt-3 w-full">
          <button
            onClick={handleSearch}
            type="button"
            className="bg-[#179FDB] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#0f7ac3] transition w-full md:w-auto md:min-w-[120px]"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
