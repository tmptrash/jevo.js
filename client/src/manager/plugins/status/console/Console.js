/**
 * This plugin is a primitive version of real time charts. It shows
 * different parameters of the jevo.js system, like average energy,
 * lps (Lines Per Second), average code size and so on. Here
 * labels explanation:
 *
 *     lps: Lines Per Second - average amount of run code lines
 *          per one second
 *     org: Average amount of organisms at the moment of logging
 *     nrg: Amount of energy of average organism
 *     che: Changes amount of average organism
 *     fit: Fitness of average organism
 *     cod: Code size of average organism
 *
 * @author flatline
 */
const Status = require('./../Status');
const Config = require('./Config');

const GREEN  = 'color: #00aa00';
const RED    = 'color: #aa0000';

class Console extends Status {
    static _format(value, name, pad) {return `${name}:${value}`.padEnd(pad)}

    constructor(manager) {
        super(manager, Config);
    }

    destroy() {
        super.destroy();
    }

    /**
     * Is called every time, when new status data is available
     * @param {Object} status Status data
     * @param {Number} orgs Amount of organisms
     * @override
     */
    onStatus(status, orgs) {
        const man       = this.parent;
        const active    = man.activeAround;
        const format    = Console._format;

        const con       = `${active[0] ? '^' : ' '}${active[1] ? '>' : ' '}${active[2] ? 'v' : ' '}${active[3] ? '<' : ' '} `;
        const conns     = `con:${con === '    ' ? 'no  ' : con}`;
        const sips      = format(status.ips,      'ips',  12);
        const slps      = format(status.lps,      'lps',  14);
        const sorgs     = format(orgs,            'org',  10);
        const senergy   = format(status.energy,   'nrg',  19);
        const spenergy  = format(status.oenergy,  'onrg', 15);
        const seenergy  = format(status.eenergy,  'enrg', 16);
        const skill     = format(status.kill,     'kil',  12);
        const schanges  = format(status.changes,  'che',  12);
        const sage      = format(status.age,      'age',  11);
        const scode     = format(status.code,     'cod',  12);

        // TODO: under Node.js should use Server/Console.xxx()
        console.log(`%c${conns}${sips}${slps}${sorgs}%c${senergy}${spenergy}${seenergy}${skill}${schanges}${sage}${scode}`, GREEN, RED);
    }
}

module.exports = Console;