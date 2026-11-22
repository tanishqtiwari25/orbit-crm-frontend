/** Shared perimeter layout: all seats face the same continuous table. */
export function sharedTableSize(count: number) {
  return Math.max(5.6, Math.ceil(count / 4) * 2.8 + 1.6);
}
export function sharedSeat(index: number, count: number) {
  const side = index % 4;
  const seatsOnSide = Math.floor((count + 3 - side) / 4);
  const along = (Math.floor(index / 4) - (seatsOnSide - 1) / 2) * 2.8;
  const edge = sharedTableSize(count) / 2 + 0.05;
  return side === 0
    ? { x: -along, z: -edge, angle: Math.PI }
    : side === 1
      ? { x: along, z: edge, angle: 0 }
      : side === 2
        ? { x: -edge, z: along, angle: -Math.PI / 2 }
        : { x: edge, z: -along, angle: Math.PI / 2 };
}
export function seatPoint(index: number, count: number, x: number, z: number) {
  const seat = sharedSeat(index, count);
  return [
    seat.x + x * Math.cos(seat.angle) + z * Math.sin(seat.angle),
    seat.z - x * Math.sin(seat.angle) + z * Math.cos(seat.angle),
  ] as const;
}
