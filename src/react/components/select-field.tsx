import { useEffect, useRef, type KeyboardEvent } from 'react';
import { usePickerBox } from '../hooks/use-picker-box.ts';
import { needsFilter } from '../picker-search.ts';
import { Icon } from './icon.tsx';
import { OptionList } from './option-list.tsx';
import type { PickerOption } from './picker.tsx';

export interface SelectFieldProps {
    label: string;
    value: string;
    options: readonly PickerOption[];
    onChange: (value: string) => void;
    /** Ties the field to a label written next to it. */
    id?: string;
}

/** A full-width single choice that reads like a select and, for a long list, takes the filter typed into itself. */
export function SelectField({ label, value, options, onChange, id }: SelectFieldProps) {
    const container = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const input = useRef<HTMLInputElement>(null);
    // Set when the list closes from inside the field, so the focus lands back on it instead of the page.
    const refocus = useRef(false);
    const searchable = needsFilter(options.length);

    const box = usePickerBox({
        container,
        options,
        value,
        onPick: (option) => {
            onChange(option.value);
            refocus.current = true;
        },
    });

    const current = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (box.isOpen) {
            input.current?.focus();

            return;
        }

        if (refocus.current) {
            refocus.current = false;
            button.current?.focus();
        }
    }, [box.isOpen]);

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && box.isOpen) {
            // Closing the list is all this key does here, not closing the sheet the field sits in.
            event.stopPropagation();
            refocus.current = true;
        }

        box.onKeyDown(event);
    };

    return (
        <div ref={container} className="select-field" data-open={box.isOpen || undefined} onKeyDown={onKeyDown}>
            {box.isOpen && searchable ? (
                <div
                    className="select-field__box"
                    onMouseDown={(event) => {
                        if (event.target !== input.current) event.preventDefault();
                    }}
                >
                    {box.query === '' ? current.visual : <Icon name="search" />}
                    <input
                        ref={input}
                        id={id}
                        type="text"
                        className="select-field__input"
                        role="combobox"
                        aria-label={label}
                        aria-expanded
                        aria-controls={box.listId}
                        aria-autocomplete="list"
                        aria-activedescendant={box.active ? box.optionId(box.active.value) : undefined}
                        value={box.query}
                        placeholder={current.label}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => {
                            box.setQuery(event.target.value);
                        }}
                    />
                    <Icon name="down" className="select-field__caret" />
                </div>
            ) : (
                <button
                    ref={button}
                    id={id}
                    type="button"
                    className="select-field__box"
                    aria-haspopup="listbox"
                    aria-expanded={box.isOpen}
                    aria-controls={box.isOpen ? box.listId : undefined}
                    onClick={() => {
                        box.toggle();
                    }}
                >
                    {current.visual}
                    <span className="picker__value">{current.label}</span>
                    <Icon name="down" className="select-field__caret" />
                </button>
            )}

            {box.isOpen ? (
                <OptionList
                    id={box.listId}
                    label={label}
                    options={box.visible}
                    active={box.active}
                    optionId={box.optionId}
                    chosen={value}
                    onPick={box.pick}
                />
            ) : null}
        </div>
    );
}
