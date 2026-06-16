// scripts/copyMediaToDataExam.cjs
const fs = require('fs');
const path = require('path');

const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
const years = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const months = ['07', '12'];

// Đường dẫn file mẫu
const sourceAudio = path.join(__dirname, '../assets/data_EXAMS/audio_mau.mp3');
const sourceImage = path.join(__dirname, '../assets/data_EXAMS/image_mau.png');

// Kiểm tra file mẫu
if (!fs.existsSync(sourceAudio)) {
  console.error('❌ Không tìm thấy file audio mẫu: assets/data_EXAMS/audio_mau.mp3');
  process.exit(1);
}
if (!fs.existsSync(sourceImage)) {
  console.error('❌ Không tìm thấy file image mẫu: assets/data_EXAMS/image_mau.png');
  process.exit(1);
}

console.log('✅ Đã tìm thấy file mẫu');
console.log(`   Audio: ${sourceAudio}`);
console.log(`   Image: ${sourceImage}\n`);

// Tạo thư mục đích
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Tạo thư mục: ${dir}`);
  }
};

// Copy file audio
const copyAudioFiles = () => {
  let count = 0;
  for (const level of levels) {
    const targetDir = path.join(__dirname, '../assets/data_EXAMS/audio', level);
    ensureDir(targetDir);
    
    for (const year of years) {
      for (const month of months) {
        const fileName = `${level}_${year}_${month}.mp3`;
        const targetFile = path.join(targetDir, fileName);
        
        if (!fs.existsSync(targetFile)) {
          fs.copyFileSync(sourceAudio, targetFile);
          count++;
        }
      }
    }
  }
  console.log(`🎵 Đã copy ${count} file audio vào assets/data_EXAMS/audio/`);
};

// Copy file image (mỗi đề 15 ảnh)
const copyImageFiles = () => {
  let count = 0;
  for (const level of levels) {
    const targetDir = path.join(__dirname, '../assets/data_EXAMS/images', level);
    ensureDir(targetDir);
    
    for (const year of years) {
      for (const month of months) {
        for (let i = 1; i <= 5; i++) {
          const fileName = `${level}_${year}_${month}_${i.toString().padStart(2, '0')}.png`;
          const targetFile = path.join(targetDir, fileName);
          
          if (!fs.existsSync(targetFile)) {
            fs.copyFileSync(sourceImage, targetFile);
            if (count === 5) {
              return
              count++;
            }
          }
        }
      }
    }
  }
  console.log(`🖼️ Đã copy ${count} file image vào assets/data_EXAMS/images/`);
};

const showStats = () => {
  console.log('\n📊 Thống kê:');
  let totalAudio = 0;
  let totalImage = 0;
  
  for (const level of levels) {
    const audioDir = path.join(__dirname, '../assets/data_EXAMS/audio', level);
    const imageDir = path.join(__dirname, '../assets/data_EXAMS/images', level);
    
    if (fs.existsSync(audioDir)) {
      const files = fs.readdirSync(audioDir);
      totalAudio += files.length;
      console.log(`   Audio ${level}: ${files.length} files`);
    }
    
    if (fs.existsSync(imageDir)) {
      const files = fs.readdirSync(imageDir);
      totalImage += files.length;
      console.log(`   Image ${level}: ${files.length} files`);
    }
  }
  
  console.log(`\n📦 Tổng cộng: ${totalAudio} audio, ${totalImage} image`);
  console.log(`\n📂 Thư mục: assets/data_EXAMS/audio/[n5,n4,n3,n2,n1]/`);
  console.log(`📂 Thư mục: assets/data_EXAMS/images/[n5,n4,n3,n2,n1]/`);
};

console.log('🎬 Bắt đầu copy file media vào data_EXAMS...\n');
copyAudioFiles();
copyImageFiles();
showStats();
console.log('\n✅ Hoàn thành!');