import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { BaseView } from '../base';
import * as scaling from './scaling';
import Player from './player';
import Track from '../../components/track';
import { merge } from '../../utils';
import { toRGB } from '../../utils/color';
import { NAMECARD_EDGE_PADDING } from '../../config';
import { LAYER_NAMECARD } from './layers';

/** creates a track view that supports multiple cars for racing */
export default class TrackView extends BaseView {

	// global effect filter
	filter = new PIXI.filters.ColorMatrixFilter()

	// tracking players and their namecards
	players = [ ]
	namecards = [ ]

	// tracking track display state
	state = {
		speed: 0,
		maxSpeed: 2
	}

	// handle remaining setup
	init(options) {
		options = merge({ scale: { height: scaling.BASE_HEIGHT }}, options);
		super.init(options);

		PIXI.settings.ROUND_PIXELS = true;

		// attach the effects filter
		this.stage.filters = [ this.filter ];
	}

	/** adds a new car to the track */
	addPlayer = async options => {
		const { players, stage } = this;

		// create the player instance
		const playerOptions = merge({ view: this }, options);
		const player = await Player.create(playerOptions);
		players.push(player);

		// with the player, include their namecard
		const { namecard } = player.layers;
		if (namecard) {

			// wrap the container with a responsive container
			const container = new AnimatorPIXI.ResponsiveContainer();
			container.addChild(namecard);

			// add to the view
			stage.addChild(container);

			// match positions to the car
			container.zIndex = LAYER_NAMECARD;
			container.relativeY = player.relativeY;
			container.relativeX = 0;
			container.pivot.x = (namecard.width * -0.5) - NAMECARD_EDGE_PADDING;
		}

		// adapts the player to the track
		// player.setTrack(this.track);
		
		// add to the view
		stage.addChild(player);
		stage.sortChildren();
	}

	/** assigns the current track */
	setTrack = async options => {
		const { stage } = this;
		const trackOptions = merge({ view: this }, options);
		const track = this.track = await Track.create(trackOptions);

		// add the scroling ground
		stage.addChild(track.ground);
		track.ground.zIndex = -100;
		track.ground.relativeX = 0.5;

		// add the scrolling overlay
		stage.addChild(track.overlay);
		track.overlay.zIndex = 100;
		track.overlay.relativeX = 0.5;

		// sort the layers
		stage.sortChildren();
	}

	/** handles activating the nitro effect for a player */
	activateNitro = index => {
		const player = this.players[index];
		if (player) {
			player.car.activateNitro();
		}
	}

	render = () => {

		// const MAX_SPEED = 1;
		// const MAX_SPEED = 2;
		// const MAX_SPEED = 0.1;
		// const MAX_SPEED = 0;
		this.state.speed = Math.min(this.state.maxSpeed, this.state.speed);

		// updates
		for (const player of this.players) {
			player.update(this.state);
		}

		// TODO: replace with new views
		// this is temporary check until
		// garage and preview modes are done
		if (this.track) {
			this.track.update(this.state);
		}


		// redraw
		super.render();
	}

}