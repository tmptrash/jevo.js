/**
 * This file contains all available operators implementation. For example:
 * for, if, variable declaration, steps, eating etc... User may override
 * this class for own needs and change operator list to custom.
 *
 * @author DeadbraiN
 */
import {EVENTS}  from './../global/Events';
import {Config}  from './../global/Config';
import Helper    from './../global/Helper';
import Operators from './base/Operators';
import Num       from './Num';

/**
 * {Function} Just a shortcuts
 */
const VAR0                  = Num.getVar;
const VAR1                  = (n) => Num.getVar(n, 1);
const VAR2                  = (n) => Num.getVar(n, 2);
const BITS_AFTER_THREE_VARS = Num.BITS_PER_OPERATOR + Num.BITS_PER_VAR * 3;
const BITS_OF_TWO_VARS      = Num.BITS_OF_TWO_VARS;
const IS_NUM                = Helper.isNumeric;
const HALF_OF_VAR           = Num.MAX_VAR / 2;

export default class OperatorsDos extends Operators {
    constructor(offsets, vars, obs) {
        super(offsets, vars, obs);
        /**
         * {Object} These operator handlers should return string, which
         * will be added to the final string script for evaluation.
         */
        this._OPERATORS_CB = {
            0 : this.onVar.bind(this),
            //1: this.onFunc.bind(this),
            1 : this.onCondition.bind(this),
            2 : this.onLoop.bind(this),
            3 : this.onOperator.bind(this),
            4 : this.onNot.bind(this),
            //5 : this.onPi.bind(this),
            //6 : this.onTrig.bind(this),
            5 : this.onLookAt.bind(this),
            6 : this.onEatLeft.bind(this),
            7 : this.onEatRight.bind(this),
            8 : this.onEatUp.bind(this),
            9 : this.onEatDown.bind(this),
            10: this.onStepLeft.bind(this),
            11: this.onStepRight.bind(this),
            12: this.onStepUp.bind(this),
            13: this.onStepDown.bind(this),
            14: this.onFromMem.bind(this),
            15: this.onToMem.bind(this),
            16: this.onMyX.bind(this),
            17: this.onMyY.bind(this),
            18: this.onCheckLeft.bind(this),
            19: this.onCheckRight.bind(this),
            20: this.onCheckUp.bind(this),
            21: this.onCheckDown.bind(this)
        };
        this._OPERATORS_CB_LEN = Object.keys(this._OPERATORS_CB).length;
        /**
         * {Array} Available conditions for if operator. Amount should be
         * the same like (1 << BITS_PER_VAR)
         */
        this._CONDITIONS = [(a,b)=>a<b, (a,b)=>a>b, (a,b)=>a==b, (a,b)=>a!=b];
        /**
         * {Array} Available operators for math calculations
         */
        this._OPERATORS = [
            (a,b)=>a+b, (a,b)=>a-b, (a,b)=>a*b, (a,b)=>a/b, (a,b)=>a%b, (a,b)=>a&b, (a,b)=>a|b, (a,b)=>a^b, (a,b)=>a>>b, (a,b)=>a<<b, (a,b)=>a>>>b, (a,b)=>+(a<b), (a,b)=>+(a>b), (a,b)=>+(a==b), (a,b)=>+(a!=b), (a,b)=>+(a<=b)
        ];
        //this._TRIGS = [(a)=>Math.sin(a), (a)=>Math.cos(a), (a)=>Math.tan(a), (a)=>Math.abs(a)];

        Num.setOperatorAmount(this._OPERATORS_CB_LEN);
    }

    destroy() {
        super.destroy();
        this._OPERATORS_CB = null;
        this._CONDITIONS   = null;
        this._OPERATORS    = null;
        //this._TRIGS        = null;
    }

    get operators() {return this._OPERATORS_CB;}
    get size()      {return this._OPERATORS_CB_LEN;}

    /**
     * Parses variable operator. Format: let = const|number. Num bits format:
     *   BITS_PER_OPERATOR bits - operator id
     *   BITS_PER_VAR bits  - destination var index
     *   BITS_PER_VAR bits  - assign type (const (half of bits) or variable (half of bits))
     *   BITS_PER_VAR bits  - variable index or all bits till the end for constant
     *
     * @param {Num} num Packed into number jsvm line
     * @param {Number} line Current line in jsvm
     * @return {Number} Parsed jsvm line string
     */
    onVar(num, line) {
        const vars = this.vars;
        const var1 = VAR1(num);
        vars[VAR0(num)] = var1 >= HALF_OF_VAR ? Num.getBits(num, BITS_AFTER_THREE_VARS, BITS_OF_TWO_VARS) : vars[var1];

        return line + 1;
    }

    //onFunc(num, line) {
    //    return line + 1;
    //}

    onCondition(num, line, org, lines) {
        const val3 = Num.getBits(num, BITS_AFTER_THREE_VARS, BITS_OF_TWO_VARS);
        const offs = this._getOffs(line, lines, val3);

        if (this._CONDITIONS[VAR2(num)](this.vars[VAR0(num)], this.vars[VAR1(num)])) {
            return line + 1;
        }

        return offs;
    }

    onLoop(num, line, org, lines, afterIteration) {
        const vars = this.vars;
        const var0 = VAR0(num);
        const val3 = Num.getBits(num, BITS_AFTER_THREE_VARS, BITS_OF_TWO_VARS);
        const offs = this._getOffs(line, lines, val3);
        //
        // If last iteration has done and we've returned to the line,
        // where "for" operator is located
        //
        if (afterIteration) {
            if (++vars[var0] < vars[VAR2(num)]) {
                this.offsets.push(line, offs);
                return line + 1;
            }
            return offs;
        }
        //
        // This is first time we are running "for" operator. No
        // iterations hav done, yet
        //
        vars[var0] = vars[VAR1(num)];
        if (vars[var0] < vars[VAR2(num)]) {
            this.offsets.push(line, offs);
            return line + 1;
        }

        return offs;
    }

