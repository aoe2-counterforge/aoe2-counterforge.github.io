import { useTranslation } from 'react-i18next';

export interface EffectChipsProps {
    /** Each change in the words the reader sees; none at all means the change has no number to it. */
    effects: readonly string[];
}

/** The changes a technology makes, one chip each, or a single muted chip for a change without a number. */
export function EffectChips({ effects }: EffectChipsProps) {
    const { t } = useTranslation();

    if (effects.length === 0) {
        return <span className="effect-chip effect-chip--muted">{t('upgrades.qualitative')}</span>;
    }

    return effects.map((effect) => (
        <span key={effect} className="effect-chip">
            {effect}
        </span>
    ));
}
