import QRCode from "qrcode";

/** Le QR du lien d'avis Google, en SVG, ou null s'il n'a pas pu être produit. */
export async function qrSvg(lien: string): Promise<string | null> {
  try {
    return await QRCode.toString(lien, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#15140F", light: "#FFFFFF" } });
  } catch {
    return null;
  }
}
