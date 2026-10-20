/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18n } from '../../../src/i18n/index.ts';
import { AttackProfile } from '../../../src/domain/values/attack-profile.ts';
import { SpecialAttack } from '../../../src/domain/values/special-attack.ts';
import { AttackCards } from '../../../src/react/components/attack-cards.tsx';
import { makeStats } from '../../fixtures/unit-builder.ts';

beforeAll(() => {
    createI18n('en');
});

afterEach(() => {
    window.history.replaceState(null, '', '/');
});

const bow = makeStats({ attacks: { 'base-pierce': 5, spearman: 3 }, range: 4, reloadTime: 2 });

const javelin = new SpecialAttack({
    role: 'charge',
    projectile: 2702,
    attack: new AttackProfile({ entries: [{ armourClass: 'base-pierce', amount: 6 }, { armourClass: 'archer', amount: 3 }] }),
    range: 6,
    count: null,
    charge: { capacity: 1, rechargeRate: 0.067 },
});

const torch = new SpecialAttack({
    role: 'charge',
    projectile: 2713,
    attack: new AttackProfile({ entries: [{ armourClass: 'base-melee', amount: 8 }] }),
    range: 3,
    count: null,
    charge: { capacity: 1, rechargeRate: 100000 },
});

const arrows = new SpecialAttack({
    role: 'secondary',
    projectile: 510,
    attack: new AttackProfile({ entries: [{ armourClass: 'base-pierce', amount: 3 }] }),
    range: 4,
    count: 2,
    maxCount: 2,
    charge: null,
});

const volleyArrows = new SpecialAttack({
    role: 'secondary',
    projectile: 511,
    attack: new AttackProfile({ entries: [{ armourClass: 'base-pierce', amount: 1 }] }),
    range: 4,
    count: 0,
    maxCount: 5,
    charge: null,
});

function card(name: string): HTMLElement {
    return screen.getByRole('listitem', { name });
}

/** What a screen reader reads out of a card, leaving out the captions printed for the eye only. */
function spoken(name: string): string {
    const copy = card(name).cloneNode(true) as HTMLElement;
    for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();

    return copy.textContent;
}

/** The cards are the only list items with a name; the bonus chips inside them have none. */
function cardNames(): (string | null)[] {
    return screen.getAllByRole('listitem', { name: /\S/ }).map((item) => {
        const id = item.getAttribute('aria-labelledby');

        return id ? (document.getElementById(id)?.textContent ?? null) : null;
    });
}

describe('AttackCards', () => {
    it('shows nothing for a unit that cannot attack', () => {
        const { container } = render(<AttackCards stats={makeStats({ attacks: {} })} base={[]} />);

        expect(container.textContent).toBe('');
    });

    it('labels every figure of the main attack the way the stat tiles do', () => {
        render(<AttackCards stats={bow} base={[]} />);

        expect(spoken('Main attack')).toMatch(/Damage5Reload2 sRange4.*\+3Spearmen/);
    });

    it('names each card by the attack it shows', () => {
        render(<AttackCards stats={bow} base={[javelin, arrows]} />);

        expect(cardNames()).toEqual(['Main attack', 'Charged attack']);
    });

    it('states the damage type beside the name of the attack', () => {
        render(<AttackCards stats={bow} base={[torch]} />);

        expect([spoken('Main attack'), spoken('Charged attack')]).toEqual([
            expect.stringMatching(/^Main attackPierceDamage/),
            expect.stringMatching(/^Charged attackStrikeDamage/),
        ]);
    });

    it('tells a charged attack by the time it takes to recharge', () => {
        render(<AttackCards stats={bow} base={[javelin]} />);

        expect(spoken('Charged attack')).toMatch(/Damage6Recharge15 sRange6.*\+3Archers/);
    });

    it('says a charge that refills at once goes off with each attack', () => {
        render(<AttackCards stats={bow} base={[torch]} />);

        expect(spoken('Charged attack')).toContain('CadenceEach attack');
    });

    it('hangs the extra projectiles every shot carries inside the main card', () => {
        render(<AttackCards stats={bow} base={[arrows]} />);

        expect([cardNames(), spoken('Main attack')]).toEqual([
            ['Main attack'],
            expect.stringMatching(/Damage3Extra projectiles2 missiles per shot/),
        ]);
    });

    it('hangs the extra missiles of a charged volley inside the charged card', () => {
        render(<AttackCards stats={bow} base={[javelin, volleyArrows]} />);

        expect([cardNames(), spoken('Charged attack')]).toEqual([
            ['Main attack', 'Charged attack'],
            expect.stringMatching(/Damage6Recharge15 sRange6.*Damage1Extra projectilesup to 5 missiles/),
        ]);
    });

    it('states the damage type of a volley once when all its missiles share it', () => {
        render(<AttackCards stats={bow} base={[javelin, volleyArrows]} />);

        expect(spoken('Charged attack').match(/Pierce/g)).toHaveLength(1);
    });

    it('gives the volley missiles their own type when it differs from the charged one', () => {
        const blades = new SpecialAttack({
            role: 'secondary',
            projectile: 512,
            attack: new AttackProfile({ entries: [{ armourClass: 'base-melee', amount: 2 }] }),
            range: 4,
            count: 0,
            maxCount: 3,
            charge: null,
        });

        render(<AttackCards stats={bow} base={[javelin, blades]} />);

        expect(spoken('Charged attack')).toMatch(/^Charged attackPierce.*Damage2TypeStrike/);
    });

    it('prints nothing for an attack with no bonus damage', () => {
        render(<AttackCards stats={makeStats({ attacks: { 'base-melee': 10 } })} base={[]} />);

        expect(screen.queryByRole('list', { name: 'Bonus damage' })).toBeNull();
    });

    it('shows the gain technologies bring to each figure', () => {
        const upgraded = makeStats({ attacks: { 'base-pierce': 7, spearman: 3 }, range: 5, reloadTime: 2 });

        render(<AttackCards stats={upgraded} compareWith={bow} base={[]} />);

        expect(spoken('Main attack')).toMatch(/Damage7\+2Reload2 sRange5\+1/);
    });
});
