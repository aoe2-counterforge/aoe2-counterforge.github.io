import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useListbox } from '../hooks/use-listbox.ts';
import { narrowOptions, needsFilter } from '../narrow-options.ts';
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
    const [term, setTerm] = useState('');
    const container = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const input = useRef<HTMLInputElement>(null);
    // Set when the list closes from inside the field, so the focus lands back on it instead of the page.
    const refocus = useRef(false);
    const listId = useId();
    const searchable = needsFilter(options.length);

    const visible = useMemo(() => narrowOptions(options, term), [options, term]);
    const current = options.find((option) => option.value === value) ?? options[0];

    const list = useListbox({
        container,
        count: visible.length,
        selected: Math.max(
            0,
            visible.findIndex((option) => option.value === value),
        ),
        onPick: (index) => {
            const picked = visible[index];
            if (picked) onChange(picked.value);
            refocus.current = true;
        },
    });

    useEffect(() => {
        if (list.isOpen) {
            input.current?.focus();

            return;
        }

        if (refocus.current) {
            refocus.current = false;
            button.current?.focus();
        }
    }, [list.isOpen]);

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && list.isOpen) {
            // Closing the list is all this key does here, not closing the sheet the field sits in.
            event.stopPropagation();
            refocus.current = true;
        }

        if (!list.isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) setTerm('');

        list.onKeyDown(event);
    };

    return (
        <div ref={container} className="select-field" data-open={list.isOpen || undefined} onKeyDown={onKeyDown}>
            {list.isOpen && searchable ? (
                <div
                    className="select-field__box"
                    onMouseDown={(event) => {
                        if (event.target !== input.current) event.preventDefault();
                    }}
                >
                    {term === '' ? current.visual : <Icon name="search" />}
                    <input
                        ref={input}
                        id={id}
                        type="text"
                        className="select-field__input"
                        role="combobox"
                        aria-label={label}
                        aria-expanded
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={visible.length > 0 ? `${listId}-${String(list.active)}` : undefined}
                        value={term}
                        placeholder={current.label}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => {
                            setTerm(event.target.value);
                            list.open();
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
                    aria-expanded={list.isOpen}
                    onClick={() => {
                        setTerm('');
                        list.toggle();
                    }}
                >
                    {current.visual}
                    <span className="picker__value">{current.label}</span>
                    <Icon name="down" className="select-field__caret" />
                </button>
            )}

            {list.isOpen ? (
                <OptionList
                    id={listId}
                    label={label}
                    options={visible}
                    active={list.active}
                    chosen={value}
                    onPick={list.pick}
                />
            ) : null}
        </div>
    );
}
