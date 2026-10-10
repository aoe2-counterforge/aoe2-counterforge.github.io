import { useId, useMemo, useRef, useState } from 'react';
import { useListbox } from '../hooks/use-listbox.ts';
import { narrowOptions } from '../narrow-options.ts';
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
    const [term, setTerm] = useState('');
    const container = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const listId = useId();

    const chosen = useMemo(
        () =>
            values
                .map((value) => options.find((option) => option.value === value))
                .filter((option) => option !== undefined),
        [values, options],
    );

    const visible = useMemo(
        () =>
            narrowOptions(
                options.filter((option) => !values.includes(option.value)),
                term,
            ),
        [options, values, term],
    );

    const full = max !== undefined && chosen.length >= max;

    const list = useListbox({
        container,
        count: visible.length,
        selected: 0,
        onPick: (index) => {
            const picked = visible[index];
            if (picked) onChange([...values, picked.value]);
            setTerm('');
            input.current?.focus();
        },
    });

    return (
        <div
            ref={container}
            className="select-field"
            role="group"
            aria-label={label}
            data-open={list.isOpen || undefined}
        >
            <div
                className="select-field__box tag-picker"
                onClick={(event) => {
                    // A tag's own button takes it out; anywhere else in the field reaches for the filter.
                    if (full || (event.target instanceof Element && event.target.closest('button'))) return;
                    input.current?.focus();
                    if (!list.isOpen) list.open();
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
                            aria-expanded={list.isOpen}
                            aria-controls={list.isOpen ? listId : undefined}
                            aria-autocomplete="list"
                            aria-activedescendant={
                                list.isOpen && visible.length > 0 ? `${listId}-${String(list.active)}` : undefined
                            }
                            value={term}
                            placeholder={placeholder}
                            autoComplete="off"
                            onChange={(event) => {
                                setTerm(event.target.value);
                                list.open();
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Backspace' && term === '' && values.length > 0) {
                                    onChange(values.slice(0, -1));

                                    return;
                                }

                                list.onKeyDown(event);
                            }}
                        />
                    )}
                </div>

                {full ? null : <Icon name="down" className="select-field__caret" />}
            </div>

            {list.isOpen ? (
                <OptionList id={listId} label={label} options={visible} active={list.active} onPick={list.pick} />
            ) : null}
        </div>
    );
}
