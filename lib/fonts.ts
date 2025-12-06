import { Archivo_Black, Poppins } from "next/font/google";

export const poppins = Poppins({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800", "900"],
    variable: "--font-poppins",
    display: "swap",
});

export const archivoBlack = Archivo_Black({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-archivo",
    display: "swap",
});
