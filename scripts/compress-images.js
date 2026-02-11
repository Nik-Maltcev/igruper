import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = 'public/cars';
const DST = 'public/cars_sm';

mkdirSync(DST, { recursive: true });

const files = readdirSync(SRC).filter(f => f.endsWith('.jpg'));
console.log(`Compressing ${files.length} images...`);

let done = 0, errors = 0, totalSaved = 0;

for (const f of files) {
  try {
    const src = join(SRC, f);
    const dst = join(DST, f);
    const origSize = statSync(src).size;
    
    await sharp(src)
      .resize(400, 200, { fit: 'cover' })
      .jpeg({ quality: 60 })
      .toFile(dst);
    
    const newSize = statSync(dst).size;
    totalSaved += origSize - newSize;
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${files.length}...`);
  } catch (e) {
    errors++;
    if (errors <= 5) console.log(`ERR: ${f} - ${e.message}`);
  }
}

console.log(`Done: ${done}, Errors: ${errors}`);
console.log(`Saved: ${(totalSaved / 1024 / 1024).toFixed(1)} MB`);
