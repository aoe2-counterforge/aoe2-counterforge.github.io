/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { createI18n } from '../../../src/i18n/index.ts';
import { AttackProfile } from '../../../src/domain/values/attack-profile.ts';
import { SpecialAttack } from '../../../src/domain/values/special-attack.ts';
import { ExtraAttacks } from '../../../src/react/components/extra-attacks.tsx';

beforeAll(() => {
    createI18n('en');
});

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

describe('ExtraAttacks', () => {
    it('shows nothing for a unit with no extra attack', () => {
        const { container } = render(<ExtraAttacks base={[]} />);

        expect(container.textContent).toBe('');
    });

    it('lists the charged attack with its name from the role and the time it takes to recharge', () => {
        render(<ExtraAttacks base={[javelin]} />);

        expect(screen.getByRole('region', { name: /Extra attacks/ }).textContent).toMatch(/Charged attack.*6.*Pierce.*6.*15 s.*\+3Archers/);
    });

    it('says a charge that refills at once goes off with each attack', () => {
        render(<ExtraAttacks base={[torch]} />);

        expect(screen.getByText('Each attack')).toBeDefined();
    });

    it('says extra projectiles fly with each shot, and how many', () => {
        render(<ExtraAttacks base={[arrows]} />);

        expect([screen.getByText('Each shot'), screen.getByText('× 2 per shot')].length).toBe(2);
    });
});
