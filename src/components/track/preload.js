import * as audio from '../../audio'
import { SELECTED_CROWD_URL } from '../../plugins/crowd'

// handles preloading external assets
export default class AssetPreloader {

	// instantiation
	constructor(track) {
		this.track = track
		this.options = track.options
		this.animator = track.view.animator
	}

	// prepares the resource loading 
	async preload() {
		this._generateResourceList()
		await this._preloadResources()
		this._validateResources()
	}

	// determine which assets to preload
	_generateResourceList = () => {
		const { options, animator } = this

		// create a list of resources to preload
		const trackAssetsUrl = `tracks/${options.trackId}/${options.variantId}`
		const resources = [

			// preselected crowd image
			{ type: 'image', src: SELECTED_CROWD_URL },

			// unique track images
			{ type: 'image', src: `${trackAssetsUrl}.png` },
			{ type: 'image', src: `${trackAssetsUrl}.jpg` },
			
			// include other image files
			{ type: 'image', src: 'extras/countdown.jpg' },
			{ type: 'image', src: 'extras/countdown.png' },
			{ type: 'image', src: 'particles.png' },
			{ type: 'image', src: 'images.jpg' },
			{ type: 'image', src: 'images.png' },

			// common audio
			{ type: 'audio', src: animator.manifest.sounds, key:'common' },

			// TODO: allow tracks to define additional resources
		]

		// save the resources
		this.resources = resources
	}

	// kick off all asset loading requests
	_preloadResources = async () => {
		const { resources, animator } = this;
		const pending = [ ];
		
		// queue up all pending asset loading requests
		for (const resource of resources) {
			const { type, src, key } = resource;
			
			// loading image assets
			let task;
			if (type === 'image') {
				task = animator.getImage(src)
			}
			// loading audio files
			else if (type === 'audio') {
				task = audio.register(key, src)
			}
			// unknown preload type
			else {
				throw new InvalidResourceError()
			}

			// add the task
			pending.push(task)
		}

		// wait for results
		this.results = await Promise.all(pending)
	}

	// check if each resource is valid
	_validateResources = () => {
		const { resources, results } = this

		// verify all resources loaded successfully
		for (let i = resources.length; i-- > 0;) {
			const resource = resources[i]
			const result = results[i]

			// this failed to load
			if (!result) {
				const { type, src } = resource
				this.status = `${type} load error ${src}`
				throw new AssetLoadingError()
			}
		}

	}

}

// exceptions
function AssetLoadingError() { }
function InvalidResourceError() { }