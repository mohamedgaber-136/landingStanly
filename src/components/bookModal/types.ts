import type { BookingData } from "@/utils/pdfGenerator";

export interface Passenger {
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

export interface SeatInfo {
  id: string;
  seatNumber?: string;
  isAvailable: boolean;
  oneWayBasePrice?: number;
  roundTripBasePrice?: number;
  effectivePrice?: number;
  seatPrice?: number;
  currency?: string;
  [key: string]: unknown;
}

export type SeatRow = { left: (SeatInfo | null)[]; right: (SeatInfo | null)[] };

export interface BookModalProps {
  isModalOpen: boolean;
  onClose: () => void;
  from: string;
  to: string;
  price: string;
  availableSeats: number;
  tripData?: any;
}

export interface SeatLegendItem {
  label: string;
  className: string;
}

export interface BookingConfirmationDetails {
  bookingId?: string;
  from?: string;
  to?: string;
  price?: string;
  selectedSeats?: string[];
  passengers?: Passenger[];
  bookerName?: string;
  bookerEmail?: string;
}

export type InvoiceData = BookingData;
