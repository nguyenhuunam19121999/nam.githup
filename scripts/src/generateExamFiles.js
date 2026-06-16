// scripts/src/generateExamFiles.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const generateExamFiles = () => {
  const baseDir = path.join(__dirname, '../../assets/data_EXAMS');
  ensureDir(baseDir);
  
  let created = 0;
  let existed = 0;
  
  for (const level of levels) {
    const levelDir = path.join(baseDir, level);
    ensureDir(levelDir);
    
    for (let year = startYear; year <= endYear; year++) {
      for (const month of months) {
        const prefix = `${level}_${year}_${month}`;
        
        const files = [
          { name: `${prefix}_text.json`, template: getTextTemplate(level, year, month) },
          { name: `${prefix}_audio.json`, template: getAudioTemplate(level, year, month) },
          { name: `${prefix}_image.json`, template: getImageTemplate(level, year, month) }
        ];
        
        for (const file of files) {
          const filePath = path.join(levelDir, file.name);
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(file.template, null, 2));
            created++;
          } else {
            existed++;
          }
        }
      }
    }
  }
  
  console.log(`✅ Tạo mới: ${created} file`);
  console.log(`📁 Đã tồn tại: ${existed} file`);
  console.log(`📂 Thư mục: assets/data_EXAMS/[n5,n4,n3,n2,n1]/`);
};

generateExamFiles();