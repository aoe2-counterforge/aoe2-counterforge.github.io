import { useTranslation } from 'react-i18next';
import type { PickerOption } from './picker.tsx';

export interface OptionListProps {
    /** Ties the list to the field that controls it; each option's id is derived from it. */
    id: string;
    label: string;
    options: readonly PickerOption[];
    active: number;
    /** The field's current choice, for a field that holds one; otherwise the active option reads as selected. */
    chosen?: string;
    onPick: (index: number) => void;
}

/** The list a field opens under itself, with rows sized to match it. */
export function OptionList({ id, label, options, active, chosen, onPick }: OptionListProps) {
    const { t } = useTranslation();

    return (
        <div className="picker__popup select-field__popup">
            {options.length === 0 ? (
                <p className="picker__empty">{t('common.noMatch')}</p>
            ) : (
                <ul id={id} className="picker__list" role="listbox" aria-label={label}>
                    {options.map((option, index) => (
                        <li
                            key={option.value}
                            ref={(node) => {
                                if (index === active) node?.scrollIntoView({ block: 'nearest' });
                            }}
                            id={`${id}-${String(index)}`}
                            role="option"
                            aria-selected={chosen === undefined ? index === active : option.value === chosen}
                            className="picker__option"
                            data-active={index === active || undefined}
                            // Keeps the focus in the field, so the keys go on working after a click.
                            onMouseDown={(event) => {
                                event.preventDefault();
                            }}
                            onClick={() => {
                                onPick(index);
                            }}
                        >
                            {option.visual}
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
