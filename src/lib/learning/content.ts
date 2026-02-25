import fs from 'fs';
import path from 'path';

export function loadLearningDocs(): { title: string; body: string }[] {
  const dir = path.join(process.cwd(), 'src', 'content', 'learning');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const body = fs.readFileSync(path.join(dir, file), 'utf8');
      return { title: file.replace(/\.md$/, ''), body };
    });
}
