/**
 * @class Cat
 */
class Cat {
    /**
     * @constructor
     */
    constructor() {
        /**
         * @property {number} speed - The speed of the animation in milliseconds.
         * @private
         * @default 150
         */
        this.speed = 150;

        /**
         * @property {number} currentFrame - The current frame of the animation.
         * @private
         * @default 0
         */
        this.currentFrame = 0;

        /**
         * @property {number} totalFrames - The total number of frames in the animation.
         * @private
         * @default 5
         */
        this.totalFrames = 5;

        /**
         * @property {HTMLElement} catIcon - The HTML element for the cat icon.
         * @private
         * @default null
         */
        this.catIcon = document.querySelector("#cat-icon");

        /**
         * animation interval timer ID
         * @type {number|null}
         * @private
         * @default null
         */
        this.animationId = null;
    }

    /**
     * Advances to the next frame in the animation.
     * @method nextFrame
     */
    nextFrame() {
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        this.updateFrame();
    }

    /**
     * Updates the cat icon to the current frame.
     * @method updateFrame
     */
    updateFrame() {
        const iconPath = `./assets/cat/light_cat_running_${this.currentFrame}.ico`;
        this.catIcon.src = iconPath;
    }

    run() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.lastFrameTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - this.lastFrameTime;

            if (elapsed >= this.speed) {
                this.nextFrame();
                this.lastFrameTime = currentTime - (elapsed % this.speed);
            }

            this.animationId = requestAnimationFrame(animate);
        };

        this.animationId = requestAnimationFrame(animate);
    }
}

export default Cat;
