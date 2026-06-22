export class CircularGrid {
  constructor(rings, sectors, blocked = []) {
    this.rings = rings;
    this.sectors = sectors;
    this.blockedSet = new Set(blocked.map(([r, s]) => `${r},${s}`));
  }

  isBlocked(r, s) {
    return this.blockedSet.has(`${r},${s}`);
  }

  isValid(r, s) {
    return r >= 0 && r < this.rings
      && s >= 0 && s < this.sectors
      && !this.isBlocked(r, s);
  }

  getNeighbors(r, s) {
    const nbrs = [];
    const prevS = ((s - 1) + this.sectors) % this.sectors;
    const nextS = (s + 1) % this.sectors;
    if (this.isValid(r, prevS))  nbrs.push([r, prevS]);
    if (this.isValid(r, nextS))  nbrs.push([r, nextS]);
    if (this.isValid(r - 1, s)) nbrs.push([r - 1, s]);
    if (this.isValid(r + 1, s)) nbrs.push([r + 1, s]);
    return nbrs;
  }

  isNeighbor(r1, s1, r2, s2) {
    const nbrs = this.getNeighbors(r1, s1);
    return nbrs.some(([nr, ns]) => nr === r2 && ns === s2);
  }
}
