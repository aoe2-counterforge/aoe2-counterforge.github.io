import type { SVGProps } from 'react';
import {
    Castle,
    Check,
    Crown,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Coins,
    Crosshair,
    Eye,
    Flame,
    Gauge,
    Gem,
    Goal,
    Hammer,
    Heart,
    Hourglass,
    House,
    Info,
    Menu,
    Monitor,
    Moon,
    Plus,
    Repeat,
    Scale,
    Search,
    Shield,
    Sun,
    Sword,
    Swords,
    Timer,
    TrendingUp,
    TreePine,
    Users,
    Wheat,
    X,
    Zap,
} from 'lucide-react';

/**
 * The GitHub mark, drawn by hand because the icon set carries no brand logos.
 *
 * @param props - Passed straight through, so it sizes and colours like any other glyph.
 * @returns The mark, filled with the surrounding text colour.
 */
function GitHubMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
    );
}

/** The stroke the icon library draws with; a hand-drawn mark left without it would draw at one, half as heavy. */
const STROKE = 2;

/** How small a damage mark is drawn inside an armour shield, and where its centre lands. */
const EMBLEM_SCALE = 0.42;
const EMBLEM_CENTRE = { x: 12, y: 11.6 };

/** The upright blade every melee glyph is drawn with. */
function SwordShape() {
    return <path d="M12 2v13M8.5 15h7M12 15v4.5M10.5 21.5h3" />;
}

/** The arrow in flight every pierce glyph is drawn with. */
function ArrowShape() {
    // The fletching points forward like the head; splayed outward it read as a second head.
    return <path d="M4.5 19.5L19 5M19 5h-5.5M19 5v5.5M8 16h-3.5M8 16v3.5" />;
}

/**
 * A blade held point up, drawn by hand because the icon set only has diagonal swords.
 *
 * It stands for melee damage.
 *
 * @param props - Passed straight through, so it sizes and colours like any other glyph.
 * @returns The sword, stroked with the surrounding text colour.
 */
function MeleeMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <SwordShape />
        </svg>
    );
}

/**
 * An arrow in flight, drawn by hand to pair with the sword for pierce damage.
 *
 * @param props - Passed straight through, so it sizes and colours like any other glyph.
 * @returns The arrow, stroked with the surrounding text colour.
 */
function PierceMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <ArrowShape />
        </svg>
    );
}

/**
 * A shield with a damage mark shrunk inside it, so an armour reads as the answer to that one kind of blow.
 *
 * The mark's stroke is widened by as much as the mark is shrunk, so it draws as heavy as the shield.
 *
 * @param props - The mark to carry as children; the rest passes straight through to the drawing.
 * @returns The shield and its emblem, stroked with the surrounding text colour.
 */
function ArmourShield({ children, ...props }: SVGProps<SVGSVGElement>) {
    const offset = (centre: number) => centre - 12 * EMBLEM_SCALE;

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 2.5l7.5 3v6c0 5-3.4 8.2-7.5 10-4.1-1.8-7.5-5-7.5-10v-6z" />
            <g
                transform={`translate(${String(offset(EMBLEM_CENTRE.x))} ${String(offset(EMBLEM_CENTRE.y))}) scale(${String(EMBLEM_SCALE)})`}
                strokeWidth={STROKE / EMBLEM_SCALE}
            >
                {children}
            </g>
        </svg>
    );
}

/**
 * Melee armour: the shield bearing the melee damage mark.
 *
 * @param props - Passed straight through, so it sizes and colours like any other glyph.
 * @returns The shield and its sword.
 */
function MeleeArmourMark(props: SVGProps<SVGSVGElement>) {
    return (
        <ArmourShield {...props}>
            <SwordShape />
        </ArmourShield>
    );
}

/**
 * Pierce armour: the shield bearing the pierce damage mark.
 *
 * @param props - Passed straight through, so it sizes and colours like any other glyph.
 * @returns The shield and its arrow.
 */
function PierceArmourMark(props: SVGProps<SVGSVGElement>) {
    return (
        <ArmourShield {...props}>
            <ArrowShape />
        </ArmourShield>
    );
}

/**
 * Three arrows flying in a staggered row, drawn by hand to stand for the extra missiles a shot carries.
 *
 * It shares the pierce arrow's stroke so that both read as missiles, the volley being the plural.
 *
 * @param props - Passed straight through, so it sizes and colours like any other glyph.
 * @returns The arrows, stroked with the surrounding text colour.
 */
function VolleyMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M2 5.5h12M11.5 3l2.5 2.5-2.5 2.5M8 12h13M18.5 9.5l2.5 2.5-2.5 2.5M2 18.5h12M11.5 16l2.5 2.5-2.5 2.5" />
        </svg>
    );
}

/**
 * Every glyph the interface is allowed to draw.
 *
 * Keeping the set in one place is what lets a stat, a resource or a tab be named rather than
 * decorated: the caller asks for "attack", not for a particular drawing.
 */
const GLYPHS = {
    accuracy: Goal,
    age: Castle,
    armour: Shield,
    attack: Sword,
    bonus: Plus,
    charge: Zap,
    civilizations: Castle,
    compare: Scale,
    damage: Swords,
    food: Wheat,
    gold: Coins,
    hitPoints: Heart,
    home: House,
    lineOfSight: Eye,
    melee: MeleeMark,
    meleeArmour: MeleeArmourMark,
    next: ChevronRight,
    pierce: PierceMark,
    pierceArmour: PierceArmourMark,
    population: Users,
    projectiles: VolleyMark,
    range: Crosshair,
    recharge: Hourglass,
    reload: Timer,
    repeat: Repeat,
    search: Search,
    speed: Gauge,
    stone: Gem,
    strongAgainst: TrendingUp,
    trainTime: Timer,
    units: Swords,
    upgrades: Hammer,
    weakAgainst: Flame,
    wood: TreePine,
    about: Info,
    system: Monitor,
    light: Sun,
    dark: Moon,
    back: ChevronLeft,
    best: Crown,
    down: ChevronDown,
    source: GitHubMark,
    menu: Menu,
    close: X,
    check: Check,
} as const;

export type IconName = keyof typeof GLYPHS;

export interface IconProps {
    name: IconName;
    className?: string;
}

/** Draws one interface glyph, inheriting the colour and size of the text around it. */
export function Icon({ name, className }: IconProps) {
    const Glyph = GLYPHS[name];

    return <Glyph className={['glyph', className].filter(Boolean).join(' ')} aria-hidden="true" focusable="false" />;
}
