import { InjectiveFacilitator } from "@injectivelabs/x402";

let instance: InjectiveFacilitator | null = null;

export function getFacilitator(): InjectiveFacilitator {
  if (!instance) {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }
    instance = new InjectiveFacilitator({
      privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    });
  }
  return instance;
}
