/**
 * Implementation of fast array. First assumption of this class is in fixed array
 * size. Second that get() method will be called must more times, then set() or
 * del() or resize(). Resize is possible, but should be rare to keep it fast. Is
 * used for storing organisms population. This class doesn't check size overflow
 * due performance issue. Removing element means setting 0 to specified index.
 * This class should not be used for storing numbers!
 *
 * @author flatline
 */
class FastArray {
    constructor(size) {
        /**
         * {Array} Source container for custom objects
         */
        this._arr         = new Array(size);
        /**
         * {Array} Array of free indexes in _arr. Every time
         * user calls del() method _arr obtains hole in it.
         * Index of this hole wil be stored in this array
         */
        this._freeIndexes = new Array(size);
        /**
         * {Number} Index of last free index in _freeIndexes array
         */
        this._index       = size - 1;
        /**
         * {Number} Allocated size of array. This is maximum amount
         * of elements, which may be stored in FastArray
         */
        this._size        = size;

        for (let i = 0; i < size; i++) {
            this._freeIndexes[i] = i;
            this._arr[i]         = 0;
        }
    }

    destroy() {
        this._arr         = null;
        this._freeIndexes = null;
        this._size        = 0;
    }

    /**
     * Analog of Array.length
     * @returns {Number} Amount of not empty elements in  FastArray.
     * Not all cells in an array may be filled by values.
     */
    get length() {return this._size - this._index - 1}

    /**
     * Returns allocated size
     * @returns {Number}
     */
    get size() {return this._size}

    /**
     * Returns next free index in FastArray
     * @returns {Number}
     */
    get freeIndex() {
        return this._freeIndexes[this._index];
    }

    /**
     * Sets value to FastArray. You can't set value index due to
     * optimization reason. Only a value
     * @param {*} v Any value except number
     */
    set(v) {this._arr[this._freeIndexes[this._index--]] = v}

    /**
     * Returns a value by index
     * @param {Number} i Value index
     * @returns {*}
     */
    get(i) {return this._arr[i]}

    /**
     * Removes a value by index
     * @param {Number} i Value index
     */
    del(i) {
        if (this._arr !== 0)
        this._arr[i] = 0;
        this._freeIndexes[++this._index] = i;
    }

    /**
     * Returns last added value by set() method
     * @returns {*} Value
     */
    lastAdded() {
        return this._arr[this._freeIndexes[this._index + 1]];
    }

    /**
     * Resizes an array. Values will not be removed during resize.
     * This method is very slow and should be called not often.
     * @param {Number} size New array size
     */
    resize(size) {
        const indexes = this._freeIndexes;
        const arr     = this._arr;
        this._index   = -1;
        arr.length    = indexes.length = (this._size = size);
        for (let i = 0; i < size; i++) {
            (arr[i] === 0) && (indexes[++this._index] = i);
        }
    }
}

module.exports = FastArray;