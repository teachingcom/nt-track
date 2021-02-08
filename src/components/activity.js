import { PIXI } from 'nt-animator'

// creates a simple spinning loader
export default function createActivityIndicator ({
  size,
  distance = 0.75,
  speed = 3,
  thickness = size / 10,
  color = '#000',
  opacity = 0.8 
}) {
  const borderOffset = thickness / 2
  const center = size / 2

  // prepare the canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.height = size

  // create the loading circle
  ctx.moveTo(center, center)
  ctx.beginPath()
  ctx.arc(center, center, center - borderOffset, 0, (Math.PI * 2) * distance, false)

  // prepare the stroke
  ctx.strokeStyle = color
  ctx.globalAlpha = opacity
  ctx.lineCap = 'round'
  ctx.lineWidth = thickness

  // draw the loading circle
  ctx.stroke()

  // create the sprite
  const texture = PIXI.Texture.from(canvas)
  const sprite = new PIXI.Sprite(texture)

  // automatically spin
  sprite.pivot.x = sprite.pivot.y = size / 2
  sprite.updateTransform = function () {
    const now = Date.now()
    sprite.angle = (now % (360 * speed)) / speed
    PIXI.Sprite.prototype.updateTransform.call(sprite)
  }

  const container = new PIXI.ResponsiveContainer()
  container.addChild(sprite)

  return container
}
