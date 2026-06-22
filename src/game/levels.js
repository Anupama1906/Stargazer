export const galaxies = [
  { id: 1, name: 'Andromeda' },
  { id: 2, name: 'Milky Way' }
];

const baseLevels = [
  {
    id: 1, name: 'First Connection',
    rings: 2, sectors: 4,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [1, 3], tgt: [0, 1] }
    ]
  },
  {
    id: 2, name: 'Parallel Lines',
    rings: 2, sectors: 4,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [0, 1], tgt: [0, 3] },
      { color: '#ffd166', src: [1, 1], tgt: [1, 3] }
    ]
  },
  {
    id: 3, name: 'Crossings',
    rings: 2, sectors: 6,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [0, 1], tgt: [1, 5] },
      { color: '#ffd166', src: [1, 0], tgt: [1, 2] }
    ]
  },
  {
    id: 4, name: 'Tangle',
    rings: 3, sectors: 4,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [0, 0], tgt: [2, 2] },
      { color: '#ffd166', src: [0, 2], tgt: [2, 0] }
    ]
  },
  {
    id: 5, name: 'Weave',
    rings: 3, sectors: 6,
    playerStart: [1, 0],
    pairs: [
      { color: '#c8d8f0', src: [1, 1], tgt: [1, 5] },
      { color: '#ffd166', src: [2, 2], tgt: [0, 4] }
    ],
    blocked: [[1, 3], [2, 0]]
  },
  {
    id: 6, name: 'Orbitals',
    rings: 3, sectors: 8,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [0, 2], tgt: [2, 6] },
      { color: '#ffd166', src: [2, 2], tgt: [0, 6] }
    ],
    blocked: [[1, 2], [1, 6]]
  },
  {
    id: 7, name: 'Trinity',
    rings: 4, sectors: 6,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [0, 1], tgt: [3, 1] },
      { color: '#ffd166', src: [0, 3], tgt: [3, 3] },
      { color: '#80d8ff', src: [0, 5], tgt: [3, 5] }
    ],
    blocked: [[1, 2], [1, 4], [2, 3]]
  },
  {
    id: 8, name: 'Maze',
    rings: 4, sectors: 8,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [1, 1], tgt: [2, 6] },
      { color: '#ffd166', src: [2, 1], tgt: [1, 6] }
    ],
    blocked: [[1, 3], [1, 5], [2, 3], [2, 5]]
  },
  {
    id: 9, name: 'Deep Space',
    rings: 4, sectors: 8,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [0, 0], tgt: [3, 4] },
      { color: '#ffd166', src: [3, 0], tgt: [0, 4] }
    ],
    blocked: [[1, 1], [1, 7], [2, 3], [2, 5]]
  },
  {
    id: 10, name: 'Event Horizon',
    rings: 5, sectors: 8,
    playerStart: [0, 0],
    pairs: [
      { color: '#c8d8f0', src: [1, 1], tgt: [4, 5] },
      { color: '#ffd166', src: [2, 2], tgt: [4, 6] },
      { color: '#80d8ff', src: [3, 3], tgt: [4, 7] }
    ],
    blocked: [[2, 1], [3, 2], [4, 4]]
  }
];

export const levels = [];

// Galaxy 1
baseLevels.forEach(lvl => {
  levels.push({ ...lvl, galaxyId: 1 });
});

// Galaxy 2
baseLevels.forEach(lvl => {
  levels.push({ ...lvl, id: lvl.id + 10, galaxyId: 2, name: lvl.name + ' II' });
});
