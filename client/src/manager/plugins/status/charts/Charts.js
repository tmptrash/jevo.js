/**
 * Manager plugin, which draws real time charts based on real time data. For example:
 * energy, iq, changes and so on. The same values like Status plugin uses.
 *
 * @author flatline
 */
const Status = require('./../Status');
const Chart  = require('./Chart');
const Config = require('./Config');
const _each  = require('lodash/each');

const API = {
    transparent: ['_transparent', 'Sets transparent level'     ],
    pos        : ['_pos',         'Sets chart position'        ],
    active     : ['_active',      'Activates/Deactivates chart']
};

class Charts extends Status {
    constructor(manager) {
        super(manager, Config, API);

        this._data   = new Array(2);
        this._charts = {
            ips    : new Chart('IPS - Iterations Per Second',             Config.charts.ips),
            lps    : new Chart('LPS - Lines Per Second',                  Config.charts.lps),
            orgs   : new Chart('Amount of organisms',                     Config.charts.orgs),
            energy : new Chart('Average organism energy',                 Config.charts.energy),
            iq     : new Chart('Average organism IQ (Energy pick speed)', Config.charts.iq),
            changes: new Chart('Average organism changes (Mutations)',    Config.charts.changes),
            fit    : new Chart('Average organism Fitness',                Config.charts.fit),
            age    : new Chart('Average organism Age',                    Config.charts.age),
            code   : new Chart('Average organism code size',              Config.charts.code)
        };
    }

    destroy() {
        _each(this._charts, chart => chart.destroy());
        this._charts = null;
        this._data   = null;

        super.destroy();
    }

    /**
     * Is called every time, when new status data is available
     * @param {Object} status Status data
     * @param {Number} orgs Amount of organisms
     * @override
     */
    onStatus(status, orgs) {
        const stamp     = Date.now();
        const time      = new Date(stamp);

        //console.log(`%c${conns}${sips}${slps}${sorgs}%c${siq}${senergy}${schanges}${sfit}${sage}${scode}`, GREEN, RED);
        // TODO: this code should be moved to separate plugin
        // TODO: add energy, orgs and code: e:xxx, o:xxx, c:xxx
        //const active = man.activeAround;
        //man.canvas && man.canvas.text(5, 20, `${sips}${man.clientId && man.clientId || ''} ${active[0] ? '^' : ' '}${active[1] ? '>' : ' '}${active[2] ? 'v' : ' '}${active[3] ? '<' : ' '}`);


        const data   = this._data;
        const charts = this._charts;
        data[0]      = `${time.getHours()}:${time.getMinutes()}`;

        _each(charts, (chart, key) => {
            data[1] = status[key];
            chart.update(data);
        });
    }

    /**
     * Sets current chart transparent coefficient
     * @param {String} chart Chart name, e.g: 'energy', or 'iq'
     * @param {Number} t Value between 0...1
     * @api
     */
    _transparent(chart, t) {this._setProperty(chart, 'transparent', t)}

    /**
     * Sets current chart position. Available positions:
     * top, down, left, right, topleft, downleft, topright,
     * downright, full.
     * @param {String} chart Chart name, e.g: 'energy', or 'iq'
     * @param {String} p new position
     * @api
     */
    _pos(chart, p) {this._setProperty(chart, 'pos', p)}

    /**
     * Sets current chart position. Available positions:
     * top, down, left, right, topleft, downleft, topright,
     * downright, full.
     * @param {String} chart Chart name, e.g: 'energy', or 'iq'
     * @param {Boolean} a New active state
     * @api
     */
    _active(chart, a) {this._setProperty(chart, 'active', a)}

    _setProperty(chart, prop, val) {
        this._charts[chart][prop]    = val;
        this.cfg.charts[chart][prop] = val;
    }
}

module.exports = Charts;