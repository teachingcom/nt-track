// TODO: refactor this file after introducing SSAA

import * as PIXI from 'pixi.js';
import { merge } from '../../utils';
import { toRGBA } from '../../utils/color';
import { createContext, getBoundsForRole } from 'nt-animator';
import { LAYER_NAMECARD_OVERLAY } from '../../views/track/layers';
import { scaleCanvas } from '../../utils/scaling';

// preferred font for namecards
const NAMECARD_ICON_SCALE = 0.35;
const DEFAULT_NAMECARD_FONT_SIZE = 22;
const DEFAULT_NAMECARD_FONT_NAME = 'montserrat';
const DEFAULT_NAMECARD_FONT_WEIGHT = 500;

// trailing namecard for a player
export default class NameCard extends PIXI.Container {

	/** handles creating a new namecard */
	static async create(options) {
		const instance = new NameCard();
		instance.visible = false;
		
		// determine the type to create
		const { type, view } = options;
		
		// try and load
		// const isDefault = /default/.test(type);
		let path = `namecards/${type}`;
		let config = view.animator.lookup(path);

		// if missing, use the default
		if (!config) {
			path = 'namecards/default';
			config = view.animator.lookup(path);
		}

		// if still missing then there's not
		// a name card that can be used
		if (!config) return;

		// save the properties
		const isGold = type === 'gold';
		const hasOverlay = config.overlay !== false;
		merge(instance, { options, view, path, config, isGold, hasOverlay });

		// create a container for all parts
		instance.container = new PIXI.Container();
		instance.addChild(instance.container);
		
		// initialize all namecard parts
		await instance._initNameCard();
		await instance._initIcons();

		// check for an overlay to render
		if (hasOverlay)
			instance._initOverlay();

		// return the created namecard
		return instance;
	}
	
	// creates the namecard instance
	async _initNameCard() {
		const { path, view, options, config, container } = this;
		const { baseHeight } = options;

		// create the instance
		const namecard = await view.animator.create(path);

		// scale correctly
		this.bounds = getBoundsForRole(namecard, 'base');
		if (config.height) this.bounds.height = config.height;
		if (config.width) this.bounds.width = config.width;
		
		// save scaling values
		container.scale.x = container.scale.y = baseHeight / this.bounds.height;
		
		// add to the view
		container.addChild(namecard);
	}

	// handle loading icons
	async _initIcons() {
		if (!!NameCard.ICONS) return;
		const { view } = this;
		const top3 = await view.animator.getImage('images', 'icon_top');
		const gold = await view.animator.getImage('images', 'icon_gold');
		const friend = await view.animator.getImage('images', 'icon_friend');
		NameCard.ICONS = { top3, gold, friend };
	}

	/** changes the visibility for a namecard */
	setVisibility = visible => {
		this.visible = visible;
		if (this.overlay)
			this.overlay.visible = visible;
	}

	/** changes the position and makes the namecard visible */
	setPosition = x => {
		this.x = x;

		// nothing to render
		if (!this.hasOverlay) 
			return;

		// redraw, if needed
		this.redraw();

		// match the position
		this.getGlobalPosition(this.overlay, true);
		this.overlay.x = 0 | this.overlay.x;
		this.overlay.y = 0 | this.overlay.y;
	}

