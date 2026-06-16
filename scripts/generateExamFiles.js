// scripts/generateExamFiles.js
const fs = require('fs');
const path = require('path');

const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
const months = ['07', '12'];
const startYear = 2010;
const endYear = 2025;

// Template cho file text (từ vựng, ngữ pháp, đọc hiểu)
const getTextTemplate = (level, year, month) => ({
  ky_thi: `JLPT ${level.toUpperCase()} tháng ${parseInt(month)}/${year}`,
  level: level.toUpperCase(),
  year: parseInt(year),
  month: parseInt(month),
  nguon: "公众号：荒木日语",
  time_vocab: level === 'n5' ? 25 : level === 'n4' ? 30 : level === 'n3' ? 35 : level === 'n2' ? 40 : 45,
  time_grammar: level === 'n5' ? 55 : level === 'n4' ? 70 : level === 'n3' ? 85 : level === 'n2' ? 105 : 110,
  time_listening: level === 'n5' ? 30 : level === 'n4' ? 40 : level === 'n3' ? 50 : level === 'n2' ? 60 : 65,
  vocab: {
    instruction: "______のことばの読み方として最もよいものを、1・2・3・4から一つえらびなさい。",
    questions: [
      {
        id: 1,
        text: "Câu hỏi mẫu - Vui lòng cập nhật dữ liệu thật",
        options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
        correct: 0
      }
    ]
  },
  grammar: {
    instruction: "______に入る最もよいものを、1・2・3・4から一つえらびなさい。",
    questions: [
      {
        id: 2,
        text: "Câu hỏi mẫu - Vui lòng cập nhật dữ liệu thật",
        options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
        correct: 0
      }
    ]
  },
  reading: {
    instruction: "文章を読んで、質問に答えなさい。",
    passages: []
  }
});

// Template cho file audio (nghe hiểu)
const getAudioTemplate = (level, year, month) => ({
  ky_thi: `JLPT ${level.toUpperCase()} tháng ${parseInt(month)}/${year}`,
  level: level.toUpperCase(),
  year: parseInt(year),
  month: parseInt(month),
  time_listening: level === 'n5' ? 30 : level === 'n4' ? 40 : level === 'n3' ? 50 : level === 'n2' ? 60 : 65,
  listening: {
    instruction: "これから問題を聞きます。よく聞いて、答えを選んでください。",
    sections: []
  }
});

// Template cho file image (hình ảnh)
const getImageTemplate = (level, year, month) => ({
  ky_thi: `JLPT ${level.toUpperCase()} tháng ${parseInt(month)}/${year}`,
  level: level.toUpperCase(),
  year: parseInt(year),
  month: parseInt(month),
  images: []
});

// Tạo thư mục nếu chưa tồn tại
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Tạo file JSON
const generateExamFiles = () => {
  const baseDir = path.join(__dirname, '../assets/data_EXAMS');
  ensureDir(baseDir);
  
  for (const level of levels) {
    const levelDir = path.join(baseDir, level);
    ensureDir(levelDir);
    
    for (let year = startYear; year <= endYear; year++) {
      for (const month of months) {
        const prefix = `${level}_${year}_${month}`;
        
        // Tạo text file
        const textFile = path.join(levelDir, `${prefix}_text.json`);
        if (!fs.existsSync(textFile)) {
          fs.writeFileSync(textFile, JSON.stringify(getTextTemplate(level, year, month), null, 2));
          console.log(`✅ Đã tạo: ${level}/${prefix}_text.json`);
        } else {
          console.log(`⏭️ Đã tồn tại: ${level}/${prefix}_text.json`);
        }
        
        // Tạo audio file
        const audioFile = path.join(levelDir, `${prefix}_audio.json`);
        if (!fs.existsSync(audioFile)) {
          fs.writeFileSync(audioFile, JSON.stringify(getAudioTemplate(level, year, month), null, 2));
          console.log(`✅ Đã tạo: ${level}/${prefix}_audio.json`);
        } else {
          console.log(`⏭️ Đã tồn tại: ${level}/${prefix}_audio.json`);
        }
        
        // Tạo image file
        const imageFile = path.join(levelDir, `${prefix}_image.json`);
        if (!fs.existsSync(imageFile)) {
          fs.writeFileSync(imageFile, JSON.stringify(getImageTemplate(level, year, month), null, 2));
          console.log(`✅ Đã tạo: ${level}/${prefix}_image.json`);
        } else {
          console.log(`⏭️ Đã tồn tại: ${level}/${prefix}_image.json`);
        }
      }
    }
  }
  
  console.log('\n🎉 Hoàn thành! Đã tạo file JSON cho tất cả đề thi.');
  console.log('📁 Thư mục: assets/data_EXAMS/[n5,n4,n3,n2,n1]/');
};

// Chạy script
generateExamFiles();