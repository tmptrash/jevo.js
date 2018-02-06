/**
 * Base class for OrganismsXXX plugins. Manages organisms. Makes
 * cloning, crossover, organisms comparison, killing and more...
 * Main function of this plugin is run organism's in an infinite
 * loop. This class can't be created as separate instance.
 *
 * @author flatline
 */
const Configurable = require('./../../../../../common/src/Configurable');
const Helper       = require('./../../../../../common/src/Helper');
const Config       = require('./../../../../src/share/Config').Config;
const OConfig      = require('./Config');
const Console      = require('./../../../../src/share/Console');
const EVENTS       = require('./../../../../src/share/Events').EVENTS;
const ORG_EVENTS   = require('./../../../../src/manager/plugins/organisms/Organism').EVENTS;
//const Backup       = require('./../backup/Backup');
const Mutator      = require('./Mutator');
const Num          = require('./../../../vm/Num');

const RAND_OFFS = 3;
const MAX_BITS  = Num.MAX_BITS;
// TODO: inherit this class from Configurable
class Organisms extends Configurable {
    /**
     * Compares two organisms and returns more fit one
     * @param {Organism} org1
     * @param {Organism} org2
     * @return {Organism}
     * @abstract
     */
    compare(org1, org2) {}

    /**
     * Is called after moving of organism is done. Updates Manager.positions
     * map with a new position of organism
     * @param {Number} x1 Start X position
     * @param {Number} y1 Start Y position
     * @param {Number} x2 End X position
     * @param {Number} y2 End Y position
     * @param {Organism} org Organism, which is moving
     * @returns {Boolean}
     * @abstract
     */
    onAfterMove(x1, y1, x2, y2, org) {}

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

    /**
     * Is called after organism has killed
     * @param {Organism} org Killed organism
     * @abstract
     */
    onAfterKillOrg(org) {}

    /**
     * Creates one instance of organism. You have to override this
     * method in your child class
     * @param {Array} args Custom organism arguments
     * @return {Organism} Organism instance
     * @abstract
     */
    createEmptyOrg(...args) {}

    /**
     * Is called at the end of run() method
     * @param {Organism} org Current organism
     * @abstract
     */
    onOrganism(org) {}

    constructor(manager) {
        super(manager, {Config, cfg: OConfig}, {getAmount: ['_apiGetAmount', 'Shows amount of organisms within current Client(Manager)']});
        this.organisms      = manager.organisms;
        this.randOrgItem    = this.organisms.first;
        this.positions      = manager.positions;
        this.world          = manager.world;
        const cbs           = this.callbacks = {};

        this._mutator       = new Mutator(manager, this);
        this._onIterationCb = this._onIteration.bind(this);
        this._onLoopCb      = this._onLoop.bind(this);

        this.reset();
        Helper.override(manager, 'onIteration', this._onIterationCb);
        Helper.override(manager, 'onLoop', this._onLoopCb);

        cbs[ORG_EVENTS.DESTROY]        = this._onKillOrg.bind(this);
        cbs[ORG_EVENTS.KILL_NO_ENERGY] = this._onKillNoEnergyOrg.bind(this);
        cbs[ORG_EVENTS.KILL_AGE]       = this._onKillAgeOrg.bind(this);
        cbs[ORG_EVENTS.ITERATION]      = this._onIterationOrg.bind(this);
        cbs[ORG_EVENTS.CLONE]          = this._onCloneOrg.bind(this);

    }

    destroy() {
        let item = this.organisms.first;
        let org;
        while (item && (org = item.val)) {org.destroy(); item = item.next}

        Helper.unoverride(this.parent, 'onIteration', this._onIterationCb);
        Helper.unoverride(this.parent, 'onLoop', this._onLoopCb);
        this._mutator.destroy();
        this._mutator       = null;
        this._onIterationCb = null;
        this._onLoopCb      = null;
        this.callbacks      = null;

        super.destroy();
    }

    reset() {
        this._orgId = 0;
    }

    move(x1, y1, x2, y2, org) {
        let   moved = false;
        const world = this.world;

        if (world.isFree(x2, y2) === false) {return false}
        if (x1 !== x2 || y1 !== y2) {moved = true; world.setDot(x1, y1, 0)}
        world.setDot(x2, y2, org.color);
        this.onAfterMove(x1, y1, x2, y2, org);

        return moved;
    }

    createOrg(pos, parent = null) {
        if (pos === false) {return false}
        const orgs = this.organisms;
        orgs.add(null);
        let   last = orgs.last;
        let   org  = this.createEmptyOrg(++this._orgId + '', pos.x, pos.y, true, last, this.callbacks, parent);

        last.val = org;
        this.move(-1, -1, pos.x, pos.y, org);
        this.parent.fire(EVENTS.BORN_ORGANISM, org);
        //Console.info(org.id, ' born');

        return true;
    }

    /**
     * Returns random organism of current population
     * @return {Organism|null}
     */
    randOrg() {
        const offs = Helper.rand(RAND_OFFS) + 1;
        let   item = this.randOrgItem;

        for (let i = 0; i < offs; i++) {
            if ((item = item.next) === null) {
                item = this.organisms.first;
            }
        }

        return (this.randOrgItem = item).val;
    }

