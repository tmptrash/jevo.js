/**
 * This file contains interface for available operators for some special
 * task. You have to inherit your operators class from this one.
 *
 * @author flatline
 */
class Operators {
    constructor(offs, vars, obs) {
        /**
         * {Array} Array of offsets for closing braces. For 'for', 'if'
         * and other operators.
         */
        this.offs = offs;
        /**
         * {Array} Available variables
         */
        this.vars = vars;
        /**
         * {Observer} Observer for sending external events
         */
        this.obs  = obs;
    }

    destroy() {
        this.offs = null;
        this.vars = null;
        this.obs  = null;
    }

    /**
     * Returns operators array. Should be overridden in child class
     * @abstract
     */
    get operators() {return []}

    /**
     * Sets offsets array from outside
     * @param {Array} offs New offsets array
     */
    set offsets(offs) {this.offs = offs}
}

module.exports = Operators;