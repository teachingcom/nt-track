import * as PIXI from 'pixi.js';
import { BaseView } from '../base';
import * as scaling from './scaling';
import Player from './player';
import Track from '../../components/track';
import { merge } from '../../utils';
import { toRGB } from '../../utils/color';

export default class TrackView extends BaseView {

	// tracking each lane
	players = [ ]

	// global effect filter
	filter = new PIXI.filters.ColorMatrixFilter()

	// handle remaining setup
	init(options) {
		options = merge({ scale: { height: scaling.BASE_HEIGHT }}, options);
		super.init(options);

		// attach the effects filter
		this.stage.filters = [ this.filter ];
	}

	/** adds a new car to the track */
	addPlayer = async options => {
		// create the player instance
		const playerOptions = merge({ view: this }, options);
		const player = await Player.create(playerOptions);
		this.players.push(player);

		// adapts the player to the track
		// player.setTrack(this.track);
		
		// add to the view
		this.stage.addChild(player);
		this.stage.sortChildren();
	}

	/** assigns the current track */
	setTrack = async options => {
		const { stage } = this;
		const trackOptions = merge({ view: this }, options);
		const track = this.track = await Track.create(trackOptions);
		stage.addChild(track);

		// check for a foreground
		if (track.foreground) {

			// TODO: track layers in a file
			track.foreground.zIndex = 100;

			// add to the view
			stage.addChild(track.foreground);
			stage.sortChildren();
		}
	}

	state = {
		speed: 0
	}

	render = () => {

		const MAX_SPEED = 2;
		this.state.speed = Math.min(MAX_SPEED, this.state.speed + 0.01);

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