    onOperator(num, line) {
        const vars = this.vars;
        vars[VAR0(num)] = this._OPERATORS[Num.getBits(num, BITS_AFTER_THREE_VARS, BITS_OF_TWO_VARS)](vars[VAR1(num)], vars[VAR2(num)]);
        return line + 1;
    }

    onNot(num, line) {
        this.vars[VAR0(num)] = +!this.vars[VAR1(num)];
        return line + 1;
    }

    //onPi(num, line) {
    //    this.vars[VAR0(num)] = Math.PI;
    //    return line + 1;
    //}

    //onTrig(num, line) {
    //    this.vars[VAR0(num)] = this._TRIGS[VAR2(num)](this.vars[VAR1(num)]);
    //    return line + 1;
    //}

    onLookAt(num, line, org) {
        const vars = this.vars;
        let   x    = vars[VAR1(num)];
        let   y    = vars[VAR2(num)];
        if (!IS_NUM(x) || !IS_NUM(y) || x < 0 || y < 0 || x >= Config.worldWidth || y >= Config.worldHeight) {
            vars[VAR0(num)] = 0;
            return line + 1;
        }

        let ret = {ret: 0};
        this.obs.fire(EVENTS.GET_ENERGY, org, x, y, ret);
        vars[VAR0(num)] = ret.ret;

        return line + 1;
    }

    onEatLeft(num, line, org)   {this.vars[VAR0(num)] = this._eat(org, num, org.x - 1, org.y); return line + 1}
    onEatRight(num, line, org)  {this.vars[VAR0(num)] = this._eat(org, num, org.x + 1, org.y); return line + 1}
    onEatUp(num, line, org)     {this.vars[VAR0(num)] = this._eat(org, num, org.x, org.y - 1); return line + 1}
    onEatDown(num, line, org)   {this.vars[VAR0(num)] = this._eat(org, num, org.x, org.y + 1); return line + 1}

    onStepLeft(num, line, org)  {this.vars[VAR0(num)] = this._step(org, org.x, org.y, org.x - 1, org.y); return line + 1}
    onStepRight(num, line, org) {this.vars[VAR0(num)] = this._step(org, org.x, org.y, org.x + 1, org.y); return line + 1}
    onStepUp(num, line, org)    {this.vars[VAR0(num)] = this._step(org, org.x, org.y, org.x, org.y - 1); return line + 1}
    onStepDown(num, line, org)  {this.vars[VAR0(num)] = this._step(org, org.x, org.y, org.x, org.y + 1); return line + 1}

    onFromMem(num, line, org) {this.vars[VAR0(num)] = org.mem.pop() || 0; return line + 1}
    onToMem(num, line, org) {
        const val = this.vars[VAR1(num)];

        if (IS_NUM(val) && org.mem.length < Config.orgMemSize) {
            this.vars[VAR0(num)] = org.mem.push(val);
        } else {
            this.vars[VAR0(num)] = 0;
        }

        return line + 1;
    }

    onMyX(num, line, org) {this.vars[VAR0(num)] = org.x; return line + 1}
    onMyY(num, line, org) {this.vars[VAR0(num)] = org.y; return line + 1;}

    onCheckLeft(num, line, org)  {return this._checkAt(num, line, org, org.x - 1, org.y)}
    onCheckRight(num, line, org) {return this._checkAt(num, line, org, org.x + 1, org.y)}
    onCheckUp(num, line, org)    {return this._checkAt(num, line, org, org.x, org.y - 1)}
    onCheckDown(num, line, org)  {return this._checkAt(num, line, org, org.x, org.y + 1)}

    _checkAt(num, line, org, x, y) {
        const ret = {ret: 0};
        org.fire(EVENTS.CHECK_AT, x, y, ret);
        this.vars[VAR0(num)] = ret.ret;
        return line + 1;
    }

    _eat(org, num, x, y) {
        const vars   = this.vars;
        const amount = vars[VAR1(num)];
        if (!IS_NUM(amount) || amount === 0) {return 0}

        let ret = {ret: amount};
        this.obs.fire(EVENTS.EAT, org, x, y, ret);
        if (!IS_NUM(ret.ret)) {return 0}
        org.energy += ret.ret;

        return ret.ret;
    }

    _step(org, x1, y1, x2, y2) {
        let ret = {ret: 0};
        this.obs.fire(EVENTS.STEP, org, x1, y1, x2, y2, ret);
        return ret.ret;
    }

    /**
     * Returns offset for closing bracket of blocked operators like
     * "if", "for" and so on. These operators shouldn't overlap each
     * other. for example:
     *
     *     for (...) {     // 0
     *         if (...) {  // 1
     *             ...     // 2
     *         }           // 3
     *     }               // 4
     *
     * Closing bracket in line 3 shouldn't be after bracket in line 4.
     * So it's possible to set it to one of  1...3.
     * @param {Number} line Current line index
     * @param {Number} lines Amount of lines
     * @param {Number} offs Local offset of closing bracket we want to set
     * @returns {Number}
     * @private
     */
    _getOffs(line, lines, offs) {
        let   offset  = line + offs < lines ? line + offs + 1 : lines;
        const offsets = this.offsets;

        if (offsets.length > 0 && offset >= offsets[offsets.length - 1]) {
            return offsets[offsets.length - 1];
        }

        return offset;
    }
}