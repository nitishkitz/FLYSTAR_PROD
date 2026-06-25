import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const inputDirectory = join(projectRoot, 'Assets');
const outputDirectory = join(projectRoot, 'public', 'Assets', 'story');
const chapters = [
  ['first', 'chapter-1'],
  ['second', 'chapter-2'],
  ['third', 'chapter-3'],
  ['fourth', 'chapter-4'],
];

function run(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  });
}

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg is required. Install it, then run npm run media:build again.');
  process.exit(1);
}

mkdirSync(outputDirectory, { recursive: true });

for (const [inputName, outputName] of chapters) {
  const input = join(inputDirectory, `${inputName}.mp4`);
  if (!existsSync(input)) {
    throw new Error(`Missing source video: ${input}`);
  }

  run([
    '-i', input,
    '-an',
    '-vf', 'scale=1920:-2:force_original_aspect_ratio=decrease',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '24',
    '-g', '12',
    '-keyint_min', '12',
    '-movflags', '+faststart',
    join(outputDirectory, `${outputName}.mp4`),
  ]);

  run([
    '-i', input,
    '-an',
    '-vf', 'scale=1920:-2:force_original_aspect_ratio=decrease',
    '-c:v', 'libvpx-vp9',
    '-crf', '34',
    '-b:v', '0',
    '-g', '12',
    join(outputDirectory, `${outputName}.webm`),
  ]);

  run([
    '-i', input,
    '-an',
    '-vf', 'scale=720:-2:force_original_aspect_ratio=decrease',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '28',
    '-g', '12',
    '-keyint_min', '12',
    '-movflags', '+faststart',
    join(outputDirectory, `${outputName}-mobile.mp4`),
  ]);

  run([
    '-i', input,
    '-frames:v', '1',
    '-vf', 'scale=1280:-2:force_original_aspect_ratio=decrease',
    '-c:v', 'libwebp',
    '-quality', '78',
    join(outputDirectory, `${outputName}-poster.webp`),
  ]);
}

console.log(`Story media written to ${outputDirectory}`);
