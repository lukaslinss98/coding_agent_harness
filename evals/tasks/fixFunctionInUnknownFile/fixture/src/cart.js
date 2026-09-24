import { sum } from "./utils/math.js";

export function total(items) {
  return sum(items.map((item) => item.price * item.quantity));
}
