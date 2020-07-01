import * as PIXI from 'pixi.js';
import { BASE_HEIGHT, TRACK_HEIGHT } from '../../views/track/scaling';
import { getBoundsForRole } from 'nt-animator';

export default class Segment {

	constructor(composition) {
		this.composition = composition;
		const { top, bottom } = this;
		
		// sort check layers using their z-index to put them
		// into their correct containers
		for (let i = composition.children.length; i-- > 0;) {
			const child = composition.children[i];
			const target = child.zIndex > 0 ? top : bottom;
			target.addChildAt(child, 0);
		}
		
		// use the base layers to determine the track bounds
		// as the scale for the top and bottom layers
		const bounds = this.bounds = this.getBounds();
		const scale = this.scale = (BASE_HEIGHT * TRACK_HEIGHT) / bounds.height;
		top.scale.x = top.scale.y = bottom.scale.x = bottom.scale.y = scale;

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

	getBounds() {
		return getBoundsForRole(this.bottom, 'base');
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
	
	// get y() {
	// 	return this.bottom.y / this.scale;
	// }

	// disposes and removes a child from the view
	dispose() {
		this.top.parent.removeChildAt(this.top.parent.getChildIndex(this.top));
		this.bottom.parent.removeChildAt(this.bottom.parent.getChildIndex(this.bottom));
		this.composition.dispose();
	}

}
