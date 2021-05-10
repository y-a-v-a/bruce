import gd from 'node-gd';
import fs from 'fs';
import debug from 'debug';

const log = debug('bruce');

const INPUT = './images';
const OUTPUT = './output';
const EXTENSION = '.png';
const EXT_REGEXP = new RegExp(`${EXTENSION}$`);

// https://gist.github.com/mjackson/5311256
function rgbToHsl(r, g, b) {
  (r /= 255), (g /= 255), (b /= 255);

  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h, s, l];
}

async function processImage(fileName) {
  const path = `${INPUT}/${fileName}`;
  const image = await gd.openPng(path);
  const image2 = await gd.createTrueColor(24, 24);
  // const image2 = await gd.createTrueColor(576, 576); // 24 * 24

  // sort pixels
  const pixels = [];
  let index = 0;
  for (let i = 0; i < image.width; i++) {
    for (let j = 0; j < image.height; j++) {
      const color = image.getTrueColorPixel(i, j);
      // pixels[index++] = color;
      let r = (color & 0xff0000) >> 16;
      let g = (color & 0x00ff00) >> 8;
      let b = color & 0x0000ff;
      const hsl = rgbToHsl(r, g, b);
      pixels[index++] = [hsl[0], color];
    }
  }
  // pixels.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  pixels.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).reverse();

  index = 0;

  for (let k = 0; k < image.width; k++) {
    for (let l = 0; l < image.height; l++) {
      const colorNumber = pixels[index++][1];

      image2.setPixel(l, k, colorNumber);
    }
  }

  // for (let k = 0; k < image2.width; k++) {
  //   for (let l = 0; l < image2.height; l++) {
  //     let idx = k + l > 0 && (k + l) % 24 === 0 ? index++ : index;
  //     console.log(idx);
  //     const colorNumber = pixels[idx];

  //     // image2.setPixel(l, k, colorNumber);
  //   }
  // }

  const image3 = await gd.createTrueColor(576, 576);
  image2.copyResampled(
    image3,
    0,
    0,
    0,
    0,
    image3.width,
    image3.height,
    image2.width,
    image2.height
  );

  const OUTPUT_PATH = `${OUTPUT}/${fileName}`.replace('.png', '-landscape.png');
  // console.log(OUTPUT_PATH);
  // return await image.saveBmp(OUTPUT_PATH);
  // return await image2.saveJpeg(OUTPUT_PATH, 0);
  image.destroy();
  image2.destroy();
  await image3.savePng(OUTPUT_PATH, -1);
  image3.destroy();
  console.log('.');
}

const entries = await new Promise((resolve, reject) => {
  fs.readdir(INPUT, { withFileTypes: true }, (error, files) => {
    if (error) {
      return reject(error);
    }
    resolve(files);
  });
});

for (let i = 0; i < entries.length; i++) {
  // for (let i = 0; i < 10; i++) {
  const file = entries[i];
  if (!EXT_REGEXP.test(file.name)) {
    continue;
  }
  try {
    await processImage(file.name);
  } catch (e) {
    console.log(e);
  }
}
