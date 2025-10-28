import type { Metadata } from "next";
import { Almarai } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Almarai font for English
const almarai = Almarai({
  subsets: ["latin"], // only need latin for English
  weight: ["300", "400", "700"], // choose the weights you need
  variable: "--font-almarai",
});

export const metadata: Metadata = {
  title: "Siwa Tourism",
  description: "Explore the beauty of Siwa, Egypt",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${almarai.variable} font-sans antialiased bg-[#114577] min-h-screen flex items-center justify-center`}
      >
        <div className="w-full min-h-screen flex items-center justify-center">
          {children}
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: "#363636",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              padding: "16px",
            },
            success: {
              style: {
                background: "#10B981",
              },
            },
            error: {
              style: {
                background: "#EF4444",
              },
            },
            loading: {
              style: {
                background: "#3B82F6",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
