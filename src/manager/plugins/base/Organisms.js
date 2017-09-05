/**
 * Base class for OrganismsXXX plugins
 *
 * @author DeadbraiN
 */
import Helper         from './../../../global/Helper';
import {Config}       from './../../../global/Config';
import Console        from './../../../global/Console';
import {EVENTS}       from './../../../global/Events';
import Queue          from './../../../global/Queue';
import Organism       from './../../../organism/Organism';
import Backup         from './../Backup';

const EMPTY     = 0;
const ENERGY    = 1;
const ORGANISM  = 2;
const RAND_OFFS = 4;

export default class Organisms {
    /**
     * Is called every time after organism's code was run
     * @param {Organism} org
     * @abstract
     */
    onOrganism(org) {}

    /**
     * Compares two organisms and returns more fit one
     * @param {Organism} org1
     * @param {Organism} org2
     * @return {Organism}
     * @abstract
     */
    compare(org1, org2) {}

    /**
     * Is called before cloning of organism
     * @param {Organism} org
     * @abstract
     */
    onBeforeClone(org) {}

    /**
     * Is called after cloning of organism
     * @param {Organism} org Parent organism
     * @param {Organism} child Child organism
     * @abstract
     */
    onClone(org, child) {}

    constructor(manager) {
        this.organisms      = new Queue();
        this.backup         = new Backup();
        this.codeRuns       = 0;
        this.stamp          = Date.now();
        this.manager        = manager;
        this.positions      = {};
        this.code2Str       = new manager.CLASS_MAP[Config.code2StringCls];
        this.randOrgItem    = this.organisms.first;
        this._onIterationCb = this.onIteration.bind(this);
        this._onAfterMoveCb = this.onAfterMove.bind(this);

        this.reset();
        Helper.override(manager, 'onIteration', this._onIterationCb);
        Helper.override(manager, 'onAfterMove', this._onAfterMoveCb);
        //
        // API of the Manager for accessing outside. (e.g. from Console)
        //
        manager.api.formatCode = (code) => this.code2Str.format(code);
    }

    get orgs() {return this.organisms;}

    destroy() {
        Helper.unoverride(man, 'onAfterMove', this._onAfterMoveCb);
        Helper.unoverride(man, 'onIteration', this._onIterationCb);
        for (let org of this.organisms) {org.destroy();}
        this.organisms.destroy();
        this.organisms      = null;
        this.positions     = null;
        this.manager        = null;
        this.code2Str.destroy();
        this.code2Str      = null;
        this._onIterationCb = null;
        this._onAfterMoveCb = null;
    }

    /**
     * Override of Manager.onIteration() method. Is called on every
     * iteration of main loop. The counter is an analog of time.
     * @param {Number} counter Value of main loop counter.
     * @param {Number} stamp Time stamp of current iteration
     * @private
     */
    onIteration(counter, stamp) {
        let item = this.organisms.first;
        let org;

        while (item && (org = item.val)) {
            org.run();
            this.onOrganism(org);
            item = item.next;
        }

        this.updateClone(counter);
        this.updateCrossover(counter);
        this.updateCreate();
        this.updateIps(stamp);
        this.updateBackup(counter);
    }

    onAfterMove(x1, y1, x2, y2, org) {
        if (x1 !== x2 || y1 !== y2) {
            delete this.positions[Helper.posId(x1, y1)];
            this.positions[Helper.posId(x2, y2)] = org;
        }

        return true;
    }

    addOrgHandlers(org) {
        org.on(EVENTS.DESTROY, this._onKillOrg.bind(this));
        org.on(EVENTS.GET_ENERGY, this._onGetEnergy.bind(this));
        org.on(EVENTS.EAT, this._onEat.bind(this));
        org.on(EVENTS.STEP, this._onStep.bind(this));
        org.on(EVENTS.CHECK_AT, this._onCheckAt.bind(this));
    }

    /**
     * Cloning parents are chosen according to tournament principle
     * @param {Number} counter Current counter
     * @returns {boolean}
     * @private
     */
    updateClone(counter) {
        const orgs      = this.organisms;
        const needClone = Config.orgClonePeriod === 0 ? false : counter % Config.orgClonePeriod === 0;
        let   orgAmount = orgs.size;
        if (!needClone || orgAmount < 1) {return false}
        let   org1      = this.getRandOrg();
        let   org2      = this.getRandOrg();
        if (!org1.alive && !org2.alive) {return false;}

        let tmpOrg = this._tournament(org1, org2);
        if (tmpOrg === org2) {[org1, org2] = [org2, org1]}

        if (orgAmount >= Config.worldMaxOrgs) {org2.destroy();}
        if (org1.alive) {this._clone(org1)}

        return true;
    }

    updateCrossover(counter) {
        const orgs      = this.organisms;
        const orgAmount = orgs.size;
        const needCrossover = Config.orgCrossoverPeriod === 0 ? false : counter % Config.orgCrossoverPeriod === 0;
        if (!needCrossover || orgAmount < 1) {return false;}

        let org1   = this._tournament();
        let org2   = this._tournament();
        let winner = this._tournament(org1, org2);
        let looser = winner === org1 ? org2 : org1;

        if (looser.alive) {
            this._crossover(winner, looser);
        }

        return true;
    }

