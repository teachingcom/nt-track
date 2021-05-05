import * as audio from '../../audio'

// handles preloading external assets
export default class AssetPreloader {

	// instantiation
	constructor(track) {
		this.track = track
		this.options = track.options
		this.animator = track.view.animator
	}

	// prepares the resource loading 
	async preload(resources) {
		this.resources = resources
		await this._preloadResources()
		this._validateResources()
	}

	// kick off all asset loading requests
	_preloadResources = async () => {
		const { resources, animator } = this
		const pending = [ ]
		
		// queue up all pending asset loading requests
		for (const resource of resources) {
			const { type, src, key, sprites } = resource
			
			// loading image assets
			let task
			if (type === 'spritesheet') {
				task = animator.preloadSpritesheet(src)
			}
			else if (type === 'image') {
				task = animator.getImage(src)
			}
			// loading audio files
			else if (type === 'audio') {
				console.log(sprites, src, key)
				task = audio.register(src, sprites, key)
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