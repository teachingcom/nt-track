import { BaseView } from '../base';
import * as scaling from './scaling';
import Player from './player';
import Track from '../../components/track';
import { merge } from '../../utils';

export default class TrackView extends BaseView {

	/** creates a new track */
	constructor(options) {
		super({ baseHeight: scaling.BASE_HEIGHT }, options);
	}

	// tracking each lane
	players = [ ]

	/** adds a new car to the track */
	addCar = async options => {
		
		const playerOptions = merge({ view: this }, options);
		const player = await Player.create(playerOptions);
		this.stage.addChild(player);
		this.players.push(player);

		this.stage.sortChildren();
	
		// const car = await Car.create(this, options);
		// this.players[options.lane] = car;
		
		// const wrap = new AnimatorPIXI.ResponsiveContainer();
		// wrap.addChild(car);
		
		// wrap.relativeX = 0.5;
		// wrap.relativeY = 0.5;

		// this.stage.addChild(wrap);
	}

	/** assigns the current track */
	setTrack = async options => {
		const trackOptions = merge({ view: this }, options);
		this.track = await Track.create(trackOptions);
		this.stage.addChild(this.track);

		// check for a foreground
		if (this.track.foreground) {

			// TODO: track layers in a file
			this.track.foreground.zIndex = 100;

			// add to the view
			this.stage.addChild(this.track.foreground);
			this.stage.sortChildren();
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