    /**
     * Override of Manager.onIteration() method. Is called on every
     * iteration of main loop. The counter is an analog of time.
     * @param {Number} counter Value of main loop counter.
     * @param {Number} stamp Time stamp of current iteration
     */
    _onIteration(counter, stamp) {
        const onOrganism = this.onOrganism.bind(this);
        let   item       = this.organisms.first;
        let   org;

        while (org = item && item.val) {
            org.run();
            onOrganism(org);
            item = item.next;
        }

        this._updateTournament(counter);
        this._updateRandomOrgs(counter);
        this._updateCrossover(counter);
    }

    _onLoop() {
        this._updateCreate();
    }

    _tournament(org1 = null, org2 = null) {
        org1 = org1 || this.randOrg();
        org2 = org2 || this.randOrg();

        if (!org1.alive && !org2.alive) {return false}
        if ((org2.alive && !org1.alive) || this.compare(org2, org1)) {
            return org2;
        }

        return org1;
    }

    _clone(org, isCrossover = false) {
        if (this.onBeforeClone(org) === false) {return false}
        let pos   = this.world.getNearFreePos(org.x, org.y);
        if (pos === false || this.createOrg(pos, org) === false) {return false}
        let child = this.organisms.last.val;

        this.onClone(org, child);
        if (!org.alive || !child.alive) {return false}
        this.parent.fire(EVENTS.CLONE, org, child, isCrossover);

        return true;
    }

    _crossover(org1, org2) {
        this._clone(org1, true);
        const orgs  = this.organisms;
        let   child = orgs.last.val;

        if (child.alive && org2.alive) {
            child.changes += (Math.abs(child.vm.crossover(org2.vm)) * MAX_BITS);
        }
    }

    _createPopulation() {
        const world = this.world;

        this.reset();
        for (let i = 0, len = OConfig.orgStartAmount; i < len; i++) {
            this.createOrg(world.getFreePos());
        }
        Console.info('Population has created');
    }

    /**
     * API method, which will be added to Manager.api interface
     * @return {Number} Amount of organisms within current Manager
     */
    _apiGetAmount() {
        return this.parent.organisms.size;
    }

    _onKillOrg(org) {
        if (this.randOrgItem === org.item) {
            if ((this.randOrgItem = org.item.next) === null) {
                this.randOrgItem = this.organisms.first;
            }
        }
        this.organisms.del(org.item);
        this.world.setDot(org.x, org.y, 0);
        this.onAfterKillOrg(org);
        this.parent.fire(EVENTS.KILL, org);
        //Console.info(org.id, ' die');
    }

    _onKillNoEnergyOrg(org) {this._parent.fire(EVENTS.KILL_NO_ENERGY, org)}
    _onKillAgeOrg(org)      {this._parent.fire(EVENTS.KILL_AGE, org)}
    _onIterationOrg(lines, org)    {
        this._parent.codeRuns += lines;
        this._parent.fire(EVENTS.CODE_RUN, lines, org);
    }

    _onCloneOrg(org) {
        const maxOrgs   = OConfig.orgMaxOrgs;
        const orgAmount = this.organisms.size;
        const ret       = org.alive && (OConfig.orgKillOnClone || orgAmount < maxOrgs) && this._clone(org);

        //if (OConfig.orgKillOnClone && ret && orgAmount + 1 >= maxOrgs) {this._killInTour()}
        if (OConfig.orgKillOnClone && ret && orgAmount + 1 >= maxOrgs) {this.randOrg().destroy()}

        return ret;
    }

    _killInTour() {
        let org1 = this.randOrg();
        let org2 = this.randOrg();
        if (!org1.alive || !org2.alive || org1 === org2 || this.organisms.size < 1) {return false}

        if (this._tournament(org1, org2) === org2) {[org1, org2] = [org2, org1]}
        this.parent.fire(EVENTS.KILL_TOUR, org2);
        org2.destroy();

        return true;
    }

    /**
     * Does tournament between two random organisms and kill looser. In general
     * this function is a natural selection in our system.
     * @param {Number} counter Current value of global iterations counter
     * @returns {Boolean} true - tournament occurred, false - otherwise
     */
    _updateTournament(counter) {
        const period = OConfig.orgTournamentPeriod;
        return counter % period === 0 && this.organisms.size > 0 || period !== 0 && this._killInTour();
    }

    _updateRandomOrgs(counter) {
        if (counter % OConfig.orgRandomOrgPeriod !== 0 || OConfig.orgRandomOrgPeriod === 0 || this.organisms.size < 1) {return false}
        const vm   = this.randOrg().vm;
        const size = Helper.rand(vm.size) + 1;
        const pos  = Helper.rand(vm.size - size);

        vm.generate(pos, size);

        return true;
    }

    _updateCrossover(counter) {
        const orgAmount = this.organisms.size;
        if (counter % OConfig.orgCrossoverPeriod !== 0 || OConfig.orgCrossoverPeriod === 0 || orgAmount < 1) {return false}
        //
        // We have to have a possibility to crossover not only with best
        // organisms, but with low fit also
        //
        let org1 = Helper.rand(2) === 0 ? this._tournament() : this.randOrg();
        let org2 = Helper.rand(2) === 0 ? this._tournament() : this.randOrg();

        if (!org1.alive || !org2.alive) {return false}
        this._crossover(org1, org2);
        if (orgAmount + 1 >= OConfig.orgMaxOrgs) {
            if (this._tournament(org1, org2) === org2) {[org1, org2] = [org2, org1]}
            this.parent.fire(EVENTS.KILL_OVERFLOW, org2);
            org2.destroy();
        }

        return true;
    }

    _updateCreate() {
        if (this.organisms.size < 1) {this._createPopulation()}
    }
}

module.exports = Organisms;