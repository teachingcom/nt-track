import * as PIXI from 'pixi.js';
import { BASE_HEIGHT, TRACK_HEIGHT } from '../../views/track/scaling';
import { getBoundsForRole } from 'nt-animator';

export default class Segment {

	constructor(track, composition) {
		this.track = track;
		this.composition = composition;

		// sort check layers using their z-index to put them
		// into their correct containers
		const { top, bottom } = this;
		for (let i = composition.children.length; i-- > 0;) {
			const child = composition.children[i];
			const target = child.zIndex > 0 ? top : bottom;
			target.addChildAt(child, 0);
		}
		
		// use the base layers to determine the track bounds
		// as the scale for the top and bottom layers
		const { width, height, left, right } = this.getBounds();
		const bounds = this.bounds = { width, height, left, right };
		const scale = this.scale = (BASE_HEIGHT * TRACK_HEIGHT) / bounds.height;
		top.scale.x = top.scale.y = bottom.scale.x = bottom.scale.y = scale;
		
		// alignment takes place on the left edges
		top.pivot.x = bottom.pivot.x = bounds.left;

		// sort by z-index
		top.sortChildren();
		bottom.sortChildren();
	}

	get visible() {
		return this.top.visible;
	}

	set visible(value) {
		this.top.visible = this.bottom.visible = value;
	}

	top = new PIXI.Container();
	bottom = new PIXI.Container();

	get visible() {
		return this.bottom.visible;
	}

	set visible(visible) {
		this.bottom.visible = this.top.visible = !!visible;
	}

	// perform culling if out of view
	cull = () => {
		const { bottom, bounds, track } = this;
		const { x } = bottom;
		const { width } = bounds;
		const overflow = track.view.width * 1.5;
		this.visible = x < overflow && x > -(width + overflow);
	}

	getBounds(asGlobal) {
		return getBoundsForRole(this.bottom, 'base', asGlobal);
	}

	setX(value) {
		this.bottom.x = value;
		this.top.x = value;
	}

	getX() {
		return this.bottom.x;
	}

	addX(value) {
		this.bottom.x += value;
		this.top.x += value;
	}

	getY() {
		return this.bottom.y;
	}
	
	setY(value) {
		this.bottom.y = value;
		this.top.y = value;
	}

	addY(value) {
		this.bottom.y += value;
		this.top.y += value;
	}

	// disposes and removes a child from the view
	dispose() {
		this.top.parent.removeChildAt(this.top.parent.getChildIndex(this.top));
		this.bottom.parent.removeChildAt(this.bottom.parent.getChildIndex(this.bottom));
		this.composition.dispose();
	}

}

