
import * as PIXI from 'pixi.js';
import { first, merge } from '../../utils';
import { toRGBA } from '../../utils/color';
import { createContext, getBoundsForRole } from 'nt-animator';

// preferred font for namecards
const DEFAULT_NAMECARD_FONT = 'montserrat';
const PREFERRED_NAME_FONT_SIZE = 64;
const PREFERRED_TEAM_FONT_SIZE = 48;

// positioning for names
const NAME_START = 0.52;
const TEAM_MARGIN = 0.05;
const LEFT_MARGIN = 0.07;

// handles rendering name cards once to prevent needing
// to call rendering functions the entire race
const cardRenderer = createContext();

// trailing namecard for a player
export default class NameCard extends PIXI.Container {

	/** handles creating a new namecard */
	static async create(options) {
		const instance = new NameCard();
		
		// determine the type to create
		const { type, view } = options;
		
		// try and load
		let path = `namecards/${type}`;
		let config = view.animator.lookup(path);

		// if missing, use the default
		if (!config) {
			path = 'namecards/default';
			config = view.animator.lookup(path);
		}

		// if still missing then there's not
		// a name card that can be used
		if (!config) {
			return;
		}

		// save the properties
		merge(instance, { options, view, path, config });

		// create a container for all parts
		instance.container = new PIXI.Container();
		instance.addChild(instance.container);
		
		// initialize all namecard parts
		await instance._initNameCard();
		instance._initText();

		// return the created namecard
		return instance;
	}
	

	// creates the namecard instance
	async _initNameCard() {
		const { path, view, options } = this;
		const { baseHeight } = options;

		// create the instance
		const namecard = await view.animator.create(path);

		// scale correctly
		this.bounds = getBoundsForRole(namecard, 'base');
		this.container.scale.x = this.container.scale.y = baseHeight / this.bounds.height;
		
		// add to the view
		this.container.addChild(namecard);
	}

	// create the text labels
	_initText() {
		const { config, options } = this;
		const { text = { } } = config;
		const { name = 'Guest Racer', team, color = 'white' } = options;

		// setup the name text
		const nameConfig = createTextConfig(name, PREFERRED_NAME_FONT_SIZE, 'bottom', text.name, config.text);
		if (isNaN(nameConfig.x) || isNaN(nameConfig.y)) {
			nameConfig.x = this.bounds.width * LEFT_MARGIN;
			nameConfig.y = this.bounds.height * NAME_START;
			nameConfig.color = 'white';
		}
		
		// setup the team text
		let teamConfig;
		if (team) {
			teamConfig = createTextConfig(`[${team}]`, PREFERRED_TEAM_FONT_SIZE, 'top', text.team, config.text);
			if (isNaN(teamConfig.x) || isNaN(teamConfig.y)) {
				teamConfig.x = this.bounds.width * LEFT_MARGIN;
				teamConfig.y = this.bounds.height * (NAME_START + TEAM_MARGIN);
				teamConfig.color = color;
			}
		}
		// no team was provided? Move the name
		else {
			nameConfig.baseline = 'middle';
			nameConfig.y = this.bounds.height * 0.5;;
		}

		// reset the view
		cardRenderer.canvas.width = this.bounds.width;
		cardRenderer.canvas.height = this.bounds.height;
		
		// render each block
		for (const block of [nameConfig, teamConfig]) {
			if (!block) continue;

			// render the text
			cardRenderer.ctx.textBaseline = block.baseline;
			cardRenderer.ctx.fillStyle = block.color;
			cardRenderer.ctx.font = `${block.fontWeight} ${block.fontSize}px ${block.fontFamily}`;

			// clear shadows
			if (block.disableShadow)
				cardRenderer.ctx.shadowColor = null;
			// render with a shadow
			else {
				cardRenderer.ctx.shadowOffsetX = 0;
				cardRenderer.ctx.shadowOffsetY = 2;
				cardRenderer.ctx.shadowBlur = 5;
				cardRenderer.ctx.shadowColor = toRGBA(block.dropShadowColor, block.dropShadowAlpha);
			}

			// render the text
			cardRenderer.ctx.fillText(block.text, block.x, block.y);
		}

		// create an image from the nametag
		const img = document.createElement('img');
		img.src = cardRenderer.canvas.toDataURL();

		// use it as a sprite
		const overlay = new PIXI.Sprite.from(img);
		overlay.pivot.x = cardRenderer.canvas.width / 2;
		overlay.pivot.y = cardRenderer.canvas.height / 2;
		this.container.addChild(overlay);	
	}

}

// common text configs
const createTextConfig = (text, fontSize, baseline, config = { }, defaults = { }) => ({
	
	// fonts
	fontFamily: first(config.font, DEFAULT_NAMECARD_FONT),
	fontWeight: first(config.weight, 'bold'),

	// copied
	text,
	fontSize,
	baseline,
	
	// styles
	color: first(config.color, defaults.color, 0xffffff),
	disableShadow: first(config.disableShadow, defaults.disableShadow, false),
	dropShadowColor: first(config.shadow, defaults.shadow, 0x000000),
	dropShadowAlpha: first(config.shadowOpacity, defaults.shadowOpacity, 0.7),
	
	// maybe allow layer
	// dropShadowBlur: 3,
	// dropShadowDistance: 2,
	// dropShadowAngle: Math.PI / 2,

	// position
	x: config.x,
	y: config.y
});

