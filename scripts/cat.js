/**
 * @class Cat
 */
class Cat {
    /**
     * @constructor
     */
    constructor(container) {
        if (!container) {
            console.error("Container element is emoty for Cat animation.");
            return;
        }
        this.container = container;
        this.speed = 150;
        this.currentFrame = 0;
        this.totalFrames = 5;

        // Initialize cat icon element
        this.catIcon = document.createElement("img");
        this.catIcon.className = "cat-icon";
        this.catIcon.src = "./assets/cat/light_cat_running_0.ico";
        this.container.appendChild(this.catIcon);
        this.animationId = null;

        // start running the animation
        this.run();
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
