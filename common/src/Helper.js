/**
 * Global helper class
 *
 * @author flatline
 */
const Config = require('./../../client/src/share/Config').Config;
const DIR    = require('./Directions').DIR;

class Helper {
    /**
     * Calculates unique id for world's coordinates. For the same x,y
     * id will be the same.
     * @param {Number} x
     * @param {Number} y
     * @returns {Number} unique id
     */
    static posId(x, y) {
        return y * Config.worldWidth + x;
    }

    /**
     * Overrides specified function in two ways: softly - by
     * calling new function and after that original; hardly - by
     * erasing old function by new one. It's still possible to
     * unoverride erasing by copy old function from fn.fn property.
     * @param {Object} obj Destination object, we want to override
     * @param {String} fnName Function name
     * @param {Function} fn Destination function
     * @param {Boolean} hard true - erase old function, false - call
     * old function and new after that.
     */
    static override(obj, fnName, fn, hard = false) {
        //
        // We need oldFn exactly in `override()`, because `fn(..args)` call removes
        // reference to fn.fn and this code crashes on line `fn.fn.apply(obj, args)`
        //
        const oldFn = fn.fn = obj[fnName];
        if (typeof oldFn === 'undefined') {throw `Helper.override: Parent object doesn't contain method '${fnName}'`}
        if (!hard) {
            obj[fnName] = (...args) => {
                const ret = fn(...args);
                oldFn.apply(obj, args);
                return ret;
            };
            return;
        }
        obj[fnName] = fn;
    }

    /**
     * Opposite to override. Removes overridden method.
     * @param {Object} obj Destination object, we want to override
     * @param {String} fnName Function name
     * @param {Function} fn Destination function
     */
    static unoverride(obj, fnName, fn) {
        obj[fnName] = fn.fn;
        delete fn.fn;
    }
    /**
     * Generates random Int number in range 0:n-1
     * @param {Number} n Right number value in a range
     * @return {Number}
     */
    static rand(n) {return Math.trunc(Math.random() * n)}
    /**
     * It calculates probability index from variable amount of components.
     * Let's imagine we have two actions: one and two. We want
     * these actions to be called randomly, but with different probabilities.
     * For example it may be [3,2]. It means that one should be called
     * in half cases, two in 1/3 cases. Probabilities should be greater then -1.
     * @param {Array} probs Probabilities array. e.g.: [3,2] or [1,3]
     * @return {Number} -1 Means that index is invalid
     */
    static probIndex(probs) {
        let len = probs.length;
        if (len < 1) {return -1}
        let sum = probs.reduce((a, b) => a + b, 0);
        if (sum < 1) {return -1}
        let num = Helper.rand(sum) + 1;
        let i;
        //
        // This is small optimization trick. if random number in
        // a left part of all numbers sum, the we have to go to it from
        // left to right, if not - then from right to left. Otherwise,
        // going every time from left to right will be a little bit
        // slower then this approach.
        //
        if (num < sum / 2) {
            sum = 0;
            for (i = 0; i < len; i++)  {if (num <= (sum += probs[i])) {break}}
        } else {
            for (i = len-1; i>-1; i--) {if (num >  (sum -= probs[i])) {break}}
        }

        return i;
    }
    /**
     * Checks if position is empty. x == y == 0 - this is empty
     * @param {Object} pos Position to check
     */
    static empty(pos) {return pos.x === 0 && pos.y === 0}
    /**
     * Does normalization of X and Y coordinates. It's used
     * in cyclical mode for checking if we out of bound (world).
     * In non cyclical mode it just returns the same coordinates.
     * Usage: [x, y, dir] = Helper.normalize(10, -1); // 10, 100 (height - 1)
     * 'dir' parameter means 'direction' and will be set only if
     * one or two coordinates are out of bounds (world). Otherwise
     * 'dir' parameter will be set to DIR.NO value.
     * @param {Number} x
     * @param {Number} y
     * @returns {[x,y,dir]}
     */
    static normalize(x, y) {
        let dir = DIR.NO;

        if (x < 0) {dir = DIR.LEFT; x = Config.worldWidth - 1}
        else if (x >= Config.worldWidth)  {dir = DIR.RIGHT; x = 0}

        if (y < 0) {dir = DIR.UP; y = Config.worldHeight - 1}
        else if (y >= Config.worldHeight) {dir = DIR.DOWN; y = 0}

        return [x, y, dir];
    }

    /**
     * Analog of jQuery.isNumeric()
     * @param {*} n Value to check
     * @returns {Boolean}
     */
    static isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    /**
     * Generates unique numeric ids
     * @returns {Number}
     */
    static getId() {
        return ++this._id;
    }

    static isFunc(v) {
        return typeof v === 'function';
    }

    // TODO: will be used later
    // /**
    //  * Saves custom data into the file. If file exists, it will
    //  * be overrided. It's only rewrites existing file and not
    //  * append it. It also doesn't work with native types, in sense
    //  * that you can't save native values into the file without *
    //  * meta information. For example, you can't store ascii string
    //  * in a file without special prefic before it.
    //  * @param {Object} data Data to save
    //  * @param {String} file File name/Key name
    //  * TODO: FileApi should be used
    //  */
    // static save(data, file = "backup.data") {
    //     localStorage[file] = JSON.stringify(data);
    // }
    // /**
    //  * Loads custom data from the file
    //  * @param file File name
    //  * @return {Object} loading result or nothing
    //  * TODO: FileApi should be used
    //  */
    // static load(file = "backup.data") {
    //     return JSON.parse(localStorage[file]);
    // }
}

/**
 * {Number} Is used as unique id generator
 */
Helper._id = 0;

module.exports = Helper;