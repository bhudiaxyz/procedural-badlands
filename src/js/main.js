'use strict';

/*!
 * Procedural Badlands - Procedurally generated terrain.
 *
 * Licensed under MIT (https://github.com/bhudiaxyz/procedural-badlands/blob/master/LICENSE)
 *
 * Based on works of Rye Terrell (aka wwwtyro): https://github.com/wwwtyro/badlands
 */

const sprintf = require('sprintf').sprintf;
const reglib = require('regl');
const saveAs = require('filesaver.js').saveAs;
const renderer = require('./render.js');
const seedrandom = require('seedrandom');
const randomLorem = require('random-lorem');
var Alea = require('alea');

const status = document.getElementById('status');
const next = document.getElementById('next');
const download = document.getElementById('download');
const canvas = document.getElementById('render-canvas');


let regl;
let seedString;
let random;

document.addEventListener('DOMContentLoaded', main, false);
window.addEventListener('resize', reflow, false);
next.addEventListener('click', randomizeRender);
download.addEventListener('click', downloadImage);
window.addEventListener('error', handleError);

function updateQueryString(key, value, url) {
  if (!url) url = window.location.href;
  var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
    hash;

  if (re.test(url)) {
    if (typeof value !== 'undefined' && value !== null)
      return url.replace(re, '$1' + key + "=" + value + '$2$3');
    else {
      hash = url.split('#');
      url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
      if (typeof hash[1] !== 'undefined' && hash[1] !== null)
        url += '#' + hash[1];
      return url;
    }
  } else {
    if (typeof value !== 'undefined' && value !== null) {
      var separator = url.indexOf('?') !== -1 ? '&' : '?';
      hash = url.split('#');
      url = hash[0] + separator + key + '=' + value;
      if (typeof hash[1] !== 'undefined' && hash[1] !== null)
        url += '#' + hash[1];
      return url;
    } else
      return url;
  }
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function updateUrl(seed) {
  let url = updateQueryString("seed", seed);
  window.history.pushState({seed: seed}, seed, url);
}


function initSeed(seed) {
  seedString = seed;
  window.seedString = seedString;
  window.rng = seedrandom(seedString);

  random = new Alea(seedString);
  updateUrl(seed)
}


function generateNewSeed() {
  let n = Math.random();
  let wordCount = 0;
  if (n > 0.8) {
    wordCount = 1;
  } else if (n > 0.4) {
    wordCount = 2;
  } else {
    wordCount = 3;
  }

  let newSeedString = "";
  for (let i = 0; i < wordCount; ++i) {
    const randWord = randomLorem({min: 2, max: 8});
    const wordCapitalized = randWord.charAt(0).toUpperCase() + randWord.slice(1)
    newSeedString += wordCapitalized;
    if (i < wordCount - 1) {
      newSeedString += "-";
    }
  }
  return newSeedString;
}

function randomizeSeed() {
  initSeed(generateNewSeed());
}

function main() {
  reflow();
  regl = reglib({
    canvas: canvas,
    extensions: ['OES_texture_float', 'OES_texture_float_linear', 'OES_element_index_uint'],
    attributes: {
      preserveDrawingBuffer: true,
    }
  });

  let seedString = getParameterByName("seed");
  if (seedString) {
    console.log("Using seed string: " + seedString);
    initSeed(seedString);
  } else {
    console.log("No seed string - randomizing");
    randomizeSeed();
  }

  render();
}

function randomizeRender() {
  randomizeSeed()
  render()
}

function render() {
  status.style.display = 'block';
  status.style.lineHeight = window.innerHeight + 'px';
  renderer.render(regl, {
    random: random,
    callback: updateStatus,
    canvas: canvas,
    fov: random() * 50 + 25,
    dir: random() * 360,
    alt: random() * 1024 * 2 + 1,
    tod: 6 + random(),
    colors: {
      high: {
        steep: [[0.45 - random() * 0.35, 0.25 - random() * 0.15, 0], [0.45 - random() * 0.35, 0.25 - random() * 0.15, 0]],
        flat: [[1, 1, 1], [1, 1, 1]]
      },
      low: {
        steep: [[0.5 - random() * 0.25, 0.25 - random() * 0.25, 0], [0.5 - random() * 0.25, 0.25 - random() * 0.25, 0]],
        flat: [[1, 1, 1], [1, 1, 1]]
      }
    },
    fog: random() * 0.0001,
    groundFog: random() * 0.01,
    groundFogAlt: random() * 1024 * 2
  });
}


function updateStatus(task, fraction, done) {
  if (fraction !== undefined) {
    status.innerText = sprintf('%s: %d%%', task, Math.round(fraction * 100));
  } else {
    status.innerText = task;
  }
  if (done) {
    status.style.display = 'none';
  }
}


function reflow() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}


function downloadImage() {
  canvas.toBlob(function (blob) {
    let filename = sprintf('procedural-badlands-%d.png', Math.round(random() * 10000));
    saveAs(blob, filename);
  });
}


function handleError(e, url, line) {
  status.style.display = 'block';
  status.style.lineHeight = '128px';
  status.innerHTML = `<div>Sorry, couldn't render the badlands because of the following error:</div> <div style='color:red'>${e.message}</div>`
}
