/** Shared perimeter layout: all seats face the same continuous table. */
export function sharedTableSize(count: number) {
  return Math.max(5.6, (count * 3.2) / Math.PI);
}
export function sharedSeat(index: number, count: number) {
  const theta = (index * Math.PI * 2) / Math.max(1, count);
  const radius = sharedTableSize(count) / 2 + 0.05;
  return {
    x: Math.sin(theta) * radius,
    z: -Math.cos(theta) * radius,
    angle: Math.PI - theta,
  };
}
export function seatPoint(index: number, count: number, x: number, z: number) {
  const seat = sharedSeat(index, count);
  return [
    seat.x + x * Math.cos(seat.angle) + z * Math.sin(seat.angle),
    seat.z - x * Math.sin(seat.angle) + z * Math.cos(seat.angle),
  ] as const;
}
