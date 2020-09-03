// TODO: refactor this file after introducing SSAA

import * as PIXI from 'pixi.js';
import { merge } from '../../utils';
import { toRGBA } from '../../utils/color';
import { createContext, getBoundsForRole } from 'nt-animator';

// preferred font for namecards
const NAMECARD_MAX_NAME_LENGTH = 15;
const NAMECARD_ICON_SCALE = 0.8;
const NAMECARD_ICON_GAP = 10;
const DEFAULT_NAMECARD_FONT_SIZE = 58;
const DEFAULT_NAMECARD_FONT_NAME = 'montserrat';
const DEFAULT_NAMECARD_FONT_WEIGHT = 600;

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
	setVisibility = visible => this.visible = visible;

	/** changes the position and makes the namecard visible */
	setPosition = x => this.x = x;

	// generates the overlay content
	_renderOverlay = () => {
		const { displayName, icons, container, config, overlay, hasOverlay } = this;
		
		// no need to resize
		if (!hasOverlay) return;

		// pick the left edge
		// TODO: why does this number work?
		const left = 0 | -(container.width * 1.15);

		// get colors to use for text
		let textColor = 0xffffff;
		let shadowColor = 0x000000;
		if (config.text) {
			textColor = 'color' in config.text ? toRGBA(config.text.color, 1) : textColor;
			shadowColor = 'shadow' in config.text ? toRGBA(config.text.shadow, 1) : shadowColor;
		}

		// render each line
		for (const style of [
			{ color: shadowColor, y: 4 },
			{ color: textColor, y: 0 }
		]) {
		
			// draw the text/shadow
			const text = new PIXI.Text(displayName, {
				fontSize: DEFAULT_NAMECARD_FONT_SIZE,
				fontFamily: DEFAULT_NAMECARD_FONT_NAME,
				fontWeight: DEFAULT_NAMECARD_FONT_WEIGHT,
				fill: style.color
			});

			// align
			text.x = 0 | left;
			text.y = 0 | style.y;
	
			// add to the view
			overlay.addChild(text);
		}

		// no icons to render
		if (!!icons) {
	
			// render the icon block
			const { tallest, ids } = icons;
			const surface = createContext();
			
			// create the icon strip
			surface.resize(500, 0 | tallest);
			surface.ctx.setTransform(1, 0, 0, 1, 0, 0);
			surface.ctx.translate(0, 0 | (tallest / 2));
			drawIcons(surface.ctx, ids);
			
			// create the new texture
			const texture = PIXI.Texture.from(surface.canvas);
			const banner = new PIXI.Sprite(texture);
			banner.scale.x = banner.scale.y = NAMECARD_ICON_SCALE;
			
			// add the banner to the view
			banner.y = 0 | -(banner.getBounds().height * 1.05);
			banner.x = left + 3;
			overlay.addChild(banner);
		}

	}

	// create the text labels
	_initOverlay() {
		const { ICONS } = NameCard;
		
		// get info to show
		const { options, container } = this;
		const { name = '12345678901234567890', team, isTop3, isGold, isFriend } = options;
		const isGoldNameCard = !!isGold;
		const full = [ team && `[${team}]`, name ].join(' ');
		
		// overlays won't change
		this.overlay = new PIXI.Container();
		this.overlay.cacheAsBitmap = true;
		container.addChild(this.overlay);
		
		// set the display name
		let displayName = full.substr(0, NAMECARD_MAX_NAME_LENGTH);
		this.displayName = displayName;

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
		if (ids.length > 0)
			// save icon rendering
			this.icons = {
				surface: createContext(),
				tallest,
				ids
			};


		// render the view
		this._renderOverlay();
	}

}

// renders the player icons onto a single canvas
function drawIcons(ctx, icons) {	
	let x = 0;
	for (const id of icons) {
		const icon = NameCard.ICONS[id];
		let { width, height } = icon;

		// render onto the view
		ctx.drawTexture(icon, x, 0 | (height * -0.5), width, height);
		x += 0 | (width + NAMECARD_ICON_GAP);
	}
}
