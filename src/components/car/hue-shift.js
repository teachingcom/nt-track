import { PIXI } from 'nt-animator'
import { createWorker, findTextures } from '../../utils'

/** performs a hue shift on a car */
export default async function hueShift (target, hue) {
  // make sure there's a hue
  if (isNaN(hue)) return

  // find all textures to work with
  const textures = target.__paintableTextures = target.__paintableTextures || findTextures(target)

  // kick off all work
  const pending = []
  for (const id in textures) {
    const { texture, targets } = textures[id]
    const work = applyHueShift(texture, targets, hue)
    pending.push(work)
  }

  // wait for completion
  await Promise.all(pending)
}

// performs the hue shifting operation for a target
async function applyHueShift (texture, targets, hue) {
  return new Promise(resolve => {
    let worker

    // // find the base texture
    // let { texture } = sprites[0]
    let safety = 10
    while (texture.baseTexture && --safety > 0) {
      texture = texture.baseTexture
    }

    // create a replacement canvas for the hue shift
    const { width, height } = texture.resource
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // redraw the texture
    canvas.width = width
    canvas.height = height
    ctx.drawImage(texture.resource.source, 0, 0)

    // handle applying the texture
    function applyTexture () {
      // create thw new texture
      const texture = PIXI.Texture.from(canvas)

      // HACK?: PIXI would throw errors when using the
      // canvas renderer trying to find the texture
      // by calling a missing function. Providing the canvas
      // to the replacement texture solves the problem
      texture.getDrawableSource = () => canvas

      // now, replace each sprite with the
      // updated texture
      for (const item of targets) {
        const [target, index] = item

        // replacing a texture inside of an array
        if (target.isSprite) {
          // check for animated sprites
          if (target.textures) {
            for (let i = target.textures.length; i-- > 0;) {
              target.textures[i] = target.textures[i].clone()
              target.textures[i].baseTexture = texture
              target.textures[i].update()
            }
          // just a single sprite
          } else {
            target.texture = target.texture.clone()
            target.texture.baseTexture = texture
            target.texture.update()
          }
        // replacing a texture in an array
        } else {
          target[index] = target[index].clone()
          target[index].baseTexture = texture
        }
      }

      // cleanup
      if (worker) {
        try {
          worker.terminate()
        } catch (ex) {
          // nothing to do, don't crash
        }
      }

      // all finished
      resolve()
    }

    // no hue shift (maybe returning to 0)
    if (hue === 0) {
      applyTexture()

    // apply the hue shift
    } else {
      const pixels = ctx.getImageData(0, 0, width, height)

      // perform the work async
      worker = createWorker(HSLShiftWorker)
      worker.postMessage({ hue, pixels: pixels.data }, [pixels.data.buffer])

      // wait for the finished result
      worker.onmessage = msg => {
        // replace the canvas with the shifted texture
        const replacement = ctx.createImageData(width, height)
        replacement.data.set(msg.data.updated)
        ctx.putImageData(replacement, 0, 0)

        // draw the new texture
        applyTexture()
      }

      // don't crash for this
      worker.onerror = () => {
        console.warn('Failed to perform hue shift')
        resolve()
      }
    }


  })
}

// performs a hue shift in a worker thread
function HSLShiftWorker () {

  // waits for incoming messages
  this.onmessage = function (msg) {
    const { pixels, hue } = msg.data
    const total = pixels.length

    // perform the conversion for each
    for (let i = 0; i < total; i += 4) {
      let r = pixels[i] / 255
      let g = pixels[i + 1] / 255
      let b = pixels[i + 2] / 255

      // Find greatest and smallest channel values
      const cmin = Math.min(r, g, b)
      const cmax = Math.max(r, g, b)
      const delta = cmax - cmin
      let h = 0
      let s = 0
      let l = 0

      // Calculate hue
      // No difference
      if (delta === 0)
        h = 0;
      // Red is max
      else if (cmax === r)
        h = ((g - b) / delta) % 6;
      // Green is max
      else if (cmax === g)
        h = (b - r) / delta + 2;
      // Blue is max
      else
        h = (r - g) / delta + 4;

      h = Math.round(h * 60);

      h += hue;
        
      // Make negative hues positive behind 360°
      if (h < 0) h += 360;
      h %= 360;

      // Calculate lightness
      l = (cmax + cmin) / 2;

      // Calculate saturation
      s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

      let c = (1 - Math.abs(2 * l - 1)) * s,
          x = c * (1 - Math.abs((h / 60) % 2 - 1)),
          m = l - c/2;

      if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
      } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
      } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
      } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
      } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
      } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
      }

      // save the change
      pixels[i] = Math.round((r + m) * 255);
      pixels[i + 1] = Math.round((g + m) * 255);
      pixels[i + 2] = Math.round((b + m) * 255);
    }

    // notify this is done
    this.postMessage({ updated: pixels }, [ pixels.buffer ])
  }

}


function getRootTexture(sprite) {

  // find the base texture
  let { texture } = sprite;
  let safety = 10;
  let previous = texture;

  while (texture.baseTexture && --safety > 0) {
    previous = texture;
    texture = texture.baseTexture;
  }

  return previous;
  
}

export function shiftDecimal(dec, hue) {
  const color = [
    (dec & 0xff0000) >> 16,
    (dec & 0x00ff00) >> 8,
    (dec & 0x0000ff)
  ];

  shiftColor(color, hue)

  return (color[0] << 16) + (color[1] << 8) + color[2]
}

// workers can't access outside functions, so unfortunately we
// have to duplicate this code here
export function shiftRgbColor(color, hue) { 
  let r = color.r / 255
  let g = color.g / 255
  let b = color.b / 255

  // Find greatest and smallest channel values
  const cmin = Math.min(r, g, b)
  const cmax = Math.max(r, g, b)
  const delta = cmax - cmin
  let h = 0
  let s = 0
  let l = 0

  // Calculate hue
  // No difference
  if (delta === 0)
    h = 0;
  // Red is max
  else if (cmax === r)
    h = ((g - b) / delta) % 6;
  // Green is max
  else if (cmax === g)
    h = (b - r) / delta + 2;
  // Blue is max
  else
    h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  h += hue;
    
  // Make negative hues positive behind 360°
  if (h < 0) h += 360;
  h %= 360;

  // Calculate lightness
  l = (cmax + cmin) / 2;

  // Calculate saturation
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  // save the change
  color.r = Math.round((r + m) * 255);
  color.g = Math.round((g + m) * 255);
  color.b = Math.round((b + m) * 255);
}
