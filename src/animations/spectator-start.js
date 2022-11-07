import Animation from './base'
import { noop } from '../utils'
import { animate, findDisplayObjectsOfRole } from 'nt-animator'

const ENTER_TIME = 3000
const DISPLAY_TIME = 4000
const EXIT_TIME = 500

export default class SpectatorStartAnimation extends Animation {
  constructor ({ follow, track }) {
    super()

    // this.player = player
    this.track = track
		this.follow = follow
    
		// hidden by default
		this.follow.alpha = 0
  }

  play = async ({ update = noop, complete = noop } = { }) => {
    const { follow, track } = this

		const [ bar ] = findDisplayObjectsOfRole(follow, 'bar');
		const [ text ] = findDisplayObjectsOfRole(follow, 'text');

		// show the marker
		animate({
			ease: 'easeOutQuad',
			from: { a: 0, x: text.x + 100 },
			to: { a: 1, x: text.x },
			loop: false,
			duration: ENTER_TIME,
			update({ a, x }) {
				follow.alpha = a;
				text.x = x;
			}
		});

		// // give it a moment
		// await animate.wait(DISPLAY_TIME);

		// // remove the marker
		// animate({
		// 	ease: 'easeOutQuad',
		// 	from: { a: 1 },
		// 	to: { a: 0 },
		// 	loop: false,
		// 	duration: EXIT_TIME,
		// 	update({ a }) {
		// 		follow.alpha = a;
		// 	},
		// 	complete() {
		// 		follow.destroy()
		// 	}
		// });
  }

}