import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { unitIconPath } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useServices } from '../hooks/use-services.ts';
import { GameIcon } from './game-icon.tsx';
import { TagPicker } from './tag-picker.tsx';

export interface UnitPickerProps {
    label: string;
    /** Unit keys already chosen, in the order they are shown. */
    values: readonly string[];
    onChange: (unitKeys: string[]) => void;
    max: number;
}

/** A select that gathers several units, each one held as a tag with its portrait. */
export function UnitPicker({ label, values, onChange, max }: UnitPickerProps) {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();

    const options = useMemo(
        () =>
            catalog
                .units()
                .map((unit) => ({
                    value: unit.key,
                    label: text.unit(unit.key).name,
                    visual: (
                        <GameIcon path={unitIconPath(unit.icon)} alt="" size="sm" />
                    ),
                }))
                .sort((left, right) => left.label.localeCompare(right.label)),
        [catalog, text],
    );

    return (
        <TagPicker
            label={label}
            placeholder={label}
            values={values}
            options={options}
            onChange={onChange}
            removeLabel={(option) => t('compare.remove', { unit: option.label })}
            max={max}
        />
    );
}
