/**
 * What special attacks and charges were measured doing in the game.
 *
 * These are observations, never figures for the site: the site reads every number from the game's
 * data file, and the measurements only check that the file is read the right way. Each entry comes
 * from a hit test run in the game, recorded under `scripts/benchmark/data/hit-test/` on the
 * `game/charge-targets` branch; the file is named beside it. Times are seconds between the hits
 * the test logged, so a charge shows up on the first attack after it is ready, up to one reload late.
 */
export const MEASURED = {
    louChuan: {
        source: 'lou-chuan-targets.csv, range-by-target.csv',
        /** Arrows that hit a Galley with each attack. */
        arrowsPerAttack: 10,
        /** How far its arrows reached: a Galley placed 9 to 11 tiles away was hit, one 12 away never was. */
        arrowRange: 10,
        /** How far its trebuchet shot reached: a House placed up to 14 tiles away was hit, one 15 away never was. */
        trebuchetRange: 13,
        /** What its arrows hit: a Galley and Archers, never a House, a Watch Tower or a Mangonel. */
        arrowsHit: ['land', 'ship'],
        /** What its trebuchet hit, and nothing else. */
        trebuchetHit: ['siege', 'building'],
    },
    xianbeiRaider: {
        source: 'xianbei-volley.csv',
        /** Missiles in a charged volley: the charged arrow and the rest. */
        volleyMissiles: 6,
    },
    turtleShip: {
        source: 'turtle-ship.csv',
        /** Hits of its full attack with every ordinary shot. */
        missilesPerShot: 3,
        /** Hits of its heavy charged shot. */
        chargedMissiles: 1,
        /** Seconds between two heavy shots against a Galley, averaged over six. */
        chargeInterval: 5.86,
        reload: 2,
    },
    hearthTroop: {
        source: 'pre-engage-shots.csv',
        /** How far from a Spearman it threw its javelin. */
        javelinFrom: 6.3,
        /** Whether it threw one at a House it walked up to. */
        javelinAtBuilding: false,
    },
    jomsviking: {
        source: 'jomsviking-torch.csv',
        /** Where it used its torch, from 3.6 to 4.7 tiles away: a House, a Barracks, a Fishing Ship and a Transport Ship. */
        torchAt: ['ship', 'building'],
        /** Where it struck from melee range instead: a Long Swordsman and a Militia. */
        bladeAt: ['land'],
    },
    coustillier: {
        source: 'melee-charges.csv',
        /** Damage of a charged blow over an ordinary one, against a Spearman. */
        bonus: 20,
        /** Seconds between two charged blows. */
        interval: 41.12,
        reload: 1.9,
    },
    urumiSwordsman: {
        source: 'melee-charges.csv',
        bonus: 12,
        interval: 24.15,
        reload: 2,
        /** Share of the charged blow the units half a tile from the target took; units a tile away took none. */
        splashShare: 0.5,
    },
    shrivamshaRider: {
        source: 'shrivamsha-dodge.csv',
        /** A Galley shooting every three seconds from the start landed its first arrow this late. */
        galleyReload: 3,
        firstHit: 52.81,
    },
    ironPagoda: {
        source: 'iron-pagoda.csv',
        /** Seconds between the two blows of a Long Swordsman it took nothing from. */
        interval: 41.1,
        /** The Long Swordsman's blows came this far apart. */
        attackerReload: 2.07,
    },
} as const;
