import { useTranslation } from 'react-i18next';
import type { HeadToHead } from '../../services/matchup/matchup-service.ts';
import { efficiency, unitIconPath } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useSearchParam } from '../hooks/use-search-param.ts';
import { VERDICT_COLOUR } from '../verdict-colour.ts';
import { DuelRow } from './duel-row.tsx';
import { GameIcon } from './game-icon.tsx';
import { SegmentedControl } from './segmented-control.tsx';

export interface HeadToHeadCardProps {
    headToHead: HeadToHead;
}

const VIEWS = ['duels', 'standings', 'grid'] as const;

type View = (typeof VIEWS)[number];

/** Below this a table of standings only restates the single duel above it. */
const STANDINGS_MIN_UNITS = 3;

function DuelList({ headToHead }: HeadToHeadCardProps) {
    return (
        <div className="stack stack--tight">
            {headToHead.duels.map((duel) => (
                <DuelRow key={`${duel.winner.key}:${duel.loser.key}`} duel={duel} />
            ))}
        </div>
    );
}

function StandingsTable({ headToHead }: HeadToHeadCardProps) {
    const { t } = useTranslation();
    const text = useGameText();

    return (
        <div className="scroll-x scroll-x--hint">
            <table className="compare-table">
                <thead>
                    <tr>
                        <th scope="col">{t('compare.standings.unit')}</th>
                        <th scope="col">{t('compare.standings.average')}</th>
                        <th scope="col" className="standing__record">
                            <abbr title={t('compare.standings.recordLong')}>{t('compare.standings.record')}</abbr>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {headToHead.standings.map((standing, index) => (
                        <tr key={standing.unit.key}>
                            <th scope="row">
                                <span className="standing">
                                    <span className="standing__rank">{index + 1}</span>
                                    <GameIcon
                                        path={unitIconPath(standing.unit.icon)}
                                        alt=""
                                        size="sm"
                                    />
                                    {text.unit(standing.unit.key).name}
                                </span>
                            </th>
                            <td style={{ color: VERDICT_COLOUR[standing.verdict], fontWeight: 700 }}>
                                {efficiency(standing.average)}
                            </td>
                            <td className="standing__record">{`${standing.won}–${standing.even}–${standing.lost}`}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Grid({ headToHead }: HeadToHeadCardProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const names = headToHead.units.map((unit) => text.unit(unit.key).name);

    return (
        <div className="scroll-x scroll-x--hint">
            <table className="compare-table">
                <thead>
                    <tr>
                        <th scope="col">{t('compare.rowVersusColumn')}</th>
                        {headToHead.units.map((unit, index) => (
                            <th scope="col" key={unit.key}>
                                {names[index]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {headToHead.units.map((unit, row) => (
                        <tr key={unit.key}>
                            <th scope="row">{names[row]}</th>
                            {headToHead.grid[row].map((matchup, column) => (
                                <td
                                    key={headToHead.units[column].key}
                                    title={
                                        matchup
                                            ? t('compare.cell', {
                                                  row: names[row],
                                                  column: names[column],
                                                  value: efficiency(matchup.efficiency),
                                              })
                                            : undefined
                                    }
                                >
                                    {matchup ? (
                                        <span style={{ color: VERDICT_COLOUR[matchup.verdict], fontWeight: 700 }}>
                                            {efficiency(matchup.efficiency)}
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Who beats whom inside the compared group, as duels, as standings or as a grid.
 *
 * The three are views of the same fights rather than three calculations, so they share one card.
 * The duels come first because a grid has to be read in the right direction to mean anything,
 * while a duel names its winner outright.
 */
export function HeadToHeadCard({ headToHead }: HeadToHeadCardProps) {
    const { t } = useTranslation();
    const views = VIEWS.filter((view) => view !== 'standings' || headToHead.units.length >= STANDINGS_MIN_UNITS);
    // The view travels in the address, so a link lands on the table it was sent for.
    const [view, choose] = useSearchParam('view', views);

    return (
        <section className="card">
            <div className="card__title">
                <h2>{t('compare.headToHead')}</h2>
                <SegmentedControl<View>
                    label={t('compare.headToHead')}
                    value={view}
                    onChange={choose}
                    options={views.map((option) => ({ value: option, label: t(`compare.views.${option}`) }))}
                />
            </div>
            <p className="card__hint">{t(`compare.hints.${view}`)}</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
                {view === 'duels' ? <DuelList headToHead={headToHead} /> : null}
                {view === 'standings' ? <StandingsTable headToHead={headToHead} /> : null}
                {view === 'grid' ? <Grid headToHead={headToHead} /> : null}
            </div>
        </section>
    );
}
