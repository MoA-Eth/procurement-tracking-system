declare module "ethiopian-date" {
  export function toGregorian(
    ethiopianDate: [number, number, number] | number,
    month?: number,
    day?: number,
  ): [number, number, number];
  export function toEthiopian(
    gregorianDate: [number, number, number] | number,
    month?: number,
    day?: number,
  ): [number, number, number];
}