	/** redraws the namecard container */
	redraw = () => {
		const { lastScale, view, displayName, icons, container, overlay, config, hasOverlay } = this;
		const { scaleY } = view.view;
		
		// no need to resize
		if (!hasOverlay || scaleY === lastScale) return;
		this.lastScale = scaleY;

		// remove previous values
		overlay.removeChildren();

		// create a mask for the container
		// TODO: render this without a mask
		// by just using a trimmed canvas
		const left = 0 | -((container.width * scaleY) * 0.465);
		const mask = new PIXI.Sprite(PIXI.Texture.WHITE);
		const width = container.width * scaleY * 0.825;
		const height = container.height * scaleY * 0.9;
		mask.width = 0 | width;
		mask.height = 0 | height;
		mask.x = left - 1;
		mask.y = 0 | -(height * 0.5);
		// overlay.addChild(mask);
		
		// get colors to use for text
		let textColor = 0xffffff;
		let shadowColor = 0x000000;
		if (config.text) {
			textColor = 'color' in config.text ? toRGBA(config.text.color, 1) : textColor;
			shadowColor = 'shadow' in config.text ? toRGBA(config.text.shadow, 1) : shadowColor;
		}

		// render each line
		for (const style of [
			{ color: shadowColor, y: 2 },
			{ color: textColor, y: 0 }
		]) {
		
			// draw the text/shadow
			const text = new PIXI.Text(displayName, {
				fontSize: DEFAULT_NAMECARD_FONT_SIZE * scaleY,
				fontFamily: DEFAULT_NAMECARD_FONT_NAME,
				fontWeight: DEFAULT_NAMECARD_FONT_WEIGHT,
				fill: style.color
			});
	
			// align
			text.x = 0 | (left);
			text.y = 0 | (style.y * scaleY);
			// text.mask = mask;
	
			// add to the view
			overlay.addChild(text);
		}

		// no icons to render
		if (!icons) return;

		// render the icon block
		const { tallest, ids } = icons;
		const surface = createContext();

		// create the icon strip
		surface.resize(500, tallest);
		surface.ctx.setTransform(1, 0, 0, 1, 0, 0);
		surface.ctx.translate(0, 0 | (tallest / 2));
		drawIcons(surface.ctx, ids, scaleY);

		// scale the icons down - try to use a sharper scaling
		// const resample = scaleY * 0.6;
		// scaleCanvas(surface.canvas, 0 | (500 * resample), 0 | (tallest * resample), true);
		
		// create the new texture
		const texture = PIXI.Texture.from(surface.canvas);
		const banner = new PIXI.Sprite(texture);
		banner.scale.x = banner.scale.y = NAMECARD_ICON_SCALE;
		
		// add the banner to the view
		banner.y = 0 | -(banner.getBounds().height * 0.95);
		banner.x = left + 3;
		overlay.addChild(banner);
	}

	// create the text labels
	_initOverlay() {
		const { ICONS } = NameCard;
		const isGoldNameCard = !!this.isGold;

		// prepare the floating overlay container
		this.overlay = new PIXI.Container();
		this.overlay.zIndex = LAYER_NAMECARD_OVERLAY;
		this.overlay.visible = false;

		// get info to show
		const { options } = this;
		const { name = 'Guest Racer', team, isTop3, isGold, isFriend } = options;
		this.displayName = [ team && `[${team}]`, name ].join(' ');

		// check for icons
		let tallest = 0;
		const ids = [ ];
		if (isGold && !isGoldNameCard) {
			tallest = Math.max(tallest, ICONS.gold.height);
			ids.push('gold');
		}
		
		if (isTop3) {
			tallest = Math.max(tallest, ICONS.top3.height);
			ids.push('top3');
		}

		if (isFriend) {
			tallest = Math.max(tallest, ICONS.friend.height);
			ids.push('friend');
		}

		// if there are no icons
		if (ids.length === 0) return;

		// save icon rendering
		this.icons = {
			surface: createContext(),
			tallest,
			ids
		};

	}

}

// renders the player icons onto a single canvas
function drawIcons(ctx, icons, scale) {
	const GAP = 0 | (10 * scale);
	let x = 0;
	for (const id of icons) {
		const icon = NameCard.ICONS[id];
		let { width, height } = icon;

		width = ((width * 1) * scale);
		height = ((height * 1) * scale);

		// render onto the view
		ctx.drawImage(icon, x, 0 | (height * -0.5), width, height);
		x += 0 | (width + GAP);
	}
}
