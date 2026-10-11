/**
 * Spike: scores each engagement model against matchups the community agrees on.
 *
 * Every pair below names the side the player base expects to come out ahead. The script rates the
 * pair under each variant, marks the ratings that land on the wrong side of an even trade, and
 * prints how many each variant gets right.
 *
 * Run with `npx vite-node scripts/compare-engagements.ts`.
 */
import { ASSUMPTIONS } from '../src/assumptions.ts';
import { createServices, MATCHUP_THRESHOLDS, RESOURCE_WEIGHTS } from '../src/composition-root.ts';
import { BattleSimulator, type BattleSimulatorConfig } from '../src/services/combat/battle-simulator.ts';
import type { EngagementModel } from '../src/services/combat/combat-service.ts';
import { MatchupService, type UpgradeLevel } from '../src/services/matchup/matchup-service.ts';

type Expectation = 'wins' | 'loses';

interface Variant {
    label: string;
    model: EngagementModel;
    upgradeLevel: UpgradeLevel;
    battles?: Partial<BattleSimulatorConfig>;
}

const PAIRS: readonly [subject: string, opponent: string, expected: Expectation][] = [
    ['archer', 'spearman', 'wins'],
    ['archer', 'man-at-arms', 'wins'],
    ['archer', 'scout-cavalry', 'loses'],
    ['archer', 'skirmisher', 'loses'],
    ['crossbowman', 'long-swordsman', 'wins'],
    ['crossbowman', 'pikeman', 'wins'],
    ['crossbowman', 'knight', 'loses'],
    ['crossbowman', 'eagle-warrior', 'loses'],
    ['arbalester', 'champion', 'wins'],
    ['arbalester', 'halberdier', 'wins'],
    ['arbalester', 'elite-jaguar-warrior', 'wins'],
    ['arbalester', 'paladin', 'loses'],
    ['arbalester', 'elite-skirmisher', 'loses'],
    ['arbalester', 'elite-eagle-warrior', 'loses'],
    ['arbalester', 'elite-huskarl', 'loses'],
    ['hand-cannoneer', 'champion', 'wins'],
    ['heavy-cavalry-archer', 'champion', 'wins'],
    ['heavy-cavalry-archer', 'elite-skirmisher', 'loses'],
    ['champion', 'halberdier', 'wins'],
    ['champion', 'elite-eagle-warrior', 'wins'],
    ['elite-jaguar-warrior', 'champion', 'wins'],
    ['paladin', 'halberdier', 'loses'],
    ['paladin', 'heavy-camel-rider', 'loses'],
    ['paladin', 'siege-onager', 'wins'],
    ['siege-onager', 'arbalester', 'wins'],
];

const VARIANTS: readonly Variant[] = [
    { label: 'stand', model: 'stand', upgradeLevel: 'full' },
    { label: 'skirmish', model: 'skirmish', upgradeLevel: 'full' },
    { label: 'army', model: 'army', upgradeLevel: 'full', battles: { kiteOverheadSeconds: Number.POSITIVE_INFINITY } },
    { label: 'kite+0s', model: 'army', upgradeLevel: 'full', battles: { kiteOverheadSeconds: 0 } },
    { label: 'army+kite', model: 'army', upgradeLevel: 'full' },
    { label: 'kite+0.4s', model: 'army', upgradeLevel: 'full', battles: { kiteOverheadSeconds: 0.4 } },
    { label: 'kite/base', model: 'army', upgradeLevel: 'base' },
];

const services = createServices();

function matchupsFor(variant: Variant): MatchupService {
    const battles = new BattleSimulator({
        combat: services.combat,
        armyValue: ASSUMPTIONS.armyValue.value,
        meleeFrontage: ASSUMPTIONS.meleeFrontage.value,
        kiteRepeats: ASSUMPTIONS.kiteRepeats.value,
        kiteOverheadSeconds: ASSUMPTIONS.kiteOverheadSeconds.value,
        ...variant.battles,
    });

    return new MatchupService({
        catalog: services.catalog,
        combat: services.combat,
        battles,
        upgrades: services.upgrades,
        resourceWeights: RESOURCE_WEIGHTS,
        thresholds: MATCHUP_THRESHOLDS,
    });
}

const columns = VARIANTS.map((variant) => ({ variant, matchups: matchupsFor(variant), right: 0 }));

console.log(
    `army value ${ASSUMPTIONS.armyValue.value}, melee frontage ${ASSUMPTIONS.meleeFrontage.value}, ` +
        `kite overhead ${ASSUMPTIONS.kiteOverheadSeconds.value}s, kite repeats ${ASSUMPTIONS.kiteRepeats.value}\n`,
);
console.log(
    'subject'.padEnd(22) +
        'opponent'.padEnd(22) +
        'expect'.padEnd(7) +
        columns.map((column) => column.variant.label.padStart(11)).join(''),
);

for (const [subjectKey, opponentKey, expected] of PAIRS) {
    const subject = services.catalog.unit(subjectKey);
    const opponent = services.catalog.unit(opponentKey);

    const cells = columns.map((column) => {
        const { model, upgradeLevel } = column.variant;
        const efficiency = column.matchups.against({ unit: subject, model, upgradeLevel }, opponent).efficiency;
        const right = expected === 'wins' ? efficiency > 1 : efficiency < 1;
        if (right) column.right += 1;

        return `${efficiency.toFixed(2)}${right ? ' ' : '✗'}`.padStart(11);
    });

    console.log(subjectKey.padEnd(22) + opponentKey.padEnd(22) + expected.padEnd(7) + cells.join(''));
}

console.log('\n' + columns.map((column) => `${column.variant.label}: ${column.right}/${PAIRS.length}`).join('   '));
