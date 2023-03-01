import NameCard from '../../components/namecard';

import { animate, PIXI } from 'nt-animator';
import { BaseView } from '../base';
import createActivityIndicator from '../../components/activity';

const DEFAULT_MAX_HEIGHT = 250;
const TRANSITION_TIME = 350;

export default class NameCardView extends BaseView {

	preferredFocusX = 0.5
	focusX = 0.5

	loader = createActivityIndicator({ size: 120, opacity: 0.5, thickness: 10 });
	
	async init(options) {
		window.PREVIEW = this

		// initialize the view
		await super.init({
			scale: { DEFAULT_MAX_HEIGHT },
			useDynamicPerformance: false,
			useWebGL: true,
			forceCanvas: false,
			...options
		});

		// center the loader in the view
		this.loader.relativeX = this.loader.relativeY = 0.5;
		this.stage.addChild(this.loader);

		// automatically render
		this.startAutoRender();
	}

	// creates a new car instance
	setNameCard = async config => {

		for (const child of this.stage.children) {
			fadeOut(child, false)
		}

		const view = this;
		const container = new PIXI.ResponsiveContainer()
		const namecard = await NameCard.create({
			view,
			baseHeight: this.options.height || 200,
			type: config.type,
			isAnimated: true,
			name: config.name,
			team: config.tag,
			color: config.tagColor,
			isGold: config.isGold,
			isFriend: false,
			playerRank: config.rank,
		});

		this.namecard = namecard
		
		// setup the container
		container.addChild(namecard);
		container.relativeY = 0.5;
		container.relativeX = 0.5;

		fadeOut(this.loader)
		fadeIn(container)

		namecard.visible = true;
		this.stage.addChild(container);
	}

}

function removeFromStage(target) {
	if (target.parent) {
		target.parent.removeChild(target);
	}
}

function fadeOut(target, skipRemove) {
	// cancel animations
	if (target.__transition) {
		target.__transition.stop();
	}

	// request the animation
	return new Promise(resolve => {
		animate({
			duration: TRANSITION_TIME,
			ease: 'linear',
			from: { alpha: target.alpha },
			to: { alpha: 0 },
			loop: false,
			update: props => target.alpha = props.alpha,
			complete: () => {
				removeFromStage(target);
				setTimeout(resolve, 100);
			},
		});
	});
}

function fadeIn(target) {
	target.alpha = 0;
	target.__transition = animate({
		duration: TRANSITION_TIME,
		ease: 'linear',
		from: { alpha: 0 },
		to: { alpha: 1 },
		loop: false,
		update: props => target.alpha = props.alpha
	});
}