    updateCreate() {
        if (this.organisms.size < 1) {
            this._createPopulation();
        }
    }

    updateIps(stamp) {
        const ts   = stamp - this.stamp;
        if (ts < Config.worldIpsPeriodMs) {return;}
        const man  = this.manager;
        const orgs = this.organisms.size;
        let   ips  = this.codeRuns / orgs / (ts / 1000);

        man.fire(EVENTS.IPS, ips, this.organisms);
        this.codeRuns = 0;
        this.stamp = stamp;
    }

    updateBackup(counter) {
        if (counter % Config.backupPeriod !== 0 || Config.backupPeriod === 0) {return;}
        // TODO: done this
        //this.backup.backup(this.organisms);
    }

    getRandOrg() {
        const offs = Helper.rand(RAND_OFFS);
        let   item = this.randOrgItem;

        for (let i = 0; i < offs; i++) {
            if ((item = item.next) === null) {
                item = this.organisms.first;
            }
        }

        return (this.randOrgItem = item).val;
    }

    reset() {
        this._orgId      = 0;
        this._maxEnergy  = 0;
    }

    _tournament(org1 = null, org2 = null) {
        org1 = org1 || this.getRandOrg();
        org2 = org2 || this.getRandOrg();

        if (!org1.alive && !org2.alive) {return false;}
        if ((org2.alive && !org1.alive) || this.compare(org2, org1)) {
            return org2;
        }

        return org1;
    }

    _clone(org) {
        if (this.onBeforeClone(org) === false) {return false}
        let pos = this.manager.world.getNearFreePos(org.x, org.y);
        if (pos === false || this._createOrg(pos, org) === false) {return false;}
        let child  = this.organisms.last.val;

        this.onClone(org, child);
        this.manager.fire(EVENTS.CLONE, org, child);

        return true;
    }

    _crossover(winner, looser) {
        this._clone(winner);
        const orgs  = this.organisms;
        let   child = orgs.last.val;

        if (child.alive && looser.alive) {
            child.changes += child.jsvm.crossover(looser.jsvm);
            if (orgs.size >= Config.worldMaxOrgs) {looser.destroy()}
        }
    }

    _createPopulation() {
        const world = this.manager.world;

        this.reset();
        for (let i = 0; i < Config.orgStartAmount; i++) {
            this._createOrg(world.getFreePos());
        }
        Console.warn('Population has created');
    }

    _onGetEnergy(org, x, y, ret) {
        if (x < 0 || y < 0 || !Number.isInteger(x) || !Number.isInteger(y)) {return;}
        const posId = Helper.posId(x, y);

        if (typeof(this.positions[posId]) === 'undefined') {
            ret.ret = this.manager.world.getDot(x, y)
        } else {
            ret.ret = this.positions[posId].energy;
        }
    }

    _onEat(org, x, y, ret) {
        const world = this.manager.world;
        const positions = this.positions;

        [x, y] = Helper.normalize(x, y);

        const posId = Helper.posId(x, y);
        if (typeof(positions[posId]) === 'undefined') {
            ret.ret = world.grabDot(x, y, ret.ret);
        } else {
            ret.ret = ret.ret < 0 ? 0 : (ret.ret > positions[posId].energy ? positions[posId].energy : ret.ret);
            positions[posId].grabEnergy(ret.ret);
        }
    }

    _onStep(org, x1, y1, x2, y2, ret) {
        if (org.alive) {
            ret.ret = +this.manager.move(x1, y1, x2, y2, org)
        }
    }

    _onCheckAt(x, y, ret) {
        [x, y] = Helper.normalize(x, y);
        if (typeof(this.positions[Helper.posId(x, y)]) === 'undefined') {
            ret.ret = this.manager.world.getDot(x, y) > 0 ? ENERGY : EMPTY;
        } else {
            ret.ret = ORGANISM;
        }
    }

    _onCodeEnd(org, lines) {
        this.codeRuns++;
        this.manager.fire(EVENTS.ORGANISM, org, lines);
    }

    _createOrg(pos, parent = null) {
        const orgs = this.organisms;
        if (orgs.size >= Config.worldMaxOrgs || pos === false) {return false;}
        orgs.add(null);
        let last   = orgs.last;
        let org    = new Organism(++this._orgId + '', pos.x, pos.y, true, last, this._onCodeEnd.bind(this), this.manager.CLASS_MAP, parent);

        last.val = org;
        this.addOrgHandlers(org);
        this.manager.move(pos.x, pos.y, pos.x, pos.y, org);
        this.positions[org.posId] = org;
        this.manager.fire(EVENTS.BORN_ORGANISM, org);
        Console.info(org.id, ' born');

        return true;
    }

    _onKillOrg(org) {
        if (this.randOrgItem === org.item) {
            if ((this.randOrgItem = org.item.next) === null) {
                this.randOrgItem = this.organisms.first;
            }
        }
        this.organisms.del(org.item);
        this.manager.world.setDot(org.x, org.y, 0);
        delete this.positions[org.posId];
        this.manager.fire(EVENTS.KILL_ORGANISM, org);
        Console.info(org.id, ' die');
    }
}