export interface SwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

/** An on-or-off setting drawn as a sliding switch, its label beside it. */
export function Switch({ label, checked, onChange }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={checked}
            onClick={() => {
                onChange(!checked);
            }}
        >
            <span className="switch__label">{label}</span>
            <span className="switch__track" aria-hidden="true">
                <span className="switch__knob" />
            </span>
        </button>
    );
}
