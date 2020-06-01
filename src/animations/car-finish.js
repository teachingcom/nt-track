import { noop } from "../utils";
import { tween, easing, chain, delay } from 'popmotion';
import { CAR_SHADOW_OFFSET_Y } from "../config";
import { TRACK_CENTER } from "../views/track/scaling";

export default class CarFinishLineAnimation {

	constructor({ isActivePlayer, player, track, place }) {
		this.player = player;
		this.track = track;
		this.place = place;
		this.isActivePlayer = isActivePlayer;
	}

	play({ isInstant = false, update = noop, complete = noop }) {
		const { player, place, isActivePlayer, track } = this;
		const { car, trail } = player;
		const { shadow } = car;

		// push each y position scaled slightly towards
		// the middle to give room for sliding
		let y = player.relativeY;
		y -= TRACK_CENTER;
		y *= 0.6;
		y += TRACK_CENTER;
		y = Math.sin(y);
		
		// create params
		const placementOffset = place * 0.1;
		const rotateUp = Math.random() < 0.5 ? true : false;
		const rotationStagger = ((Math.random() * 0.2) - 0.1) * Math.PI;
		const rotationDirection = (rotateUp ? (Math.PI / -2) : (Math.PI / 2)) * (1 - placementOffset);
		const restingY = y + (rotateUp ? -0.1 : 0.1);
		const shadowOffsetY = (rotateUp ? (CAR_SHADOW_OFFSET_Y / car.scale.x) * 10 : 0); // * placementOffset;
		const hoodPivotPoint = car.width * 0.45;

		// the starting point for the animatin
		// TODO: look at shortening the animation and
		// starting closer to the line
		const entryOrigin = {
			playerX: -0.25 - placementOffset,
			shadowY: shadow.pivot.y
		};

		// the stopping point
		// TODO: look at a tigher fit when lanes are staggered
		const entryDestination = {
			playerX: 0.9 - placementOffset,
			shadowY: shadow.pivot.y + shadowOffsetY
		};

		// the slide starting point
		const slideOrigin = { 
			carPivotX: 0,
			carY: y,
			carRotation: 0,
			trailAlpha: 255
		};
		
		// the slide ending point
		// TODO: ensure all cars don't slide the same way
		const slideDestination = { 
			carPivotX: hoodPivotPoint,
			carY: restingY,
			carRotation: rotationDirection + rotationStagger,
			trailAlpha: 0
		};

		// handle updating the entry animation
		const updateEntryProps = props => {
			player.relativeX = props.playerX;
			shadow.pivot.y = props.shadowY;
		};

		// handle animating the slide in props
		const updateSlideProps = props => {
			player.pivot.x = props.carPivotX;
			player.rotation = props.carRotation;
			player.relativeY = props.carY;

			// update each trail part
			trail.each(part => {
				part.alpha = Math.min(1, props.trailAlpha * 0.01);
				part.skew.y = -props.carRotation * 0.25;

				// TODO: -35 is hard coded because it looks good
				// but probably should be relative to the car
				part.y = (-props.carRotation * 0.15) * -35;
			});
		};

		// set the new starting positions
		player.relativeY = slideOrigin.carY;
		player.relativeX = entryOrigin.playerX;

		// if this shouldn't be animated, for example
		// the player isn't finishing in first place
		if (isInstant) {
			updateEntryProps(entryDestination);
			updateSlideProps(slideDestination);
			if (complete) complete();
			return;
		}

		// set starting positions
		updateEntryProps(entryOrigin);
		updateSlideProps(slideOrigin);

		// start the entry animation
		const entryAnimation = tween({
			duration: 1500,
			// duration: 3000,
			// ease: easing.cubicBezier(.27,1.31,.25,.72),
			ease: easing.easeOut,
			from: entryOrigin,
			to: entryDestination
		})
		.start({ update: updateEntryProps })

		// sliding in animation
		const slideAnimation = tween({
			duration: 600 + Math.abs(400 * rotationDirection),
			// duration: 4300, // + Math.abs(400 * rotationDirection),
			// ease: easing.cubicBezier(1,.02,.68,1.36),
			ease: easing.backOut,
			from: slideOrigin,
			to: slideDestination,
		});
		
		// queue up the slide in tween
		delay(500)
			.start({
				complete: () => slideAnimation.start({ 
					update: updateSlideProps
				})
			});

		// // for the current player, zoom in on their car
		// if (!isActivePlayer) return;

		// // get the stage access
		// const stage = track.view.view;

		// // recenter the view
		// // stage.scale.x = stage.scale.y = props.scale;
		// const bounds = track.view.getViewport();
		// const cx = bounds.width / 2;
		// const cy = bounds.height / 2;
		// stage.pivot.x = cx;
		// stage.pivot.y = cy;
		// stage.x = cx;
		// stage.y = cy;

		// // determine the player position in
		// // absolute values
		// const playerX = entryDestination.playerX * stage.width;
		// console.log(cx, playerX)

		// // const cameraX = 0;
		// // const cameraX = -(() - cx);

		// const cameraX = playerX; // + (cx - (playerX - hoodPivotPoint));
		// // console.log(stage.x);
		// // console.log(cameraX)

		// // update camera values

		// const updateCameraProps = props => {
			
		// 	stage.x = props.x;
		// 	// stage.y -= cy * props.y;
		// 	stage.scale.x = stage.scale.y = props.scale;

		// };


		// const cameraAnimation = tween({
		// 	duration: 1500,
		// 	ease: easing.backOut,
		// 	from: { scale: 1, x: cx },
		// 	to: { scale: 2.2, x: cameraX }
		// });

		// delay(500)
		// 	.start({
		// 		complete: () => cameraAnimation.start({
		// 			update: updateCameraProps
		// 		})
		// 	});
		


	}

}