#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const vocabPath = path.join(__dirname, '../artifacts/mirai-jp/assets/vocab/n4.json');
const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

// Group by (kanji + hira) — same reading = same word
const groups = {};
vocab.forEach((v, idx) => {
  const key = v.kanji + '||' + v.hira;
  if (!groups[key]) groups[key] = [];
  groups[key].push({ ...v, _idx: idx });
});

const kept = [];
let removed = 0;

for (const key of Object.keys(groups)) {
  const group = groups[key];
  if (group.length === 1) {
    kept.push(group[0]);
    continue;
  }

  // Genuinely different readings → should have been in different groups already (different hira)
  // Here all entries share same kanji+hira, so they are the same word.
  // Strategy: keep the one with lowest lesson; if nghia differs, merge them.

  // Sort by lesson ascending (keep original data priority)
  group.sort((a, b) => a.lesson - b.lesson);

  const winner = { ...group[0] };

  // If later entries have richer nghia not in winner, append
  for (let i = 1; i < group.length; i++) {
    const other = group[i];
    const winNghias = winner.nghia.split(/[,;/]/).map(s => s.trim().toLowerCase());
    const otherNghias = other.nghia.split(/[,;/]/).map(s => s.trim().toLowerCase());
    const extra = otherNghias.filter(n => !winNghias.some(w => w.includes(n) || n.includes(w)));
    if (extra.length > 0) {
      winner.nghia = winner.nghia + ', ' + extra.join(', ');
    }
    removed++;
  }

  // Remove internal _idx
  delete winner._idx;
  kept.push(winner);
}

// Sort by week, then lesson, then original order
kept.sort((a, b) => a.week !== b.week ? a.week - b.week : a.lesson - b.lesson);

fs.writeFileSync(vocabPath, JSON.stringify(kept, null, 2), 'utf8');
console.log(`Trước: ${vocab.length} từ`);
console.log(`Xóa:   ${removed} từ trùng`);
console.log(`Sau:   ${kept.length} từ`);
