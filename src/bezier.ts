import { vec3 } from 'gl-matrix';

/**
 * evaluate a Bézier curve at given parameter values.
 * @param ps control points, at least 2 points are required
 * @param ts parameter values, must be in [0, 1] and sorted in ascending order
 * @returns an array of approximated points on the curve. Its length is the same as that of {@link ts}'s.
 */
export function evaluateBezierCurve(ps: readonly vec3[], ts: readonly number[]): vec3[]{
    if (ps.length < 2) {
        throw new Error('At least 2 control points are required');
    }
    const result = [];
    for (const t of ts) {
        let points = ps.map(vec3.clone);
        while (points.length > 1) {
            for (let i = 0; i < points.length - 1; i++) {
                vec3.lerp(points[i], points[i], points[i + 1], t);
            }
            points.pop();
        }
        result.push(points[0]);
    }
    return result;
}

/**
 * evaluate a Bézier curve in an adaptive subdivision way.
 * 
 * @param ps control points, at least 2 points are required
 * @returns an array of approximated points on the curve.
 */
export function adaptiveSubdivision(ps: readonly vec3[]) {
    if (ps.length < 2) {
        throw new Error('At least 2 control points are required');
    } else if (ps.length === 2) {
        return ps.map(vec3.clone);
    }
    const stack = [ps];
    const out = [vec3.clone(ps[0])];
    while (stack.length > 0) {
        const top = stack.pop()!;
        if (top.length < 2) {
            throw new Error('At least 2 control points are required');
        }
        if (top.length === 2) {
            out.push(top[1]);
            continue;
        }
        let lp = 0, last = top[top.length - 1];
        for (let i = 0; i < top.length - 1; i++) {
            lp += vec3.dist(top[i], top[i + 1]);
        }
        const lc = vec3.dist(top[0], last);
        const n = top.length - 1;
        if ((n - 1) / (n + 1) * (lp - lc) > 1e-5) {
            let points = top.map(vec3.clone), p1s = [vec3.clone(top[0])], p2s = [vec3.clone(last)];
            while (points.length > 1) {
                for (let i = 0; i < points.length - 1; i++) {
                    vec3.lerp(points[i], points[i], points[i + 1], 0.5);
                }
                points.pop();
                p1s.push(vec3.clone(points[0]));
                p2s.push(vec3.clone(points[points.length - 1]));
            }
            stack.push(p2s.reverse());
            stack.push(p1s);
        } else {
            out.push(last);
        }
    }
    return out;
}