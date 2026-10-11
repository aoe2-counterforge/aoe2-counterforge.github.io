import { useTranslation } from 'react-i18next';
import type { AgeId } from '../../domain/enums/age.ts';
import { iconUrl } from '../format.ts';

export interface AgeLabelProps {
    age: AgeId;
}

/** An age named next to its shield, as the heading of one part of a list split by age. */
export function AgeLabel({ age }: AgeLabelProps) {
    const { t } = useTranslation();

    return (
        <span className="age-label">
            <img className="age-label__shield" src={iconUrl(`ui/age-${String(age)}.png`)} alt="" />
            {t(`ages.${age}`)}
        </span>
    );
}
