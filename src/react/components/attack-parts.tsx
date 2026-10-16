import { useTranslation } from 'react-i18next';
import type { AttackProfile } from '../../domain/values/attack-profile.ts';
import { delta, short } from '../format.ts';
import { Icon } from './icon.tsx';

export type DamageType = 'melee' | 'pierce';

/**
 * Names the armour a hit goes through, so melee and pierce cannot be mistaken for one another.
 *
 * @param props.type - Which armour the damage is checked against.
 */
export function DamageTypePill({ type }: { type: DamageType }) {
    const { t } = useTranslation();

    return (
        <span className={`damage-pill damage-pill--${type}`}>
            <Icon name={type} />
            {t(`armourClasses.base-${type}`)}
        </span>
    );
}

/**
 * The change a technology made to a number, painted as a gain unless lower is the better direction.
 *
 * @param props.value - Difference from the number before technologies.
 * @param props.inverted - True when a lower number is the better one, as with reload time.
 */
export function Gain({ value, inverted = false }: { value: number; inverted?: boolean }) {
    const text = delta(value);
    if (text === '') return null;

    const good = inverted ? value < 0 : value > 0;

    return <span className={good ? 'stat__delta' : 'stat__delta stat__delta--down'}>{text}</span>;
}

export interface BonusChipsProps {
    attack: AttackProfile;
    /** The same attack before technologies, when the reader is looking at an upgraded one. */
    compareWith?: AttackProfile;
}

/**
 * The classes an attack deals more or less to, as green and red chips.
 *
 * @param props.attack - The attack to list.
 * @param props.compareWith - What technologies are measured against.
 */
export function BonusChips({ attack, compareWith }: BonusChipsProps) {
    const { t } = useTranslation();
    const modifiers = attack.modifiers();
    if (modifiers.length === 0) return <span className="attack-none">—</span>;

    return (
        <ul className="bonus-chips">
            {modifiers.map(({ armourClass, amount }) => (
                <li key={armourClass} className={amount < 0 ? 'bonus-chip bonus-chip--bad' : 'bonus-chip'}>
                    <strong>
                        {amount < 0 ? '−' : '+'}
                        {short(Math.abs(amount))}
                    </strong>
                    {t(`armourClasses.${armourClass}`)}
                    {compareWith ? <Gain value={amount - compareWith.valueFor(armourClass)} /> : null}
                </li>
            ))}
        </ul>
    );
}
