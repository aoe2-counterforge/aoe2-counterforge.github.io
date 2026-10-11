import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import { unitIconPath } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useUnitLine } from '../hooks/use-unit-line.ts';
import { Forge } from './forge.tsx';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';

export interface UnitForgeProps {
    unit: Unit;
    name: string;
    /** One line naming what the unit is and where it is trained. */
    subtitle: string;
    /** Badges describing availability, shown under the line. */
    meta: ReactNode;
}

/** The head of a unit page, which adds the upgrade line to the shared banner. */
export function UnitForge({ unit, name, subtitle, meta }: UnitForgeProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const { preferences } = usePreferences();
    const steps = useUnitLine(unit);
    const line = useRef<HTMLDivElement>(null);

    // A line longer than a phone is wide slides sideways, and it opens with the unit you are on in view.
    useEffect(() => {
        const strip = line.current;
        const here = strip?.querySelector<HTMLElement>('[data-here]');
        if (!strip || !here || strip.scrollWidth <= strip.clientWidth) return;

        const offset = here.getBoundingClientRect().left - strip.getBoundingClientRect().left;
        strip.scrollLeft += offset - (strip.clientWidth - here.offsetWidth) / 2;
    }, [unit.key]);

    return (
        <Forge
            name={name}
            subtitle={subtitle}
            age={unit.ageFor(preferences.civ)}
            meta={meta}
            portrait={
                <GameIcon path={unitIconPath(unit.icon)} alt="" size="lg" />
            }
        >
            {steps.length > 1 ? (
                <div className="forge__line" ref={line}>
                    {steps.map((step, index) => (
                        <span className="forge__step-wrap" key={step[0].key}>
                            {index > 0 ? <Icon name="next" className="forge__arrow" /> : null}
                            <span className="forge__fork">
                                {step.map((member, choice) => {
                                    const name = text.unit(member.key).name;

                                    return (
                                        <Fragment key={member.key}>
                                            {choice > 0 ? (
                                                <span className="forge__or">{t('unit.lineOr')}</span>
                                            ) : null}
                                            <Link
                                                className="forge__step"
                                                to={`/unit/${member.key}`}
                                                aria-label={name}
                                                data-here={member.key === unit.key || undefined}
                                            >
                                                <GameIcon
                                                    path={unitIconPath(member.icon)}
                                                    alt=""
                                                    size="sm"
                                                />
                                                <span className="forge__step-name">{name}</span>
                                            </Link>
                                        </Fragment>
                                    );
                                })}
                            </span>
                        </span>
                    ))}
                </div>
            ) : null}
        </Forge>
    );
}
