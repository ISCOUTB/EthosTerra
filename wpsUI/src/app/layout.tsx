import "./styles/global.css";
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { SimulationToastListener } from "@/components/settings/toastListener/toastListener";
import { ElectronPolyfill } from "@/components/ElectronPolyfill";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "WellProdSim",
  description:
    "Simulador Social de Productividad y Bienestar para Familias Campesinas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={archivo.className}>
      <body className="font-archivo">
        <ElectronPolyfill />
        <SimulationToastListener />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
