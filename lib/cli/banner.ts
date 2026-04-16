import { brand, dim } from "./ui.js";

const BANNER = `██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝
██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗
██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝
██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗
╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝`;

export function printBanner(tagline: string, version: string) {
  console.log("");
  console.log(brand(BANNER));
  console.log(dim(`  v${version} — ${tagline}`));
  console.log("");
}
