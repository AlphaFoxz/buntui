import {type TuiThemedColorRef, isThemedColorRef, resolveThemedColor} from '../theme/themed-color';
import {colorToNumber} from './color-parser';

type TuiNamedColor
  = | 'aliceblue' | 'antiquewhite' | 'aqua' | 'aquamarine' | 'azure'
    | 'beige' | 'bisque' | 'black' | 'blanchedalmond' | 'blue' | 'blueviolet' | 'brown' | 'burlywood'
    | 'cadetblue' | 'chartreuse' | 'chocolate' | 'coral' | 'cornflowerblue' | 'cornsilk' | 'crimson' | 'cyan'
    | 'darkblue' | 'darkcyan' | 'darkgoldenrod' | 'darkgray' | 'darkgreen' | 'darkgrey' | 'darkkhaki'
    | 'darkmagenta' | 'darkolivegreen' | 'darkorange' | 'darkorchid' | 'darkred' | 'darksalmon'
    | 'darkseagreen' | 'darkslateblue' | 'darkslategray' | 'darkslategrey' | 'darkturquoise' | 'darkviolet'
    | 'deeppink' | 'deepskyblue' | 'dimgray' | 'dimgrey' | 'dodgerblue'
    | 'firebrick' | 'floralwhite' | 'forestgreen' | 'fuchsia'
    | 'gainsboro' | 'ghostwhite' | 'gold' | 'goldenrod' | 'gray' | 'green' | 'greenyellow' | 'grey'
    | 'honeydew' | 'hotpink'
    | 'indianred' | 'indigo' | 'ivory'
    | 'khaki'
    | 'lavender' | 'lavenderblush' | 'lawngreen' | 'lemonchiffon' | 'lightblue' | 'lightcoral' | 'lightcyan'
    | 'lightgoldenrodyellow' | 'lightgray' | 'lightgreen' | 'lightgrey' | 'lightpink' | 'lightsalmon'
    | 'lightseagreen' | 'lightskyblue' | 'lightslategray' | 'lightslategrey' | 'lightsteelblue' | 'lightyellow'
    | 'lime' | 'limegreen' | 'linen'
    | 'magenta' | 'maroon' | 'mediumaquamarine' | 'mediumblue' | 'mediumorchid' | 'mediumpurple'
    | 'mediumseagreen' | 'mediumslateblue' | 'mediumspringgreen' | 'mediumturquoise' | 'mediumvioletred'
    | 'midnightblue' | 'mintcream' | 'mistyrose' | 'moccasin'
    | 'navajowhite' | 'navy' | 'none'
    | 'oldlace' | 'olive' | 'olivedrab' | 'orange' | 'orangered' | 'orchid'
    | 'palegoldenrod' | 'palegreen' | 'paleturquoise' | 'palevioletred' | 'papayawhip' | 'peachpuff' | 'peru'
    | 'pink' | 'plum' | 'powderblue' | 'purple'
    | 'rosybrown' | 'royalblue' | 'red'
    | 'saddlebrown' | 'salmon' | 'sandybrown' | 'seagreen' | 'seashell' | 'sienna' | 'silver' | 'skyblue'
    | 'slateblue' | 'slategray' | 'slategrey' | 'snow' | 'springgreen' | 'steelblue'
    | 'tan' | 'teal' | 'thistle' | 'tomato' | 'transparent' | 'turquoise'
    | 'violet'
    | 'wheat' | 'white' | 'whitesmoke'
    | 'yellow' | 'yellowgreen';

export type TuiColorString = TuiNamedColor | (string & {});

export type TuiColor = U32 | TuiColorString | TuiThemedColorRef;

/**
 * Parse a color value to 0xRRGGBBAA (U32).
 * Accepts U32 numbers (passthrough), CSS color strings, or TuiThemedColorRef.
 * CSS strings: `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(r,g,b)`, `rgba(r,g,b,a)`, CSS named colors.
 */
export function parseColor(color: unknown): U32 {
  if (typeof color === 'number') {
    return color >>> 0;
  }

  if (typeof color === 'string') {
    const n = colorToNumber(color.trim());
    if (n === undefined) {
      throw new Error(`Invalid color: ${color}`);
    }

    return n >>> 0;
  }

  if (isThemedColorRef(color)) {
    return resolveThemedColor(color);
  }

  throw new Error(`Invalid color: ${typeof color}`);
}
