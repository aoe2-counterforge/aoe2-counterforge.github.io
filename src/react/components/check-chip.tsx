import type { ReactNode } from 'react';
import { Icon } from './icon.tsx';

export interface CheckChipProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** A picture before the label, such as the technology the chip stands for. */
    icon?: ReactNode;
    className?: string;
    /** Why the chip cannot be turned on here; given, the chip is drawn drained and refuses the click. */
    unavailable?: string;
}

/**
 * A choice that is on or off, drawn as a pill with its own round mark instead of a bare checkbox.
 *
 * The native box stays in the markup for the keyboard and the screen reader; only the eye sees
 * the pill. A chip that is unavailable keeps its place so the reader sees what is missing.
 */
export function CheckChip({ label, checked, onChange, icon, className, unavailable }: CheckChipProps) {
    return (
        <label
            className={['toggle', className].filter(Boolean).join(' ')}
            data-unavailable={unavailable === undefined ? undefined : true}
            title={unavailable}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={unavailable !== undefined}
                onChange={(event) => {
                    onChange(event.target.checked);
                }}
            />
            <span className="toggle__mark" aria-hidden="true">
                <Icon name="check" />
            </span>
            {icon}
            <span className="toggle__label">{label}</span>
            {unavailable === undefined ? null : <span className="visually-hidden">{unavailable}</span>}
        </label>
    );
}
