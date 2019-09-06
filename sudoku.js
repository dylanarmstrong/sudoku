#!/usr/bin/env node
'use strict';

const assert = require('assert');
const process = require('process');

const usage = () => {
  console.error('Usage: ./solver.js puzzle');
  process.exit(1);
};

const { argv } = process;
if (argv.length === 2) {
  usage();
}

// Setup functions
const cross = (a, b) => {
  const ret = [];
  for (let i = 0, len = a.length; i < len; i++) {
    for (let j = 0, _len = b.length; j < _len; j++) {
      ret.push(`${a[i]}${b[j]}`);
    }
  }
  return ret;
};

const get_unitlist = (rows, cols) => {
  let unitlist = [];

  for (let i = 0, len = cols.length; i < len; i++) {
    const c = cols[i];
    unitlist = [].concat(unitlist, [ cross(rows, c) ]);
  }

  for (let i = 0, len = rows.length; i < len; i++) {
    const r = rows[i];
    unitlist = [].concat(unitlist, [ cross(r, cols) ]);
  }

  let _unitlist = [];
  const _rs = ['ABC', 'DEF', 'GHI'];
  const _cs = ['123', '456', '789'];
  for (let i = 0, len = _rs.length; i < len; i++) {
    const rs = _rs[i];
    for (let j = 0, _len = _cs.length; j < _len; j++) {
      const cs = _cs[j];
      _unitlist = [].concat(_unitlist, [ cross(rs, cs) ]);
    }
  }

  unitlist = [].concat(unitlist, _unitlist);
  return unitlist;
};

const get_units = (unitlist, squares) => {
  const units = {};
  for (let i = 0, len = unitlist.length; i < len; i++) {
    for (let j = 0, _len = squares.length; j < _len; j++) {
      const u = unitlist[i];
      const s = squares[j];
      if (u.includes(s)) {
        units[s] = [].concat(units[s] || [], [u]);
      }
    }
  }
  return units;
};

const get_peers = (units) => {
  const peers = {};
  Object.keys(units).forEach(s => {
    const peer = new Set(units[s].flat());
    peer.delete(s);
    peers[s] = peer;
  });
  return peers;
};

const input = argv[2];

const digits = '123456789';
const rows = 'ABCDEFGHI';
const cols = digits;

const squares = cross(rows, cols);
const unitlist = get_unitlist(rows, cols);
const units = get_units(unitlist, squares);
const peers = get_peers(units);

const test = () => {
  assert(unitlist.length === 27);
  assert(squares.length === 81);
  squares.forEach(s => assert(units[s].length === 3));
  squares.forEach(s => assert(peers[s].size === 20));
};

// Convert string representation into object
const parse = () => {
  const grid = {};
  let index = 0;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      let entry = input[(i * 9) + j];
      if (entry === '' || entry === '0' || entry === '.') {
        entry = '';
      }
      grid[rows[i] + cols[j]] = entry;
    }
  }
  return grid;
};

const eliminate = (values, s, d) => {
  if (!values[s].includes(d)) {
    return values;
  }

  const value = values[s].replace(d, '');
  values[s] = value;
  if (value.length === 0) {
    // Last value removed
    return false;
  }

  // Only value, so clear up peers
  if (value.length === 1) {
    const d2 = value;
    let good = true;
    peers[s].forEach(s2 =>
      // If still good and an eliminate fails, return that this failed
      good && !eliminate(values, s2, d2) && (good = false)
    );
    if (!good) {
      return false;
    }
  }

  const unit = units[s];
  for (let i = 0, len = unit.length; i < len; i++) {
    const u = unit[i];
    const dplaces = [];
    for (let j = 0, _len = u.length; j < _len; j++) {
      const s2 = u[j];
      if (values[s2].includes(d)) {
        dplaces.push(s2);
      }
    }

    if (dplaces.length === 0) {
      return false;
    }

    if (dplaces.length === 1) {
      if (!assign(values, dplaces[0], d)) {
        return false;
      }
    }
  };

  return values;
};

const assign = (values, s, d) => {
  const other = values[s].replace(d, '').split('');
  for (let i = 0, len = other.length; i < len; i++) {
    const d2 = other[i];
    if (!eliminate(values, s, d2)) {
      return false;
    }
  }
  return values;
};

const print = (puzzle) => {
  let buf = '';
  for (let i = 0, len = rows.length; i < len; i++) {
    if (i > 0 && i % 3 === 0) {
      buf += '-'.repeat(6);
      buf += '+'
      buf += '-'.repeat(7);
      buf += '+'
      buf += '-'.repeat(6);
      buf += '\n';
    }
    const r = rows[i];
    for (let j = 0, _len = cols.length; j < _len; j++) {
      if (j > 0 && j % 3 === 0) {
        buf += '| ';
      }
      const c = cols[j];
      let entry = puzzle[r + c];
      if (entry === '') {
        entry = '.';
      }
      buf += entry + ' ';
    }
    buf += '\n';
  }
  console.log(buf);
};

const search = (values) => {
  if (values === false) {
    return false;
  }

  // Done
  const done = squares.filter(s => values[s].length !== 1).length === 0;
  if (done) {
    return values;
  }

  let min_l = 9;
  let min_s = '';
  squares.forEach(s => {
    const len = values[s].length;
    if (len > 1 && len < min_l) {
      min_l = len;
      min_s = s;
    }
  });

  if (min_s === '') {
    return false;
  }

  const value = values[min_s].split('');
  for (let j = 0, len = value.length; j < len; j++) {
    const _values = JSON.parse(JSON.stringify(values));
    const d = value[j];
    const ret = search(assign(_values, min_s, d));
    if (ret !== false) {
      return ret;
    }
  }

  return false;
};

const solve = (grid) => {
  const values = {};
  for (let i = 0, len = squares.length; i < len; i++) {
    const s = squares[i];
    values[s] = digits;
  }

  Object.keys(grid).forEach(s => {
    const d = grid[s];
    if (d !== '') {
      assign(values, s, d);
    }
  });

  return values;
};

const start = process.hrtime();
test();
const grid = parse(input);
print(search(solve(grid)));
const end = process.hrtime(start)
console.log('Execution time (hr): %ds %dms', end[0], end[1] / 1000000)

