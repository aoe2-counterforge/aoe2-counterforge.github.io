import { useTranslation } from 'react-i18next';
import type { PickerOption } from './picker.tsx';

export interface OptionListProps {
    /** Ties the list to the field that controls it. */
    id: string;
    label: string;
    options: readonly PickerOption[];
    /** The entry the keys have reached. */
    active: PickerOption | null;
    /** Names each entry's element, so the field can point at the active one. */
    optionId: (value: string) => string;
    /** The field's current choice, for a field that holds one; otherwise the active option reads as selected. */
    chosen?: string;
    onPick: (option: PickerOption) => void;
}

/** The list a field opens under itself, with rows sized to match it. */
export function OptionList({ id, label, options, active, optionId, chosen, onPick }: OptionListProps) {
    const { t } = useTranslation();

    return (
        <div className="picker__popup select-field__popup">
            {options.length === 0 ? (
                <p className="picker__empty">{t('common.noMatch')}</p>
            ) : (
                <ul id={id} className="picker__list" role="listbox" aria-label={label}>
                    {options.map((option) => {
                        const isActive = option.value === active?.value;

                        return (
                            <li
                                key={option.value}
                                ref={(node) => {
                                    if (isActive) node?.scrollIntoView({ block: 'nearest' });
                                }}
                                id={optionId(option.value)}
                                role="option"
                                aria-selected={chosen === undefined ? isActive : option.value === chosen}
                                className="picker__option"
                                data-active={isActive || undefined}
                                // Keeps the focus in the field, so the keys go on working after a click.
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                }}
                                onClick={() => {
                                    onPick(option);
                                }}
                            >
                                {option.visual}
                                {option.label}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
