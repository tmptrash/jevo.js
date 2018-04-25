/**
 * Manager's plugin. Base class for adding dots to the world. It may
 * be energy, stones, etc... You have to inherit your class to have
 * your custom object.
 *
 * @author flatline
 */
const Helper       = require('../../../common/src/Helper');
const Configurable = require('../../../common/src/Configurable');
const Config       = require('./Config').Config;
const Organism     = require('../manager/plugins/organisms/Organism').Organism;

class Dots extends Configurable {
    /**
     * Creates dots object. You have to inherit your class from this one
     * to have specified type of object. For example: stone or energy.
     * @param {Manager} manager Parent manager instance
     * @param {Config} config Reference to configuration object
     * @param {Object} cfg Configuration for current dots class
     * @param {Object} api plugin's API
     */
    constructor(manager, config, cfg, api = {}) {
        super(manager, {Config, cfg: config}, api);

        this.manager        = manager;
        this._cfg           = cfg;
        this._config        = config;
        this._onIterationCb = this.onIteration.bind(this);

        Helper.override(manager, 'onIteration', this._onIterationCb);
    }

    destroy() {
        Helper.unoverride(this.manager, 'onIteration', this._onIterationCb);
        this._onIterationCb = null;
        this._cfg           = null;
        this._config        = null;
        this.manager        = null;
    }

    onIteration(counter) {
        const cfg    = this._cfg;
        const config = this._config;
        //
        // We have to add dots only once
        //
        if (cfg.addOnce && counter < 1 && config.maxPercent !== .0) {this._addDots(); return false}
        //
        // We have to add dots every time, when minimum percent of dots is reached
        //
        if (config.checkPeriod === 0 || counter % config.checkPeriod !== 0) {return false}

        const dotsPercent = this._getDotsPercent(cfg.compareCb);
        if (dotsPercent > config.minPercent) {return dotsPercent}
        this._addDots();

        return dotsPercent;
    }

    /**
     * Returns percent of object with specified type in a world. Percent is
     * calculating comparing with all dots in a world (100%)
     * @param {Function} compareCb Compare function. Returns true/false
     * @return {Number} Percent
     */
    _getDotsPercent(compareCb) {
        let   dots   = 0;
        const width  = Config.worldWidth;
        const height = Config.worldHeight;

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (compareCb(x, y)) {++dots}
            }
        }

        return dots / (width * height);
    }

    _addDots() {
        const dots     = this._config.maxPercent * Config.worldWidth * Config.worldHeight;
        let   amount   = 0;
        let   attempts = 0;
        while (amount < dots && attempts < 100) {
            const startAmount = amount;
            amount = this._addDotsBlock(amount, dots);
            if (startAmount === amount) {
                attempts++;
            } else {
                attempts = 0;
            }
        }
    }

    _addDotsBlock(amount, dots) {
        const width       = Config.worldWidth;
        const height      = Config.worldHeight;
        const color       = Organism.getColor(this._config.colorIndex);
        const man         = this.manager;
        const world       = man.world;
        const blockSize   = this._config.blockSize;
        const setCb       = this._cfg.setCb;
        const colorCb     = this._cfg.colorCb;
        const groups      = this._config.groups;
        const rand        = Helper.rand;
        const groupAmount = groups ? groups.length : 0;
        const xCoord      = rand(groupAmount / 4) * 4;
        const yCoord      = rand(groupAmount / 4) * 4;
        let   x           = groups ? groups[xCoord]     - rand(groups[xCoord + 2] / 2) + rand(groups[xCoord + 2] / 2) : rand(width);
        let   y           = groups ? groups[yCoord + 1] - rand(groups[yCoord + 3] / 2) + rand(groups[yCoord + 3] / 2) : rand(height);

        for (let i = 0; i < blockSize; i++) {
            x = x + Helper.rand(3) - 1;
            y = y + Helper.rand(3) - 1;
            if (x < 0 || x >= width || y < 0 || y >= height) {return amount}
            if (world.isFree(x, y)) {
                if (world.setDot(x, y, colorCb ? colorCb(x, y) : color)) {
                    setCb && setCb(x,y);
                    if (++amount >= dots) {return amount}
                }
            }
        }

        return amount;
    }
}

module.exports = Dots;