// scripts/generateExamStructure.js
const fs = require('fs');
const path = require('path');

const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
const months = ['07', '12'];
const startYear = 2010;
const endYear = 2025;

const getTextTemplate = (level, year, month) => ({
  ky_thi: `JLPT ${level.toUpperCase()} tháng ${parseInt(month)}/${year}`,
  level: level.toUpperCase(),
  year: parseInt(year),
  month: parseInt(month),
  nguon: "公众号：荒木日语",
  time_vocab: level === 'n5' ? 25 : level === 'n4' ? 30 : level === 'n3' ? 35 : level === 'n2' ? 40 : 45,
  time_grammar: level === 'n5' ? 55 : level === 'n4' ? 70 : level === 'n3' ? 85 : level === 'n2' ? 105 : 110,
  time_listening: level === 'n5' ? 30 : level === 'n4' ? 40 : level === 'n3' ? 50 : level === 'n2' ? 60 : 65,
  vocab: { instruction: "", questions: [] },
  grammar: { instruction: "", questions: [] },
  reading: { instruction: "", passages: [] }
});

const getAudioTemplate = (level, year, month) => ({
  ky_thi: `JLPT ${level.toUpperCase()} tháng ${parseInt(month)}/${year}`,
  level: level.toUpperCase(),
  year: parseInt(year),
  month: parseInt(month),
  time_listening: level === 'n5' ? 30 : level === 'n4' ? 40 : level === 'n3' ? 50 : level === 'n2' ? 60 : 65,
  listening: { instruction: "", sections: [] }
});

const getImageTemplate = (level, year, month) => ({
  ky_thi: `JLPT ${level.toUpperCase()} tháng ${parseInt(month)}/${year}`,
  level: level.toUpperCase(),
  year: parseInt(year),
  month: parseInt(month),
  images: []
});

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const generate = () => {
  const baseDir = path.join(__dirname, '../assets/data_EXAMS');
  ensureDir(baseDir);
  
  let count = 0;
  
  for (const level of levels) {
    const levelDir = path.join(baseDir, level);
    ensureDir(levelDir);
    
    for (let year = startYear; year <= endYear; year++) {
      for (const month of months) {
        const prefix = `${level}_${year}_${month}`;
        
        const textFile = path.join(levelDir, `${prefix}_text.json`);
        const audioFile = path.join(levelDir, `${prefix}_audio.json`);
        const imageFile = path.join(levelDir, `${prefix}_image.json`);
        
        if (!fs.existsSync(textFile)) {
          fs.writeFileSync(textFile, JSON.stringify(getTextTemplate(level, year, month), null, 2));
          count++;
        }
        if (!fs.existsSync(audioFile)) {
          fs.writeFileSync(audioFile, JSON.stringify(getAudioTemplate(level, year, month), null, 2));
          count++;
        }
        if (!fs.existsSync(imageFile)) {
          fs.writeFileSync(imageFile, JSON.stringify(getImageTemplate(level, year, month), null, 2));
          count++;
        }
      }
    }
  }
  
  console.log(`✅ Đã tạo ${count} file JSON`);
  console.log(`📂 Thư mục: assets/data_EXAMS/[n5,n4,n3,n2,n1]/`);
};

generate();