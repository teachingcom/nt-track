// TODO: refactor this file after introducing SSAA

import { isArray, isNumber, merge } from '../../utils';
import { toRGBA } from '../../utils/color';
import { PIXI, createContext, getBoundsForRole, removeDisplayObject } from 'nt-animator';

// preferred font for namecards
const TARGET_NAMECARD_WIDTH = 650
const NAMECARD_MAX_NAME_LENGTH = 20;
const DEFAULT_CENTER_PADDING = 8;
const DEFAULT_LEFT_MARGIN = 25;
const DEFAULT_TOP_MARGIN = 10;
const NAMECARD_ICON_GAP = 10;
const NAMECARD_MAXIMUM_WIDTH = 575;
const DEFAULT_NAMECARD_FONT_SIZE = 52;
const DEFAULT_NAMECARD_FONT_NAME = 'montserrat';
const DEFAULT_NAMECARD_FONT_WEIGHT = 600;
const DEFAULT_NAMECARD_FONT = {
	fontSize: DEFAULT_NAMECARD_FONT_SIZE,
	fontFamily: DEFAULT_NAMECARD_FONT_NAME,
	fontWeight: DEFAULT_NAMECARD_FONT_WEIGHT,
};

const NAMECARD_TEXT_STYLE = new PIXI.TextStyle(DEFAULT_NAMECARD_FONT);

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
		let path = `nametags/${type}`.replace(/\/+/, '/')
		let config = view.animator.lookup(path)
		
		// maybe needs to load
		if (!config) {
			try {
				await view.animator.importManifest(path)
				config = view.animator.lookup(path)
			}
			// nothing to do, just let the next config
			// load attempt fix this
			catch(ex) { }
		}

		// if missing, use the default
		if (!config) {
			path = 'nametags/default_tag'
			config = view.animator.lookup(path)
		}

		// if still missing then there's not
		// a name card that can be used
		if (!config) return

		// save the properties
		console.log('jhas', options)
		const isGoldNamecard = /gold/i.test(type)
		const isPlayerNamecard = /player/i.test(type)
		const hasOverlay = config.overlay !== false
		const { isAdmin, isChampion } = options
		merge(instance, { options, view, path, config, isGoldNamecard, isPlayerNamecard, isAdmin, isChampion, hasOverlay })

		// attempt to add a namecard
		try {			
			// create a container for all parts
			instance.container = new PIXI.Container();
			instance.addChild(instance.container);

			// initialize all namecard parts
			await instance._initNameCard();
			await instance._initIcons();

			// check for an overlay to render
			if (hasOverlay)
				instance._initOverlay();
		}
		// failed to render the card and could
		// potentially be a future issue - logthis
		catch (ex) {
			console.error(ex);
			this.failedToLoadNamecard = true;
			return null;
		}

		// return the created namecard
		instance.pivot.x = -instance.nudgeX
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
		const scale = baseHeight / this.bounds.height
		container.scale.x = container.scale.y = scale;

		// calculate nudging values used to position this layer correctly
		const { nudgeX = 0, nudgeY = 0 } = config
		const bounding = namecard.getBounds()
		this.nudgeX = (((bounding.width - TARGET_NAMECARD_WIDTH) * -0.5) + nudgeX) * scale
		this.nudgeY = nudgeY * scale

		// add to the view
		container.addChild(namecard);
	}

	// handle loading icons
	async _initIcons() {
		if (!!NameCard.ICONS) return;
		const { view } = this;
		
		const [
			top3,
			top10,
			top50,
			top100,
			top300,
			gold,
			friend,
			admin,
			admin_invert,
			champion,
		] = await Promise.all([
			view.animator.getImage('images', 'icon_top_3'),
			view.animator.getImage('images', 'icon_top_10'),
			view.animator.getImage('images', 'icon_top_50'),
			view.animator.getImage('images', 'icon_top_100'),
			view.animator.getImage('images', 'icon_top_300'),
			view.animator.getImage('images', 'icon_gold'),
			view.animator.getImage('images', 'icon_friend'),
			view.animator.getImage('images', 'icon_admin'),
			view.animator.getImage('images', 'icon_admin_invert'),
			view.animator.getImage('images', 'icon_champion')
		])
		
		NameCard.ICONS = {
			top3,
			top10,
			top50,
			top100,
			top300,
			gold,
			friend,
			admin,
			admin_invert,
			champion,
		};
	}

	/** changes the visibility for a namecard */
	setVisibility = visible => this.visible = visible;

	/** changes the position and makes the namecard visible */
	setPosition = x => {
		this.x = 0 | x;
		// this.y = 0 | this.y;
	}

	// generates the overlay content
	_renderOverlay = () => {
		const { displayName, icons, bounds, config, container, hasOverlay } = this;

		// no need to resize
		if (!hasOverlay) return;

		// create the bounds
		const { width, height } = bounds;
		const cx = 0 | width / 2;
		const cy = 0 | height / 2;
		
		// create the layer to draw everything
		const surface = createContext();
		const { ctx, canvas } = surface;
		surface.resize(0 | width * 0.875, 0 | height * 0.85);
	
		// get rendering params
		let textColor = '#ffffff';
		let shadowColor = '#000000';
		let left = DEFAULT_LEFT_MARGIN;
		let top = DEFAULT_TOP_MARGIN;
		
		// check for display text config
		if (config.text) {
			textColor = 'color' in config.text ? toRGBA(config.text.color, 1) : textColor;
			shadowColor = 'shadow' in config.text ? toRGBA(config.text.shadow, config.text.shadowOpacity || 1) : shadowColor;
			if (!isNaN(config.text.left)) left = config.text.left;
			if (!isNaN(config.text.top)) top = config.text.top;
		}

		// prepare to draw text
		ctx.textBaseline = 'top';
		ctx.textAlignment = 'left';

		// check for fonts
		let font = [ DEFAULT_NAMECARD_FONT_NAME ];
		if (config.text?.font) {
			const include = isArray(config.text.font) ? config.text.font : [ config.text.font ];
			font.unshift(...include);
		}

		ctx.font = `${DEFAULT_NAMECARD_FONT_WEIGHT} ${DEFAULT_NAMECARD_FONT_SIZE * (config.text?.scale || 1)}px ${font.join(', ')}`;

		// render the text
		ctx.translate(0, cy + DEFAULT_CENTER_PADDING);

		for (const style of [
			{ color: shadowColor, y: 'shadowY' in (config.text || { }) ? (config.text.shadowY || 0) : 4, blur: config.text?.shadowBlur || 0, isShadow: true },
			{ color: textColor, y: 0, blur: 0 }
		]) {

			// render each part			
			if (style.blur) {
				ctx.shadowBlur = style.blur
				ctx.shadowColor = style.color;
			}
			else {
				ctx.shadowBlur = 0
				ctx.shadowColor = '';
				ctx.fillStyle = style.color;
			}

			ctx.fillText(displayName, 0, style.y);
		}

		// check for icons to render
		if (!!icons) {
	
			// render the icon block
			const { tallest, ids } = icons;
			
			// create the icon strip
			surface.ctx.setTransform(1, 0, 0, 1, 0, 0);
			surface.ctx.translate(0, 0 | (tallest / 2));
			drawIcons(surface.ctx, ids);
		}

		// create the new texture
		const texture = PIXI.Texture.from(canvas);
		const display = new PIXI.Sprite(texture);

		// add the banner to the view
		display.y = -cy + top;
		display.x = -cx + left;
		container.addChild(display);
	}

	// create the text labels
	_initOverlay() {
		const { ICONS } = NameCard;

		// get info to show
		const { options, isGoldNamecard, config } = this;
		const {
			isTop3,
			isGold,
			isChampion,
			isFriend,
			isAdmin
		} = options;
		
		// TODO: support for old style -- remove later and
		// only use the playerRank
		const playerRank = isTop3 ? 3 : options.playerRank;
		const playerRankIconId = `top${playerRank}`;
		const playerRankIcon = ICONS[playerRankIconId];
		const hasPlayerRank = !!playerRankIcon;
		
		// debug
		// options.name = '|||||.|||||.|||||.|||||.|||||';
		// options.team = ' TALK ';

		// console.log('is usong', options, this)
		// create the full name
		const name = clean(options.name);
		const team = clean(options.team);
		let full = [ team && `[${team}]`, name ].join(' ');

		// measure to fit
		if (full.length > NAMECARD_MAX_NAME_LENGTH) {
			const maxWidth = config.text?.maxWidth || NAMECARD_MAXIMUM_WIDTH;
			let safety = full.length;
			while (--safety > 0) {
				const size = PIXI.TextMetrics.measureText(full, NAMECARD_TEXT_STYLE);
				if (size.width < maxWidth) break;
				full = full.substr(0, full.length - 1);
			}
		}
		
		// set the display name
		this.displayName = full;

		// check for icons
		let tallest = 0;
		const ids = [ ];

		// Disallow Gold Icons as of the nametags update
		// leaving here to make it easy to restore if needed
		// if (!isAdmin && isGold && !isGoldNamecard && !config.hideGold) {
		// 	tallest = Math.max(tallest, ICONS.gold.height);
		// 	ids.push('gold');
		// }
		
		if (isAdmin && !config.hideAdmin) {
			tallest = Math.max(tallest, ICONS.admin.height);
			ids.push(config.invertAdmin ? 'admin_invert' : 'admin');
		}
		
		// if (hasPlayerRank) {
		// 	tallest = Math.max(tallest, playerRankIcon.height);
		// 	ids.push(playerRankIconId);
		// }

		if (isChampion && !isAdmin) {
			tallest = Math.max(tallest, ICONS.champion.height);
			ids.push('champion');
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

	// stop () {
  //   this.controller.stopEmitters()
  // }

  dispose() {
    // this.stop()
    removeDisplayObject(this)
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

// remove excess whitespace
function clean(str) {
	return (str || '').toString()
		.replace(/^\s*|\s*$/g, '')
		.replace(/\s+/, ' ');
}