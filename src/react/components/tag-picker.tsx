import { useMemo, useRef } from 'react';
import { usePickerBox } from '../hooks/use-picker-box.ts';
import { Icon } from './icon.tsx';
import { OptionList } from './option-list.tsx';
import type { PickerOption } from './picker.tsx';

export interface TagPickerProps {
    label: string;
    /** The chosen values, in the order their tags are drawn. */
    values: readonly string[];
    options: readonly PickerOption[];
    onChange: (values: string[]) => void;
    /** Written where the filter is typed, after the tags. */
    placeholder: string;
    /** Names the button that takes one tag back out. */
    removeLabel: (option: PickerOption) => string;
    /** Once this many are chosen the field stops offering more. */
    max?: number;
}

/** A select that keeps several choices as tags, with the filter typed in the field right after them. */
export function TagPicker({ label, values, options, onChange, placeholder, removeLabel, max }: TagPickerProps) {
    const container = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);

    const chosen = useMemo(
        () =>
            values
                .map((value) => options.find((option) => option.value === value))
                .filter((option) => option !== undefined),
        [values, options],
    );

    // An entry held as a tag leaves the list, so the same one cannot be added twice.
    const offered = useMemo(() => options.filter((option) => !values.includes(option.value)), [options, values]);

    const box = usePickerBox({
        container,
        options: offered,
        value: null,
        onPick: (option) => {
            onChange([...values, option.value]);
            input.current?.focus();
        },
    });

    const full = max !== undefined && chosen.length >= max;

    return (
        <div
            ref={container}
            className="select-field"
            role="group"
            aria-label={label}
            data-open={box.isOpen || undefined}
        >
            <div
                className="select-field__box tag-picker"
                onClick={(event) => {
                    // A tag's own button takes it out; anywhere else in the field reaches for the filter.
                    if (full || (event.target instanceof Element && event.target.closest('button'))) return;
                    input.current?.focus();
                    box.open();
                }}
            >
                <div className="tag-picker__values">
                    {chosen.map((option) => (
                        <span key={option.value} className="tag-picker__tag">
                            {option.visual}
                            <span className="tag-picker__label">{option.label}</span>
                            <button
                                type="button"
                                className="tag-picker__remove"
                                aria-label={removeLabel(option)}
                                onClick={() => {
                                    onChange(values.filter((value) => value !== option.value));
                                }}
                            >
                                <Icon name="close" />
                            </button>
                        </span>
                    ))}

                    {full ? null : (
                        <input
                            ref={input}
                            type="text"
                            className="select-field__input"
                            role="combobox"
                            aria-label={label}
                            aria-expanded={box.isOpen}
                            aria-controls={box.isOpen ? box.listId : undefined}
                            aria-autocomplete="list"
                            aria-activedescendant={box.active ? box.optionId(box.active.value) : undefined}
                            value={box.query}
                            placeholder={placeholder}
                            autoComplete="off"
                            onChange={(event) => {
                                box.open();
                                box.setQuery(event.target.value);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Backspace' && box.query === '' && values.length > 0) {
                                    onChange(values.slice(0, -1));

                                    return;
                                }

                                box.onKeyDown(event);
                            }}
                        />
                    )}
                </div>

                {full ? null : <Icon name="down" className="select-field__caret" />}
            </div>

            {box.isOpen ? (
                <OptionList
                    id={box.listId}
                    label={label}
                    options={box.visible}
                    active={box.active}
                    optionId={box.optionId}
                    onPick={box.pick}
                />
            ) : null}
        </div>
    );
}
