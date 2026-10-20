import { describe, expect, it } from 'vitest';
import { UNIT_RECORDS } from '../../../src/data/dataset.ts';
import type { Unit } from '../../../src/domain/entities/unit.ts';
import { CatalogAssembler } from '../../../src/services/game-catalog/catalog-assembler.ts';
import { MEASURED } from '../../fixtures/measured-special-attacks.ts';

const assembler = new CatalogAssembler();

function unit(key: string): Unit {
    const record = UNIT_RECORDS.find((entry) => entry.key === key);
    if (!record) throw new Error(`The dataset ships no unit called "${key}".`);

    return assembler.toUnit(record);
}

function charged(key: string) {
    const attack = unit(key).activeSpecialAttack('charge');
    if (!attack) throw new Error(`The dataset gives "${key}" no charged attack.`);

    return attack;
}

/** Whether a time read from the data is the one measured, which may come up to one reload late. */
function within(derived: number, measured: number, reload: number): boolean {
    return derived <= measured + 0.1 && measured - derived < reload;
}

describe('the special attacks read from the data, against what the game was measured doing', () => {
    it('fires ten arrows at units and ships from 10 tiles and the trebuchet shot at the rest from 13 for the Lou Chuan', () => {
        const measured = MEASURED.louChuan;

        const arrows = charged('lou-chuan');

        expect([arrows.count, arrows.range, unit('lou-chuan').stats.range, arrows.targetGroups()]).toEqual([
            measured.arrowsPerAttack,
            measured.arrowRange,
            measured.trebuchetRange,
            { within: measured.arrowsHit, without: measured.trebuchetHit },
        ]);
    });

    it('puts five extra arrows behind the Xianbei Raider charged one', () => {
        const extras = unit('xianbei-raider').activeSpecialAttack('secondary');

        expect(1 + (extras?.maxCount ?? 0)).toBe(MEASURED.xianbeiRaider.volleyMissiles);
    });

    it('fires three missiles a shot and one heavy shot when charged for the Turtle Ship', () => {
        const measured = MEASURED.turtleShip;
        const turtle = unit('turtle-ship');

        const heavy = charged('turtle-ship');

        expect([
            1 + turtle.stats.extraProjectiles,
            heavy.count,
            Math.abs((heavy.rechargeTime() ?? 0) - measured.chargeInterval) < measured.reload,
        ]).toEqual([measured.missilesPerShot, measured.chargedMissiles, true]);
    });

    it('copies the main missile, full attack and all, for every extra a unit without a secondary missile fires', () => {
        const measured = MEASURED.copiedMissiles.missilesPerShot;

        const derived = Object.keys(measured).map((key) => {
            const stats = unit(key).stats;

            return [key, 1 + stats.extraProjectiles, stats.extrasRepeatMain];
        });

        expect(derived).toEqual(Object.entries(measured).map(([key, count]) => [key, count, true]));
    });

    it('throws the Hearth Troop javelin from 6 tiles and never at a building', () => {
        const measured = MEASURED.hearthTroop;

        const javelin = charged('hearth-troop');

        expect([
            javelin.range <= measured.javelinFrom && measured.javelinFrom - javelin.range < 1,
            javelin.targetGroups()?.without.includes('building'),
        ]).toEqual([true, !measured.javelinAtBuilding]);
    });

    it('spends the Jomsviking torch on buildings and ships and the blade on the rest', () => {
        const groups = charged('jomsviking').targetGroups();

        expect([groups?.within, groups?.without.filter((group) => group !== 'siege')]).toEqual([
            MEASURED.jomsviking.torchAt,
            MEASURED.jomsviking.bladeAt,
        ]);
    });

    it('lands a Coustillier charged blow 20 harder every 40 seconds', () => {
        const measured = MEASURED.coustillier;

        const blow = unit('coustillier').chargeAbility;

        expect([blow?.kind, blow?.amount, within(blow?.cycleTime() ?? 0, measured.interval, measured.reload)]).toEqual([
            'blow',
            measured.bonus,
            true,
        ]);
    });

    it('lands an Urumi charged blow 12 harder every 24 seconds, half of it on the units beside the target', () => {
        const measured = MEASURED.urumiSwordsman;

        const blast = unit('urumi-swordsman').chargeAbility;

        expect([
            blast?.kind,
            blast?.amount,
            within(blast?.cycleTime() ?? 0, measured.interval, measured.reload),
            blast?.blast?.share,
        ]).toEqual(['blast', measured.bonus, true, measured.splashShare]);
    });

    it('lets the Shrivamsha dodge a Galley until its five dodges, regained one every 4 seconds, run out', () => {
        const measured = MEASURED.shrivamshaRider;
        const dodge = unit('shrivamsha-rider').chargeAbility;
        const regain = dodge?.cycleTime() ?? Number.POSITIVE_INFINITY;
        let held = dodge?.amount ?? 0;
        let shot = 0;

        while (held >= 1) {
            held = Math.min(dodge?.amount ?? 0, held - 1 + measured.galleyReload / regain);
            shot += 1;
        }
        const firstHit = shot * measured.galleyReload;

        expect(within(firstHit, measured.firstHit, measured.galleyReload)).toBe(true);
    });

    it('lets the Iron Pagoda take nothing from one blow every 40 seconds', () => {
        const measured = MEASURED.ironPagoda;

        const block = unit('iron-pagoda').chargeAbility;

        expect([block?.kind, within(block?.cycleTime() ?? 0, measured.interval, measured.attackerReload)]).toEqual([
            'block',
            true,
        ]);
    });
});
