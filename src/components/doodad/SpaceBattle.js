import { findDisplayObjectsOfRole, removeDisplayObject } from 'nt-animator';

export default class SpaceBattle {

    constructor(instance) {
        this.projectiles = findDisplayObjectsOfRole(instance.doodad, 'projectiles');
        this.enemies = findDisplayObjectsOfRole(instance.doodad, 'enemy');
        this.explodes = findDisplayObjectsOfRole(instance.doodad, 'explode');

        for (const explode of this.explodes) {
            explode.onFrameChange = () => {
                if (explode.currentFrame === explode.totalFrames - 1) {
                    explode.alpha = 0;
                }
            }
        }

    }

    /**
     * Gets the particles container from an emitter
     * @param {Object} emitter - The emitter object
     * @returns {Object} Object with children property representing particles
     */
    getParticlesContainer(emitter) {
        return emitter.children[0];
    }

    /**
     * Checks if two bounds rectangles overlap
     * @param {PIXI.Rectangle} bounds1 - First bounds
     * @param {PIXI.Rectangle} bounds2 - Second bounds
     * @returns {boolean} True if bounds overlap
     */
    boundsOverlap(bounds1, bounds2) {
        return !(
            bounds1.x + bounds1.width < bounds2.x ||
            bounds2.x + bounds2.width < bounds1.x ||
            bounds1.y + bounds1.height < bounds2.y ||
            bounds2.y + bounds2.height < bounds1.y
        );
    }

    /**
     * Called when an enemy particle is destroyed
     * @param {Object} enemyParticle - The enemy particle being destroyed
     */
    explodeIndex = 0
    destroyAt(enemyParticle) {
        const explode = this.explodes[++this.explodeIndex % this.explodes.length];
        explode.x = enemyParticle.x;
        explode.y = enemyParticle.y;

        explode.alpha = 1;
        explode.gotoAndPlay(0);
        explode.loop = false;
    }

    update() {
        // Iterate through all projectile emitters
        for (const projectileEmitter of this.projectiles) {
            const projectileContainer = this.getParticlesContainer(projectileEmitter);
            if (!projectileContainer || !projectileContainer.children) continue;


            // Check each projectile particle
            for (let i = projectileContainer.children.length - 1; i >= 0; i--) {
                const projectileParticle = projectileContainer.children[i];
                if (!projectileParticle) continue;

                const projectileBounds = projectileParticle.getBounds();

                // Check against all enemy emitters
                let collisionFound = false;
                for (const enemyEmitter of this.enemies) {
                    if (collisionFound) break;

                    const enemyContainer = this.getParticlesContainer(enemyEmitter);
                    if (!enemyContainer || !enemyContainer.children) continue;

                    // Check each enemy particle
                    for (let j = enemyContainer.children.length - 1; j >= 0; j--) {
                        const enemyParticle = enemyContainer.children[j];

                        if (!enemyParticle) continue;

                        // Only check collision if enemy alpha is at 1
                        if (enemyParticle.alpha !== 1) continue;

                        // Remove enemy if x position is less than
                        if (enemyParticle.x < -enemyContainer.x) {
                            this.destroyAt(enemyParticle);
                            removeDisplayObject(enemyParticle);
                            continue;
                        }

                        const enemyBounds = enemyParticle.getBounds();
                        
                        // Check for overlap and distance
                        if (this.boundsOverlap(projectileBounds, enemyBounds)) {
                            // Calculate distance between particle centers
                            const size = Math.max(40, Math.max(projectileBounds.width, projectileBounds.height) * 0.5);
                            const projectileCenterX = projectileBounds.x + projectileBounds.width / 2;
                            const projectileCenterY = projectileBounds.y + projectileBounds.height / 2;
                            const enemyCenterX = enemyBounds.x + enemyBounds.width / 2;
                            const enemyCenterY = enemyBounds.y + enemyBounds.height / 2;

                            const dx = enemyCenterX - projectileCenterX;
                            const dy = enemyCenterY - projectileCenterY;
                            const distance = Math.hypot(dx, dy);

                            // Only consider it a hit if distance is less than 15
                            if (distance < size) {
                                // Remove both particles immediately
                                this.destroyAt(enemyParticle);
                                removeDisplayObject(projectileParticle);
                                removeDisplayObject(enemyParticle);
                                collisionFound = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
}