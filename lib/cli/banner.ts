import figlet from "figlet";
import { brand, dim } from "./ui.js";

export function printBanner(tagline: string, version: string) {
  console.log("");
  console.log(brand(figlet.textSync("Bridge", { font: "ANSI Shadow" })));
  console.log(dim(`  v${version} — ${tagline}`));
  console.log("");
}
