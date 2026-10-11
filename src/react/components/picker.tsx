import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { usePickerBox } from '../hooks/use-picker-box.ts';
import { needsFilter } from '../picker-search.ts';
import { Icon } from './icon.tsx';
import { SelectField } from './select-field.tsx';

export interface PickerOption {
    value: string;
    label: string;
    /** Drawn before the label, in the button and in the list. */
    visual?: ReactNode;
}

export interface PickerProps {
    label: string;
    value: string;
    options: readonly PickerOption[];
    onChange: (value: string) => void;
    /** Hides the label text in the button, leaving only the visual. */
    compact?: boolean;
    /** Names the filter inside the button, for a picker that stands outside a form field. */
    prefix?: string;
    /** Fills the width of a form field, the way a plain select does. */
    block?: boolean;
    /** Ties the button to a label written next to it. */
    id?: string;
    align?: 'start' | 'end';
}

/** How close to the window edge an open list is allowed to come, in pixels. */
const EDGE_MARGIN = 8;

/** A single-choice list that can carry a flag, an emblem or an icon beside each entry. */
export function Picker(props: PickerProps) {
    if (!props.block) return <MenuPicker {...props} />;

    return (
        <SelectField
            id={props.id}
            label={props.label}
            value={props.value}
            options={props.options}
            onChange={props.onChange}
        />
    );
}

/** The small shape: a button whose list, and the filter for a long one, open in a popup under it. */
function MenuPicker({ label, value, options, onChange, compact, prefix, id, align = 'end' }: PickerProps) {
    const { t } = useTranslation();
    const container = useRef<HTMLDivElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const [shift, setShift] = useState(0);
    const search = useRef<HTMLInputElement>(null);
    const searchable = needsFilter(options.length);

    const box = usePickerBox({
        container,
        options,
        value,
        onPick: (option) => {
            onChange(option.value);
        },
    });

    const current = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (box.isOpen) search.current?.focus();
    }, [box.isOpen]);

    // A list anchored to a small button can hang off the screen, so it slides back into it.
    useLayoutEffect(() => {
        if (!box.isOpen || !popup.current) {
            setShift(0);

            return;
        }

        const rect = popup.current.getBoundingClientRect();
        const past = rect.right - (window.innerWidth - EDGE_MARGIN);
        const before = EDGE_MARGIN - rect.left;

        if (past > 0) setShift(-past);
        else if (before > 0) setShift(before);
        else setShift(0);
    }, [box.isOpen]);

    return (
        <div
            className={prefix === undefined ? 'picker' : 'picker picker--labelled'}
            ref={container}
            onKeyDown={box.onKeyDown}
        >
            <button
                id={id}
                type="button"
                className="picker__button"
                aria-haspopup="listbox"
                aria-expanded={box.isOpen}
                aria-controls={box.isOpen ? box.listId : undefined}
                aria-label={compact || prefix !== undefined ? `${label}: ${current.label}` : undefined}
                onClick={() => {
                    box.toggle();
                }}
            >
                {current.visual}
                {prefix === undefined ? null : <span className="picker__prefix">{prefix}</span>}
                {compact ? null : <span className="picker__value">{current.label}</span>}
                <Icon name="down" className="picker__caret" />
            </button>

            {box.isOpen ? (
                <div
                    ref={popup}
                    className="picker__popup"
                    data-align={align}
                    style={shift === 0 ? undefined : { transform: `translateX(${String(shift)}px)` }}
                >
                    {searchable ? (
                        <input
                            ref={search}
                            type="search"
                            className="picker__search"
                            value={box.query}
                            placeholder={t('common.filter')}
                            aria-label={label}
                            aria-controls={box.listId}
                            aria-activedescendant={box.active ? box.optionId(box.active.value) : undefined}
                            onChange={(event) => {
                                box.setQuery(event.target.value);
                            }}
                        />
                    ) : null}

                    {box.visible.length === 0 ? (
                        <p className="picker__empty">{t('common.noMatch')}</p>
                    ) : (
                        <ul id={box.listId} className="picker__list" role="listbox" aria-label={label}>
                            {box.visible.map((option) => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        id={box.optionId(option.value)}
                                        role="option"
                                        aria-selected={option.value === value}
                                        className="picker__option"
                                        data-active={option.value === box.active?.value || undefined}
                                        onClick={() => {
                                            box.pick(option);
                                        }}
                                    >
                                        {option.visual}
                                        {option.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}
